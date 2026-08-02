-- ============================================================================
-- Staff write integrity — behaviour tests for 20260802140000.
--
-- Run as the caller (`set local role authenticated` + a JWT subject), which is
-- the position a browser holding the anon key and a session cookie is in.
-- Testing through /api/staff would prove the wrong thing: PostgREST is
-- reachable directly, so the route is a convenience and not a gate.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/staff-write-integrity.sql
--
-- One transaction, rolled back. Fixture slugs are `sw-test-*` and fixture
-- emails are @example.invalid, so it cannot collide with a seeded database —
-- the booking suite learned that the hard way when it borrowed the real
-- dev-account addresses and hit the unique index on auth.users.email.
--
-- TO CONFIRM THESE FAIL WITHOUT THE FIX: drop the staff_enforce_integrity
-- trigger and re-run. T1 is the one that matters — it is a live privilege
-- escalation, not a missing feature.
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
-- FOUR CALLERS, because the interesting cases are the partial ones.
--
--   owner    — everything, including edit_payroll and manage_roles
--   manager  — manage_staff and VIEW payroll, but NOT edit_payroll or
--              manage_roles. This is the preset as shipped, not a contrivance:
--              a manager runs the roster, the owner sets the wages.
--   clerk    — manage_staff with view_payroll revoked too, so they receive a
--              REDACTED row. The round-trip case.
--   groomer  — the subject, and the attacker in T1-T9.
--
-- The first version of this file assumed a manager could set pay and reported
-- three failures that were really one wrong assumption about the role model.
-- The trigger was right; the test was not.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b0', 'sw-test-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000000000b1', 'sw-test-manager@example.invalid'),
  ('00000000-0000-0000-0000-0000000000b2', 'sw-test-groomer@example.invalid'),
  ('00000000-0000-0000-0000-0000000000b3', 'sw-test-clerk@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000000000b0', 'sw-test-owner@example.invalid',   'Owner'),
  ('00000000-0000-0000-0000-0000000000b1', 'sw-test-manager@example.invalid', 'Manager'),
  ('00000000-0000-0000-0000-0000000000b2', 'sw-test-groomer@example.invalid', 'Groomer'),
  ('00000000-0000-0000-0000-0000000000b3', 'sw-test-clerk@example.invalid',   'Clerk')
on conflict (id) do nothing;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000e0', 'Staff-Write Test Org', 'sw-test-org');

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e0',
   'SW Facility', 'sw-test-facility', 'sw-test-a'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e0',
   'SW Facility Two', 'sw-test-facility-2', 'sw-test-b');

insert into public.facility_memberships (id, profile_id, facility_id, role, is_active) values
  ('00000000-0000-0000-0000-0000000000c0', '00000000-0000-0000-0000-0000000000b0',
   '00000000-0000-0000-0000-0000000000e1', 'owner',   true),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1',
   '00000000-0000-0000-0000-0000000000e1', 'manager', true),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b2',
   '00000000-0000-0000-0000-0000000000e1', 'groomer', true),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b3',
   '00000000-0000-0000-0000-0000000000e1', 'manager', true);

-- The clerk keeps manage_staff but loses the ability to SEE pay, which is what
-- makes them the redacted-round-trip case. The manager needs no override: the
-- shipped preset already grants view_payroll without edit_payroll.
insert into public.membership_permissions (membership_id, permission_key, scope) values
  ('00000000-0000-0000-0000-0000000000c3', 'view_payroll',  'none');

insert into public.staff
  (id, facility_id, membership_id, legacy_id, first_name, last_name, email,
   phone, primary_role, status, details)
values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1',
   '00000000-0000-0000-0000-0000000000c2', 'sw-groomer', 'Gina', 'Groomer',
   'sw-test-groomer@example.invalid', '555-0100', 'groomer', 'active',
   jsonb_build_object(
     'payroll', jsonb_build_object('hourlyRate', 24, 'generalServiceCommission', 8,
                                   'tipsRate', 100, 'overrides', '[]'::jsonb),
     'permissionOverrides', jsonb_build_object('view_petcams',
       jsonb_build_object('granted', true, 'scope', 'anytime')),
     'employment', jsonb_build_object('hireDate', '2025-01-05',
                                      'employmentType', 'full_time',
                                      'notes', 'Confidential HR note.'),
     'clockIn', jsonb_build_object('requireAccessCode', true, 'accessCode', '4242'),
     'notifications', jsonb_build_object('invoice_paid', 'related_to_them')));

-- ── T1: the escalation ──────────────────────────────────────────────────────
do $$
declare v_ok boolean; v_scope text;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
  set local role authenticated;
  begin
    update public.staff set primary_role = 'owner'
     where id = '00000000-0000-0000-0000-0000000000d1';
    v_ok := false;
  exception when insufficient_privilege then v_ok := true;
  end;
  select scope::text into v_scope from public.my_permissions() where permission_key = 'manage_roles';
  reset role;
  perform pg_temp.t('T1  a groomer cannot make themselves owner', v_ok and v_scope = 'none',
            format('refused=%s manage_roles=%s', v_ok, v_scope));
exception when others then
  reset role; perform pg_temp.t('T1  self role escalation', false, sqlerrm);
end $$;

-- ── T2: additional_roles is the same door ───────────────────────────────────
do $$
declare v_ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
  set local role authenticated;
  begin
    update public.staff set additional_roles = array['owner']::public.facility_staff_role[]
     where id = '00000000-0000-0000-0000-0000000000d1';
    v_ok := false;
  exception when insufficient_privilege then v_ok := true;
  end;
  reset role;
  perform pg_temp.t('T2  nor via additional_roles', v_ok);
exception when others then
  reset role; perform pg_temp.t('T2  additional_roles', false, sqlerrm);
end $$;

-- ── T3: nor by re-filing under another facility ─────────────────────────────
do $$
declare v_ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
  set local role authenticated;
  begin
    update public.staff set facility_id = '00000000-0000-0000-0000-0000000000e2'
     where id = '00000000-0000-0000-0000-0000000000d1';
    v_ok := false;
  exception when insufficient_privilege then v_ok := true;
  end;
  reset role;
  perform pg_temp.t('T3  nor by moving to another facility', v_ok);
exception when others then
  reset role; perform pg_temp.t('T3  facility move', false, sqlerrm);
end $$;

-- ── T4: nor by claiming another account's membership ────────────────────────
do $$
declare v_ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
  set local role authenticated;
  begin
    update public.staff set membership_id = '00000000-0000-0000-0000-0000000000c1'
     where id = '00000000-0000-0000-0000-0000000000d1';
    v_ok := false;
  exception when insufficient_privilege then v_ok := true;
  end;
  reset role;
  perform pg_temp.t('T4  nor by claiming a manager''s membership', v_ok);
exception when others then
  reset role; perform pg_temp.t('T4  membership claim', false, sqlerrm);
end $$;

-- ── T5: nor by promoting themselves out of "inactive" ───────────────────────
do $$
declare v_ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
  set local role authenticated;
  begin
    update public.staff set status = 'terminated'
     where id = '00000000-0000-0000-0000-0000000000d1';
    v_ok := false;
  exception when insufficient_privilege then v_ok := true;
  end;
  reset role;
  perform pg_temp.t('T5  employment status is a manager''s to set', v_ok);
exception when others then
  reset role; perform pg_temp.t('T5  status', false, sqlerrm);
end $$;

-- ── T6: self-service still works ────────────────────────────────────────────
do $$
declare r public.staff;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
  set local role authenticated;
  update public.staff
     set phone = '555-0199',
         details = coalesce(details, '{}'::jsonb) || jsonb_build_object(
           'notifications', jsonb_build_object('invoice_paid', 'do_not_notify'))
   where id = '00000000-0000-0000-0000-0000000000d1';
  reset role;
  select * into r from public.staff where id = '00000000-0000-0000-0000-0000000000d1';
  perform pg_temp.t('T6  you may still change your own phone and alerts',
            r.phone = '555-0199'
            and r.details->'notifications'->>'invoice_paid' = 'do_not_notify',
            format('phone=%s notif=%s', r.phone, r.details->'notifications'->>'invoice_paid'));
exception when others then
  reset role; perform pg_temp.t('T6  self-service', false, sqlerrm);
end $$;

-- ── T7: and that self-edit must not have touched anything else ──────────────
do $$
declare r public.staff;
begin
  select * into r from public.staff where id = '00000000-0000-0000-0000-0000000000d1';
  perform pg_temp.t('T7  the self-edit left pay, HR notes and the code alone',
            (r.details->'payroll'->>'hourlyRate')::numeric = 24
            and r.details->'employment'->>'notes' = 'Confidential HR note.'
            and r.details->'clockIn'->>'accessCode' = '4242'
            and r.details ? 'permissionOverrides',
            format('rate=%s note=%s code=%s',
                   r.details->'payroll'->>'hourlyRate',
                   r.details->'employment'->>'notes',
                   r.details->'clockIn'->>'accessCode'));
end $$;

-- ── T8: a groomer cannot give themselves a raise ────────────────────────────
do $$
declare r public.staff;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
  set local role authenticated;
  update public.staff
     set details = coalesce(details, '{}'::jsonb) || jsonb_build_object(
       'payroll', jsonb_build_object('hourlyRate', 999, 'generalServiceCommission', 50,
                                     'tipsRate', 100, 'overrides', '[]'::jsonb))
   where id = '00000000-0000-0000-0000-0000000000d1';
  reset role;
  select * into r from public.staff where id = '00000000-0000-0000-0000-0000000000d1';
  perform pg_temp.t('T8  a groomer cannot write their own pay',
            (r.details->'payroll'->>'hourlyRate')::numeric = 24,
            format('rate=%s', r.details->'payroll'->>'hourlyRate'));
exception when others then
  reset role; perform pg_temp.t('T8  self payroll', false, sqlerrm);
end $$;

-- ── T9: nor grant themselves a permission override ──────────────────────────
do $$
declare r public.staff;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
  set local role authenticated;
  update public.staff
     set details = coalesce(details, '{}'::jsonb) || jsonb_build_object(
       'permissionOverrides', jsonb_build_object('manage_roles',
         jsonb_build_object('granted', true, 'scope', 'anytime')))
   where id = '00000000-0000-0000-0000-0000000000d1';
  reset role;
  select * into r from public.staff where id = '00000000-0000-0000-0000-0000000000d1';
  perform pg_temp.t('T9  nor grant themselves a permission override',
            not (r.details->'permissionOverrides' ? 'manage_roles'),
            coalesce(r.details->>'permissionOverrides', '(absent)'));
exception when others then
  reset role; perform pg_temp.t('T9  self override', false, sqlerrm);
end $$;

-- ── T10: an owner can do the things an owner does ───────────────────────────
do $$
declare r public.staff;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b0', true);
  set local role authenticated;
  update public.staff
     set primary_role = 'reception',
         status = 'inactive',
         status_note = 'On leave',
         details = coalesce(details, '{}'::jsonb) || jsonb_build_object(
           'payroll', jsonb_build_object('hourlyRate', 30, 'generalServiceCommission', 8,
                                         'tipsRate', 100, 'overrides', '[]'::jsonb))
   where id = '00000000-0000-0000-0000-0000000000d1';
  reset role;
  select * into r from public.staff where id = '00000000-0000-0000-0000-0000000000d1';
  perform pg_temp.t('T10 an owner sets roles, status and pay',
            r.primary_role = 'reception' and r.status = 'inactive'
            and r.status_note = 'On leave'
            and (r.details->'payroll'->>'hourlyRate')::numeric = 30,
            format('role=%s status=%s rate=%s', r.primary_role, r.status,
                   r.details->'payroll'->>'hourlyRate'));
exception when others then
  reset role; perform pg_temp.t('T10 manager authority', false, sqlerrm);
end $$;

-- ── T11: THE ONE THAT MATTERS FOR DATA LOSS ─────────────────────────────────
-- The clerk holds manage_staff but not view_payroll. /api/staff therefore
-- sends them a row with `payroll` ABSENT. Saving the profile sends it back
-- absent — and that must not read as "delete their salary".
do $$
declare r public.staff;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b3', true);
  set local role authenticated;
  update public.staff
     set job_title = 'Senior Groomer',
         details = jsonb_build_object(
           'employment', jsonb_build_object('hireDate', '2025-01-05',
                                            'employmentType', 'full_time',
                                            'notes', 'Confidential HR note.'),
           'clockIn', jsonb_build_object('requireAccessCode', true, 'accessCode', '4242'),
           'notifications', jsonb_build_object('invoice_paid', 'do_not_notify'))
   where id = '00000000-0000-0000-0000-0000000000d1';
  reset role;
  select * into r from public.staff where id = '00000000-0000-0000-0000-0000000000d1';
  perform pg_temp.t('T11 a redacted read written back does not delete the pay',
            (r.details->'payroll'->>'hourlyRate')::numeric = 30
            and r.job_title = 'Senior Groomer',
            format('rate=%s title=%s', r.details->'payroll'->>'hourlyRate', r.job_title));
exception when others then
  reset role; perform pg_temp.t('T11 redacted round-trip', false, sqlerrm);
end $$;

-- ── T12: seeing pay is not setting pay ──────────────────────────────────────
-- The MANAGER, on the shipped preset: manage_staff + view_payroll, no
-- edit_payroll. The sharpest version of "read and write are different rights",
-- because this caller can see the exact number they are forbidden to change.
do $$
declare r public.staff;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
  set local role authenticated;
  update public.staff
     set details = coalesce(details, '{}'::jsonb) || jsonb_build_object(
       'payroll', jsonb_build_object('hourlyRate', 1, 'generalServiceCommission', 0,
                                     'tipsRate', 0, 'overrides', '[]'::jsonb))
   where id = '00000000-0000-0000-0000-0000000000d1';
  reset role;
  select * into r from public.staff where id = '00000000-0000-0000-0000-0000000000d1';
  perform pg_temp.t('T12 a manager may SEE pay without being able to SET it',
            (r.details->'payroll'->>'hourlyRate')::numeric = 30,
            format('rate=%s', r.details->'payroll'->>'hourlyRate'));
exception when others then
  reset role; perform pg_temp.t('T12 manager payroll', false, sqlerrm);
end $$;

-- ── T13: nor rewrite someone's permission overrides ─────────────────────────
do $$
declare r public.staff;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b3', true);
  set local role authenticated;
  update public.staff
     set details = coalesce(details, '{}'::jsonb) || jsonb_build_object(
       'permissionOverrides', jsonb_build_object('manage_roles',
         jsonb_build_object('granted', true, 'scope', 'anytime')))
   where id = '00000000-0000-0000-0000-0000000000d1';
  reset role;
  select * into r from public.staff where id = '00000000-0000-0000-0000-0000000000d1';
  perform pg_temp.t('T13 manage_staff alone does not let you grant permissions',
            not (r.details->'permissionOverrides' ? 'manage_roles')
            and (r.details->'permissionOverrides' ? 'view_petcams'),
            coalesce(r.details->>'permissionOverrides', '(absent)'));
exception when others then
  reset role; perform pg_temp.t('T13 clerk overrides', false, sqlerrm);
end $$;

-- ── T14: a new hire cannot be born with a salary its author may not set ─────
do $$
declare r public.staff;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b3', true);
  set local role authenticated;
  insert into public.staff
    (id, facility_id, legacy_id, first_name, last_name, email, primary_role, status, details)
  values ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000e1',
          'sw-new', 'New', 'Hire', 'sw-test-new@example.invalid', 'groomer', 'active',
          jsonb_build_object('payroll', jsonb_build_object('hourlyRate', 500)))
  returning * into r;
  reset role;
  perform pg_temp.t('T14 a new hire cannot arrive pre-paid by someone who may not pay',
            not (r.details ? 'payroll'),
            coalesce(r.details->>'payroll', '(absent)'));
exception when others then
  reset role; perform pg_temp.t('T14 insert payroll', false, sqlerrm);
end $$;

-- ── T15: the seed path must survive ─────────────────────────────────────────
do $$
declare r public.staff;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  insert into public.staff
    (id, facility_id, legacy_id, first_name, last_name, email, primary_role, status, details)
  values ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000e1',
          'sw-seed', 'Seed', 'Person', 'sw-test-seed@example.invalid', 'owner', 'active',
          jsonb_build_object('payroll', jsonb_build_object('hourlyRate', 42)))
  returning * into r;
  perform pg_temp.t('T15 seeds keep everything they are given',
            (r.details->'payroll'->>'hourlyRate')::numeric = 42 and r.primary_role = 'owner',
            format('rate=%s role=%s', r.details->'payroll'->>'hourlyRate', r.primary_role));
exception when others then
  perform pg_temp.t('T15 seed path', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
