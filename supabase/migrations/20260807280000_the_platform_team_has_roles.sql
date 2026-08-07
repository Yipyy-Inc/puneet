-- ============================================================================
-- The platform team has roles, and nobody can grant themselves one.
--
-- Spec 002, phase 6. `profiles.is_platform_admin` was a single boolean, so
-- "superadmin" and "the users of superadmin" were the same person as far as the
-- database was concerned: every member of the Yipyy team could delete a
-- customer's business.
--
-- ── AND THE BOOLEAN WAS SELF-SERVICE ──────────────────────────────────────
--
-- Found while grounding this migration, and proved against the live database
-- before it was fixed:
--
--   profiles_update_self  USING (id = auth.jwt()->>'sub')
--
-- RLS is ROW-level, not column-level. That policy admits the whole row, so any
-- signed-in person — a customer, a groomer, anyone with an account — could run
--
--   update profiles set is_platform_admin = true where id = <their own sub>;
--
-- and pass all 69 policies that call private.is_platform_admin(): every
-- facility's clients, payments and staff, plus deleting facilities. The probe
-- returned `became_admin: true`. PostgREST exposes this table, so it was
-- reachable from a browser with a session and the publishable key.
--
-- ── HOW THIS CLOSES IT, STRUCTURALLY ──────────────────────────────────────
--
-- `platform_memberships` becomes the source of truth, and it has no policy that
-- lets anyone but a superadmin write it. `profiles.is_platform_admin` stays as
-- a READ-ONLY MIRROR: a trigger reverts any hand-edit to whatever the
-- membership table says, so the escalation path writes a value that is undone
-- in the same statement.
--
-- Kept as a mirror rather than dropped because src/lib/auth/viewer.ts reads the
-- column directly, and 69 policies read the function. Changing either in this
-- migration would mean changing the meaning of authorisation everywhere at
-- once, which is not a thing to do in the same change as a security fix.
--
-- ── is_platform_admin() KEEPS ITS EXACT MEANING ───────────────────────────
--
-- "Is this caller on the platform team." It now reads the new table instead of
-- the boolean, and answers identically for every existing caller. Narrowing it
-- would silently re-authorise 69 policies in one step; the narrow checks are a
-- SEPARATE function, applied deliberately, one policy at a time.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'platform_role') then
    create type public.platform_role as enum (
      'superadmin',  -- everything, including destructive and irreversible
      'support',     -- help customers; read broadly, no destruction
      'billing',     -- the commercial surfaces
      'readonly'     -- look, do not touch
    );
  end if;
end $$;

create table if not exists public.platform_memberships (
  profile_id text primary key references public.profiles(id) on delete cascade,
  role       public.platform_role not null default 'readonly',
  granted_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists platform_memberships_set_updated_at on public.platform_memberships;
create trigger platform_memberships_set_updated_at
  before update on public.platform_memberships
  for each row execute function private.set_updated_at();

-- ── Backfill BEFORE the function changes over ──────────────────────────────
--
-- Order matters: if is_platform_admin() started reading an empty table, every
-- platform admin would lose access mid-migration and the superadmin-only
-- policies below could not be administered by anyone.

insert into public.platform_memberships (profile_id, role)
select p.id, 'superadmin'::public.platform_role
  from public.profiles p
 where p.is_platform_admin
on conflict (profile_id) do nothing;

alter table public.platform_memberships enable row level security;

-- The team can see itself. Knowing who else is on the platform team is not
-- sensitive to a platform member and is needed to administer it.
--
-- The "is on the team" half goes through private.is_platform_admin() rather
-- than an EXISTS against this table. A SELECT policy that selects from its own
-- table re-enters the policy — 42P17, infinite recursion, and the table becomes
-- unreadable to everyone. The function is SECURITY DEFINER, so it reads without
-- re-entering. The own-row arm is first and is a plain comparison, so a caller
-- can always see their own role.
drop policy if exists platform_memberships_read on public.platform_memberships;
create policy platform_memberships_read on public.platform_memberships
  for select to authenticated
  using (
    profile_id = (select auth.jwt()->>'sub')
    or private.is_platform_admin()
  );

-- NO insert, update or delete policy. Membership is granted only through
-- public.grant_platform_role below, which requires superadmin — so there is no
-- shape of request that promotes anybody, including the row's own owner.

-- ── The two questions, kept separate ───────────────────────────────────────

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $fn$
  select exists (
    select 1 from public.platform_memberships m
     where m.profile_id = (select auth.jwt()->>'sub')
  );
$fn$;

/**
 * The narrow question. `superadmin` satisfies every role, so a policy asking
 * for 'billing' does not have to also spell out 'or superadmin' — forgetting
 * that in one place is how a superadmin gets locked out of one screen.
 */
create or replace function private.has_platform_role(p_role public.platform_role)
returns boolean
language sql
stable
security definer
set search_path to ''
as $fn$
  select exists (
    select 1 from public.platform_memberships m
     where m.profile_id = (select auth.jwt()->>'sub')
       and (m.role = p_role or m.role = 'superadmin')
  );
$fn$;

-- Granted to `authenticated`, exactly like private.is_platform_admin() and
-- private.has_permission(). An RLS policy expression is evaluated as the
-- CURRENT user, so a policy calling a function the caller may not execute
-- FAILS rather than returning false — the first draft revoked this and broke
-- facilities_delete for everybody, superadmins included.
--
-- Being callable directly leaks nothing: it reads the caller's own sub from the
-- JWT, so it can only ever answer about them.
revoke execute on function private.has_platform_role(public.platform_role)
  from public, anon;
grant execute on function private.has_platform_role(public.platform_role)
  to authenticated;

-- ── The mirror, and the trigger that makes it read-only ────────────────────

create or replace function private.sync_platform_admin_flag()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
begin
  update public.profiles p
     set is_platform_admin = exists (
       select 1 from public.platform_memberships m where m.profile_id = p.id
     )
   where p.id = coalesce(new.profile_id, old.profile_id);
  return coalesce(new, old);
end;
$fn$;

drop trigger if exists platform_memberships_mirror on public.platform_memberships;
create trigger platform_memberships_mirror
  after insert or update or delete on public.platform_memberships
  for each row execute function private.sync_platform_admin_flag();

/**
 * THE ESCALATION FIX.
 *
 * profiles_update_self admits the whole row, and RLS cannot gate a column. So
 * rather than trying to forbid the write, this makes it pointless: any value a
 * caller puts in `is_platform_admin` is replaced, in the same statement, by
 * what platform_memberships says.
 *
 * A trigger rather than a generated column because a generated column cannot
 * reference another table.
 *
 * It does NOT raise. A raise would break every ordinary profile update that
 * happens to send the column back unchanged — which is what a PATCH of a whole
 * row does — and turn a security fix into an outage. Reverting is silent,
 * total, and cannot be worked around by sending a different value.
 */
create or replace function private.enforce_platform_admin_flag()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
begin
  new.is_platform_admin := exists (
    select 1 from public.platform_memberships m where m.profile_id = new.id
  );
  return new;
end;
$fn$;

drop trigger if exists profiles_platform_admin_is_derived on public.profiles;
create trigger profiles_platform_admin_is_derived
  before insert or update on public.profiles
  for each row execute function private.enforce_platform_admin_flag();

-- ── Granting ───────────────────────────────────────────────────────────────

create or replace function public.grant_platform_role(
  p_profile_id text,
  p_role       public.platform_role
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_caller text := (select auth.jwt()->>'sub');
begin
  if not private.has_platform_role('superadmin') then
    raise exception 'Only a superadmin may change platform roles.'
      using errcode = '42501';
  end if;

  if p_profile_id is null or p_profile_id !~ '^user_' then
    raise exception 'Not a Clerk identity: %.', coalesce(p_profile_id, 'null')
      using errcode = '22023';
  end if;

  if not exists (select 1 from public.profiles where id = p_profile_id) then
    raise exception 'No such profile.' using errcode = 'no_data_found';
  end if;

  insert into public.platform_memberships (profile_id, role, granted_by)
  values (p_profile_id, p_role, v_caller)
  on conflict (profile_id) do update
    set role = excluded.role, granted_by = excluded.granted_by;

  return jsonb_build_object('profileId', p_profile_id, 'role', p_role);
end;
$fn$;

create or replace function public.revoke_platform_role(p_profile_id text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $fn$
declare v_role public.platform_role;
begin
  if not private.has_platform_role('superadmin') then
    raise exception 'Only a superadmin may change platform roles.'
      using errcode = '42501';
  end if;

  select role into v_role from public.platform_memberships
   where profile_id = p_profile_id;
  if v_role is null then
    raise exception 'That person is not on the platform team.'
      using errcode = 'no_data_found';
  end if;

  -- Guards the person being REMOVED, not the caller. A self-revoke check holds
  -- the same invariant today -- only a superadmin can call this, so they are
  -- always one of the remaining ones -- but it states a smaller rule than it
  -- means, and the smaller rule is the one somebody edits later.
  --
  -- A platform with nobody who can grant roles is unrecoverable without direct
  -- database access, and the moment somebody reaches for this is the moment
  -- they are tidying up.
  if v_role = 'superadmin'
     and (select count(*) from public.platform_memberships
           where role = 'superadmin') <= 1 then
    raise exception 'That is the last superadmin. Promote somebody else first.'
      using errcode = '42501';
  end if;

  delete from public.platform_memberships where profile_id = p_profile_id;
  return jsonb_build_object('profileId', p_profile_id, 'revoked', true);
end;
$fn$;

revoke execute on function public.grant_platform_role(text, public.platform_role)
  from public, anon;
grant execute on function public.grant_platform_role(text, public.platform_role)
  to authenticated;
revoke execute on function public.revoke_platform_role(text) from public, anon;
grant execute on function public.revoke_platform_role(text) to authenticated;

-- ── Destructive actions need superadmin, not merely membership ─────────────
--
-- Deliberately only these two. Every other platform-admin policy keeps its
-- current meaning; narrowing 69 of them in one migration would be a rewrite of
-- authorisation disguised as a security fix. Deleting a customer's business,
-- and the org it belongs to, are the irreversible ones.

drop policy if exists facilities_delete on public.facilities;
create policy facilities_delete on public.facilities
  for delete to authenticated
  using (private.has_platform_role('superadmin'));

drop policy if exists orgs_delete on public.orgs;
create policy orgs_delete on public.orgs
  for delete to authenticated
  using (private.has_platform_role('superadmin'));
