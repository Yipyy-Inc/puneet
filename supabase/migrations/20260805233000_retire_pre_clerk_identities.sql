-- ============================================================================
-- Delete the pre-Clerk identities.
--
-- After 20260805223000_clerk_identity_is_text.sql these rows are uuid strings
-- sitting in a text column: they match no caller, because auth.jwt()->>'sub' is
-- now a Clerk id. They are not dormant accounts, they are unreachable ones — no
-- sign-in can ever resolve to them again.
--
-- Confirmed not needed (2026-08-05). Measured BEFORE running:
--
--   9  profiles                 deleted
--   5  facility_memberships     cascade (facility_memberships_profile_id_fkey)
--   0  membership_permissions   cascade — nothing was configured on them
--   5  staff                    membership_id -> NULL (staff_membership_id_fkey)
--   1  clients                  profile_id    -> NULL (clients_profile_id_fkey)
--
-- SO NO BUSINESS RECORD IS DESTROYED. Staff and clients survive and merely stop
-- pointing at a login that cannot be used. That is already the normal state
-- here — 18 of 23 staff rows had no membership at all — so this does not invent
-- a shape the app has not seen.
--
-- Confirmed AFTER: 23 staff, 14 clients, 326 bookings all still present.
--
-- Anyone who needs access again signs in with Google or Apple, the Clerk sync
-- webhook (src/app/api/webhooks/clerk/route.ts) creates their profile, and an
-- admin grants the membership. The webhook deliberately does not grant tenancy
-- itself — a sign-up form must not be able to join a facility.
--
-- The regex is the discriminator: every Clerk subject is `user_…`, so anything
-- that is not is pre-migration by construction. Written as a guarded delete
-- rather than a hardcoded id list so it cannot half-apply against a database
-- that has drifted from these files — and they have drifted before.
-- ============================================================================

do $$
declare
  v_profiles    int;
  v_memberships int;
  v_clerk       int;
begin
  -- The guard that matters. Run against a database where nobody has signed in
  -- through Clerk yet, this statement would delete every identity and lock the
  -- project out of itself.
  select count(*) into v_clerk from public.profiles where id ~ '^user_';
  if v_clerk = 0 then
    raise exception
      'Refusing to delete every identity: no Clerk profile exists yet, so this '
      'would leave the database with no one who can sign in.';
  end if;

  select count(*) into v_profiles    from public.profiles where id !~ '^user_';
  select count(*) into v_memberships from public.facility_memberships
   where profile_id !~ '^user_';

  delete from public.profiles where id !~ '^user_';

  raise notice 'retired % pre-Clerk profiles and % memberships; % Clerk profiles remain',
    v_profiles, v_memberships, v_clerk;
end $$;
