-- ============================================================================
-- Make the role editor real.
--
-- The three-layer cascade has existed since the tenancy migration, but only
-- layer 1 (the global presets) has ever had rows. `facility_role_permissions`
-- and `membership_permissions` were created, indexed, RLS'd — and left empty,
-- because nothing could write to them.
--
-- Meanwhile the UI let a facility owner edit role permissions and told them it
-- had saved. It had: to localStorage. Since PR #99 the database answers
-- `my_permissions()`, so that edit is not merely private to one browser, it is
-- discarded on the next load. The editor has been drawing a control that does
-- nothing.
--
-- This migration gives those edits somewhere to land, and fixes two things
-- found on the way.
--
-- ── 1. The write policies gate on the wrong permission ──────────────────────
-- Every write policy on the permission tables checks `scheduling_view_all` —
-- "View all staff schedules". The comment above them says "written only by
-- someone holding the staff-management permission", so the intent was clear
-- and the key was a placeholder nobody replaced.
--
-- The consequence is a live privilege escalation: `supervisor` holds
-- scheduling_view_all, therefore any supervisor can rewrite their facility's
-- permission table and grant themselves anything, including manage_roles.
-- `manage_roles` ("Manage roles & permissions") is granted to owner and admin
-- only, and is the key these policies meant all along.
--
-- Membership writes get `manage_staff` for the same reason — adding and
-- removing people is staff management, not schedule viewing.
--
-- ── 2. Per-staff overrides had nowhere to live ──────────────────────────────
-- Layer 3 is `membership_permissions`, keyed on membership_id. But a
-- membership is an ACCOUNT, and 0 of the 18 staff records have one — a staff
-- record is created when someone is hired, a membership only when they accept
-- an invite. Keying the override on the account means it cannot be written
-- until the person signs in, and is destroyed if their access is later
-- revoked and re-granted.
--
-- `staff_permissions` keys on the durable HR record instead, which is what
-- StaffProfile.permissionOverrides has always meant. An override can be set
-- for a new hire on their first day and takes effect the moment they have an
-- account.
--
-- membership_permissions is kept, above it in precedence: it is the right home
-- for an override that belongs to the login rather than the person (a
-- temporary elevation, a contractor's account). It has no writer yet.
--
-- ── 3. The cascade only ever read one role ─────────────────────────────────
-- resolvePermission() in TypeScript unions across primaryRole, additionalRoles
-- and custom roles, widest scope winning. The SQL read `facility_memberships.
-- role` — one role, singular. A groomer who is also a supervisor resolved as a
-- groomer alone.
--
-- Rewritten below to union the same way. Note this makes a REVOKE at the
-- facility layer non-absolute, exactly as the TypeScript has it: revoking a
-- permission for Groomer removes the groomer's claim to it, but if they also
-- hold Supervisor and Supervisor grants it, they keep it. A revoke that must
-- bind regardless is a per-staff override, which is the layer above.
--
-- ── Not in scope: custom roles ─────────────────────────────────────────────
-- CustomFacilityRole lets a facility invent a role ("Senior Groomer"). It has
-- no home here because `facility_role_permissions.role` is the
-- facility_staff_role ENUM — a fixed list — and memberships carry one enum
-- value. Giving custom roles a real home means a table, a join table, and a
-- fourth branch in the union below. It is a bigger change than this one and
-- it needs a product answer first (are they roles, or are they saved bundles
-- of per-staff overrides?). Until then they remain browser-local, and the
-- preset editor — the surface facilities actually use — is real.
-- ============================================================================

-- ── 1. Correct the privilege gate ───────────────────────────────────────────

drop policy if exists facility_role_permissions_insert on public.facility_role_permissions;
drop policy if exists facility_role_permissions_update on public.facility_role_permissions;
drop policy if exists facility_role_permissions_delete on public.facility_role_permissions;

create policy facility_role_permissions_insert on public.facility_role_permissions
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_roles'));
create policy facility_role_permissions_update on public.facility_role_permissions
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_roles'))
  with check (private.has_permission(facility_id, 'manage_roles'));
create policy facility_role_permissions_delete on public.facility_role_permissions
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_roles'));

drop policy if exists membership_permissions_insert on public.membership_permissions;
drop policy if exists membership_permissions_update on public.membership_permissions;
drop policy if exists membership_permissions_delete on public.membership_permissions;

create policy membership_permissions_insert on public.membership_permissions
  for insert to authenticated
  with check (exists (
    select 1 from public.facility_memberships m
     where m.id = membership_permissions.membership_id
       and private.has_permission(m.facility_id, 'manage_roles')));
create policy membership_permissions_update on public.membership_permissions
  for update to authenticated
  using (exists (
    select 1 from public.facility_memberships m
     where m.id = membership_permissions.membership_id
       and private.has_permission(m.facility_id, 'manage_roles')))
  with check (exists (
    select 1 from public.facility_memberships m
     where m.id = membership_permissions.membership_id
       and private.has_permission(m.facility_id, 'manage_roles')));
create policy membership_permissions_delete on public.membership_permissions
  for delete to authenticated
  using (exists (
    select 1 from public.facility_memberships m
     where m.id = membership_permissions.membership_id
       and private.has_permission(m.facility_id, 'manage_roles')));

-- Adding or removing a person is staff management. The read policy is
-- unchanged.
drop policy if exists memberships_insert on public.facility_memberships;
drop policy if exists memberships_update on public.facility_memberships;
drop policy if exists memberships_delete on public.facility_memberships;

create policy memberships_insert on public.facility_memberships
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_staff'));
create policy memberships_update on public.facility_memberships
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_staff'))
  with check (private.has_permission(facility_id, 'manage_staff'));
create policy memberships_delete on public.facility_memberships
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_staff'));

-- ── 2. Per-staff overrides, keyed on the person ─────────────────────────────

create table public.staff_permissions (
  staff_id       uuid not null references public.staff (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,

  -- 'none' is how a REVOKE is spelled: an explicit denial that outranks every
  -- role the person holds. Absence of a row means "inherit", which is why
  -- clearing an override is a DELETE and not a write of 'none'.
  scope          public.access_scope not null,

  updated_at     timestamptz not null default now(),
  primary key (staff_id, permission_key)
);

create index staff_permissions_permission_key_idx
  on public.staff_permissions (permission_key);

create trigger staff_permissions_set_updated_at
  before update on public.staff_permissions
  for each row execute function private.set_updated_at();

comment on table public.staff_permissions is
  'Layer 3 of the permission cascade: an override on the PERSON. Keyed on the staff record rather than the membership so it survives a hire with no account yet, and an access revoke/re-grant.';

alter table public.staff_permissions enable row level security;

-- Visible to anyone who can already see the staff row. Knowing that a groomer
-- has an extra permission is not the sensitive part; changing it is.
create policy staff_permissions_read on public.staff_permissions
  for select to authenticated
  using (
    private.is_platform_admin()
    or exists (
      select 1 from public.staff s
       where s.id = staff_permissions.staff_id
         and (s.id in (select private.own_staff_ids())
              or s.facility_id in (select private.member_facility_ids()))
    )
  );

create policy staff_permissions_insert on public.staff_permissions
  for insert to authenticated
  with check (exists (
    select 1 from public.staff s
     where s.id = staff_permissions.staff_id
       and private.has_permission(s.facility_id, 'manage_roles')));
create policy staff_permissions_update on public.staff_permissions
  for update to authenticated
  using (exists (
    select 1 from public.staff s
     where s.id = staff_permissions.staff_id
       and private.has_permission(s.facility_id, 'manage_roles')))
  with check (exists (
    select 1 from public.staff s
     where s.id = staff_permissions.staff_id
       and private.has_permission(s.facility_id, 'manage_roles')));
create policy staff_permissions_delete on public.staff_permissions
  for delete to authenticated
  using (exists (
    select 1 from public.staff s
     where s.id = staff_permissions.staff_id
       and private.has_permission(s.facility_id, 'manage_roles')));

-- ── 3. Resolution, matching the TypeScript ──────────────────────────────────
-- Precedence, most specific first:
--   account override  (membership_permissions)   — wins outright, incl. 'none'
--   person override   (staff_permissions)        — wins outright, incl. 'none'
--   roles             — union of every role held, widest scope wins
--
-- The first two use coalesce, so a stored 'none' short-circuits and denies.
-- The role layer filters 'none' out instead, because there a 'none' means
-- "this role does not grant it" and another role still might.

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
  with m as (
    select fm.id, fm.facility_id, fm.role
      from public.facility_memberships fm
     where fm.id = p_membership_id
  ),
  -- The person behind the account, if the staff record has been linked.
  s as (
    select st.id, st.primary_role, st.additional_roles
      from public.staff st
      join m on m.id = st.membership_id
  ),
  -- Every role this person carries. `m.role` is always present; the staff
  -- record adds its own primary and any additional roles. UNION dedupes.
  held_roles as (
    select m.role as role from m
     union
    select s.primary_role from s
     union
    select unnest(s.additional_roles) from s
  ),
  -- Each role resolved through the facility's override, else the global preset.
  role_scopes as (
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
$$;

comment on function private.resolve_permission is
  'Effective scope for one membership and one permission. Account override, then person override (both absolute, including a stored ''none''), then the widest scope across every role held. NULL means not granted. The SQL twin of resolvePermission() in src/types/facility-staff.ts.';

grant execute on function private.resolve_permission(uuid, text) to authenticated;
