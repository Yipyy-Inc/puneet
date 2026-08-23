-- ============================================================================
-- Facility tasks — the dedup key, the assignee's ceiling, and who sees what
-- (20260823600000).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/facility-tasks.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ────────────────────────────────────────
--
-- K3 AND K9 ARE THE POINT.
--
-- K3: the fixture deduped call follow-ups with `hasTaskForCallLog(call.id)`, a
-- scan of a module-level array. That answers "have I already made one" for one
-- browser tab. Two people working the same call queue would each create one and
-- neither would see the other's. A unique index is the same intent expressed
-- somewhere it can actually hold.
--
-- K9: every role in this product holds `manage_own_tasks`, including ones with
-- no `ops_manage_tasks` at all. The update policy has to admit them — you must
-- be able to finish work assigned to you — so without the trigger, "manage own
-- tasks" would also mean "hand this to somebody else" and "change what it says
-- I have to do". That is managing the roster through the back door.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;
-- `serial` makes a sequence and GRANT on the table does not reach it.
grant usage, select on sequence tap_n_seq to authenticated, anon;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture ───────────────────────────────────────────────────────────────

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000001c0001', 'ft-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001c0002', 'ft-groomer@example.invalid'),
  ('00000000-0000-0000-0000-0000001c0003', 'ft-accountant@example.invalid'),
  ('00000000-0000-0000-0000-0000001c0004', 'ft-rival@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001c0001', 'ft-owner@example.invalid', 'FT Owner'),
  ('00000000-0000-0000-0000-0000001c0002', 'ft-groomer@example.invalid', 'FT Groomer'),
  ('00000000-0000-0000-0000-0000001c0003', 'ft-accountant@example.invalid', 'FT Accountant'),
  ('00000000-0000-0000-0000-0000001c0004', 'ft-rival@example.invalid', 'FT Rival')
on conflict (id) do nothing;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001c0010', 'FT Org', 'ft-org'),
  ('00000000-0000-0000-0000-0000001c0011', 'FT Rival Org', 'ft-rival-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug) values
  ('00000000-0000-0000-0000-0000001c0020', '00000000-0000-0000-0000-0000001c0010',
   'FT Facility', 'ft-facility'),
  ('00000000-0000-0000-0000-0000001c0021', '00000000-0000-0000-0000-0000001c0011',
   'FT Rival Facility', 'ft-rival-facility')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001c0030', '00000000-0000-0000-0000-0000001c0020',
   '00000000-0000-0000-0000-0000001c0001', 'owner', true),
  -- A groomer holds `ops_manage_tasks` at assigned_shifts scope and
  -- `manage_own_tasks` anytime.
  ('00000000-0000-0000-0000-0000001c0031', '00000000-0000-0000-0000-0000001c0020',
   '00000000-0000-0000-0000-0000001c0002', 'groomer', true),
  -- An accountant holds `manage_own_tasks` and NO `ops_manage_tasks` at all,
  -- which is the only combination that can reach the trigger's own refusal.
  ('00000000-0000-0000-0000-0000001c0032', '00000000-0000-0000-0000-0000001c0020',
   '00000000-0000-0000-0000-0000001c0003', 'accountant', true),
  ('00000000-0000-0000-0000-0000001c0033', '00000000-0000-0000-0000-0000001c0021',
   '00000000-0000-0000-0000-0000001c0004', 'owner', true)
on conflict (id) do nothing;

-- `legacy_id` is unique and named explicitly: left out, a trigger derives one
-- and the two rows collide on it.
insert into public.staff
  (id, facility_id, membership_id, legacy_id, first_name, last_name, email,
   primary_role, status)
values
  ('00000000-0000-0000-0000-0000001c0040', '00000000-0000-0000-0000-0000001c0020',
   '00000000-0000-0000-0000-0000001c0031', 'ft-groomer', 'FT', 'Groomer',
   'ft-groomer@example.invalid', 'groomer', 'active'),
  ('00000000-0000-0000-0000-0000001c0041', '00000000-0000-0000-0000-0000001c0020',
   '00000000-0000-0000-0000-0000001c0032', 'ft-accountant', 'FT', 'Accountant',
   'ft-accountant@example.invalid', 'accountant', 'active')
on conflict (id) do nothing;

-- ── As the owner ──────────────────────────────────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001c0001','role','authenticated')::text, true);
set local role authenticated;

do $$
declare state text;
begin
  begin
    insert into public.facility_tasks (facility_id, title)
    values ('00000000-0000-0000-0000-0000001c0020', '   ');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t('K1  a task with no title cannot be created',
    state = '23514', 'state=' || state);
end $$;

do $$
declare state text;
begin
  begin
    insert into public.facility_tasks (facility_id, title, status)
    values ('00000000-0000-0000-0000-0000001c0020', 'Done somehow', 'completed');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  -- Completion is one fact in two columns. "Completed with no completed_at" is
  -- the shape that makes every turnaround report quietly drop rows.
  perform pg_temp.t('K2  completed and completed_at cannot disagree',
    state = '23514', 'state=' || state);
end $$;

-- ── The dedup key ─────────────────────────────────────────────────────────

do $$
declare state text; c integer;
begin
  insert into public.facility_tasks
    (id, facility_id, title, source, source_ref, assigned_to)
  values
    ('00000000-0000-0000-0000-0000001c0050', '00000000-0000-0000-0000-0000001c0020',
     'Call Mrs Patel back', 'call_follow_up', 'call-9931',
     '00000000-0000-0000-0000-0000001c0040');

  begin
    insert into public.facility_tasks (facility_id, title, source, source_ref)
    values ('00000000-0000-0000-0000-0000001c0020',
            'Call Mrs Patel back', 'call_follow_up', 'call-9931');
    state := 'ALLOWED';
  exception when unique_violation then state := 'REFUSED';
  when others then state := sqlstate;
  end;

  select count(*) into c from public.facility_tasks
   where source = 'call_follow_up' and source_ref = 'call-9931';

  -- THE POINT. `hasTaskForCallLog()` scanned one tab's array; two people
  -- working the same queue each made one and neither saw the other's.
  perform pg_temp.t('K3  one follow-up per call, enforced where it holds',
    state = 'REFUSED' and c = 1, 'state=' || state || ' rows=' || c);
end $$;

do $$
declare c integer;
begin
  insert into public.facility_tasks (facility_id, title) values
    ('00000000-0000-0000-0000-0000001c0020', 'Restock shampoo'),
    ('00000000-0000-0000-0000-0000001c0020', 'Restock shampoo');
  select count(*) into c from public.facility_tasks
   where title = 'Restock shampoo';
  -- The index is PARTIAL. A manual task has no ref and the same errand may
  -- legitimately be written twice.
  perform pg_temp.t('K4  ...but a manual task may be created as often as needed',
    c = 2, 'rows=' || c);
end $$;

do $$
declare state text;
begin
  begin
    insert into public.facility_tasks (facility_id, title, source, source_ref)
    values ('00000000-0000-0000-0000-0000001c0021',
            'Same ref, different facility', 'call_follow_up', 'call-9931');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  -- Keyed per facility, so two businesses numbering their calls the same way
  -- do not collide. Refused here only because the owner is not a member there.
  perform pg_temp.t('K5  the owner cannot write into another facility',
    state = '42501', 'state=' || state);
end $$;

-- ── The assignee's ceiling ────────────────────────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001c0003','role','authenticated')::text, true);
set local role authenticated;

do $$
declare state text; v_id uuid;
begin
  begin
    insert into public.facility_tasks (id, facility_id, title, assigned_to)
    values ('00000000-0000-0000-0000-0000001c0051',
            '00000000-0000-0000-0000-0000001c0020', 'Reconcile the till',
            '00000000-0000-0000-0000-0000001c0041')
    returning id into v_id;
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  -- `manage_own_tasks` and no `ops_manage_tasks`: a reminder to yourself is
  -- exactly what that permission is for.
  perform pg_temp.t('K6  a person with only manage_own_tasks can write themselves a task',
    state = 'ALLOWED' and v_id is not null, 'state=' || state);
end $$;

do $$
declare state text;
begin
  begin
    insert into public.facility_tasks (facility_id, title, assigned_to)
    values ('00000000-0000-0000-0000-0000001c0020', 'You do it',
            '00000000-0000-0000-0000-0000001c0040');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  -- ...and NOT what it is for. Assigning work to somebody else is
  -- `ops_manage_tasks`.
  perform pg_temp.t('K7  ...and cannot assign work to anybody else',
    state = '42501', 'state=' || state);
end $$;

-- ── The assignee's ceiling, measured on the only role that can reach it ───
--
-- STILL THE ACCOUNTANT. A groomer looks like the natural subject here and is
-- the wrong one: they hold `ops_manage_tasks` (at assigned_shifts scope), so
-- the trigger's first branch lets them through and K9/K10 would report
-- ALLOWED — a true answer about a person the guard was never meant to stop.
-- The accountant is the only preset with `manage_own_tasks` and no
-- `ops_manage_tasks` at all.

do $$
declare state text; v_status text; v_rows integer;
begin
  begin
    update public.facility_tasks
       set status = 'in_progress'
     where id = '00000000-0000-0000-0000-0000001c0051';
    get diagnostics v_rows = row_count;
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  select status into v_status from public.facility_tasks
   where id = '00000000-0000-0000-0000-0000001c0051';
  -- Read back rather than trusting the write: an RLS-refused UPDATE touches
  -- zero rows and raises nothing at all.
  perform pg_temp.t('K8  the person holding a task can move it along',
    state = 'ALLOWED' and v_rows = 1 and v_status = 'in_progress',
    'state=' || state || ' rows=' || coalesce(v_rows::text, '-')
      || ' status=' || coalesce(v_status, 'null'));
end $$;

do $$
declare state text; v_assignee uuid;
begin
  begin
    update public.facility_tasks
       set assigned_to = '00000000-0000-0000-0000-0000001c0040'
     where id = '00000000-0000-0000-0000-0000001c0051';
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  select assigned_to into v_assignee from public.facility_tasks
   where id = '00000000-0000-0000-0000-0000001c0051';
  -- THE OTHER POINT. The update policy must admit the assignee so they can
  -- finish their work; without the trigger that also means handing it away.
  perform pg_temp.t('K9  ...but cannot hand it to somebody else',
    state = '42501' and v_assignee = '00000000-0000-0000-0000-0000001c0041',
    'state=' || state || ' assignee=' || coalesce(v_assignee::text, 'null'));
end $$;

do $$
declare state text; v_title text;
begin
  begin
    update public.facility_tasks
       set title = 'Something much easier'
     where id = '00000000-0000-0000-0000-0000001c0051';
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  select title into v_title from public.facility_tasks
   where id = '00000000-0000-0000-0000-0000001c0051';
  perform pg_temp.t('K10 ...nor rewrite what it asks for',
    state = '42501' and v_title = 'Reconcile the till',
    'state=' || state || ' title=' || coalesce(v_title, 'null'));
end $$;

do $$
declare state text; v_assignee uuid;
begin
  begin
    update public.facility_tasks set assigned_to = null
     where id = '00000000-0000-0000-0000-0000001c0051';
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  select assigned_to into v_assignee from public.facility_tasks
   where id = '00000000-0000-0000-0000-0000001c0051';
  -- K15 proves a CASCADE may null this column. This proves that branch is not
  -- a hole: the cascade is admitted only when the staff row is already gone,
  -- so a person cannot use "unassign" as a way to drop work they were given.
  -- Without this, K15's fix would read as "assigned_to may be nulled by
  -- anyone", which is a different rule than the one intended.
  perform pg_temp.t('K16 a person cannot drop the task by unassigning themselves',
    state = '42501' and v_assignee = '00000000-0000-0000-0000-0000001c0041',
    'state=' || state || ' assignee=' || coalesce(v_assignee::text, 'null'));
end $$;

-- ── As the groomer ────────────────────────────────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001c0002','role','authenticated')::text, true);
set local role authenticated;

do $$
declare c integer;
begin
  select count(*) into c from public.facility_tasks
   where assigned_to = '00000000-0000-0000-0000-0000001c0041';
  -- A groomer has `ops_manage_tasks` at assigned_shifts scope, so the read
  -- policy admits them to the facility's tasks. This asserts the accountant's
  -- self-written task is reachable, not hidden — the split that matters is on
  -- WRITING, and K7/K9 are where it is proved.
  perform pg_temp.t('K11 a task written by somebody else is readable by the team',
    c >= 1, 'rows=' || c);
end $$;

do $$
declare state text; c_before integer; c_after integer;
begin
  select count(*) into c_before from public.facility_tasks;
  begin
    delete from public.facility_tasks
     where id = '00000000-0000-0000-0000-0000001c0050';
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  select count(*) into c_after from public.facility_tasks;
  -- Two layers, and both are asserted: the privilege was revoked explicitly
  -- (a default privilege had granted it) AND there is no delete policy. Either
  -- alone would leave the other looking like the thing protecting the row.
  perform pg_temp.t('K12 nobody deletes a task; cancelled is the operation',
    c_after = c_before, 'state=' || state || ' before=' || c_before || ' after=' || c_after);
end $$;

select pg_temp.t('K13 the privilege itself is gone, not merely unused',
  not has_table_privilege('authenticated', 'public.facility_tasks', 'delete')
  and not has_table_privilege('anon', 'public.facility_tasks', 'select'),
  'auth_delete=' || has_table_privilege('authenticated', 'public.facility_tasks', 'delete')::text
  || ' anon_select=' || has_table_privilege('anon', 'public.facility_tasks', 'select')::text);

-- ── Another facility ──────────────────────────────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001c0004','role','authenticated')::text, true);
set local role authenticated;

select pg_temp.t('K14 another facility sees none of it',
  (select count(*) from public.facility_tasks) = 0,
  'rows=' || (select count(*) from public.facility_tasks));

-- ── Somebody leaving does not delete the work they were carrying ──────────

reset role;

do $$
declare state text; v_assignee uuid; c integer;
begin
  begin
    delete from public.staff where id = '00000000-0000-0000-0000-0000001c0040';
    state := 'DELETED';
  exception when others then state := sqlstate || ': ' || sqlerrm;
  end;
  select count(*) into c from public.facility_tasks
   where id = '00000000-0000-0000-0000-0000001c0050';
  select assigned_to into v_assignee from public.facility_tasks
   where id = '00000000-0000-0000-0000-0000001c0050';
  -- `on delete set null`, not cascade. The work still has to be done by
  -- somebody; it becomes unassigned, which is a real state the board shows.
  perform pg_temp.t('K15 a staff member leaving unassigns their tasks, not deletes them',
    state = 'DELETED' and c = 1 and v_assignee is null,
    'state=' || state || ' rows=' || c || ' assignee=' || coalesce(v_assignee::text, 'null'));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
