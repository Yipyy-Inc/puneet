-- ============================================================================
-- Offboarding — revocation, retention and RLS tests for 20260804180000.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/offboarding-rls.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid so this
-- cannot collide with a seeded database.
--
-- THE TWO CLAIMS THIS FILE EXISTS TO PROVE, and they pull against each other:
--
--   1. A deactivated member reads NOTHING of their old facility. Not the
--      clients, not the bookings, not the roster.
--   2. Their history survives anyway, readable by the facility — the bookings
--      they worked still name them, their signatures are still on file.
--
-- A design that only satisfies (1) deletes the person and takes the payroll
-- trail with them. A design that only satisfies (2) leaves an ex-employee
-- holding a live key. Both tests are here, adjacent, because passing either
-- one alone is the bug.
--
-- T1 IS THE ARMING TEST. It asserts the leaver CAN read the facility before
-- offboarding, so that T4's zero means "revoked" and not "the fixture never
-- worked". Without it T4 passes against an empty database.
--
-- TO CONFIRM THESE FAIL WITHOUT THE MIGRATION: in `public.offboard_staff`,
-- delete the `update public.facility_memberships set is_active = false` line
-- and re-run. T3 and T4 go green-to-red, and nothing else moves — which is
-- itself the finding: marking somebody `terminated` revokes NOTHING on its
-- own. `is_active` is the entire switch (private.has_permission,
-- member_facility_ids, own_staff_ids and custom_access_token_hook all filter
-- on it), so the migration's job was never to invent revocation. It was to
-- make revocation and the status change ATOMIC — one call, or a window where
-- somebody is terminated on the roster and still logged in.
--
-- Likewise: drop `private.former_staff_ids()` from the staff_documents and
-- staff_signatures read policies and T6 goes red — a former employee loses
-- their own final payslip, because own_staff_ids() requires the membership
-- that offboarding just switched off.
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
-- Two callers: a manager who holds manage_staff, and the groomer being let go.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c0', 'ob-manager@example.invalid'),
  ('00000000-0000-0000-0000-0000000000c1', 'ob-leaver@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000000000c0', 'ob-manager@example.invalid', 'Manager'),
  ('00000000-0000-0000-0000-0000000000c1', 'ob-leaver@example.invalid',  'Leaver')
on conflict (id) do nothing;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000c8', 'OB Test Org', 'ob-test-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000c8',
   'OB Facility', 'ob-facility', 'ob-a')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-0000000000ca',
   '00000000-0000-0000-0000-0000000000c0', 'manager', true),
  ('00000000-0000-0000-0000-0000000000cd', '00000000-0000-0000-0000-0000000000ca',
   '00000000-0000-0000-0000-0000000000c1', 'groomer', true)
on conflict (id) do nothing;

insert into public.staff
  (id, facility_id, membership_id, legacy_id, first_name, last_name, email, primary_role, status)
values
  ('00000000-0000-0000-0000-00000000c101', '00000000-0000-0000-0000-0000000000ca',
   '00000000-0000-0000-0000-0000000000cd', 'ob-leaver', 'Lee', 'Aver',
   'ob-leaver@example.invalid', 'groomer', 'active');

-- The history that must OUTLIVE them: a booking they worked, a document filed
-- for them, an agreement they signed.
insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-00000000c201', '00000000-0000-0000-0000-0000000000ca',
   'OB Client', 'ob-client@example.invalid');

insert into public.bookings
  (id, facility_id, client_id, assigned_staff_id, service, start_at, end_at)
values
  ('00000000-0000-0000-0000-00000000c301', '00000000-0000-0000-0000-0000000000ca',
   '00000000-0000-0000-0000-00000000c201', '00000000-0000-0000-0000-00000000c101',
   'Groom', '2026-07-01T10:00:00Z', '2026-07-01T11:00:00Z');

insert into public.staff_documents
  (id, facility_id, staff_id, file_name, content_type, size_bytes, storage_path,
   doc_type, visible_to_employee)
values
  ('00000000-0000-0000-0000-00000000c401', '00000000-0000-0000-0000-0000000000ca',
   '00000000-0000-0000-0000-00000000c101', 'final-payslip.pdf', 'application/pdf',
   1234, 'ob/a/payslip.pdf', 'other', true);

insert into public.staff_signatures
  (id, facility_id, staff_id, agreement_key, agreement_title, agreement_text,
   agreement_hash, signature_name)
values
  ('00000000-0000-0000-0000-00000000c501', '00000000-0000-0000-0000-0000000000ca',
   '00000000-0000-0000-0000-00000000c101', 'handbook', 'Handbook',
   'Clause 4.', 'abc', 'Lee Aver');

-- The checklist the facility designed once (P1's tables, unchanged).
insert into public.offboarding_templates (id, facility_id, name, applies_to_reasons) values
  ('00000000-0000-0000-0000-00000000c601', '00000000-0000-0000-0000-0000000000ca',
   'Resignation checklist', array['Resignation']);

insert into public.offboarding_tasks
  (id, template_id, facility_id, position, name, assigned_to, due, days)
values
  ('00000000-0000-0000-0000-00000000c602', '00000000-0000-0000-0000-00000000c601',
   '00000000-0000-0000-0000-0000000000ca', 1, 'Recover laptop', 'manager', 'on_termination', null),
  ('00000000-0000-0000-0000-00000000c603', '00000000-0000-0000-0000-00000000c601',
   '00000000-0000-0000-0000-0000000000ca', 2, 'Submit ROE', 'hr', 'within_days', 5);

-- ── T0: the fixture is real ─────────────────────────────────────────────────
do $$
declare c integer;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into c from public.offboarding_tasks
   where template_id = '00000000-0000-0000-0000-00000000c601';
  perform pg_temp.t('T0  fixture: template with 2 tasks, leaver has history',
    c = 2, format('tasks=%s', c));
end $$;

-- ── T1: ARMING — before offboarding, the employee can read the facility ─────
-- Without this, T4's zero proves nothing.
do $$
declare cl integer; bk integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
  set local role authenticated;
  select count(*) into cl from public.clients;
  select count(*) into bk from public.bookings;
  reset role;
  perform pg_temp.t('T1  BEFORE: the employee can read their facility',
    cl >= 1 and bk >= 1, format('clients=%s bookings=%s', cl, bk));
exception when others then
  reset role; perform pg_temp.t('T1  arming', false, sqlerrm);
end $$;

-- ── T2: one call does the whole thing ───────────────────────────────────────
do $$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c0', true);
  set local role authenticated;
  r := public.offboard_staff('ob-leaver', 'Resignation', null, current_date + 5);
  reset role;
  perform pg_temp.t('T2  offboard_staff: checklist materialised, access revoked',
    (r->>'tasks')::int = 2 and (r->>'revoked')::boolean,
    format('tasks=%s revoked=%s', r->>'tasks', r->>'revoked'));
exception when others then
  reset role; perform pg_temp.t('T2  offboard_staff', false, sqlerrm);
end $$;

-- ── T3: terminated AND deactivated, together ────────────────────────────────
-- The atomicity claim. Two rows in two tables, one transaction — there is no
-- window in which the roster says "terminated" and the session still works.
do $$
declare st text; act boolean;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  select status into st from public.staff where id = '00000000-0000-0000-0000-00000000c101';
  select is_active into act from public.facility_memberships
   where id = '00000000-0000-0000-0000-0000000000cd';
  perform pg_temp.t('T3  terminated AND deactivated, in the same transaction',
    st = 'terminated' and act = false, format('status=%s is_active=%s', st, act));
end $$;

-- ── T4: THE HEADLINE ────────────────────────────────────────────────────────
-- A deactivated member reads none of their old facility. Three different
-- tables, because RLS is per-table and one passing SELECT is not a policy.
do $$
declare cl integer; bk integer; stf integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
  set local role authenticated;
  select count(*) into cl  from public.clients;
  select count(*) into bk  from public.bookings;
  select count(*) into stf from public.staff;
  reset role;
  perform pg_temp.t('T4  AFTER: a deactivated member reads NONE of their old facility',
    cl = 0 and bk = 0 and stf = 0,
    format('clients=%s bookings=%s staff=%s', cl, bk, stf));
exception when others then
  reset role; perform pg_temp.t('T4  revocation', false, sqlerrm);
end $$;

-- ── T5: …and the history is still there ─────────────────────────────────────
-- Deactivation, not deletion. The booking still NAMES them — a design that
-- nulled assigned_staff_id would pass T4 and lose who did the work.
do $$
declare bk integer; asg uuid; sg integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c0', true);
  set local role authenticated;
  select count(*) into bk from public.bookings
   where assigned_staff_id = '00000000-0000-0000-0000-00000000c101';
  select assigned_staff_id into asg from public.bookings
   where id = '00000000-0000-0000-0000-00000000c301';
  select count(*) into sg from public.staff_signatures
   where staff_id = '00000000-0000-0000-0000-00000000c101';
  reset role;
  perform pg_temp.t('T5  their history survives and the FACILITY can still read it',
    bk = 1 and asg is not null and sg = 1,
    format('bookings=%s still_assigned=%s signatures=%s', bk, asg is not null, sg));
exception when others then
  reset role; perform pg_temp.t('T5  retention', false, sqlerrm);
end $$;

-- ── T6: the final payslip still reaches them ────────────────────────────────
-- own_staff_ids() requires an ACTIVE membership, so offboarding would have cut
-- them off from their own paperwork on the day they most need it. That is what
-- private.former_staff_ids() is for, and it is used by exactly these two read
-- policies and nothing else.
do $$
declare d integer; sg integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
  set local role authenticated;
  select count(*) into d  from public.staff_documents;
  select count(*) into sg from public.staff_signatures;
  reset role;
  perform pg_temp.t('T6  a FORMER employee still reads their own documents and signatures',
    d = 1 and sg = 1, format('documents=%s signatures=%s', d, sg));
exception when others then
  reset role; perform pg_temp.t('T6  former-employee reads', false, sqlerrm);
end $$;

-- ── T7: …but writes nothing ─────────────────────────────────────────────────
-- The read carve-out is a READ carve-out. If it leaked into the write policies
-- an ex-employee could file documents into a facility that no longer employs
-- them.
do $$
declare v_ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
  set local role authenticated;
  begin
    insert into public.staff_documents
      (facility_id, staff_id, file_name, content_type, size_bytes, storage_path)
    values ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-00000000c101',
            'after.pdf', 'application/pdf', 1, 'ob/a/after.pdf');
    v_ok := false;
  exception when insufficient_privilege then
    v_ok := true;
  end;
  reset role;
  perform pg_temp.t('T7  …but a former employee can WRITE nothing', v_ok);
exception when others then
  reset role; perform pg_temp.t('T7  former-employee writes', false, sqlerrm);
end $$;

-- ── T8: nor read the file the facility is keeping on their exit ─────────────
-- The offboarding checklist is the facility's internal record — "recover the
-- laptop", "hold the final cheque". The person leaving is its subject, not its
-- audience.
do $$
declare c integer; ts integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
  set local role authenticated;
  select count(*) into c  from public.offboarding_instances;
  select count(*) into ts from public.offboarding_task_states;
  reset role;
  perform pg_temp.t('T8  the departing person cannot read the checklist ABOUT them',
    c = 0 and ts = 0, format('instances=%s tasks=%s', c, ts));
exception when others then
  reset role; perform pg_temp.t('T8  checklist privacy', false, sqlerrm);
end $$;

-- ── T9: the manager can, with due dates resolved ────────────────────────────
-- `within_days 5` is stored on the TEMPLATE as an interval and becomes a real
-- date on the INSTANCE, counted from the last day — so the checklist a manager
-- opens has dates on it, not arithmetic.
do $$
declare c integer; d date;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c0', true);
  set local role authenticated;
  select count(*) into c from public.offboarding_task_states;
  select due_date into d from public.offboarding_task_states where name = 'Submit ROE';
  reset role;
  perform pg_temp.t('T9  the manager reads it, with within_days resolved to a date',
    c = 2 and d = current_date + 10,
    format('tasks=%s roe_due=%s expected=%s', c, d, current_date + 10));
exception when others then
  reset role; perform pg_temp.t('T9  due-date arithmetic', false, sqlerrm);
end $$;

-- ── T10: offboarding is a manage_staff action ───────────────────────────────
-- Asserted on a SECOND staff member, so a refusal cannot be confused with
-- "already terminated". The status check afterwards proves the refusal
-- happened before any write, not after a partial one.
do $$
declare v_ok boolean; st text;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  insert into public.staff
    (id, facility_id, membership_id, legacy_id, first_name, last_name, email, primary_role, status)
  values ('00000000-0000-0000-0000-00000000c102', '00000000-0000-0000-0000-0000000000ca',
          null, 'ob-other', 'Other', 'Person', 'ob-other@example.invalid', 'groomer', 'active');

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
  set local role authenticated;
  begin
    perform public.offboard_staff('ob-other', 'Resignation', null, null);
    v_ok := false;
  exception when insufficient_privilege then
    v_ok := true;
  end;
  reset role;

  perform set_config('request.jwt.claim.sub', '', true);
  select status into st from public.staff where id = '00000000-0000-0000-0000-00000000c102';
  perform pg_temp.t('T10 a caller without manage_staff cannot offboard anyone',
    v_ok and st = 'active', format('refused=%s status=%s', v_ok, st));
exception when others then
  reset role; perform pg_temp.t('T10 permission gate', false, sqlerrm);
end $$;

-- ── T11: anon cannot offboard anybody ───────────────────────────────────────
-- This was a REAL HOLE, not a hypothetical: offboard_staff shipped with the
-- write-integrity triggers' `auth.uid() is null` carve-out, which is correct in
-- a trigger and catastrophic in an RPC. Anyone holding the publishable key —
-- which ships in every browser bundle — could terminate any employee at any
-- facility and revoke their access. Fixed in this migration and in
-- 20260804200000; kept here so it cannot come back.
do $$
declare refused boolean; st text; act boolean;
begin
  perform set_config('request.jwt.claim.sub', '', true);   -- no session at all
  set local role anon;
  begin
    perform public.offboard_staff('ob-other', 'Termination', null, null);
    refused := false;
  exception when others then
    refused := true;
  end;
  reset role;

  perform set_config('request.jwt.claim.sub', '', true);
  select status into st from public.staff where id = '00000000-0000-0000-0000-00000000c102';
  perform pg_temp.t('T11 anon cannot offboard anybody, and nothing was written',
    refused and st = 'active', format('refused=%s status=%s', refused, st));
exception when others then
  reset role; perform pg_temp.t('T11 anon gate', false, sqlerrm);
end $$;

-- ── T12: …and holds no EXECUTE grant either ─────────────────────────────────
-- The body check above is the rule; this is the second lock. Note that
-- `revoke ... from public` does NOT produce this — Supabase's default
-- privileges grant EXECUTE to `anon` by name, and only a revoke naming `anon`
-- removes it.
do $$
declare g boolean;
begin
  select has_function_privilege('anon', 'public.offboard_staff(text,text,uuid,date)', 'execute')
    into g;
  perform pg_temp.t('T12 anon holds no EXECUTE grant on offboard_staff', not g,
    format('anon_execute=%s', g));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
