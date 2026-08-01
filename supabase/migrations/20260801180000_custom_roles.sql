-- ============================================================================
-- Custom roles.
--
-- The last part of the role editor that was still lying. A facility could
-- invent "Senior Groomer", give it permissions, assign it to people — and all
-- of it lived in one browser's localStorage.
--
-- ── Why this is cheaper than it looked ─────────────────────────────────────
-- The open question was whether a custom role is a ROLE (and therefore needs
-- to be something `facility_memberships.role` can point at, which is an enum
-- and so would need widening or replacing) or a saved BUNDLE of per-staff
-- overrides.
--
-- The code already answers it. `StaffProfile.customRoleIds` is an ARRAY,
-- resolved by resolvePermission() in exactly the same union as
-- `additionalRoles`: every role a person holds contributes, widest scope wins.
-- No code path ever puts a custom role in `primaryRole`. So a custom role is
-- additive — a named, reusable permission bundle attached to N staff — and it
-- never needs to be an enum value. The enum problem was imaginary.
--
-- That makes it a real role in the only sense that matters (named, reusable,
-- owns a permission set) at the cost of three ordinary tables.
--
-- ── Assignment hangs off staff, not membership ─────────────────────────────
-- Same reasoning as staff_permissions in the previous migration: 0 of 18 staff
-- have an account, and a custom role assigned at hire has to survive until
-- they do.
--
-- ── legacy_id ──────────────────────────────────────────────────────────────
-- Custom role ids are minted client-side as "custom-<base36>-<rand>" and are
-- referenced across the staff editor, the role studio and the admin roles
-- page. Keeping them means those files keep working unchanged.
-- ============================================================================

create table public.facility_custom_roles (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,

  /** The client-minted id, e.g. "custom-mabc123-xy9z". */
  legacy_id   text unique,

  label       text not null,
  description text not null default '',

  -- Presentation, carried so a role looks the same in every browser rather
  -- than only the one that created it.
  accent      text not null default '',
  ring        text not null default '',
  icon        text not null default '',

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Deliberately no unique constraint on (facility_id, label): the studio's
-- Duplicate button mints "Groomer (Copy)", and duplicating twice would then
-- fail on a name collision rather than doing the obvious thing.
create index facility_custom_roles_facility_idx
  on public.facility_custom_roles (facility_id);

create trigger facility_custom_roles_set_updated_at
  before update on public.facility_custom_roles
  for each row execute function private.set_updated_at();

create table public.facility_custom_role_permissions (
  custom_role_id uuid not null references public.facility_custom_roles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  scope          public.access_scope not null,
  primary key (custom_role_id, permission_key)
);

create index facility_custom_role_permissions_key_idx
  on public.facility_custom_role_permissions (permission_key);

-- Who holds the role. A plain join table: a person may hold several, and a
-- role may be held by several people.
create table public.staff_custom_roles (
  staff_id       uuid not null references public.staff (id) on delete cascade,
  custom_role_id uuid not null references public.facility_custom_roles (id) on delete cascade,
  primary key (staff_id, custom_role_id)
);

create index staff_custom_roles_role_idx
  on public.staff_custom_roles (custom_role_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Reading is facility-wide: the staff editor has to list the roles on offer,
-- and knowing "Senior Groomer exists" is not the sensitive part. Writing is
-- manage_roles, the same gate as every other layer of the cascade.

alter table public.facility_custom_roles            enable row level security;
alter table public.facility_custom_role_permissions enable row level security;
alter table public.staff_custom_roles               enable row level security;

create policy facility_custom_roles_read on public.facility_custom_roles
  for select to authenticated
  using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );
create policy facility_custom_roles_insert on public.facility_custom_roles
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_roles'));
create policy facility_custom_roles_update on public.facility_custom_roles
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_roles'))
  with check (private.has_permission(facility_id, 'manage_roles'));
create policy facility_custom_roles_delete on public.facility_custom_roles
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_roles'));

create policy facility_custom_role_permissions_read on public.facility_custom_role_permissions
  for select to authenticated
  using (exists (
    select 1 from public.facility_custom_roles r
     where r.id = facility_custom_role_permissions.custom_role_id
       and (private.is_platform_admin()
            or r.facility_id in (select private.member_facility_ids()))));
create policy facility_custom_role_permissions_insert on public.facility_custom_role_permissions
  for insert to authenticated
  with check (exists (
    select 1 from public.facility_custom_roles r
     where r.id = facility_custom_role_permissions.custom_role_id
       and private.has_permission(r.facility_id, 'manage_roles')));
create policy facility_custom_role_permissions_update on public.facility_custom_role_permissions
  for update to authenticated
  using (exists (
    select 1 from public.facility_custom_roles r
     where r.id = facility_custom_role_permissions.custom_role_id
       and private.has_permission(r.facility_id, 'manage_roles')))
  with check (exists (
    select 1 from public.facility_custom_roles r
     where r.id = facility_custom_role_permissions.custom_role_id
       and private.has_permission(r.facility_id, 'manage_roles')));
create policy facility_custom_role_permissions_delete on public.facility_custom_role_permissions
  for delete to authenticated
  using (exists (
    select 1 from public.facility_custom_roles r
     where r.id = facility_custom_role_permissions.custom_role_id
       and private.has_permission(r.facility_id, 'manage_roles')));

create policy staff_custom_roles_read on public.staff_custom_roles
  for select to authenticated
  using (exists (
    select 1 from public.staff s
     where s.id = staff_custom_roles.staff_id
       and (private.is_platform_admin()
            or s.facility_id in (select private.member_facility_ids()))));
create policy staff_custom_roles_insert on public.staff_custom_roles
  for insert to authenticated
  with check (exists (
    select 1 from public.staff s
     where s.id = staff_custom_roles.staff_id
       and private.has_permission(s.facility_id, 'manage_roles')));
create policy staff_custom_roles_delete on public.staff_custom_roles
  for delete to authenticated
  using (exists (
    select 1 from public.staff s
     where s.id = staff_custom_roles.staff_id
       and private.has_permission(s.facility_id, 'manage_roles')));
-- No update policy: an assignment is a (staff, role) pair with nothing else to
-- change. Reassigning is a delete and an insert.

-- ── Resolution ──────────────────────────────────────────────────────────────
-- Unchanged except for one addition: the roles layer now unions the scopes
-- granted by every custom role the person holds, alongside their preset roles.
-- Precedence above it is untouched — an account override, then a person
-- override, either of which is absolute.

create or replace function private.resolve_permission(
  p_membership_id uuid,
  p_permission    text
)
returns public.access_scope
language sql
stable
security definer
set search_path = ''
as $fn$
  with m as (
    select fm.id, fm.facility_id, fm.role
      from public.facility_memberships fm
     where fm.id = p_membership_id
  ),
  s as (
    select st.id, st.primary_role, st.additional_roles
      from public.staff st
      join m on m.id = st.membership_id
  ),
  held_roles as (
    select m.role as role from m
     union
    select s.primary_role from s
     union
    select unnest(s.additional_roles) from s
  ),
  preset_scopes as (
    select coalesce(
             (select frp.scope
                from public.facility_role_permissions frp
               where frp.facility_id    = (select facility_id from m)
                 and frp.role           = hr.role
                 and frp.permission_key = p_permission),
             (select rpp.scope
                from public.role_preset_permissions rpp
               where rpp.role           = hr.role
                 and rpp.permission_key = p_permission)
           ) as scope
      from held_roles hr
  ),
  custom_scopes as (
    select cp.scope
      from public.staff_custom_roles scr
      join s on s.id = scr.staff_id
      join public.facility_custom_role_permissions cp
        on cp.custom_role_id = scr.custom_role_id
     where cp.permission_key = p_permission
  ),
  role_scopes as (
    select scope from preset_scopes
     union all
    select scope from custom_scopes
  )
  select coalesce(
    (select mp.scope
       from public.membership_permissions mp
      where mp.membership_id  = p_membership_id
        and mp.permission_key = p_permission),
    (select sp.scope
       from public.staff_permissions sp
       join s on s.id = sp.staff_id
      where sp.permission_key = p_permission),
    (select rs.scope
       from role_scopes rs
      where rs.scope is not null
        and rs.scope <> 'none'::public.access_scope
      order by case rs.scope
                 when 'anytime'         then 3
                 when 'operating_hours' then 2
                 when 'assigned_shifts' then 1
                 else 0
               end desc
      limit 1)
  );
$fn$;

comment on function private.resolve_permission is
  'Effective scope for one membership and one permission. Account override, then person override (both absolute, including a stored ''none''), then the widest scope across every role held — preset roles and custom roles alike. NULL means not granted. The SQL twin of resolvePermission() in src/types/facility-staff.ts.';

grant execute on function private.resolve_permission(uuid, text) to authenticated;
