-- ============================================================================
-- The facility's own account is the admin's, and RLS starts saying so.
--
-- ADR 0005 split a membership into a JOB TITLE and an ACCESS LEVEL, and
-- 20260818100000 added the column, the guard and the gates. That change moved
-- ROUTING only — deliberately, so it could be proved to alter nothing else.
-- Not one row changed who may read it.
--
-- This is the half that makes the split real. `canAccessFacilityPortal` sends a
-- staff member away from /facility, but a redirect is not a boundary: the
-- database decides, from the JWT, and it was still answering "any active
-- member".
--
-- ── WHAT WAS ACTUALLY READABLE ────────────────────────────────────────────
--
-- Measured against production before this migration, as a groomer:
--
--   groomer reads employer's facility_subscriptions rows = 1
--
-- That row is the facility's commercial relationship with Yipyy: its plan, its
-- price, its status, its dunning state. Every member of every facility could
-- read it — through PostgREST, from a browser, with nothing but a session and
-- the publishable key. `payment_connections` is the same shape and worse in
-- kind: it names the facility's Clover merchant.
--
-- Neither is read by any facility-facing screen. The only consumers are the
-- platform-admin surfaces (src/lib/api/admin-facilities.ts,
-- src/lib/api/facility-modules.ts), and private.is_facility_admin returns true
-- for a platform admin, so they are unaffected. The Clover libraries and
-- /pay/[ref] use the service-role client and never touched these policies —
-- /pay/[ref] says so in its own header, because a customer paying their own
-- booking is not a facility member either.
--
-- ── AND THE WRITES, WHICH WERE ONE ROLE-EDITOR CLICK FROM WRONG ───────────
--
-- The settings writes are gated on the PERMISSION `settings_general`. Only the
-- owner/admin/manager presets hold it today, and all three are admin-tier — so
-- this changes nothing for any membership that exists. But a permission is
-- exactly what a facility can hand to any job title through its own role
-- editor, which is the escalation shape 20260818100000 closed for memberships.
-- A facility's own name, address, hours and rules are the admin's, not a
-- permission it can delegate to the front desk.
--
-- Written as `is_facility_admin AND has_permission`, never as a replacement.
-- has_permission ALSO excludes suspended and cancelled facilities, and
-- is_facility_admin deliberately does not — dropping the permission arm would
-- quietly hand a suspended facility its settings back. Both arms, so the change
-- can only ever narrow.
--
-- ── WHAT IS DELIBERATELY LEFT WIDE ────────────────────────────────────────
--
-- `facility_settings_read` and `facility_modules_read` still admit any member.
-- Staff need the opening hours to read a schedule and the enabled modules to
-- render a nav; narrowing those would break the staff portal to protect
-- nothing. The distinction is between what a business RUNS ON and what it IS
-- COMMERCIALLY — only the second is the admin's alone.
--
-- `membership_grants_read` stays on `manage_staff`: seeing pending invitations
-- is part of hiring, which a non-admin may legitimately do. What they may no
-- longer do — mint an admin — is enforced one layer down, by trigger.
-- ============================================================================

-- ── The two commercial tables ──────────────────────────────────────────────

drop policy if exists facility_subscriptions_read on public.facility_subscriptions;
create policy facility_subscriptions_read on public.facility_subscriptions
  for select to authenticated
  using (private.is_facility_admin(facility_id));

drop policy if exists payment_connections_read on public.payment_connections;
create policy payment_connections_read on public.payment_connections
  for select to authenticated
  using (private.is_facility_admin(facility_id));

-- ── The facility's own profile and settings ────────────────────────────────

drop policy if exists facility_settings_insert on public.facility_settings;
create policy facility_settings_insert on public.facility_settings
  for insert to authenticated
  with check (
    private.is_facility_admin(facility_id)
    and private.has_permission(facility_id, 'settings_general')
  );

drop policy if exists facility_settings_update on public.facility_settings;
create policy facility_settings_update on public.facility_settings
  for update to authenticated
  using (
    private.is_facility_admin(facility_id)
    and private.has_permission(facility_id, 'settings_general')
  )
  with check (
    private.is_facility_admin(facility_id)
    and private.has_permission(facility_id, 'settings_general')
  );

drop policy if exists facilities_update_own_profile on public.facilities;
create policy facilities_update_own_profile on public.facilities
  for update to authenticated
  using (
    private.is_facility_admin(id)
    and private.has_permission(id, 'settings_general')
  )
  with check (
    private.is_facility_admin(id)
    and private.has_permission(id, 'settings_general')
  );
