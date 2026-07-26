-- ============================================================================
-- Tenancy & identity — the foundation every other table hangs off.
--
-- Mirrors the RBAC engine that already exists in TypeScript
-- (src/types/facility-staff.ts). That engine is the spec; this file is its
-- database form. It preserves the three properties that make it work, rather
-- than flattening them into a simpler role->boolean model:
--
--   1. Permissions resolve to an AccessScope ("anytime" | "operating_hours" |
--      "assigned_shifts" | "none"), NOT a boolean. "when" is part of the grant.
--   2. Resolution is a three-layer cascade, most specific wins:
--         ROLE_PRESETS  ->  per-facility role override  ->  per-staff override
--   3. There are 168 permission keys across 19 groups, and the list grows.
--      They live in a catalog TABLE, not a Postgres enum, so adding one is an
--      INSERT rather than an ALTER TYPE (which locks and cannot run in a
--      transaction alongside its own use). Seeded by
--      `bun run db:seed:generate` from PERMISSION_GROUPS — never by hand.
--
-- The TS union `AccessScope | "revoked"` collapses to `'none'` here: both mean
-- "not granted" once resolved (see permissionCheck() in
-- src/lib/facility-permissions.ts), so a separate revoked state would be a
-- distinction the application never observes.
--
-- SECURITY: every SECURITY DEFINER function lives in the `private` schema,
-- never in `public`. PostgREST only routes to schemas on the project's exposed
-- list, so a definer function in `private` cannot be invoked as an RPC by a
-- client — while RLS policies can still call it because EXECUTE is granted
-- explicitly below. A definer function in `public` would be a callable
-- privilege-escalation surface.
--
-- Verified against a live database: `get_advisors(security)` returns zero
-- lints and `get_advisors(performance)` returns only `unused_index` INFOs
-- (expected — the indexes exist for queries that do not exist yet).
-- ============================================================================

create extension if not exists "pgcrypto";

create schema if not exists private;

-- ── Enums ───────────────────────────────────────────────────────────────────
-- Small, stable value sets only. Anything expected to grow is a table.

create type public.facility_staff_role as enum (
  'owner', 'admin', 'manager', 'supervisor', 'reception', 'groomer',
  'trainer', 'caretaker', 'daycare_attendant', 'boarding_attendant',
  'retail', 'accountant', 'sanitation'
);

create type public.access_scope as enum (
  'anytime', 'operating_hours', 'assigned_shifts', 'none'
);

create type public.service_module as enum (
  'grooming', 'training', 'daycare', 'boarding',
  'reception', 'retail', 'sanitation', 'transport'
);

-- ── Tenancy: orgs -> facilities -> locations ────────────────────────────────
-- `legacy_id` bridges the mock data in src/data/ during migration (facility
-- "11" is the demo facility referenced throughout the app). Drop the columns
-- once nothing references the old string ids.

create table public.orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  slug        text        not null unique,
  legacy_id   text        unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.facilities (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid        not null references public.orgs (id) on delete restrict,
  name        text        not null,
  slug        text        not null unique,
  timezone    text        not null default 'America/New_York',
  legacy_id   text        unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index facilities_org_id_idx on public.facilities (org_id);

create table public.locations (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid        not null references public.facilities (id) on delete cascade,
  name         text        not null,
  is_primary   boolean     not null default false,
  timezone     text,
  legacy_id    text        unique,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index locations_facility_id_idx on public.locations (facility_id);

-- Exactly one primary location per facility.
create unique index locations_one_primary_per_facility
  on public.locations (facility_id)
  where is_primary;

-- ── Identity ────────────────────────────────────────────────────────────────
-- profiles is 1:1 with auth.users. `is_platform_admin` gates the super-admin
-- portal (src/app/dashboard/**) and is deliberately NOT a facility role — it
-- sits above the tenancy tree.

create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  email             text        not null,
  full_name         text,
  avatar_url        text,
  is_platform_admin boolean     not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- One row per (user, facility). This is the "staff member" record: a user can
-- belong to several facilities with a different role in each.
create table public.facility_memberships (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid        not null references public.profiles (id) on delete cascade,
  facility_id      uuid        not null references public.facilities (id) on delete cascade,
  role             public.facility_staff_role not null,
  home_location_id uuid        references public.locations (id) on delete set null,
  departments      public.service_module[] not null default '{}',
  is_active        boolean     not null default true,
  legacy_id        text        unique,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (profile_id, facility_id)
);

create index facility_memberships_facility_id_idx     on public.facility_memberships (facility_id);
create index facility_memberships_profile_id_idx      on public.facility_memberships (profile_id);
create index facility_memberships_home_location_id_idx on public.facility_memberships (home_location_id);

-- ── Permission catalog + the three cascade layers ───────────────────────────

create table public.permissions (
  key         text primary key,
  category    text not null,
  is_personal boolean not null default false,  -- always-on, non-removable
  description text
);

comment on table public.permissions is
  'Catalog of PermissionKey from src/types/facility-staff.ts (168 keys, 19 groups). Generated by bun run db:seed:generate — never hand-written.';

-- Layer 1: global ROLE_PRESETS.
create table public.role_preset_permissions (
  role           public.facility_staff_role not null,
  permission_key text  not null references public.permissions (key) on delete cascade,
  scope          public.access_scope not null,
  primary key (role, permission_key)
);

create index role_preset_permissions_permission_key_idx
  on public.role_preset_permissions (permission_key);

-- Layer 2: a facility tweaks what a role means for them.
create table public.facility_role_permissions (
  facility_id    uuid  not null references public.facilities (id) on delete cascade,
  role           public.facility_staff_role not null,
  permission_key text  not null references public.permissions (key) on delete cascade,
  scope          public.access_scope not null,
  primary key (facility_id, role, permission_key)
);

create index facility_role_permissions_permission_key_idx
  on public.facility_role_permissions (permission_key);

-- Layer 3: an individual staff member is granted or denied something directly.
create table public.membership_permissions (
  membership_id  uuid  not null references public.facility_memberships (id) on delete cascade,
  permission_key text  not null references public.permissions (key) on delete cascade,
  scope          public.access_scope not null,
  primary key (membership_id, permission_key)
);

create index membership_permissions_permission_key_idx
  on public.membership_permissions (permission_key);

-- ── updated_at ──────────────────────────────────────────────────────────────

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Resolution ──────────────────────────────────────────────────────────────
-- The SQL twin of resolvePermission() in src/types/facility-staff.ts.
-- Returns NULL when nothing grants the permission (the TS `false`).

create or replace function private.resolve_permission(
  p_membership_id uuid,
  p_permission    text
)
returns public.access_scope
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    -- layer 3: per-staff
    (select mp.scope
       from public.membership_permissions mp
      where mp.membership_id = p_membership_id
        and mp.permission_key = p_permission),
    -- layer 2: per-facility role override
    (select frp.scope
       from public.facility_role_permissions frp
       join public.facility_memberships m on m.id = p_membership_id
      where frp.facility_id    = m.facility_id
        and frp.role           = m.role
        and frp.permission_key = p_permission),
    -- layer 1: global role preset
    (select rpp.scope
       from public.role_preset_permissions rpp
       join public.facility_memberships m on m.id = p_membership_id
      where rpp.role           = m.role
        and rpp.permission_key = p_permission)
  );
$$;

comment on function private.resolve_permission is
  'Three-layer cascade, most specific wins: membership override -> facility role override -> global role preset. NULL means not granted.';

-- ── RLS helpers ─────────────────────────────────────────────────────────────
-- SECURITY DEFINER so they can read the membership tables without re-entering
-- the policies that call them (otherwise every policy recurses infinitely).

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_platform_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function private.member_facility_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.facility_id
    from public.facility_memberships m
   where m.profile_id = auth.uid()
     and m.is_active;
$$;

create or replace function private.has_permission(
  p_facility_id uuid,
  p_permission  text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin() or exists (
    select 1
      from public.facility_memberships m
     where m.profile_id  = auth.uid()
       and m.facility_id = p_facility_id
       and m.is_active
       and coalesce(private.resolve_permission(m.id, p_permission),
                    'none'::public.access_scope) <> 'none'::public.access_scope
  );
$$;

-- Policies are evaluated as the calling role, so `authenticated` needs USAGE on
-- the schema and EXECUTE on these. That does NOT make them RPC-callable:
-- PostgREST only routes to schemas on the project's exposed list. `anon` is
-- deliberately not granted — every policy below is `to authenticated`.
grant usage on schema private to authenticated;
grant execute on function private.is_platform_admin()            to authenticated;
grant execute on function private.member_facility_ids()          to authenticated;
grant execute on function private.has_permission(uuid, text)     to authenticated;
grant execute on function private.resolve_permission(uuid, text) to authenticated;

-- ── Row Level Security ──────────────────────────────────────────────────────
-- On by default, everywhere. These policies are the backstop, not the primary
-- gate: business writes go through server code that enforces the invariants
-- RLS cannot express (capacity, ledger balance, dunning idempotency).
--
-- Two rules learned from the database linter, applied throughout:
--   • `auth.uid()` is wrapped in `(select ...)` so it is evaluated once per
--     query rather than once per row (lint 0003_auth_rls_initplan).
--   • Write policies target insert/update/delete explicitly rather than
--     `for all`, because `for all` also matches SELECT and would make every
--     read evaluate two permissive policies (lint 0006).

alter table public.orgs                      enable row level security;
alter table public.facilities                enable row level security;
alter table public.locations                 enable row level security;
alter table public.profiles                  enable row level security;
alter table public.facility_memberships      enable row level security;
alter table public.permissions               enable row level security;
alter table public.role_preset_permissions   enable row level security;
alter table public.facility_role_permissions enable row level security;
alter table public.membership_permissions    enable row level security;

-- Catalog + global presets: readable by any signed-in user, written by
-- platform admins only.
create policy permissions_read on public.permissions
  for select to authenticated using (true);
create policy permissions_insert on public.permissions
  for insert to authenticated with check (private.is_platform_admin());
create policy permissions_update on public.permissions
  for update to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());
create policy permissions_delete on public.permissions
  for delete to authenticated using (private.is_platform_admin());

create policy role_presets_read on public.role_preset_permissions
  for select to authenticated using (true);
create policy role_presets_insert on public.role_preset_permissions
  for insert to authenticated with check (private.is_platform_admin());
create policy role_presets_update on public.role_preset_permissions
  for update to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());
create policy role_presets_delete on public.role_preset_permissions
  for delete to authenticated using (private.is_platform_admin());

-- Orgs / facilities: members see their own; platform admins manage.
create policy orgs_read on public.orgs
  for select to authenticated
  using (
    private.is_platform_admin()
    or exists (
      select 1 from public.facilities f
       where f.org_id = orgs.id
         and f.id in (select private.member_facility_ids())
    )
  );
create policy orgs_insert on public.orgs
  for insert to authenticated with check (private.is_platform_admin());
create policy orgs_update on public.orgs
  for update to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());
create policy orgs_delete on public.orgs
  for delete to authenticated using (private.is_platform_admin());

create policy facilities_read on public.facilities
  for select to authenticated
  using (private.is_platform_admin() or id in (select private.member_facility_ids()));
create policy facilities_insert on public.facilities
  for insert to authenticated with check (private.is_platform_admin());
create policy facilities_update on public.facilities
  for update to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());
create policy facilities_delete on public.facilities
  for delete to authenticated using (private.is_platform_admin());

create policy locations_read on public.locations
  for select to authenticated
  using (private.is_platform_admin() or facility_id in (select private.member_facility_ids()));
create policy locations_insert on public.locations
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_services'));
create policy locations_update on public.locations
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_services'))
  with check (private.has_permission(facility_id, 'manage_services'));
create policy locations_delete on public.locations
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_services'));

-- Profiles: you always see yourself. You also see colleagues at facilities you
-- belong to, so staff pickers and schedules work.
create policy profiles_read on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or private.is_platform_admin()
    or exists (
      select 1 from public.facility_memberships m
       where m.profile_id = profiles.id
         and m.facility_id in (select private.member_facility_ids())
    )
  );

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Memberships and their overrides: visible within the facility, written only
-- by someone holding the staff-management permission there.
create policy memberships_read on public.facility_memberships
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );
create policy memberships_insert on public.facility_memberships
  for insert to authenticated
  with check (private.has_permission(facility_id, 'scheduling_view_all'));
create policy memberships_update on public.facility_memberships
  for update to authenticated
  using (private.has_permission(facility_id, 'scheduling_view_all'))
  with check (private.has_permission(facility_id, 'scheduling_view_all'));
create policy memberships_delete on public.facility_memberships
  for delete to authenticated
  using (private.has_permission(facility_id, 'scheduling_view_all'));

create policy facility_role_permissions_read on public.facility_role_permissions
  for select to authenticated
  using (private.is_platform_admin() or facility_id in (select private.member_facility_ids()));
create policy facility_role_permissions_insert on public.facility_role_permissions
  for insert to authenticated
  with check (private.has_permission(facility_id, 'scheduling_view_all'));
create policy facility_role_permissions_update on public.facility_role_permissions
  for update to authenticated
  using (private.has_permission(facility_id, 'scheduling_view_all'))
  with check (private.has_permission(facility_id, 'scheduling_view_all'));
create policy facility_role_permissions_delete on public.facility_role_permissions
  for delete to authenticated
  using (private.has_permission(facility_id, 'scheduling_view_all'));

create policy membership_permissions_read on public.membership_permissions
  for select to authenticated
  using (
    private.is_platform_admin()
    or exists (
      select 1 from public.facility_memberships m
       where m.id = membership_permissions.membership_id
         and (m.profile_id = (select auth.uid())
              or m.facility_id in (select private.member_facility_ids()))
    )
  );
create policy membership_permissions_insert on public.membership_permissions
  for insert to authenticated
  with check (exists (
    select 1 from public.facility_memberships m
     where m.id = membership_permissions.membership_id
       and private.has_permission(m.facility_id, 'scheduling_view_all')));
create policy membership_permissions_update on public.membership_permissions
  for update to authenticated
  using (exists (
    select 1 from public.facility_memberships m
     where m.id = membership_permissions.membership_id
       and private.has_permission(m.facility_id, 'scheduling_view_all')))
  with check (exists (
    select 1 from public.facility_memberships m
     where m.id = membership_permissions.membership_id
       and private.has_permission(m.facility_id, 'scheduling_view_all')));
create policy membership_permissions_delete on public.membership_permissions
  for delete to authenticated
  using (exists (
    select 1 from public.facility_memberships m
     where m.id = membership_permissions.membership_id
       and private.has_permission(m.facility_id, 'scheduling_view_all')));

-- ── Triggers ────────────────────────────────────────────────────────────────

create trigger orgs_set_updated_at
  before update on public.orgs
  for each row execute function private.set_updated_at();

create trigger facilities_set_updated_at
  before update on public.facilities
  for each row execute function private.set_updated_at();

create trigger locations_set_updated_at
  before update on public.locations
  for each row execute function private.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger facility_memberships_set_updated_at
  before update on public.facility_memberships
  for each row execute function private.set_updated_at();

-- New auth user -> profile row, so nothing has to remember to create one.
-- Reads raw_user_meta_data for DISPLAY fields only; it is user-editable and is
-- never used for an authorization decision.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
