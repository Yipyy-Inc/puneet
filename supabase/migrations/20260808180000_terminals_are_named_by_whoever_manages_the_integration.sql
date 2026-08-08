-- ============================================================================
-- Corrective. The write policy asked for a permission that does not exist.
--
-- `manage_settings` is not a key this platform grants. `private.has_permission`
-- answers FALSE for any key nobody holds, so the policy did not restrict
-- writing to settings managers — it locked the table to EVERYONE, the facility
-- owner included.
--
-- ── WHY THAT IS WORSE THAN A TYPO ─────────────────────────────────────────
--
-- The failure is indistinguishable from working correctly. A total lockout
-- surfaces as "new row violates row-level security policy", which is exactly
-- what a properly-refused write looks like — so the only way to catch it is to
-- assert that the person who SHOULD be allowed actually is. The migration's own
-- verification did (R3), and reading the policy would not have.
--
-- The lesson generalises: a permission check against a misspelled key always
-- fails closed and always looks deliberate. Assertions on RLS need a positive
-- control, not just a denial.
--
-- ── AND manage_integrations IS RIGHT ON THE MERITS ────────────────────────
--
-- Not merely the nearest key that exists. A card terminal is the Clover
-- integration's hardware; whoever may connect or disconnect that merchant
-- account is exactly who should decide which physical device "Front desk"
-- points at. Reading stays on `view_bookings`, because the person taking a
-- payment has to see the picker.
-- ============================================================================

drop policy if exists facility_terminals_write on public.facility_terminals;
create policy facility_terminals_write on public.facility_terminals
  for all to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'manage_integrations')
  )
  with check (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'manage_integrations')
  );
