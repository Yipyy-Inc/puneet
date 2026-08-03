-- ============================================================================
-- SECURITY DEFINER RPCs: which ones `anon` may call, and what they refuse.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/rpc-session-required.sql
--
-- ── WHY THIS FILE EXISTS ───────────────────────────────────────────────────
--
-- Two shipped RPCs were exploitable from the publishable key — the one that is
-- in every browser bundle, with no session, no cookie and no account. Both bugs
-- had the same root cause, and it is a subtle one worth a permanent test:
--
--   THE SERVICE-ROLE CARVE-OUT DOES NOT BELONG IN AN RPC.
--
-- The write-integrity triggers legitimately open with:
--
--     if (select auth.uid()) is null then return new; end if;
--
-- because a trigger only fires on a write that ALREADY cleared RLS, so a
-- missing JWT subject really does mean service_role, and the early return is
-- how a seed script inserts a catalogue without tripping its own rules.
--
-- An RPC has no such guarantee. It is a front door: `anon` reaches
-- /rest/v1/rpc/<name> directly with no subject at all. Copying the carve-out
-- there turns "let the seed script through" into "let the internet through".
--
--     link_staff_invite('<staff legacy id>', '<my own user id>', '<my email>')
--       → a signed-up customer with zero memberships became role=owner,
--         is_active=true at that facility, because the function grants the role
--         recorded on the TARGET staff row. legacy_ids are readable slugs.
--
--     offboard_staff('<staff legacy id>', 'Termination')
--       → status='terminated', membership deactivated. Anyone could fire
--         anyone.
--
-- ── AND WHY THE `revoke` LINE DID NOT SAVE US ──────────────────────────────
--
-- Both migrations already carried `revoke all on function ... from public`,
-- which LOOKS like it shuts the door and does not:
--
--   REVOKING FROM `public` IS NOT REVOKING FROM `anon`.
--
-- Supabase ships `alter default privileges in schema public grant execute on
-- functions to anon, authenticated, service_role`, so every function in
-- `public` is born with an explicit `anon=X` ACL entry. `revoke ... from
-- public` drops the PUBLIC pseudo-role grant, a different one, and leaves
-- `anon=X` untouched. Only a revoke naming `anon` removes it — which is what
-- V3 asserts, separately from the body check in V1/V2.
--
-- ── THE SHAPE OF THE TESTS ─────────────────────────────────────────────────
--
-- V1/V2 replay the exploits verbatim and assert BOTH that the call was refused
-- AND that nothing was written — a refusal after a partial write is not a
-- refusal. V4 guards the other direction: the four onboarding token RPCs are
-- anon-callable ON PURPOSE (a new hire has no account; the token is the
-- credential, verified by hash inside the function), and a fix that locked them
-- down would silently break every invite. V5/V6 prove the legitimate manager
-- path still works, because a security fix that also breaks the feature is not
-- a fix.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture ─────────────────────────────────────────────────────────────────
-- The attacker is an ORDINARY SIGNED-UP CUSTOMER: a real auth user with no
-- facility membership anywhere. That is the realistic starting position, and it
-- is what makes the escalation meaningful.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'rs-attacker@example.invalid'),
  ('00000000-0000-0000-0000-0000000000f0', 'rs-manager@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000000000f0', 'rs-manager@example.invalid', 'Manager')
on conflict (id) do nothing;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000f8', 'RS Test Org', 'rs-test-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000000000fa', '00000000-0000-0000-0000-0000000000f8',
   'RS Facility', 'rs-facility', 'rs-a')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000000000fc', '00000000-0000-0000-0000-0000000000fa',
   '00000000-0000-0000-0000-0000000000f0', 'manager', true)
on conflict (id) do nothing;

-- The target: an OWNER's staff row. Aiming link_staff_invite here is what made
-- the old bug an ownership grant rather than a nuisance.
insert into public.staff
  (id, facility_id, membership_id, legacy_id, first_name, last_name, email, primary_role, status)
values
  ('00000000-0000-0000-0000-00000000f101', '00000000-0000-0000-0000-0000000000fa',
   null, 'rs-owner', 'The', 'Owner', 'rs-owner@example.invalid', 'owner', 'active'),
  ('00000000-0000-0000-0000-00000000f102', '00000000-0000-0000-0000-0000000000fa',
   null, 'rs-hire', 'New', 'Hire', 'rs-hire@example.invalid', 'groomer', 'active');

-- ── V1: the link_staff_invite exploit, replayed ─────────────────────────────
do $$
declare refused boolean; n integer;
begin
  perform set_config('request.jwt.claim.sub', '', true);   -- no session at all
  set local role anon;
  begin
    perform public.link_staff_invite('rs-owner',
      '00000000-0000-0000-0000-0000000000f1', 'rs-attacker@example.invalid');
    refused := false;
  exception when others then
    refused := true;
  end;
  reset role;

  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into n from public.facility_memberships
   where profile_id = '00000000-0000-0000-0000-0000000000f1';
  perform pg_temp.t('V1 EXPLOIT: anon link_staff_invite refused, no membership granted',
    refused and n = 0, format('refused=%s memberships=%s', refused, n));
exception when others then
  reset role; perform pg_temp.t('V1 link_staff_invite anon gate', false, sqlerrm);
end $$;

-- ── V2: the offboard_staff exploit, replayed ────────────────────────────────
do $$
declare refused boolean; st text;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  set local role anon;
  begin
    perform public.offboard_staff('rs-owner', 'Termination', null, null);
    refused := false;
  exception when others then
    refused := true;
  end;
  reset role;

  perform set_config('request.jwt.claim.sub', '', true);
  select status into st from public.staff where id = '00000000-0000-0000-0000-00000000f101';
  perform pg_temp.t('V2 EXPLOIT: anon offboard_staff refused, staff untouched',
    refused and st = 'active', format('refused=%s status=%s', refused, st));
exception when others then
  reset role; perform pg_temp.t('V2 offboard_staff anon gate', false, sqlerrm);
end $$;

-- ── V3: the second lock — no EXECUTE grant at all ───────────────────────────
-- Asserted separately from V1/V2 because they test different layers: the body
-- is the rule, the grant is what stops a future edit to the body from silently
-- reopening the door.
do $$
declare g1 boolean; g2 boolean;
begin
  select has_function_privilege('anon', 'public.link_staff_invite(text,uuid,text)', 'execute') into g1;
  select has_function_privilege('anon', 'public.offboard_staff(text,text,uuid,date)', 'execute') into g2;
  perform pg_temp.t('V3 anon holds no EXECUTE grant on either function',
    not g1 and not g2, format('link=%s offboard=%s', g1, g2));
end $$;

-- ── V4: the token RPCs KEEP their anon grant ────────────────────────────────
-- The opposite failure. A fix that locked these down would break every invite,
-- because a new hire has no account by definition. They are safe for a
-- different reason: the token is the credential and it is verified by hash
-- INSIDE the function, never as a policy predicate (20260803180000).
do $$
declare g integer;
begin
  select count(*) into g
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('onboarding_by_token', 'save_onboarding_section',
                       'submit_onboarding', 'set_onboarding_account_complete')
     and has_function_privilege('anon', p.oid, 'execute');
  perform pg_temp.t('V4 the 4 onboarding token RPCs still allow anon (by design)',
    g = 4, format('anon-callable=%s of 4', g));
end $$;

-- ── V5: the legitimate path still works — a manager invites ─────────────────
do $$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f0', true);
  set local role authenticated;
  r := public.link_staff_invite('rs-hire',
    '00000000-0000-0000-0000-0000000000f1', 'rs-hire@example.invalid');
  reset role;
  perform pg_temp.t('V5 a manager with manage_staff can still invite',
    r->>'membershipId' is not null, format('membership=%s', r->>'membershipId'));
exception when others then
  reset role; perform pg_temp.t('V5 manager invite', false, sqlerrm);
end $$;

-- ── V6: …and can still offboard ─────────────────────────────────────────────
do $$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f0', true);
  set local role authenticated;
  r := public.offboard_staff('rs-hire', 'Resignation', null, current_date);
  reset role;
  perform pg_temp.t('V6 a manager with manage_staff can still offboard',
    (r->>'revoked')::boolean, format('revoked=%s', r->>'revoked'));
exception when others then
  reset role; perform pg_temp.t('V6 manager offboard', false, sqlerrm);
end $$;

-- ── V7: the sweep — no OTHER function in `public` is anon-callable ──────────
-- The two holes were found by an advisor sweep, not by reading the code, so the
-- sweep itself becomes the test. A new SECURITY DEFINER function that forgets
-- `revoke ... from anon` fails HERE rather than in production.
do $$
declare unexpected text;
begin
  select string_agg(p.proname, ', ' order by p.proname) into unexpected
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f'
     and has_function_privilege('anon', p.oid, 'execute')
     and p.proname not in ('onboarding_by_token', 'save_onboarding_section',
                           'submit_onboarding', 'set_onboarding_account_complete');
  perform pg_temp.t('V7 no unexpected anon-callable function in public',
    unexpected is null, coalesce('anon can call: ' || unexpected, 'none'));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
