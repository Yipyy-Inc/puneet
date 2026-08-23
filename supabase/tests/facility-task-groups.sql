-- ============================================================================
-- The chore library and the groups that turn it into work (20260823800000).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/facility-task-groups.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ────────────────────────────────────────
--
-- C8 IS THE POINT. A generated task COPIES what the chore said; it does not
-- point at it. Editing "hose down run 3" to say twenty minutes tomorrow must
-- not reach back into the task somebody already finished at fifteen. That is
-- the same rule the form versions and waiver signatures follow, arrived at from
-- the other direction — and it is the rule a definition/instance split exists
-- to make possible in the first place.
--
-- C7 is its twin: generating twice creates nothing the second time. The board
-- has a button, a scheduler will one day have a retry, and two people may open
-- the screen at once. `facility_tasks_source_unique` is the only thing standing
-- between that and a morning list printed three times.
--
-- ── EVERY REFUSAL HERE HAS A POSITIVE CONTROL ─────────────────────────────
--
-- A deny-assertion with no matching allow-assertion is indistinguishable from a
-- broken fixture: "X cannot do Y" passes just as well when X cannot do anything
-- at all, or when Y never existed. So C12 (a chore in use cannot be deleted) is
-- paired with C13 (it can be retired), and C15 (an accountant cannot write the
-- library) is paired with C14 (they can read it).
--
-- The actor for the write refusals is an ACCOUNTANT, and that is not
-- decoration: they are the only role preset in this product holding no
-- `ops_manage_tasks` at all. A caretaker looks like the natural subject and
-- holds it at `anytime`, so every one of these would have reported ALLOWED
-- about a person the rule was never meant to stop.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;
grant usage, select on sequence tap_n_seq to authenticated, anon;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture ───────────────────────────────────────────────────────────────

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000001d0001', 'cg-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001d0002', 'cg-accountant@example.invalid'),
  ('00000000-0000-0000-0000-0000001d0003', 'cg-rival@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001d0001', 'cg-owner@example.invalid', 'CG Owner'),
  ('00000000-0000-0000-0000-0000001d0002', 'cg-accountant@example.invalid', 'CG Accountant'),
  ('00000000-0000-0000-0000-0000001d0003', 'cg-rival@example.invalid', 'CG Rival')
on conflict (id) do nothing;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001d0010', 'CG Org', 'cg-org'),
  ('00000000-0000-0000-0000-0000001d0011', 'CG Rival Org', 'cg-rival-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug) values
  ('00000000-0000-0000-0000-0000001d0020', '00000000-0000-0000-0000-0000001d0010',
   'CG Facility', 'cg-facility'),
  ('00000000-0000-0000-0000-0000001d0021', '00000000-0000-0000-0000-0000001d0011',
   'CG Rival Facility', 'cg-rival-facility')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001d0030', '00000000-0000-0000-0000-0000001d0020',
   '00000000-0000-0000-0000-0000001d0001', 'owner', true),
  -- The ONLY preset with no `ops_manage_tasks`. See the header.
  ('00000000-0000-0000-0000-0000001d0031', '00000000-0000-0000-0000-0000001d0020',
   '00000000-0000-0000-0000-0000001d0002', 'accountant', true),
  ('00000000-0000-0000-0000-0000001d0032', '00000000-0000-0000-0000-0000001d0021',
   '00000000-0000-0000-0000-0000001d0003', 'owner', true)
on conflict (id) do nothing;

insert into public.facility_departments (id, facility_id, name, color) values
  ('00000000-0000-0000-0000-0000001d0040', '00000000-0000-0000-0000-0000001d0020',
   'CG Sanitation', '#888888')
on conflict (id) do nothing;

-- ── As the owner ──────────────────────────────────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001d0001','role','authenticated')::text, true);
set local role authenticated;

do $$
declare state text;
begin
  begin
    insert into public.facility_task_definitions (facility_id, title)
    values ('00000000-0000-0000-0000-0000001d0020', '   ');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t('C1  a chore with no title cannot be created',
    state = '23514', 'state=' || state);
end $$;

do $$
declare shift_bad text; position_bad text; when_bad text;
begin
  begin
    insert into public.facility_task_groups
      (facility_id, name, scope, shift_key, department_id)
    values ('00000000-0000-0000-0000-0000001d0020', 'Confused', 'shift',
            'morning', '00000000-0000-0000-0000-0000001d0040');
    shift_bad := 'ALLOWED';
  exception when others then shift_bad := sqlstate;
  end;

  begin
    insert into public.facility_task_groups
      (facility_id, name, scope, shift_key)
    values ('00000000-0000-0000-0000-0000001d0020', 'Also confused', 'position',
            'morning');
    position_bad := 'ALLOWED';
  exception when others then position_bad := sqlstate;
  end;

  begin
    insert into public.facility_task_groups
      (facility_id, name, scope, shift_key, is_recurring, specific_date)
    values ('00000000-0000-0000-0000-0000001d0020', 'Both at once', 'shift',
            'morning', true, current_date);
    when_bad := 'ALLOWED';
  exception when others then when_bad := sqlstate;
  end;

  -- A row that claims to be a shift group AND names a department leaves every
  -- reader guessing which half to believe.
  perform pg_temp.t('C2  a group cannot claim both a shift and a department, nor both a rhythm and a date',
    shift_bad = '23514' and position_bad = '23514' and when_bad = '23514',
    format('shift=%s position=%s when=%s', shift_bad, position_bad, when_bad));
end $$;

-- ── A real group, and what it generates ───────────────────────────────────

do $$
declare c integer;
begin
  insert into public.facility_task_definitions
    (id, facility_id, title, description, category, priority, estimated_minutes,
     requires_photo)
  values
    ('00000000-0000-0000-0000-0000001d0050', '00000000-0000-0000-0000-0000001d0020',
     'Hose down run 3', 'Including the drains.', 'cleaning', 'high', 15, true),
    ('00000000-0000-0000-0000-0000001d0051', '00000000-0000-0000-0000-0000001d0020',
     'Check the water bowls', null, 'operations', 'medium', 5, false),
    ('00000000-0000-0000-0000-0000001d0052', '00000000-0000-0000-0000-0000001d0020',
     'Retired chore', null, 'cleaning', 'low', 10, false);

  update public.facility_task_definitions set is_active = false
   where id = '00000000-0000-0000-0000-0000001d0052';

  insert into public.facility_task_groups
    (id, facility_id, name, scope, shift_key)
  values
    ('00000000-0000-0000-0000-0000001d0060', '00000000-0000-0000-0000-0000001d0020',
     'Morning Opening Checklist', 'shift', 'morning');

  insert into public.facility_task_group_items (group_id, definition_id, sort_order)
  values
    ('00000000-0000-0000-0000-0000001d0060', '00000000-0000-0000-0000-0000001d0050', 1),
    ('00000000-0000-0000-0000-0000001d0060', '00000000-0000-0000-0000-0000001d0051', 2),
    ('00000000-0000-0000-0000-0000001d0060', '00000000-0000-0000-0000-0000001d0052', 3);

  select count(*) into c from public.facility_task_group_items
   where group_id = '00000000-0000-0000-0000-0000001d0060';

  -- The positive control the refusals above are measured against. Without it,
  -- C1 and C2 pass equally well against a role that can create nothing.
  perform pg_temp.t('C3  the owner can build a chore list and a group from it',
    c = 3, 'items=' || c);
end $$;

do $$
declare c integer; v_title text; v_photo boolean; v_due timestamptz; v_source text;
begin
  perform public.generate_tasks_from_group(
    '00000000-0000-0000-0000-0000001d0060', date '2026-08-24');

  select count(*) into c from public.facility_tasks
   where source = 'template'
     and source_ref like '00000000-0000-0000-0000-0000001d0060:2026-08-24:%';

  select title, requires_photo, due_at, source into v_title, v_photo, v_due, v_source
    from public.facility_tasks
   where source_ref = '00000000-0000-0000-0000-0000001d0060:2026-08-24:00000000-0000-0000-0000-0000001d0050';

  -- Two, not three: the retired chore is skipped. And the wording, the photo
  -- requirement and the daypart's due time all came across.
  perform pg_temp.t('C4  generating creates one task per ACTIVE chore, carrying what it said',
    c = 2 and v_title = 'Hose down run 3' and v_photo
      and v_source = 'template' and v_due = timestamptz '2026-08-24 12:00',
    format('tasks=%s title=%s photo=%s due=%s', c, v_title, v_photo, v_due));
end $$;

do $$
declare c integer;
begin
  perform public.generate_tasks_from_group(
    '00000000-0000-0000-0000-0000001d0060', date '2026-08-24');
  perform public.generate_tasks_from_group(
    '00000000-0000-0000-0000-0000001d0060', date '2026-08-24');

  select count(*) into c from public.facility_tasks
   where source_ref like '00000000-0000-0000-0000-0000001d0060:2026-08-24:%';

  -- THE POINT. The board has a button, two people may press it, and a
  -- scheduler will one day retry. Without the unique index this is the morning
  -- list printed three times.
  perform pg_temp.t('C5  generating again creates nothing, however many times',
    c = 2, 'tasks=' || c);
end $$;

do $$
declare v_task_title text; v_task_minutes integer; v_def_title text;
begin
  update public.facility_task_definitions
     set title = 'Hose down run 3 AND run 4', estimated_minutes = 25
   where id = '00000000-0000-0000-0000-0000001d0050';

  select title into v_def_title from public.facility_task_definitions
   where id = '00000000-0000-0000-0000-0000001d0050';

  select title, estimated_minutes into v_task_title, v_task_minutes
    from public.facility_tasks
   where source_ref = '00000000-0000-0000-0000-0000001d0060:2026-08-24:00000000-0000-0000-0000-0000001d0050';

  -- THE HEADLINE. The chore changed; what somebody was asked to do this
  -- morning did not. A task that POINTED at its definition would now say
  -- twenty-five minutes for work already done in fifteen.
  perform pg_temp.t('C6  editing a chore does not rewrite work already generated from it',
    v_def_title = 'Hose down run 3 AND run 4'
      and v_task_title = 'Hose down run 3'
      and v_task_minutes = 15,
    format('definition=%s task=%s minutes=%s', v_def_title, v_task_title, v_task_minutes));
end $$;

-- ── When a group does and does not run ────────────────────────────────────

do $$
declare weekday_bad text; oneoff_bad text; oneoff_ok integer;
begin
  update public.facility_task_groups
     set days_of_week = array[1, 2, 3]::smallint[]   -- Mon, Tue, Wed
   where id = '00000000-0000-0000-0000-0000001d0060';

  begin
    -- 2026-08-23 is a Sunday.
    perform public.generate_tasks_from_group(
      '00000000-0000-0000-0000-0000001d0060', date '2026-08-23');
    weekday_bad := 'ALLOWED';
  exception when others then weekday_bad := sqlstate;
  end;

  insert into public.facility_task_groups
    (id, facility_id, name, scope, shift_key, is_recurring, specific_date)
  values
    ('00000000-0000-0000-0000-0000001d0061', '00000000-0000-0000-0000-0000001d0020',
     'Deep clean before the inspection', 'shift', 'afternoon', false, date '2026-09-01');

  insert into public.facility_task_group_items (group_id, definition_id)
  values ('00000000-0000-0000-0000-0000001d0061', '00000000-0000-0000-0000-0000001d0051');

  begin
    perform public.generate_tasks_from_group(
      '00000000-0000-0000-0000-0000001d0061', date '2026-09-02');
    oneoff_bad := 'ALLOWED';
  exception when others then oneoff_bad := sqlstate;
  end;

  perform public.generate_tasks_from_group(
    '00000000-0000-0000-0000-0000001d0061', date '2026-09-01');
  select count(*) into oneoff_ok from public.facility_tasks
   where source_ref like '00000000-0000-0000-0000-0000001d0061:2026-09-01:%';

  -- The refusals, and the allow that proves they are about the DATE rather
  -- than about the group being unusable.
  perform pg_temp.t('C7  a group runs on its own days only, and a one-off on its own date only',
    weekday_bad = '22023' and oneoff_bad = '22023' and oneoff_ok = 1,
    format('weekday=%s oneoff=%s onitsday=%s', weekday_bad, oneoff_bad, oneoff_ok));
end $$;

-- ── A chore in use cannot vanish ──────────────────────────────────────────

do $$
declare del_state text; retire_state text; v_active boolean; c integer;
begin
  begin
    delete from public.facility_task_definitions
     where id = '00000000-0000-0000-0000-0000001d0051';
    del_state := 'DELETED';
  exception when others then del_state := sqlstate;
  end;

  begin
    update public.facility_task_definitions set is_active = false
     where id = '00000000-0000-0000-0000-0000001d0051';
    retire_state := 'RETIRED';
  exception when others then retire_state := sqlstate;
  end;

  select is_active into v_active from public.facility_task_definitions
   where id = '00000000-0000-0000-0000-0000001d0051';
  select count(*) into c from public.facility_task_group_items
   where definition_id = '00000000-0000-0000-0000-0000001d0051';

  -- The refusal AND the way out. A guard with no permitted alternative is a
  -- dead end somebody will route around with a raw delete.
  perform pg_temp.t('C8  a chore a group names cannot be deleted, but it can be retired',
    del_state = '23503' and retire_state = 'RETIRED' and not v_active and c = 2,
    format('delete=%s retire=%s active=%s items=%s', del_state, retire_state, v_active, c));
end $$;

-- ── The accountant: reads the list, does not write it ─────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001d0002','role','authenticated')::text, true);
set local role authenticated;

do $$
declare defs integer; groups integer;
begin
  select count(*) into defs from public.facility_task_definitions
   where facility_id = '00000000-0000-0000-0000-0000001d0020';
  select count(*) into groups from public.facility_task_groups
   where facility_id = '00000000-0000-0000-0000-0000001d0020';
  -- THE POSITIVE CONTROL for C10 and C11. Reading is wide on purpose: somebody
  -- has to be able to see what the morning shift owes without being able to
  -- decide it.
  perform pg_temp.t('C9  a member with no ops_manage_tasks can still READ the chore list',
    defs = 3 and groups = 2, format('defs=%s groups=%s', defs, groups));
end $$;

do $$
declare def_state text; group_state text; item_state text;
begin
  begin
    insert into public.facility_task_definitions (facility_id, title)
    values ('00000000-0000-0000-0000-0000001d0020', 'Chore I invented');
    def_state := 'ALLOWED';
  exception when others then def_state := sqlstate;
  end;

  begin
    insert into public.facility_task_groups (facility_id, name, scope, shift_key)
    values ('00000000-0000-0000-0000-0000001d0020', 'Group I invented', 'shift', 'night');
    group_state := 'ALLOWED';
  exception when others then group_state := sqlstate;
  end;

  begin
    insert into public.facility_task_group_items (group_id, definition_id)
    values ('00000000-0000-0000-0000-0000001d0060',
            '00000000-0000-0000-0000-0000001d0052');
    item_state := 'ALLOWED';
  exception when others then item_state := sqlstate;
  end;

  -- A chore list is an instruction to other people, so writing one is
  -- `ops_manage_tasks`. The join table resolves the permission through its
  -- group rather than carrying a facility of its own.
  perform pg_temp.t('C10 ...and cannot write the library, the groups, or their contents',
    def_state = '42501' and group_state = '42501' and item_state = '42501',
    format('def=%s group=%s item=%s', def_state, group_state, item_state));
end $$;

do $$
declare state text; c_before integer; c_after integer;
begin
  select count(*) into c_before from public.facility_tasks
   where source = 'template';
  begin
    perform public.generate_tasks_from_group(
      '00000000-0000-0000-0000-0000001d0060', date '2026-08-25');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  select count(*) into c_after from public.facility_tasks
   where source = 'template';

  -- SECURITY INVOKER, so the function is not a way around the policies. A
  -- definer here would have bypassed RLS entirely - `force row level security`
  -- does not stop one, because the owner is a superuser.
  perform pg_temp.t('C11 generating is not a back door: the caller''s own permissions still apply',
    c_after = c_before, format('state=%s before=%s after=%s', state, c_before, c_after));
end $$;

-- ── Another facility ──────────────────────────────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001d0003','role','authenticated')::text, true);
set local role authenticated;

do $$
declare defs integer; groups integer; items integer; state text;
begin
  select count(*) into defs   from public.facility_task_definitions;
  select count(*) into groups from public.facility_task_groups;
  select count(*) into items  from public.facility_task_group_items;
  begin
    perform public.generate_tasks_from_group(
      '00000000-0000-0000-0000-0000001d0060', date '2026-08-24');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  -- The group is not merely unwritable to them, it is unreadable — so the
  -- function cannot even tell them it exists.
  perform pg_temp.t('C12 another facility sees none of it and cannot generate from it',
    defs = 0 and groups = 0 and items = 0 and state = '42501',
    format('defs=%s groups=%s items=%s generate=%s', defs, groups, items, state));
end $$;

-- ── A department dissolving ───────────────────────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001d0001','role','authenticated')::text, true);
set local role authenticated;

do $$
declare state text; groups_left integer; tasks_left integer;
begin
  insert into public.facility_task_groups
    (id, facility_id, name, scope, department_id)
  values
    ('00000000-0000-0000-0000-0000001d0062', '00000000-0000-0000-0000-0000001d0020',
     'Sanitation daily duties', 'position', '00000000-0000-0000-0000-0000001d0040');

  insert into public.facility_task_group_items (group_id, definition_id)
  values ('00000000-0000-0000-0000-0000001d0062', '00000000-0000-0000-0000-0000001d0050');

  perform public.generate_tasks_from_group(
    '00000000-0000-0000-0000-0000001d0062', date '2026-08-24');

  begin
    delete from public.facility_departments
     where id = '00000000-0000-0000-0000-0000001d0040';
    state := 'DELETED';
  exception when others then state := sqlstate || ': ' || sqlerrm;
  end;

  select count(*) into groups_left from public.facility_task_groups
   where id = '00000000-0000-0000-0000-0000001d0062';
  select count(*) into tasks_left from public.facility_tasks
   where source_ref like '00000000-0000-0000-0000-0000001d0062:%';

  -- The group goes: "the Sanitation team's duties" means nothing once there is
  -- no Sanitation team. The WORK ALREADY GENERATED stays — somebody was asked
  -- to do it, and a department being dissolved does not undo that.
  perform pg_temp.t('C13 dissolving a department takes its groups and leaves the work already asked for',
    state = 'DELETED' and groups_left = 0 and tasks_left = 1,
    format('state=%s groups=%s tasks=%s', state, groups_left, tasks_left));
end $$;

-- ── Privileges, asserted rather than assumed ──────────────────────────────

reset role;

select pg_temp.t('C14 anon reads none of the three tables and cannot generate',
  not has_table_privilege('anon', 'public.facility_task_definitions', 'select')
  and not has_table_privilege('anon', 'public.facility_task_groups', 'select')
  and not has_table_privilege('anon', 'public.facility_task_group_items', 'select')
  and not has_function_privilege('anon', 'public.generate_tasks_from_group(uuid, date, uuid)', 'execute'),
  'anon_defs=' || has_table_privilege('anon', 'public.facility_task_definitions', 'select')::text
  || ' anon_exec=' || has_function_privilege('anon', 'public.generate_tasks_from_group(uuid, date, uuid)', 'execute')::text);

select pg_temp.t('C15 the generator is SECURITY INVOKER, so RLS still decides',
  not (select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'generate_tasks_from_group'),
  'definer=' || (select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'generate_tasks_from_group')::text);

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
