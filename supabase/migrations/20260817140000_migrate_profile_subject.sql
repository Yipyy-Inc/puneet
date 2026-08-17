-- ============================================================================
-- Move a profile from one identity subject to another, carrying everything.
--
-- Written for the Clerk -> WorkOS cutover (ADR 0004): eight real people held
-- Clerk-era subjects that no provider can present any more, and their first
-- WorkOS sign-in would be refused a profile by profiles_email_lower_key. It is
-- kept rather than run ad-hoc because this is the SECOND change of identity
-- provider in this project's short life, and the third will want it too.
--
-- ── WHY A REPLACEMENT AND NOT AN UPDATE ────────────────────────────────────
--
-- `update profiles set id = …` cannot work. Every foreign key into profiles.id
-- is ON UPDATE NO ACTION, so Postgres refuses while any child references the
-- row, and the children cannot move first because the new id does not exist
-- yet. The sequence below never holds two rows for one address, which the
-- unique index on lower(email) would refuse:
--
--   1. insert the new row under a placeholder address
--   2. repoint every child at the new id
--   3. delete the old row, freeing the real address
--   4. put the real address on the new row
--
-- ── WHY EVERY CHILD IS LISTED EXPLICITLY ───────────────────────────────────
--
-- Two of these columns CASCADE on delete and six SET NULL, so simply deleting
-- the old profile would drop the grants and silently blank the attribution
-- without raising anything. `clover-test@yipyy.com` carries three
-- payment_intents against a live Clover merchant account and
-- `develop@yipyy.com` owns a payment_connections.connected_by; those are the
-- rows this exists to preserve.
--
-- If a future migration adds another FK to profiles.id, ADD IT HERE. A missed
-- column does not error — it quietly loses data at step 3.
--
-- ── SECURITY ───────────────────────────────────────────────────────────────
--
-- SECURITY INVOKER deliberately: the only legitimate caller is the service role
-- (the people it repairs cannot sign in, so there is no session to run as), and
-- service_role already bypasses RLS. Making it DEFINER would buy nothing and
-- create a function that rewrites identity while running as its owner.
--
-- Execute is revoked from anon, authenticated and public — a function that
-- reassigns who owns a platform-admin grant must not be reachable from the
-- publishable key. See supabase/tests/rpc-session-required.sql, whose V7 sweep
-- fails on any anon-callable function in public.
-- ============================================================================

create or replace function public.migrate_profile_subject(
  p_old_id text,
  p_new_id text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_email text;
begin
  if p_old_id is null or p_new_id is null then
    raise exception 'migrate_profile_subject: both ids are required';
  end if;

  if p_old_id = p_new_id then
    return; -- idempotent: already migrated
  end if;

  select email into v_email from public.profiles where id = p_old_id;
  if v_email is null then
    raise exception 'migrate_profile_subject: no profile %', p_old_id;
  end if;

  if exists (select 1 from public.profiles where id = p_new_id) then
    raise exception
      'migrate_profile_subject: % already has a profile; resolve the duplicate by hand',
      p_new_id;
  end if;

  -- 1. the new row, under an address nobody else can hold
  insert into public.profiles (id, email, full_name, avatar_url)
  select p_new_id, p_new_id || '@migration.invalid', full_name, avatar_url
  from public.profiles
  where id = p_old_id;

  -- 2. every child, including the attribution columns that would SET NULL
  update public.facility_memberships     set profile_id   = p_new_id where profile_id   = p_old_id;
  update public.platform_memberships     set profile_id   = p_new_id where profile_id   = p_old_id;
  update public.platform_memberships     set granted_by   = p_new_id where granted_by   = p_old_id;
  update public.clients                  set profile_id   = p_new_id where profile_id   = p_old_id;
  update public.payment_intents          set created_by   = p_new_id where created_by   = p_old_id;
  update public.payment_connections      set connected_by = p_new_id where connected_by = p_old_id;
  update public.facility_settings        set updated_by   = p_new_id where updated_by   = p_old_id;
  update public.facility_modules         set granted_by   = p_new_id where granted_by   = p_old_id;
  update public.communication_connections set connected_by = p_new_id where connected_by = p_old_id;

  -- 3. the old row goes, which releases the address
  delete from public.profiles where id = p_old_id;

  -- 4. and the address lands on the new row
  update public.profiles set email = v_email where id = p_new_id;

  -- 5. is_platform_admin is DERIVED — private.enforce_platform_admin_flag()
  --    overwrites it from platform_memberships on every write. At step 1 the
  --    membership still pointed at the OLD id, so the new row was born false.
  --    This write re-runs the trigger now that step 2 has moved the grant;
  --    the value assigned here is irrelevant, the trigger recomputes it.
  update public.profiles set is_platform_admin = false where id = p_new_id;
end;
$$;

revoke all on function public.migrate_profile_subject(text, text) from public;
revoke all on function public.migrate_profile_subject(text, text) from anon;
revoke all on function public.migrate_profile_subject(text, text) from authenticated;

comment on function public.migrate_profile_subject(text, text) is
  'Move a profile and all its grants/attribution to a new identity subject. '
  'Service-role only. Written for the Clerk->WorkOS cutover (ADR 0004).';
