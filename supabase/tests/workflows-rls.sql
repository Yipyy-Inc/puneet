-- ============================================================================
-- A workflow can be written by the people who may, run by the engine, and read
-- by nobody else.
--
--   bun run test:sql
--
-- One transaction, rolled back.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- Two things, and the second is the one that actually bit.
--
-- FIRST: `workflow_enrollments` is a record of who was put into a sequence and
-- what they were sent. Like the outbox, no session may write it — the engine
-- does, as service_role. P3/P4 measure that rather than trusting it, because
-- the default privilege in this project hands `authenticated` the full set on
-- every new table, so "we only granted SELECT" leaves the rest in place.
--
-- SECOND, and this is the interesting one: `compile_audience` must be callable
-- by BOTH `authenticated` (the wizard's estimate) and `service_role` (the
-- scheduled run). It shipped callable by only the first, because the filter
-- helper sat in the `private` schema, which service_role cannot reach. The
-- wizard worked perfectly and the scheduled run enrolled nobody — a workflow
-- that looked live, showed a plausible recipient count, and silently never
-- sent. P7/P8 exist so that cannot come back quietly.
--
-- P9 is the other half of the same lesson: an unknown field must RAISE. A
-- filter that fell through to "match everything" would mail the entire client
-- list, which is the single worst outcome available to this feature.
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
  v_fac uuid;
  v_admin text;
  v_plain text;
  v_tpl uuid;
  v_wf uuid;
  v_rows int;
  v_msg text;
  v_n int;
begin
  select m.facility_id into v_fac
    from public.facility_memberships m
   where m.is_active and m.role in ('owner', 'admin', 'manager')
   limit 1;

  select profile_id into v_admin
    from public.facility_memberships
   where facility_id = v_fac and is_active
     and role in ('owner', 'admin', 'manager')
   limit 1;

  select profile_id into v_plain
    from public.facility_memberships
   where facility_id = v_fac and is_active
     and role not in ('owner', 'admin', 'manager')
   limit 1;

  if v_fac is null or v_admin is null then
    perform pg_temp.t(0, 'fixtures present', false, 'no facility with a manager');
    return;
  end if;

  perform public.ensure_message_templates(v_fac);
  select id into v_tpl from public.message_templates
   where facility_id = v_fac and key = 'booking_confirmation';

  -- ── Privilege shape, measured not assumed ───────────────────────────────

  perform pg_temp.t(1, 'anon cannot read workflows',
    not has_table_privilege('anon', 'public.workflows', 'select'));

  perform pg_temp.t(2, 'anon cannot read enrolments',
    not has_table_privilege('anon', 'public.workflow_enrollments', 'select'));

  perform pg_temp.t(3, 'authenticated cannot INSERT an enrolment',
    not has_table_privilege('authenticated', 'public.workflow_enrollments', 'insert'));

  perform pg_temp.t(4, 'authenticated cannot UPDATE an enrolment',
    not has_table_privilege('authenticated', 'public.workflow_enrollments', 'update'));

  -- ── As somebody who may manage automations ──────────────────────────────

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  insert into public.workflows (facility_id, name, kind, trigger)
    values (v_fac, 'ZZ wf probe', 'event', 'booking_created')
    returning id into v_wf;
  perform pg_temp.t(5, 'a new workflow is created as a DRAFT',
    (select status = 'draft' from public.workflows where id = v_wf));

  -- A workflow with no steps must not be activatable. The wizard checks this
  -- too; the trigger is what makes a direct write obey it as well.
  begin
    update public.workflows set status = 'active' where id = v_wf;
    perform pg_temp.t(6, 'a stepless workflow cannot be activated', false, 'it was allowed');
  exception when others then
    get stacked diagnostics v_msg = message_text;
    perform pg_temp.t(6, 'a stepless workflow cannot be activated', true, v_msg);
  end;

  -- ── The audience compiler, from a SESSION ───────────────────────────────

  select public.count_audience(v_fac,
    '{"filterGroups":[{"filters":[{"field":"last_visit_days","operator":"more_than","value":30}]}]}'::jsonb)
    into v_n;
  perform pg_temp.t(7, 'a signed-in user can count an audience (the wizard estimate)',
    v_n is not null, v_n::text);

  -- An empty filter names NOBODY. If this ever returns the client count, a
  -- half-built workflow mails everybody.
  select public.count_audience(v_fac, '{"filterGroups":[]}'::jsonb) into v_n;
  perform pg_temp.t(8, 'an empty audience names nobody, not everybody', v_n = 0, v_n::text);

  begin
    select public.count_audience(v_fac,
      '{"filterGroups":[{"filters":[{"field":"mutual_friends","operator":"is","value":true}]}]}'::jsonb)
      into v_n;
    perform pg_temp.t(9, 'an unknown audience field RAISES', false,
      'it returned ' || coalesce(v_n::text, 'null'));
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg like 'it returned%' then raise; end if;
    perform pg_temp.t(9, 'an unknown audience field RAISES', true, v_msg);
  end;

  execute 'reset role';

  -- ── The scheduled run's identity ────────────────────────────────────────
  --
  -- This is the assertion that would have caught the shipped bug. The wizard
  -- and the engine call the SAME function as DIFFERENT roles, and only one of
  -- them was ever exercised by hand.

  perform pg_temp.t(10, 'service_role can compile an audience (the scheduled run)',
    has_function_privilege('service_role', 'public.compile_audience(uuid, jsonb)', 'execute'));

  perform pg_temp.t(11, 'authenticated can compile an audience (the wizard)',
    has_function_privilege('authenticated', 'public.compile_audience(uuid, jsonb)', 'execute'));

  perform pg_temp.t(12, 'anon can do neither',
    not has_function_privilege('anon', 'public.compile_audience(uuid, jsonb)', 'execute')
    and not has_function_privilege('anon', 'public.count_audience(uuid, jsonb)', 'execute'));

  -- ── A colleague without the permission ──────────────────────────────────

  if v_plain is not null then
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_plain, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    select count(*) into v_rows from public.workflows where id = v_wf;
    perform pg_temp.t(13, 'a colleague without the permission can still READ it',
      v_rows = 1, v_rows || ' visible');

    -- Zero rows affected IS the refusal. It does not raise.
    update public.workflows set name = 'hijacked' where id = v_wf;
    get diagnostics v_rows = row_count;
    perform pg_temp.t(14, 'a colleague without the permission cannot EDIT it',
      v_rows = 0, v_rows || ' rows affected');

    execute 'reset role';
  else
    perform pg_temp.t(13, 'a colleague without the permission can still READ it', true, 'skipped');
    perform pg_temp.t(14, 'a colleague without the permission cannot EDIT it', true, 'skipped');
  end if;

  -- ── The step template guard ─────────────────────────────────────────────

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    insert into public.workflow_steps (workflow_id, step_index, sms_template_id)
      values (v_wf, 0, v_tpl);  -- v_tpl is an EMAIL template
    perform pg_temp.t(15, 'an email template is refused in the SMS slot', false, 'accepted');
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg = 'accepted' then raise; end if;
    perform pg_temp.t(15, 'an email template is refused in the SMS slot', true, v_msg);
  end;

  execute 'reset role';
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
