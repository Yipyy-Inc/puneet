-- ============================================================================
-- Onboarding INSTANCES — RLS, the token surface, and the employee clamp.
-- Behaviour tests for 20260803180000.
--
-- Run as the caller (`set local role authenticated` / `anon` plus the JWT
-- subject), which is the position a browser holding the anon key is in.
-- Testing through /onboard/[token] would prove the wrong thing: PostgREST is
-- reachable directly, so the page is a convenience and not a gate.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/onboarding-instances-rls.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── EVERY BLOCK SETS ITS OWN JWT SUBJECT, INCLUDING THE HARNESS ONES ────────
--
-- `set_config(..., true)` is TRANSACTION-local, not block-local. The first
-- version of this file let T13's subject (the hire) leak into T14 and T15,
-- which then ran their setup as that hire rather than as the harness — and the
-- clamp under test dutifully reverted the very state the test was trying to
-- arm. Two red tests, both reporting that the code works.
--
-- So: `perform set_config('request.jwt.claims', '', true)` opens every block
-- that means to act as service_role, and T14/T15 additionally ASSERT that the
-- state they armed actually took. A test that arms nothing proves nothing.
--
-- TO CONFIRM THESE FAIL WITHOUT THE MIGRATION: drop the policies and the
-- triggers and re-run. T1/T2 (anon sees nothing), T7/T8/T13 (the clamp) and
-- T11 (manage_staff) all go red.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture ─────────────────────────────────────────────────────────────────
-- THREE CALLERS and an anon one:
--   manager  — manage_staff. Reviews and activates.
--   hire     — the person being onboarded. Has an account (so the authenticated
--              clamp can be tested) AND a live token.
--   groomer  — a colleague at the same facility. Must see nothing.
--   anon     — the token-bearer, which is how the real flow works.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b0', 'oi-manager@example.invalid'),
  ('00000000-0000-0000-0000-0000000000b1', 'oi-hire@example.invalid'),
  ('00000000-0000-0000-0000-0000000000b2', 'oi-groomer@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000000000b0', 'oi-manager@example.invalid', 'Manager'),
  ('00000000-0000-0000-0000-0000000000b1', 'oi-hire@example.invalid',    'Hire'),
  ('00000000-0000-0000-0000-0000000000b2', 'oi-groomer@example.invalid', 'Groomer')
on conflict (id) do nothing;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000b8', 'OI Org', 'oi-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000000000ba', '00000000-0000-0000-0000-0000000000b8',
   'OI Facility', 'oi-facility', 'oi-a')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000000000bc', '00000000-0000-0000-0000-0000000000ba',
   '00000000-0000-0000-0000-0000000000b0', 'manager', true),
  ('00000000-0000-0000-0000-0000000000bd', '00000000-0000-0000-0000-0000000000ba',
   '00000000-0000-0000-0000-0000000000b1', 'groomer', true),
  ('00000000-0000-0000-0000-0000000000be', '00000000-0000-0000-0000-0000000000ba',
   '00000000-0000-0000-0000-0000000000b2', 'groomer', true)
on conflict (id) do nothing;

insert into public.staff
  (id, facility_id, membership_id, legacy_id, first_name, last_name, email, primary_role, status)
values
  ('00000000-0000-0000-0000-00000000b101', '00000000-0000-0000-0000-0000000000ba',
   '00000000-0000-0000-0000-0000000000bd', 'oi-hire', 'Nadia', 'Hire',
   'oi-hire@example.invalid', 'groomer', 'invited'),
  ('00000000-0000-0000-0000-00000000b102', '00000000-0000-0000-0000-0000000000ba',
   null, 'oi-other', 'Other', 'Hire', 'oi-other@example.invalid', 'groomer', 'invited'),
  ('00000000-0000-0000-0000-00000000b103', '00000000-0000-0000-0000-0000000000ba',
   '00000000-0000-0000-0000-0000000000be', 'oi-groomer', 'Existing', 'Groomer',
   'oi-groomer@example.invalid', 'groomer', 'active'),
  ('00000000-0000-0000-0000-00000000b104', '00000000-0000-0000-0000-0000000000ba',
   null, 'oi-active', 'Already', 'Active', 'oi-active@example.invalid', 'groomer', 'invited');

-- Tokens are written as HASHES here too — the test cannot store a plaintext
-- token any more than the app can.
insert into public.onboarding_instances
  (id, staff_id, facility_id, token_hash, token_expires_at)
values
  ('00000000-0000-0000-0000-00000000c101', '00000000-0000-0000-0000-00000000b101',
   '00000000-0000-0000-0000-0000000000ba',
   private.hash_onboarding_token('TOKEN-LIVE-aaaaaaaaaaaa'), now() + interval '7 days'),
  ('00000000-0000-0000-0000-00000000c102', '00000000-0000-0000-0000-00000000b102',
   '00000000-0000-0000-0000-0000000000ba',
   private.hash_onboarding_token('TOKEN-OTHER-bbbbbbbbbbb'), now() + interval '7 days'),
  ('00000000-0000-0000-0000-00000000c103', '00000000-0000-0000-0000-00000000b104',
   '00000000-0000-0000-0000-0000000000ba',
   private.hash_onboarding_token('TOKEN-EXPIRED-ccccccccc'), now() - interval '1 day');

insert into public.onboarding_sections
  (instance_id, facility_id, task_key, section_type, status)
values
  ('00000000-0000-0000-0000-00000000c101', '00000000-0000-0000-0000-0000000000ba',
   'task-bank', 'banking', 'not_started');

-- ── T0: the fixture is what the tests think, and the token is a hash ────────
do $$
declare c integer; h bytea;
begin
  perform set_config('request.jwt.claims', '', true);
  select count(*) into c from public.onboarding_instances;
  select token_hash into h from public.onboarding_instances
   where id = '00000000-0000-0000-0000-00000000c101';
  perform pg_temp.t('T0  fixture: 3 instances; token stored as a hash, not text',
    c = 3 and h = extensions.digest('TOKEN-LIVE-aaaaaaaaaaaa','sha256'),
    format('instances=%s hash_prefix=%s', c, left(encode(h,'hex'), 16)));
end $$;

-- ── T1: an anon caller cannot list instances ────────────────────────────────
-- The headline. There is no anon policy, so this is not "filtered to zero" —
-- there is nothing for anon to filter.
do $$
declare c integer;
begin
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  select count(*) into c from public.onboarding_instances;
  reset role;
  perform pg_temp.t('T1  an anon caller cannot list instances', c = 0, format('rows=%s', c));
exception when others then reset role; perform pg_temp.t('T1', false, sqlerrm);
end $$;

-- ── T2: nor the children ────────────────────────────────────────────────────
-- Sections hold the IBAN. A policy on the parent alone would leave this open.
do $$
declare s integer; c integer;
begin
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  select count(*) into s from public.onboarding_sections;
  select count(*) into c from public.onboarding_change_requests;
  reset role;
  perform pg_temp.t('T2  nor sections nor change requests', s = 0 and c = 0,
    format('sections=%s change_requests=%s', s, c));
exception when others then reset role; perform pg_temp.t('T2', false, sqlerrm);
end $$;

-- ── T3: a VALID token gets exactly one ──────────────────────────────────────
do $$
declare v jsonb;
begin
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  v := public.onboarding_by_token('TOKEN-LIVE-aaaaaaaaaaaa');
  reset role;
  perform pg_temp.t('T3  an anon caller with a VALID token gets exactly one instance',
    v is not null and v->>'staffId' = 'oi-hire' and jsonb_array_length(v->'sections') = 1,
    format('staff=%s sections=%s', v->>'staffId', jsonb_array_length(v->'sections')));
exception when others then reset role; perform pg_temp.t('T3', false, sqlerrm);
end $$;

-- ── T4: …and only its own ───────────────────────────────────────────────────
-- Two live instances exist. Holding one token must not reach the other, and a
-- guess must not distinguish itself from a miss.
do $$
declare v jsonb; w jsonb;
begin
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  v := public.onboarding_by_token('TOKEN-LIVE-aaaaaaaaaaaa');
  w := public.onboarding_by_token('TOKEN-GUESSED-zzzzzzzzzz');
  reset role;
  perform pg_temp.t('T4  a valid token reads only its OWN instance, and a guess reads none',
    v->>'staffId' = 'oi-hire' and w is null,
    format('own=%s guessed=%s', v->>'staffId', coalesce(w->>'staffId','(null)')));
exception when others then reset role; perform pg_temp.t('T4', false, sqlerrm);
end $$;

-- ── T5: an expired token returns nothing ────────────────────────────────────
do $$
declare v jsonb;
begin
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  v := public.onboarding_by_token('TOKEN-EXPIRED-ccccccccc');
  reset role;
  perform pg_temp.t('T5  an EXPIRED token returns nothing', v is null,
    coalesce(v->>'staffId','(null)'));
exception when others then reset role; perform pg_temp.t('T5', false, sqlerrm);
end $$;

-- ── T6: the control — the token-bearer CAN work ─────────────────────────────
-- Without this, every refusal above is satisfied by an RPC that returns null
-- to everyone, which is not a feature.
do $$
declare ok boolean; v jsonb;
begin
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  ok := public.save_onboarding_section('TOKEN-LIVE-aaaaaaaaaaaa', 'task-bank', 'banking',
        jsonb_build_object('iban','GB00TEST'), 'complete');
  v := public.onboarding_by_token('TOKEN-LIVE-aaaaaaaaaaaa');
  reset role;
  perform pg_temp.t('T6  the token-bearer CAN save their own section',
    ok and v->'sections'->0->'data'->>'iban' = 'GB00TEST'
      and v->'sections'->0->>'status' = 'complete',
    format('ok=%s iban=%s status=%s', ok,
           v->'sections'->0->'data'->>'iban', v->'sections'->0->>'status'));
exception when others then reset role; perform pg_temp.t('T6', false, sqlerrm);
end $$;

-- ── T7: an employee cannot self-submit-and-review ───────────────────────────
-- Reverted rather than raised, for the reason in the migration header: the app
-- PATCHes whole objects and erroring would break a legitimate save.
do $$
declare r public.onboarding_instances;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000b1', 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.onboarding_instances set submitted_at = now(), reviewed_at = now()
   where id = '00000000-0000-0000-0000-00000000c101';
  reset role;
  perform set_config('request.jwt.claims', '', true);
  select * into r from public.onboarding_instances
   where id = '00000000-0000-0000-0000-00000000c101';
  perform pg_temp.t('T7  an employee cannot self-submit-and-review',
    r.submitted_at is null and r.reviewed_at is null,
    format('submitted=%s reviewed=%s',
           coalesce(r.submitted_at::text,'null'), coalesce(r.reviewed_at::text,'null')));
exception when others then reset role; perform pg_temp.t('T7', false, sqlerrm);
end $$;

-- ── T8: nor extend their own link ───────────────────────────────────────────
-- This one RAISES: an expiry the holder can move is not an expiry.
do $$
declare v_ok boolean; r public.onboarding_instances;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000b1', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.onboarding_instances set token_expires_at = now() + interval '365 days'
     where id = '00000000-0000-0000-0000-00000000c101';
    v_ok := false;
  exception when insufficient_privilege then v_ok := true;
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  select * into r from public.onboarding_instances
   where id = '00000000-0000-0000-0000-00000000c101';
  perform pg_temp.t('T8  an employee cannot extend their own link',
    v_ok and r.token_expires_at < now() + interval '30 days');
exception when others then reset role; perform pg_temp.t('T8', false, sqlerrm);
end $$;

-- ── T9: a colleague sees nothing ────────────────────────────────────────────
do $$
declare c integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000b2', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into c from public.onboarding_instances;
  reset role;
  perform pg_temp.t('T9  a colleague without manage_staff reads no instances', c = 0,
    format('rows=%s', c));
exception when others then reset role; perform pg_temp.t('T9', false, sqlerrm);
end $$;

-- ── T10: …but the hire reads their own ──────────────────────────────────────
-- Through private.own_staff_ids(), the helper that already answers this.
do $$
declare c integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000b1', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into c from public.onboarding_instances;
  reset role;
  perform pg_temp.t('T10 the hire reads their OWN instance (own_staff_ids)', c = 1,
    format('rows=%s', c));
exception when others then reset role; perform pg_temp.t('T10', false, sqlerrm);
end $$;

-- ── T11: a manager WITHOUT manage_staff cannot activate ─────────────────────
-- Revoked at the facility level, so this is the same person a moment earlier —
-- the permission is what changed, not the caller.
do $$
declare r public.onboarding_instances;
begin
  perform set_config('request.jwt.claims', '', true);
  insert into public.facility_role_permissions (facility_id, role, permission_key, scope)
  values ('00000000-0000-0000-0000-0000000000ba', 'manager', 'manage_staff', 'none')
  on conflict (facility_id, role, permission_key) do update set scope = 'none';

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000b0', 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.onboarding_instances set reviewed_at = now()
   where id = '00000000-0000-0000-0000-00000000c101';
  reset role;
  perform set_config('request.jwt.claims', '', true);
  select * into r from public.onboarding_instances
   where id = '00000000-0000-0000-0000-00000000c101';
  perform pg_temp.t('T11 a manager WITHOUT manage_staff cannot activate',
    r.reviewed_at is null, format('reviewed=%s', coalesce(r.reviewed_at::text,'null')));
exception when others then reset role; perform pg_temp.t('T11', false, sqlerrm);
end $$;

-- ── T12: the control — restore it and they can ──────────────────────────────
do $$
declare r public.onboarding_instances;
begin
  perform set_config('request.jwt.claims', '', true);
  delete from public.facility_role_permissions
   where facility_id = '00000000-0000-0000-0000-0000000000ba'
     and permission_key = 'manage_staff';

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000b0', 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.onboarding_instances set reviewed_at = now()
   where id = '00000000-0000-0000-0000-00000000c101';
  reset role;
  perform set_config('request.jwt.claims', '', true);
  select * into r from public.onboarding_instances
   where id = '00000000-0000-0000-0000-00000000c101';
  perform pg_temp.t('T12 the control: WITH manage_staff the manager CAN activate',
    r.reviewed_at is not null);
exception when others then reset role; perform pg_temp.t('T12', false, sqlerrm);
end $$;

-- ── T13: an employee cannot close their own change request ──────────────────
-- Nor reword it — a note the subject can edit is not a record of what was asked.
do $$
declare r public.onboarding_change_requests;
begin
  perform set_config('request.jwt.claims', '', true);
  insert into public.onboarding_change_requests
    (id, instance_id, facility_id, task_key, section_type, note)
  values ('00000000-0000-0000-0000-00000000d101', '00000000-0000-0000-0000-00000000c101',
          '00000000-0000-0000-0000-0000000000ba', 'task-bank', 'banking', 'IBAN looks wrong');

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000b1', 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.onboarding_change_requests set resolved_at = now(), note = 'all fine actually'
   where id = '00000000-0000-0000-0000-00000000d101';
  reset role;
  perform set_config('request.jwt.claims', '', true);
  select * into r from public.onboarding_change_requests
   where id = '00000000-0000-0000-0000-00000000d101';
  perform pg_temp.t('T13 an employee cannot resolve or reword their own change request',
    r.resolved_at is null and r.note = 'IBAN looks wrong',
    format('resolved=%s note=%s', coalesce(r.resolved_at::text,'null'), r.note));
exception when others then reset role; perform pg_temp.t('T13', false, sqlerrm);
end $$;

-- ── T14: a submitted instance is spent ──────────────────────────────────────
-- ASSERTS ITS OWN ARMING (`armed`). The first version of this test did not, and
-- when a leaked JWT subject meant the clamp reverted the submit it was trying to
-- set, the test reported a broken RPC instead of an unarmed fixture.
do $$
declare v jsonb; ok boolean; s timestamptz;
begin
  perform set_config('request.jwt.claims', '', true);
  update public.onboarding_instances set submitted_at = now()
   where id = '00000000-0000-0000-0000-00000000c102';
  select submitted_at into s from public.onboarding_instances
   where id = '00000000-0000-0000-0000-00000000c102';

  set local role anon;
  v  := public.onboarding_by_token('TOKEN-OTHER-bbbbbbbbbbb');
  ok := public.save_onboarding_section('TOKEN-OTHER-bbbbbbbbbbb','x','banking','{}'::jsonb,'complete');
  reset role;
  perform pg_temp.t('T14 a SUBMITTED instance is spent - token reads and writes nothing',
    s is not null and v is null and ok = false,
    format('armed=%s read=%s write=%s', s is not null, coalesce(v->>'staffId','null'), ok));
exception when others then reset role; perform pg_temp.t('T14', false, sqlerrm);
end $$;

-- ── T15: leaving `invited` kills the link ───────────────────────────────────
-- Also asserts its arming, for the same reason: the staff trigger refuses a
-- status change from a caller without manage_staff, so a leaked subject would
-- have left the row `invited` and the test passing for the wrong reason.
do $$
declare v jsonb; st text;
begin
  perform set_config('request.jwt.claims', '', true);
  update public.staff set status = 'active'
   where id = '00000000-0000-0000-0000-00000000b101';
  select status into st from public.staff where id = '00000000-0000-0000-0000-00000000b101';

  set local role anon;
  v := public.onboarding_by_token('TOKEN-LIVE-aaaaaaaaaaaa');
  reset role;

  perform set_config('request.jwt.claims', '', true);
  update public.staff set status = 'invited'
   where id = '00000000-0000-0000-0000-00000000b101';
  perform pg_temp.t('T15 a staff row no longer `invited` kills the link',
    st = 'active' and v is null,
    format('armed_status=%s read=%s', st, coalesce(v->>'staffId','null')));
exception when others then reset role; perform pg_temp.t('T15', false, sqlerrm);
end $$;

-- ── T16: the uniqueness saveOnboardingSectionByTask assumes, and the cascade ─
do $$
declare v_dup boolean; c integer;
begin
  perform set_config('request.jwt.claims', '', true);
  begin
    insert into public.onboarding_sections
      (instance_id, facility_id, task_key, section_type)
    values ('00000000-0000-0000-0000-00000000c101',
            '00000000-0000-0000-0000-0000000000ba', 'task-bank', 'banking');
    v_dup := false;
  exception when unique_violation then v_dup := true;
  end;

  delete from public.staff where id = '00000000-0000-0000-0000-00000000b101';
  select count(*) into c from public.onboarding_instances
   where staff_id = '00000000-0000-0000-0000-00000000b101';
  perform pg_temp.t('T16 (instance,task_key) is unique; deleting the staff row cascades',
    v_dup and c = 0, format('dup_refused=%s orphans=%s', v_dup, c));
exception when others then perform pg_temp.t('T16', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
