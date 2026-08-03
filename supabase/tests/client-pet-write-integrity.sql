-- ============================================================================
-- Client and pet write integrity — behaviour tests for 20260803090000.
--
-- Run as the caller (`set local role authenticated` + a JWT subject), which is
-- the position a browser holding the anon key and a session cookie is in.
-- Testing through /api/clients would prove the wrong thing: PostgREST is
-- reachable directly, so the routes are a convenience and not a gate.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/client-pet-write-integrity.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid so this
-- cannot collide with a seeded database — auth.users has a unique index on
-- email, and `on conflict (id)` does not save you from it.
--
-- TO CONFIRM THESE FAIL WITHOUT THE FIX: drop clients_enforce_integrity and
-- pets_enforce_integrity and re-run. T1 is the one that matters — a blocked
-- customer clearing their own balance is a live hole, not a missing feature.
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
-- TWO CALLERS and TWO FACILITIES.
--
--   customer — owns the client record under test. The attacker in T1-T7.
--   staff    — holds edit_clients and edit_pet_records at facility A. The
--              control: every refusal below has to be a refusal of the CALLER,
--              not of the operation, or the trigger is just breaking the app.
--
-- Facility B exists for one test: that a customer cannot move their own record
-- to another business.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f0', 'cp-test-customer@example.invalid'),
  ('00000000-0000-0000-0000-0000000000f1', 'cp-test-staff@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000000000f0', 'cp-test-customer@example.invalid', 'Customer'),
  ('00000000-0000-0000-0000-0000000000f1', 'cp-test-staff@example.invalid',    'Staff')
on conflict (id) do nothing;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000f8', 'CP Test Org', 'cp-test-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000000000fa', '00000000-0000-0000-0000-0000000000f8', 'CP Facility A', 'cp-facility-a', 'cp-a'),
  ('00000000-0000-0000-0000-0000000000fb', '00000000-0000-0000-0000-0000000000f8', 'CP Facility B', 'cp-facility-b', 'cp-b')
on conflict (id) do nothing;

-- The staff caller is a manager at A, which carries edit_clients and
-- edit_pet_records in the shipped preset.
insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000000000fc', '00000000-0000-0000-0000-0000000000fa',
   '00000000-0000-0000-0000-0000000000f1', 'manager', true)
on conflict (id) do nothing;

insert into public.clients
  (id, facility_id, profile_id, name, email, phone, status,
   is_blocked, blocked_at, blocked_reason, outstanding_balance, no_show_count, last_visit_date, details)
values
  ('00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-0000000000fa',
   '00000000-0000-0000-0000-0000000000f0', 'Probe Customer', 'cp-test-customer@example.invalid',
   '+1-555-0000', 'inactive', true, '2026-07-01T00:00:00Z', 'Repeated no-shows',
   480.00, 7, '2026-06-01',
   jsonb_build_object(
     'storeCredit', jsonb_build_object('balance', 0, 'transactions', '[]'::jsonb),
     'membership',  jsonb_build_object('tier', 'none'),
     'packages',    '[]'::jsonb,
     'additionalContacts', '[]'::jsonb));

insert into public.pets
  (id, client_id, facility_id, name, species, breed, weight, status, details)
values
  ('00000000-0000-0000-0000-000000000f02', '00000000-0000-0000-0000-000000000f01',
   '00000000-0000-0000-0000-0000000000fa', 'Rex', 'dog', 'Beagle', 12.0, 'active',
   jsonb_build_object('evaluations',
     jsonb_build_array(jsonb_build_object('result', 'not suitable for group play'))));

-- ── T0: the fixture is what the tests below think it is ─────────────────────
-- Added after T8 failed reporting an empty evaluation. The trigger was firing
-- on the fixture's own INSERT — no JWT subject, so it read as an owner adding a
-- pet — and stripping the seeded evaluation before a single assertion ran. The
-- test looked like it was catching the bug it was written for. It was reporting
-- a fixture that had never contained the thing under test.
do $$
declare c public.clients; p public.pets;
begin
  select * into c from public.clients where id = '00000000-0000-0000-0000-000000000f01';
  select * into p from public.pets    where id = '00000000-0000-0000-0000-000000000f02';
  perform pg_temp.t('T0  fixture: blocked client with a balance, pet with an evaluation',
    c.is_blocked and c.outstanding_balance = 480.00
      and p.details->'evaluations'->0->>'result' = 'not suitable for group play',
    format('blocked=%s balance=%s evaluation=%s',
           c.is_blocked, c.outstanding_balance, p.details->'evaluations'->0->>'result'));
end $$;

-- ── T1: the hole ────────────────────────────────────────────────────────────
do $$
declare r public.clients;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f0', true);
  set local role authenticated;
  update public.clients
     set is_blocked = false, blocked_reason = null, blocked_at = null,
         outstanding_balance = 0, no_show_count = 0, status = 'active'
   where id = '00000000-0000-0000-0000-000000000f01';
  reset role;
  select * into r from public.clients where id = '00000000-0000-0000-0000-000000000f01';
  perform pg_temp.t('T1  a blocked customer cannot unblock or clear their balance',
    r.is_blocked and r.outstanding_balance = 480.00 and r.no_show_count = 7
      and r.status = 'inactive' and r.blocked_reason = 'Repeated no-shows',
    format('blocked=%s balance=%s no_shows=%s status=%s',
           r.is_blocked, r.outstanding_balance, r.no_show_count, r.status));
exception when others then
  reset role; perform pg_temp.t('T1  blocked customer', false, sqlerrm);
end $$;

-- ── T2: and it is not a lockdown ────────────────────────────────────────────
do $$
declare r public.clients;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f0', true);
  set local role authenticated;
  update public.clients
     set name = 'Renamed Customer', phone = '+1-555-0100',
         preferred_language = 'fr', address = '{"city":"Montreal"}'::jsonb
   where id = '00000000-0000-0000-0000-000000000f01';
  reset role;
  select * into r from public.clients where id = '00000000-0000-0000-0000-000000000f01';
  perform pg_temp.t('T2  a customer may still edit their own details',
    r.name = 'Renamed Customer' and r.phone = '+1-555-0100'
      and r.preferred_language = 'fr' and r.address ->> 'city' = 'Montreal',
    format('name=%s phone=%s lang=%s', r.name, r.phone, r.preferred_language));
exception when others then
  reset role; perform pg_temp.t('T2  customer self-edit', false, sqlerrm);
end $$;

-- ── T3: money and entitlements are the facility's to grant ──────────────────
do $$
declare r public.clients;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f0', true);
  set local role authenticated;
  update public.clients
     set details = jsonb_build_object(
           'storeCredit', jsonb_build_object('balance', 9999, 'transactions', '[]'::jsonb),
           'membership',  jsonb_build_object('tier', 'platinum'),
           'packages',    jsonb_build_array(jsonb_build_object('name', 'Unlimited')))
   where id = '00000000-0000-0000-0000-000000000f01';
  reset role;
  select * into r from public.clients where id = '00000000-0000-0000-0000-000000000f01';
  perform pg_temp.t('T3  a customer cannot grant themselves credit or a tier',
    (r.details->'storeCredit'->>'balance')::numeric = 0
      and r.details->'membership'->>'tier' = 'none'
      and jsonb_array_length(r.details->'packages') = 0,
    format('credit=%s tier=%s packages=%s',
           r.details->'storeCredit'->>'balance', r.details->'membership'->>'tier',
           jsonb_array_length(r.details->'packages')));
exception when others then
  reset role; perform pg_temp.t('T3  self-granted credit', false, sqlerrm);
end $$;

-- ── T4: the round trip ──────────────────────────────────────────────────────
-- The app PATCHes the whole object. A customer's client of the record may not
-- carry storeCredit at all — sending it back absent must PRESERVE it, not
-- delete it. This is the case that makes reverting the right shape and
-- raising the wrong one.
do $$
declare r public.clients;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f0', true);
  set local role authenticated;
  update public.clients
     set details = jsonb_build_object('additionalContacts',
           jsonb_build_array(jsonb_build_object('name', 'Neighbour')))
   where id = '00000000-0000-0000-0000-000000000f01';
  reset role;
  select * into r from public.clients where id = '00000000-0000-0000-0000-000000000f01';
  perform pg_temp.t('T4  omitting a withheld key preserves it rather than clearing it',
    r.details ? 'storeCredit' and r.details ? 'membership'
      and r.details->'additionalContacts'->0->>'name' = 'Neighbour',
    format('keys=%s contact=%s',
           (select string_agg(k, ',' order by k) from jsonb_object_keys(r.details) k),
           r.details->'additionalContacts'->0->>'name'));
exception when others then
  reset role; perform pg_temp.t('T4  round trip', false, sqlerrm);
end $$;

-- ── T5: a client record belongs to one business ─────────────────────────────
do $$
declare v_ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f0', true);
  set local role authenticated;
  begin
    update public.clients set facility_id = '00000000-0000-0000-0000-0000000000fb'
     where id = '00000000-0000-0000-0000-000000000f01';
    v_ok := false;
  exception when insufficient_privilege then v_ok := true;
  end;
  reset role;
  perform pg_temp.t('T5  a customer cannot move their record to another facility', v_ok);
exception when others then
  reset role; perform pg_temp.t('T5  facility move', false, sqlerrm);
end $$;

-- ── T6: nor hand it to another account ──────────────────────────────────────
do $$
declare v_ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f0', true);
  set local role authenticated;
  begin
    update public.clients set profile_id = '00000000-0000-0000-0000-0000000000f1'
     where id = '00000000-0000-0000-0000-000000000f01';
    v_ok := false;
  exception when insufficient_privilege or others then v_ok := true;
  end;
  reset role;
  perform pg_temp.t('T6  a customer cannot reassign their record to another account', v_ok);
exception when others then
  reset role; perform pg_temp.t('T6  profile reassign', false, sqlerrm);
end $$;

-- ── T7: the control — staff CAN do all of it ────────────────────────────────
-- Without this the tests above are satisfied by a trigger that simply breaks
-- writing, which is not the behaviour anyone wants.
do $$
declare r public.clients;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', true);
  set local role authenticated;
  update public.clients
     set is_blocked = false, blocked_reason = null, outstanding_balance = 0,
         details = jsonb_build_object('storeCredit',
           jsonb_build_object('balance', 25, 'transactions', '[]'::jsonb))
   where id = '00000000-0000-0000-0000-000000000f01';
  reset role;
  select * into r from public.clients where id = '00000000-0000-0000-0000-000000000f01';
  perform pg_temp.t('T7  staff with edit_clients may unblock and issue credit',
    not r.is_blocked and r.outstanding_balance = 0
      and (r.details->'storeCredit'->>'balance')::numeric = 25,
    format('blocked=%s balance=%s credit=%s',
           r.is_blocked, r.outstanding_balance, r.details->'storeCredit'->>'balance'));
exception when others then
  reset role; perform pg_temp.t('T7  staff edit', false, sqlerrm);
end $$;

-- ── T8: the facility's assessment of an animal ──────────────────────────────
do $$
declare r public.pets;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f0', true);
  set local role authenticated;
  update public.pets
     set details = jsonb_build_object('evaluations',
           jsonb_build_array(jsonb_build_object('result', 'excellent with all dogs')))
   where id = '00000000-0000-0000-0000-000000000f02';
  reset role;
  select * into r from public.pets where id = '00000000-0000-0000-0000-000000000f02';
  perform pg_temp.t('T8  an owner cannot rewrite the facility''s evaluation',
    r.details->'evaluations'->0->>'result' = 'not suitable for group play',
    format('evaluation=%s', r.details->'evaluations'->0->>'result'));
exception when others then
  reset role; perform pg_temp.t('T8  pet evaluation', false, sqlerrm);
end $$;

-- ── T9: nor the operational status ──────────────────────────────────────────
do $$
declare r public.pets;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f0', true);
  set local role authenticated;
  update public.pets set status = 'deceased'
   where id = '00000000-0000-0000-0000-000000000f02';
  reset role;
  select * into r from public.pets where id = '00000000-0000-0000-0000-000000000f02';
  perform pg_temp.t('T9  an owner cannot change a pet''s status', r.status = 'active',
    format('status=%s', r.status));
exception when others then
  reset role; perform pg_temp.t('T9  pet status', false, sqlerrm);
end $$;

-- ── T10: and again, not a lockdown ──────────────────────────────────────────
do $$
declare r public.pets;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f0', true);
  set local role authenticated;
  update public.pets
     set name = 'Rexy', breed = 'Beagle mix', weight = 13.5,
         allergies = 'chicken', special_needs = 'slow feeder'
   where id = '00000000-0000-0000-0000-000000000f02';
  reset role;
  select * into r from public.pets where id = '00000000-0000-0000-0000-000000000f02';
  perform pg_temp.t('T10 an owner may still edit their pet''s own details',
    r.name = 'Rexy' and r.weight = 13.5 and r.allergies = 'chicken',
    format('name=%s weight=%s allergies=%s', r.name, r.weight, r.allergies));
exception when others then
  reset role; perform pg_temp.t('T10 pet self-edit', false, sqlerrm);
end $$;

-- ── T11: re-homing is a facility action ─────────────────────────────────────
do $$
declare v_ok boolean;
begin
  insert into public.clients (id, facility_id, name, email)
  values ('00000000-0000-0000-0000-000000000f03', '00000000-0000-0000-0000-0000000000fa',
          'Other Owner', 'cp-test-other@example.invalid');
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f0', true);
  set local role authenticated;
  begin
    update public.pets set client_id = '00000000-0000-0000-0000-000000000f03'
     where id = '00000000-0000-0000-0000-000000000f02';
    v_ok := false;
  exception when insufficient_privilege then v_ok := true;
  end;
  reset role;
  perform pg_temp.t('T11 an owner cannot re-home their pet to someone else', v_ok);
exception when others then
  reset role; perform pg_temp.t('T11 re-home', false, sqlerrm);
end $$;

-- ── T12: a new pet arrives without the facility's opinion of it ─────────────
do $$
declare r public.pets;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f0', true);
  set local role authenticated;
  insert into public.pets (id, client_id, facility_id, name, species, status, details)
  values ('00000000-0000-0000-0000-000000000f04', '00000000-0000-0000-0000-000000000f01',
          '00000000-0000-0000-0000-0000000000fb',  -- wrong facility on purpose
          'Pip', 'dog', 'deceased',
          jsonb_build_object('evaluations',
            jsonb_build_array(jsonb_build_object('result', 'self-certified'))))
  returning * into r;
  reset role;
  perform pg_temp.t('T12 a customer''s new pet: no evaluation, active, owner''s facility',
    not (r.details ? 'evaluations') and r.status = 'active'
      and r.facility_id = '00000000-0000-0000-0000-0000000000fa',
    format('evals=%s status=%s facility=%s',
           r.details ? 'evaluations', r.status, r.facility_id));
exception when others then
  reset role; perform pg_temp.t('T12 pet insert', false, sqlerrm);
end $$;

-- ── T13: the control — staff CAN record an evaluation ───────────────────────
do $$
declare r public.pets;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', true);
  set local role authenticated;
  update public.pets
     set status = 'inactive',
         details = jsonb_build_object('evaluations',
           jsonb_build_array(jsonb_build_object('result', 'reassessed: fine in small groups')))
   where id = '00000000-0000-0000-0000-000000000f02';
  reset role;
  select * into r from public.pets where id = '00000000-0000-0000-0000-000000000f02';
  perform pg_temp.t('T13 staff with edit_pet_records may record an evaluation',
    r.details->'evaluations'->0->>'result' = 'reassessed: fine in small groups'
      and r.status = 'inactive',
    format('evaluation=%s status=%s',
           r.details->'evaluations'->0->>'result', r.status));
exception when others then
  reset role; perform pg_temp.t('T13 staff pet edit', false, sqlerrm);
end $$;

-- ── T14: the seed path must survive ─────────────────────────────────────────
do $$
declare r public.clients;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  insert into public.clients (id, facility_id, name, email, is_blocked, outstanding_balance, details)
  values ('00000000-0000-0000-0000-000000000f05', '00000000-0000-0000-0000-0000000000fa',
          'Seeded', 'cp-test-seed@example.invalid', true, 99.00,
          jsonb_build_object('storeCredit', jsonb_build_object('balance', 5)))
  returning * into r;
  perform pg_temp.t('T14 seeds keep everything they are given',
    r.is_blocked and r.outstanding_balance = 99.00
      and (r.details->'storeCredit'->>'balance')::numeric = 5,
    format('blocked=%s balance=%s credit=%s',
           r.is_blocked, r.outstanding_balance, r.details->'storeCredit'->>'balance'));
exception when others then
  perform pg_temp.t('T14 seed path', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
