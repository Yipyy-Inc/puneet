-- ============================================================================
-- The roster writes its own history, and only the right people read it.
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/audit-scheduling-and-facility-read.sql
--
-- One transaction, rolled back. That matters more here than usual:
-- public.audit_log is append-only by trigger, so a test that COMMITTED could
-- never clean up after itself. Rollback is the only teardown available.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- Two separate claims, and both were false before 20260824200000:
--
--   1. Shift changes are recorded. They were "recorded" into a module-level
--      array in `src/lib/schedule-audit.ts` that dies with the process, while
--      the roster underneath was real Postgres.
--   2. A facility can read its own trail. `audit_log_read` admitted
--      private.is_platform_admin() and NOBODY else, so every facility-facing
--      audit screen read a fixture because the real table returned nothing.
--
-- ── EVERY DENY HAS A POSITIVE CONTROL ──────────────────────────────────────
--
-- "A groomer cannot read the audit trail" passes just as well when the groomer
-- can read nothing at all, when the JWT never took effect, or when the table is
-- empty. T8 is the deny; T9 proves the same session CAN read something else.
-- Without T9, T8 is a test of nothing.
--
-- Same shape for the facility scoping: T6 proves the admin cannot see another
-- facility's rows, and T5 proves they can see their own — otherwise T6 passes
-- because the policy denies everyone.
--
-- ── WHAT THIS FILE DOES NOT PROVE ──────────────────────────────────────────
--
-- The cascade exemption in private.audit_staff_shift() — the branch that stays
-- silent when a shift is deleted because its FACILITY is being deleted — is
-- NOT tested here, and cannot be from this file. Deleting a facility is
-- already impossible in this database (audit_log.facility_id is ON DELETE SET
-- NULL and the append-only trigger refuses the UPDATE; see the debt map). The
-- branch exists so that this trigger does not become a SECOND reason facility
-- deletion fails once the first is fixed. Saying so is more useful than a test
-- that pretends to cover it.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

do $$
declare
  v_fac         uuid;
  v_other_fac   uuid;
  v_admin       text;
  v_groomer     constant text := 'user_auditProbeGroomer0000000000';
  v_dept        uuid;
  v_pos         uuid;
  v_shift       uuid;
  v_staff       uuid;
  n             int;
  v_rows        int;
begin
  select id into v_fac from public.facilities where legacy_id = '11';
  select id into v_other_fac from public.facilities where id <> v_fac limit 1;

  -- NOT `limit 1` on its own. Three people are admins of this facility and one
  -- of them — houssemsina123@gmail.com — is also a Yipyy platform admin, so
  -- `audit_log_read` shows them EVERY facility's rows, correctly. Picking them
  -- made T7 and T8 fail on the first run and, worse, would have made them pass
  -- for no reason had the planner returned a different row that day.
  --
  -- An actor chosen by an unordered `limit 1` is chosen by the planner. This
  -- test needs a facility admin who is ONLY that.
  select m.profile_id into v_admin
    from public.facility_memberships m
   where m.facility_id = v_fac
     and m.access_level = 'admin'
     and m.is_active
     and not exists (select 1 from public.platform_memberships pm
                      where pm.profile_id = m.profile_id)
   order by m.profile_id
   limit 1;

  if v_admin is null then
    raise exception 'no facility-only admin on facility 11 — T6/T7/T8 would be meaningless';
  end if;

  select id into v_staff from public.staff where facility_id = v_fac limit 1;

  -- A member of staff who is NOT an admin, for the deny and its control.
  insert into public.profiles (id, email, full_name)
  values (v_groomer, 'audit.probe@yipyy.invalid', 'Audit Probe Groomer')
  on conflict (id) do nothing;
  insert into public.facility_memberships (profile_id, facility_id, role, is_active)
  values (v_groomer, v_fac, 'groomer', true)
  on conflict (profile_id, facility_id) do nothing;

  insert into public.facility_departments(facility_id, name)
    values (v_fac, 'Audit probe dept') returning id into v_dept;
  insert into public.facility_positions(facility_id, department_id, name)
    values (v_fac, v_dept, 'Audit probe position') returning id into v_pos;

  -- ── the trigger writes what happened ────────────────────────────────────

  insert into public.staff_shifts(facility_id, department_id, position_id,
                                  starts_at, ends_at, status)
    values (v_fac, v_dept, v_pos, now(), now() + interval '8 hours', 'draft')
    returning id into v_shift;

  select count(*) into n from public.audit_log
   where entity_id = v_shift::text and action = 'Shift created';
  perform pg_temp.t(1, 'creating a shift records it', n = 1, n::text);

  update public.staff_shifts set staff_id = v_staff where id = v_shift;
  select count(*) into n from public.audit_log
   where entity_id = v_shift::text and action = 'Shift assigned';
  perform pg_temp.t(2, 'assigning somebody records who', n = 1, n::text);

  -- The entry has to name a PERSON, not a uuid — a trail nobody can read is
  -- not a trail. This is what `entity_name` is resolved for in the trigger.
  select count(*) into n from public.audit_log a
   where a.entity_id = v_shift::text and a.action = 'Shift assigned'
     and a.entity_name = (select trim(s.first_name || ' ' || s.last_name)
                            from public.staff s where s.id = v_staff);
  perform pg_temp.t(3, 'the entry names the person, not their id', n = 1, n::text);

  -- Bookkeeping is not history. A trail full of updated_at is a trail nobody
  -- reads, so an UPDATE touching nothing a person would notice writes nothing.
  update public.staff_shifts set notes = 'retyped' where id = v_shift;
  select count(*) into n from public.audit_log
   where entity_id = v_shift::text and action = 'Shift changed';
  perform pg_temp.t(4, 'a notes-only edit is NOT recorded as a change', n = 0, n::text);

  delete from public.staff_shifts where id = v_shift;
  select count(*) into n from public.audit_log
   where entity_id = v_shift::text and action = 'Shift deleted';
  perform pg_temp.t(5, 'deleting a rostered shift records it', n = 1, n::text);

  -- ── as an admin of this facility ────────────────────────────────────────

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.audit_log where facility_id = v_fac;
  perform pg_temp.t(6, 'an admin reads their OWN facility trail', n > 0, n || ' rows');

  select count(*) into n from public.audit_log where facility_id = v_other_fac;
  perform pg_temp.t(7, 'an admin cannot read ANOTHER facility trail', n = 0, n::text);

  -- The platform rows say who was made a Yipyy superadmin and when. They carry
  -- a null facility, and that null is the whole reason they stay out.
  select count(*) into n from public.audit_log where facility_id is null;
  perform pg_temp.t(8, 'an admin cannot read the platform-level rows', n = 0, n::text);

  -- A SELECT policy must not have opened a write path. audit_log is
  -- append-only for every role including its owner.
  begin
    update public.audit_log set action = 'TAMPERED' where facility_id = v_fac;
    get diagnostics v_rows = row_count;
    perform pg_temp.t(9, 'an admin still cannot rewrite history', v_rows = 0,
                      v_rows || ' rows affected');
  exception when others then
    perform pg_temp.t(9, 'an admin still cannot rewrite history', true, 'refused: ' || sqlerrm);
  end;

  execute 'reset role';

  -- ── as a member of staff who is not an admin ────────────────────────────

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_groomer, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.audit_log;
  perform pg_temp.t(10, 'a groomer reads NO audit trail at all', n = 0, n::text);

  -- THE POSITIVE CONTROL for T10. Without this, T10 passes when the JWT never
  -- took effect, when the session can read nothing, or when the table is empty.
  select count(*) into n from public.facility_settings where facility_id = v_fac;
  perform pg_temp.t(11, 'the same groomer session CAN still read settings',
                    n > 0, n || ' rows');

  execute 'reset role';

  -- ── as a platform admin, who supports every facility ────────────────────

  perform set_config('request.jwt.claims',
    json_build_object('sub', (select profile_id from public.platform_memberships limit 1),
                      'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.audit_log where facility_id is null;
  perform pg_temp.t(12, 'a platform admin still reads the platform rows',
                    n > 0, n || ' rows');

  execute 'reset role';
end $$;

-- ── the grant, not just the policy ─────────────────────────────────────────
--
-- A revoke naming a privilege the role does not hold succeeds silently, and
-- `public` and `anon` are different grants. Assert the outcome.

do $$
begin
  perform pg_temp.t(13, 'anon holds no SELECT on the audit trail',
    not has_table_privilege('anon', 'public.audit_log', 'select'));
  perform pg_temp.t(14, 'authenticated still holds the SELECT the policy needs',
    has_table_privilege('authenticated', 'public.audit_log', 'select'));
  perform pg_temp.t(15, 'the facility read policy exists',
    exists (select 1 from pg_policy p join pg_class c on c.oid = p.polrelid
             where c.relname = 'audit_log' and p.polname = 'audit_log_facility_read'));
  perform pg_temp.t(16, 'all three scheduling audit triggers are attached',
    (select count(*) from pg_trigger t where not t.tgisinternal
      and t.tgname in ('staff_shifts_audit', 'time_off_audit_decision',
                       'shift_swap_audit_decision')) = 3);
end $$;

select n, name, case when ok then 'PASS' else 'FAIL' end as result, detail
  from tap order by n;

do $$
declare v_failed int;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise exception '% assertion(s) failed', v_failed;
  end if;
end $$;

rollback;
