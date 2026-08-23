-- ============================================================================
-- Schedule templates — the timezone, the night shift, and applying once
-- (20260823900000).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/schedule-templates.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ────────────────────────────────────────
--
-- S4 AND S5 ARE THE POINT, and they are about the same mistake from two sides.
--
-- S4: a template says "Tuesday, 08:00" and means 08:00 WHERE THE KENNELS ARE.
-- Reading that as UTC is not a rounding error — it is how a UTC window dropped
-- every night shift out of its own day here once before, which is in the debt
-- map. The fixture facility sits in America/Toronto, so a correct 08:00 local
-- is 12:00Z in August and the assertion says so in both directions.
--
-- S5: a night shift runs 22:00 to 06:00, and `end_time` is therefore ALLOWED to
-- be at or before `start_time`. A `check (end_time > start_time)` would have
-- looked obviously right and refused every night shift in the business.
--
-- ── EVERY REFUSAL HAS A POSITIVE CONTROL ──────────────────────────────────
--
-- The actor for the write refusals is a SUPERVISOR, and that is load-bearing:
-- they hold `scheduling_edit_shifts` and NOT `scheduling_create_shifts`. So S9
-- proves they can edit a shift that exists, and S10 that they still cannot
-- conjure a week of them. A caretaker would have proved nothing — they hold
-- neither, and "cannot apply a template" is true of somebody who cannot do
-- anything at all.
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
  ('00000000-0000-0000-0000-0000001e0001', 'st-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001e0002', 'st-supervisor@example.invalid'),
  ('00000000-0000-0000-0000-0000001e0003', 'st-rival@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001e0001', 'st-owner@example.invalid', 'ST Owner'),
  ('00000000-0000-0000-0000-0000001e0002', 'st-supervisor@example.invalid', 'ST Supervisor'),
  ('00000000-0000-0000-0000-0000001e0003', 'st-rival@example.invalid', 'ST Rival')
on conflict (id) do nothing;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001e0010', 'ST Org', 'st-org'),
  ('00000000-0000-0000-0000-0000001e0011', 'ST Rival Org', 'st-rival-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug) values
  ('00000000-0000-0000-0000-0000001e0020', '00000000-0000-0000-0000-0000001e0010',
   'ST Facility', 'st-facility'),
  ('00000000-0000-0000-0000-0000001e0021', '00000000-0000-0000-0000-0000001e0011',
   'ST Rival Facility', 'st-rival-facility')
on conflict (id) do nothing;

-- THE TIMEZONE UNDER TEST. Not UTC, deliberately — a fixture in UTC cannot
-- tell a correct conversion from no conversion at all.
insert into public.locations (id, facility_id, name, is_primary, timezone) values
  ('00000000-0000-0000-0000-0000001e0025', '00000000-0000-0000-0000-0000001e0020',
   'ST Main', true, 'America/Toronto')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001e0030', '00000000-0000-0000-0000-0000001e0020',
   '00000000-0000-0000-0000-0000001e0001', 'owner', true),
  -- `scheduling_edit_shifts` and NO `scheduling_create_shifts`. The only
  -- combination that can reach the refusal in S10 without being unable to do
  -- anything at all.
  ('00000000-0000-0000-0000-0000001e0031', '00000000-0000-0000-0000-0000001e0020',
   '00000000-0000-0000-0000-0000001e0002', 'supervisor', true),
  ('00000000-0000-0000-0000-0000001e0032', '00000000-0000-0000-0000-0000001e0021',
   '00000000-0000-0000-0000-0000001e0003', 'owner', true)
on conflict (id) do nothing;

insert into public.facility_departments (id, facility_id, name, color) values
  ('00000000-0000-0000-0000-0000001e0040', '00000000-0000-0000-0000-0000001e0020',
   'ST Kennels', '#333333')
on conflict (id) do nothing;

insert into public.facility_positions (id, facility_id, department_id, name) values
  ('00000000-0000-0000-0000-0000001e0045', '00000000-0000-0000-0000-0000001e0020',
   '00000000-0000-0000-0000-0000001e0040', 'ST Attendant')
on conflict (id) do nothing;

insert into public.staff
  (id, facility_id, membership_id, legacy_id, first_name, last_name, email,
   primary_role, status)
values
  ('00000000-0000-0000-0000-0000001e0050', '00000000-0000-0000-0000-0000001e0020',
   '00000000-0000-0000-0000-0000001e0031', 'st-supervisor', 'ST', 'Supervisor',
   'st-supervisor@example.invalid', 'supervisor', 'active')
on conflict (id) do nothing;

-- ── As the owner ──────────────────────────────────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001e0001','role','authenticated')::text, true);
set local role authenticated;

do $$
declare state text;
begin
  begin
    insert into public.schedule_templates (facility_id, name)
    values ('00000000-0000-0000-0000-0000001e0020', '   ');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t('S1  a template with no name cannot be created',
    state = '23514', 'state=' || state);
end $$;

do $$
declare bad_day text; bad_slots text;
begin
  insert into public.schedule_templates (id, facility_id, name, description)
  values ('00000000-0000-0000-0000-0000001e0060',
          '00000000-0000-0000-0000-0000001e0020', 'ST Regular Week',
          'The shape of an ordinary week.');

  begin
    insert into public.schedule_template_shifts
      (template_id, day_of_week, department_id, position_id, start_time, end_time)
    values ('00000000-0000-0000-0000-0000001e0060', 9,
            '00000000-0000-0000-0000-0000001e0040',
            '00000000-0000-0000-0000-0000001e0045', time '08:00', time '16:00');
    bad_day := 'ALLOWED';
  exception when others then bad_day := sqlstate;
  end;

  begin
    insert into public.schedule_template_shifts
      (template_id, day_of_week, department_id, position_id, start_time, end_time, slots)
    values ('00000000-0000-0000-0000-0000001e0060', 1,
            '00000000-0000-0000-0000-0000001e0040',
            '00000000-0000-0000-0000-0000001e0045', time '08:00', time '16:00', 0);
    bad_slots := 'ALLOWED';
  exception when others then bad_slots := sqlstate;
  end;

  perform pg_temp.t('S2  a day outside the week and a shift with no slots are both refused',
    bad_day = '23514' and bad_slots = '23514',
    format('day=%s slots=%s', bad_day, bad_slots));
end $$;

do $$
declare c integer;
begin
  insert into public.schedule_template_shifts
    (id, template_id, day_of_week, staff_id, department_id, position_id,
     start_time, end_time, break_minutes, sort_order)
  values
    -- Tuesday day shift, assigned.
    ('00000000-0000-0000-0000-0000001e0070', '00000000-0000-0000-0000-0000001e0060',
     2, '00000000-0000-0000-0000-0000001e0050',
     '00000000-0000-0000-0000-0000001e0040', '00000000-0000-0000-0000-0000001e0045',
     time '08:00', time '16:30', 30, 1),
    -- Tuesday NIGHT shift, unassigned. 22:00 -> 06:00 the next morning.
    ('00000000-0000-0000-0000-0000001e0071', '00000000-0000-0000-0000-0000001e0060',
     2, null,
     '00000000-0000-0000-0000-0000001e0040', '00000000-0000-0000-0000-0000001e0045',
     time '22:00', time '06:00', 0, 2);

  select count(*) into c from public.schedule_template_shifts
   where template_id = '00000000-0000-0000-0000-0000001e0060';

  -- The positive control S1 and S2 are measured against, and the proof that an
  -- OPEN line (null staff) is permitted: a slot the roster still has to fill.
  perform pg_temp.t('S3  the owner can build a week, including an unassigned night shift',
    c = 2, 'lines=' || c);
end $$;

-- ── The timezone, and the night that crosses midnight ─────────────────────

do $$
declare v_created integer; v_day_start timestamptz; v_day_end timestamptz;
        v_night_start timestamptz; v_night_end timestamptz; v_status text;
        v_recurrence uuid; v_application uuid;
begin
  -- 2026-08-23 is a Sunday, so day_of_week 2 lands on Tuesday 2026-08-25.
  select count(*) into v_created from public.apply_schedule_template(
    '00000000-0000-0000-0000-0000001e0060', date '2026-08-23');

  select starts_at, ends_at, status::text, recurrence_id
    into v_day_start, v_day_end, v_status, v_recurrence
    from public.staff_shifts
   where recurrence_id is not null
     and facility_id = '00000000-0000-0000-0000-0000001e0020'
     and staff_id = '00000000-0000-0000-0000-0000001e0050';

  select id into v_application from public.schedule_template_applications
   where template_id = '00000000-0000-0000-0000-0000001e0060';

  -- 08:00 in America/Toronto on 2026-08-25 is 12:00Z — the offset is -4 in
  -- August. Asserted as an absolute instant, so "no conversion happened" and
  -- "the wrong conversion happened" both fail.
  perform pg_temp.t('S4  a template time is the FACILITY''s time, not UTC',
    v_created = 2
      and v_day_start = timestamptz '2026-08-25 12:00:00+00'
      and v_day_end   = timestamptz '2026-08-25 20:30:00+00'
      and v_status = 'draft'
      and v_recurrence = v_application,
    format('created=%s start=%s end=%s status=%s recurrence_matches=%s',
           v_created, v_day_start, v_day_end, v_status,
           (v_recurrence = v_application)));
end $$;

do $$
declare v_start timestamptz; v_end timestamptz;
begin
  select starts_at, ends_at into v_start, v_end
    from public.staff_shifts
   where facility_id = '00000000-0000-0000-0000-0000001e0020'
     and staff_id is null
     and recurrence_id is not null;

  -- 22:00 Tuesday to 06:00 WEDNESDAY. `end_time <= start_time` means the next
  -- day; a `check (end_time > start_time)` would have refused this line
  -- outright and looked perfectly reasonable doing it.
  perform pg_temp.t('S5  a night shift ends the next morning, not eight hours earlier',
    v_start = timestamptz '2026-08-26 02:00:00+00'   -- 22:00 Tue in Toronto
      and v_end = timestamptz '2026-08-26 10:00:00+00' -- 06:00 Wed in Toronto
      and v_end > v_start,
    format('start=%s end=%s', v_start, v_end));
end $$;

do $$
declare v_second integer; v_total integer; v_apps integer;
begin
  select count(*) into v_second from public.apply_schedule_template(
    '00000000-0000-0000-0000-0000001e0060', date '2026-08-23');

  select count(*) into v_total from public.staff_shifts
   where facility_id = '00000000-0000-0000-0000-0000001e0020';
  select count(*) into v_apps from public.schedule_template_applications
   where template_id = '00000000-0000-0000-0000-0000001e0060';

  -- The button exists, two people may press it, and a retry will happen. The
  -- unique constraint means the week is created once and the function returns
  -- nothing rather than raising — so the screen can say "already applied".
  perform pg_temp.t('S6  applying the same week again creates nothing',
    v_second = 0 and v_total = 2 and v_apps = 1,
    format('second=%s shifts=%s applications=%s', v_second, v_total, v_apps));
end $$;

do $$
declare v_created integer; v_total integer;
begin
  select count(*) into v_created from public.apply_schedule_template(
    '00000000-0000-0000-0000-0000001e0060', date '2026-08-30');
  select count(*) into v_total from public.staff_shifts
   where facility_id = '00000000-0000-0000-0000-0000001e0020';

  -- ...but the NEXT week is a different week. The control for S6: without it,
  -- "applying again creates nothing" would pass just as well against a
  -- function that had stopped working entirely.
  perform pg_temp.t('S7  the following week is a different week',
    v_created = 2 and v_total = 4,
    format('created=%s total=%s', v_created, v_total));
end $$;

do $$
declare state text;
begin
  update public.schedule_templates set is_active = false
   where id = '00000000-0000-0000-0000-0000001e0060';
  begin
    perform public.apply_schedule_template(
      '00000000-0000-0000-0000-0000001e0060', date '2026-09-06');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  update public.schedule_templates set is_active = true
   where id = '00000000-0000-0000-0000-0000001e0060';

  perform pg_temp.t('S8  a retired template cannot be applied',
    state = '22023', 'state=' || state);
end $$;

-- ── The supervisor: edits shifts, does not create weeks ───────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001e0002','role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_rows integer; v_notes text;
begin
  update public.staff_shifts set notes = 'Covered by ST Supervisor'
   where facility_id = '00000000-0000-0000-0000-0000001e0020'
     and staff_id = '00000000-0000-0000-0000-0000001e0050';
  get diagnostics v_rows = row_count;

  select notes into v_notes from public.staff_shifts
   where facility_id = '00000000-0000-0000-0000-0000001e0020'
     and staff_id = '00000000-0000-0000-0000-0000001e0050'
   limit 1;

  -- THE POSITIVE CONTROL for S10. A supervisor really can change the roster;
  -- what they cannot do is conjure one.
  perform pg_temp.t('S9  a supervisor can edit a shift that exists',
    v_rows >= 1 and v_notes = 'Covered by ST Supervisor',
    format('rows=%s notes=%s', v_rows, coalesce(v_notes, 'null')));
end $$;

do $$
declare tmpl_state text; apply_state text; v_total integer;
begin
  begin
    insert into public.schedule_templates (facility_id, name)
    values ('00000000-0000-0000-0000-0000001e0020', 'ST Supervisor Week');
    tmpl_state := 'ALLOWED';
  exception when others then tmpl_state := sqlstate;
  end;

  begin
    perform public.apply_schedule_template(
      '00000000-0000-0000-0000-0000001e0060', date '2026-09-13');
    apply_state := 'ALLOWED';
  exception when others then apply_state := sqlstate;
  end;

  select count(*) into v_total from public.staff_shifts
   where facility_id = '00000000-0000-0000-0000-0000001e0020';

  -- SECURITY INVOKER is what makes this hold: the function inserts as the
  -- caller, so `staff_shifts_insert` still asks for `scheduling_create_shifts`.
  -- A definer would have handed a supervisor a week of shifts they may not
  -- create one at a time.
  perform pg_temp.t('S10 ...and cannot write a template or apply one',
    tmpl_state = '42501' and apply_state = '42501' and v_total = 4,
    format('template=%s apply=%s shifts=%s', tmpl_state, apply_state, v_total));
end $$;

-- ── Another facility ──────────────────────────────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001e0003','role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_templates integer; v_lines integer; v_apps integer; state text;
begin
  select count(*) into v_templates from public.schedule_templates;
  select count(*) into v_lines     from public.schedule_template_shifts;
  select count(*) into v_apps      from public.schedule_template_applications;
  begin
    perform public.apply_schedule_template(
      '00000000-0000-0000-0000-0000001e0060', date '2026-09-20');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;

  -- Unreadable, so the function cannot even confirm the template exists.
  perform pg_temp.t('S11 another facility sees none of it and cannot apply it',
    v_templates = 0 and v_lines = 0 and v_apps = 0 and state = '42501',
    format('templates=%s lines=%s apps=%s apply=%s',
           v_templates, v_lines, v_apps, state));
end $$;

-- ── Undoing a week ────────────────────────────────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001e0001','role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_app uuid; v_removed integer; v_left integer;
begin
  select id into v_app from public.schedule_template_applications
   where template_id = '00000000-0000-0000-0000-0000001e0060'
     and week_start = date '2026-08-30';

  delete from public.staff_shifts where recurrence_id = v_app;
  get diagnostics v_removed = row_count;
  delete from public.schedule_template_applications where id = v_app;

  select count(*) into v_left from public.staff_shifts
   where facility_id = '00000000-0000-0000-0000-0000001e0020';

  -- `recurrence_id` already meant "every shift from one series carries this",
  -- so undoing a week is a where clause rather than a guess about which rows
  -- came from where. The FIRST week is untouched, which is the half that
  -- matters — an undo that took both weeks would pass a naive count.
  perform pg_temp.t('S12 undoing a week removes that week and leaves the other',
    v_removed = 2 and v_left = 2,
    format('removed=%s left=%s', v_removed, v_left));
end $$;

do $$
declare v_shifts integer; v_lines integer;
begin
  delete from public.schedule_templates
   where id = '00000000-0000-0000-0000-0000001e0060';

  select count(*) into v_lines from public.schedule_template_shifts
   where template_id = '00000000-0000-0000-0000-0000001e0060';
  select count(*) into v_shifts from public.staff_shifts
   where facility_id = '00000000-0000-0000-0000-0000001e0020';

  -- The template's LINES go with it; the SHIFTS already published to a week do
  -- not. Somebody is rostered on those days and deleting the template they came
  -- from is not a statement about whether they are working.
  perform pg_temp.t('S13 deleting a template takes its lines and leaves the shifts it made',
    v_lines = 0 and v_shifts = 2,
    format('lines=%s shifts=%s', v_lines, v_shifts));
end $$;

-- ── Privileges, asserted rather than assumed ──────────────────────────────

reset role;

select pg_temp.t('S14 anon reads none of the three tables and cannot apply',
  not has_table_privilege('anon', 'public.schedule_templates', 'select')
  and not has_table_privilege('anon', 'public.schedule_template_shifts', 'select')
  and not has_table_privilege('anon', 'public.schedule_template_applications', 'select')
  and not has_function_privilege('anon', 'public.apply_schedule_template(uuid, date)', 'execute'),
  'anon_templates=' || has_table_privilege('anon', 'public.schedule_templates', 'select')::text
  || ' anon_exec=' || has_function_privilege('anon', 'public.apply_schedule_template(uuid, date)', 'execute')::text);

select pg_temp.t('S15 an application cannot be edited, and the function is SECURITY INVOKER',
  not has_table_privilege('authenticated', 'public.schedule_template_applications', 'update')
  and not (select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'apply_schedule_template'),
  'app_update=' || has_table_privilege('authenticated', 'public.schedule_template_applications', 'update')::text
  || ' definer=' || (select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                      where n.nspname = 'public' and p.proname = 'apply_schedule_template')::text);

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
