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
  v_client uuid;
  v_enrol uuid;
  v_enrol2 uuid;
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

  -- ── Taking one person out of a sequence by hand ─────────────────────────
  --
  -- The one write a session may make to `workflow_enrollments`, and it exists
  -- only because P3/P4 above take every other one away. What matters here is
  -- that it stays that narrow: the permission is checked INSIDE the function,
  -- so a route that forgot to check cannot widen it, and an already-ended
  -- enrolment is refused rather than silently re-stamped with a second reason.

  perform pg_temp.t(16, 'anon cannot stop an enrolment',
    not has_function_privilege('anon',
      'public.stop_workflow_enrollment(uuid, text)', 'execute'));

  select id into v_client from public.clients where facility_id = v_fac limit 1;

  if v_client is null then
    perform pg_temp.t(17, 'stopping also cancels what was already queued', true, 'skipped');
    perform pg_temp.t(18, 'the stop says a PERSON did it', true, 'skipped');
    perform pg_temp.t(19, 'stopping an ended enrolment is refused', true, 'skipped');
    perform pg_temp.t(20, 'a colleague without the permission cannot stop one', true, 'skipped');
    perform pg_temp.t(21, 'the refused stop left the sequence running', true, 'skipped');
  else
    -- Written as the owner, because that is who writes them: the engine runs
    -- as service_role and no session may insert one.
    insert into public.workflow_enrollments
      (workflow_id, client_id, steps_snapshot, enrolment_key, next_run_at)
    values
      (v_wf, v_client, '[]'::jsonb, 'ZZ probe a:' || v_wf, now()),
      (v_wf, v_client, '[]'::jsonb, 'ZZ probe b:' || v_wf, now());
    select id into v_enrol  from public.workflow_enrollments
      where enrolment_key = 'ZZ probe a:' || v_wf;
    select id into v_enrol2 from public.workflow_enrollments
      where enrolment_key = 'ZZ probe b:' || v_wf;

    -- One message already waiting to go out for that enrolment. This is the
    -- assertion that matters: quiet hours routinely defer a step to 08:00
    -- tomorrow, and a stop that clears `next_run_at` but leaves that row queued
    -- would still send the message staff pressed the button to prevent.
    insert into public.message_sends
      (facility_id, client_id, channel, to_address, source_kind, source_id,
       enrollment_id, step_index, body_rendered, status, idempotency_key)
    values
      (v_fac, v_client, 'email', 'zz-probe@example.invalid', 'workflow', v_wf,
       v_enrol, 0, 'probe', 'queued', 'ZZ probe send:' || v_enrol);

    perform set_config('request.jwt.claims',
      json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    select cancelled_messages into v_n
      from public.stop_workflow_enrollment(v_enrol);
    perform pg_temp.t(17, 'stopping also cancels what was already queued',
      v_n = 1, coalesce(v_n::text, 'null') || ' message(s) cancelled');

    -- `next_run_at` cleared is what actually prevents the next step; the
    -- prefix is what lets staff tell their own decision from the engine's.
    perform pg_temp.t(18, 'the stop says a PERSON did it',
      (select status = 'stopped'
          and stopped_reason like 'manual:%'
          and next_run_at is null
         from public.workflow_enrollments where id = v_enrol));

    begin
      perform public.stop_workflow_enrollment(v_enrol);
      perform pg_temp.t(19, 'stopping an ended enrolment is refused', false, 'accepted');
    exception when others then
      get stacked diagnostics v_msg = message_text;
      if v_msg = 'accepted' then raise; end if;
      perform pg_temp.t(19, 'stopping an ended enrolment is refused', true, v_msg);
    end;

    execute 'reset role';

    -- Prefer a colleague at this facility who lacks the permission. Failing
    -- that — and on this database there is not one, which is why 13/14 read
    -- 'skipped' — fall back to somebody who is not a member at all. The
    -- refusals have different causes but the same boundary, and an untested
    -- boundary on the one function that may write an enrolment is worse than
    -- an approximate one. Platform admins are excluded on purpose: they can see
    -- every facility, so one would fail this for the wrong reason.
    if v_plain is null then
      select p.id into v_plain
        from public.profiles p
       where not exists (select 1 from public.facility_memberships m
                          where m.profile_id = p.id and m.facility_id = v_fac
                            and m.is_active)
         and not exists (select 1 from public.platform_memberships pm
                          where pm.profile_id = p.id)
       limit 1;
    end if;

    if v_plain is null then
      perform pg_temp.t(20, 'a colleague without the permission cannot stop one', true, 'skipped');
      perform pg_temp.t(21, 'the refused stop left the sequence running', true, 'skipped');
    else
      perform set_config('request.jwt.claims',
        json_build_object('sub', v_plain, 'role', 'authenticated')::text, true);
      execute 'set local role authenticated';
      begin
        perform public.stop_workflow_enrollment(v_enrol2);
        perform pg_temp.t(20, 'a colleague without the permission cannot stop one',
          false, 'accepted');
      exception when others then
        get stacked diagnostics v_msg = message_text;
        if v_msg = 'accepted' then raise; end if;
        perform pg_temp.t(20, 'a colleague without the permission cannot stop one',
          true, v_msg);
      end;
      execute 'reset role';

      -- And it is still running, which is the half a refusal that raises could
      -- still get wrong.
      perform pg_temp.t(21, 'the refused stop left the sequence running',
        (select status = 'active' from public.workflow_enrollments where id = v_enrol2));
    end if;
  end if;
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
