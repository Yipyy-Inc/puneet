-- ============================================================================
-- public.purge_e2e_task_groups() — see the migration
-- 20260923180000_the_suite_takes_its_chores_back_out.sql
--
--   bun run test:sql purge-e2e-task-groups
--
-- One transaction, rolled back. It builds its own chores and groups on the
-- demo facility and asserts against those, so it never depends on what the
-- suite has left lying around — which is the very thing the function exists to
-- remove.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- T0  NEGATIVE CONTROL, and it runs first. A chore a group still names cannot
--     be deleted — that is `facility_task_group_items.definition_id` ON DELETE
--     RESTRICT doing its job, and it is the reason the function deletes the
--     groups before the chores. If this assertion ever passes trivially the
--     constraint has been weakened and the ORDER in the function stopped being
--     load-bearing without anybody noticing.
-- T1  A group the suite made is gone, and its items go with it (CASCADE).
-- T2  THE ONE THAT MATTERS. A facility's own group, its own chore and its own
--     task all survive. A purge that cannot tell the suite's rows from a
--     facility's is worse than no purge.
-- T3  A marked chore that a SURVIVING facility group still names is LEFT, and
--     is not counted. This is the `not exists` guard: without it the delete
--     raises and takes the whole purge down, including the work that already
--     succeeded.
-- T4  The three counts are three different numbers and each names what it
--     removed, so `e2e:purge` cannot report a figure it did not earn.
-- T5  The grants. `revoke from public` and `revoke from anon` are different
--     grants and a function is reachable through either, so both are asserted
--     against has_function_privilege() rather than trusted for having been
--     written in the migration.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── T0 the constraint the function's ORDER depends on ──────────────────────
do $$
declare
  v_facility uuid := 'a0000000-0000-4000-8000-0000000000f1';
  v_def      uuid;
  v_group    uuid;
  v_refused  boolean := false;
  v_stamp    text := to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');
begin
  insert into public.facility_task_definitions (facility_id, title)
       values (v_facility, '[e2e] control chore ' || v_stamp)
    returning id into v_def;
  insert into public.facility_task_groups (facility_id, name, scope, shift_key)
       values (v_facility, '[e2e] control group ' || v_stamp, 'shift', 'morning')
    returning id into v_group;
  insert into public.facility_task_group_items (group_id, definition_id)
       values (v_group, v_def);

  -- The chore alone, with its group still standing. This must be refused.
  begin
    delete from public.facility_task_definitions where id = v_def;
  exception when foreign_key_violation then
    v_refused := true;
  end;

  perform pg_temp.t(
    'T0 a chore a group still names cannot be deleted',
    v_refused,
    case when v_refused then 'RESTRICT refused it, as the function assumes'
         else 'THE DELETE SUCCEEDED — the constraint is gone and the order no longer protects anything'
    end);
exception when others then
  perform pg_temp.t('T0 negative control', false, sqlerrm);
end $$;

-- ── T1-T4 the function itself ──────────────────────────────────────────────
do $$
declare
  v_facility  uuid := 'a0000000-0000-4000-8000-0000000000f1';
  v_mdef      uuid;  -- marked chore, free once its marked group goes
  v_sdef      uuid;  -- marked chore a FACILITY group names: must survive
  v_odef      uuid;  -- the facility's own chore
  v_mgroup    uuid;  -- marked group
  v_ogroup    uuid;  -- the facility's own group
  v_mtask     uuid;  -- marked task
  v_otask     uuid;  -- the facility's own task
  v_tasks     integer;
  v_groups    integer;
  v_defs      integer;
  v_stamp     text := to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');
begin
  -- What the suite leaves behind.
  insert into public.facility_task_definitions (facility_id, title)
       values (v_facility, '[e2e] chore ' || v_stamp) returning id into v_mdef;
  insert into public.facility_task_definitions (facility_id, title)
       values (v_facility, '[e2e] shared chore ' || v_stamp) returning id into v_sdef;
  insert into public.facility_task_groups (facility_id, name, scope, shift_key)
       values (v_facility, '[e2e] group ' || v_stamp, 'shift', 'morning')
    returning id into v_mgroup;
  insert into public.facility_task_group_items (group_id, definition_id)
       values (v_mgroup, v_mdef);
  insert into public.facility_tasks (facility_id, title)
       values (v_facility, '[e2e] task ' || v_stamp) returning id into v_mtask;

  -- What the FACILITY has, shaped identically but without the marker — plus
  -- one marked chore it has taken into its own group, which is the case the
  -- `not exists` guard exists for.
  insert into public.facility_task_definitions (facility_id, title)
       values (v_facility, 'Hose the runs ' || v_stamp) returning id into v_odef;
  insert into public.facility_task_groups (facility_id, name, scope, shift_key)
       values (v_facility, 'Morning open ' || v_stamp, 'shift', 'morning')
    returning id into v_ogroup;
  insert into public.facility_task_group_items (group_id, definition_id)
       values (v_ogroup, v_odef);
  insert into public.facility_task_group_items (group_id, definition_id)
       values (v_ogroup, v_sdef);
  insert into public.facility_tasks (facility_id, title)
       values (v_facility, 'Hose the runs ' || v_stamp) returning id into v_otask;

  select p.tasks, p.groups, p.definitions
    into v_tasks, v_groups, v_defs
    from public.purge_e2e_task_groups() p;

  perform pg_temp.t(
    'T1 a marked group is gone, and its items with it',
    not exists (select 1 from public.facility_task_groups where id = v_mgroup)
      and not exists (select 1 from public.facility_task_group_items
                       where group_id = v_mgroup)
      and not exists (select 1 from public.facility_task_definitions where id = v_mdef)
      and not exists (select 1 from public.facility_tasks where id = v_mtask),
    format('group=%s items=%s chore=%s task=%s',
      exists (select 1 from public.facility_task_groups where id = v_mgroup),
      exists (select 1 from public.facility_task_group_items where group_id = v_mgroup),
      exists (select 1 from public.facility_task_definitions where id = v_mdef),
      exists (select 1 from public.facility_tasks where id = v_mtask)));

  perform pg_temp.t(
    'T2 the facility''s own group, chore and task are untouched',
    exists (select 1 from public.facility_task_groups where id = v_ogroup)
      and exists (select 1 from public.facility_task_definitions where id = v_odef)
      and exists (select 1 from public.facility_tasks where id = v_otask)
      and exists (select 1 from public.facility_task_group_items
                   where group_id = v_ogroup and definition_id = v_odef),
    format('group=%s chore=%s task=%s item=%s',
      exists (select 1 from public.facility_task_groups where id = v_ogroup),
      exists (select 1 from public.facility_task_definitions where id = v_odef),
      exists (select 1 from public.facility_tasks where id = v_otask),
      exists (select 1 from public.facility_task_group_items
               where group_id = v_ogroup and definition_id = v_odef)));

  perform pg_temp.t(
    'T3 a marked chore a surviving group still names is left, not raised on',
    exists (select 1 from public.facility_task_definitions where id = v_sdef),
    format('shared chore still there=%s',
      exists (select 1 from public.facility_task_definitions where id = v_sdef)));

  perform pg_temp.t(
    'T4 each count names what it removed, and none is a restatement',
    v_tasks >= 1 and v_groups >= 1 and v_defs >= 1
      and not exists (select 1 from public.facility_task_groups where name like '[e2e]%')
      and not exists (select 1 from public.facility_tasks where title like '[e2e]%'),
    format('tasks=%s groups=%s definitions=%s', v_tasks, v_groups, v_defs));
exception when others then
  perform pg_temp.t('T1-T4 purge', false, sqlerrm);
end $$;

-- ── T5 the grants ──────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t(
    'T5 only the service role may run it',
    not has_function_privilege('anon',               'public.purge_e2e_task_groups()', 'execute')
      and not has_function_privilege('authenticated', 'public.purge_e2e_task_groups()', 'execute')
      and has_function_privilege('service_role',      'public.purge_e2e_task_groups()', 'execute')
      and 0 = (select count(*) from information_schema.routine_privileges
                 where routine_schema = 'public'
                   and routine_name   = 'purge_e2e_task_groups'
                   and grantee        = 'PUBLIC'),
    format('anon=%s authenticated=%s service_role=%s',
      has_function_privilege('anon',          'public.purge_e2e_task_groups()', 'execute'),
      has_function_privilege('authenticated', 'public.purge_e2e_task_groups()', 'execute'),
      has_function_privilege('service_role',  'public.purge_e2e_task_groups()', 'execute')));
exception when others then
  perform pg_temp.t('T5 grants', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
