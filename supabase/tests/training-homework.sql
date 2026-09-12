-- ============================================================================
-- training_homework and training_homework_practice (see the migration
-- a_homework_is_assigned_and_practised).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/training-homework.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- T1  The facility, pet and owner come from the ENROLLMENT — a caller naming
--     another facility gets the enrollment's anyway.
-- T2  The owner reads the homework and logs a practice; the same day twice is
--     one row, and the next due date moves by the cadence.
-- T3  The owner can neither insert a practice nor edit the homework directly.
-- T4  Another facility reads nothing and cannot log a practice.
-- T5  Staff log and respond; the day a practice was logged does not move.
-- T6  Completed homework, or a day not yet come, takes no practice.
-- T7  anon holds nothing, and nobody holds INSERT on the practice table.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_sub text)
returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_sub, 'role', 'authenticated')::text, true);
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000001f7001', 'thw-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001f7002', 'thw-other@example.invalid'),
  ('00000000-0000-0000-0000-0000001f7003', 'thw-client@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001f7001', 'thw-owner@example.invalid', 'Owner'),
  ('00000000-0000-0000-0000-0000001f7002', 'thw-other@example.invalid', 'Other'),
  ('00000000-0000-0000-0000-0000001f7003', 'thw-client@example.invalid', 'Client')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001f7010', 'THW Org', 'thw-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001f7020', '00000000-0000-0000-0000-0000001f7010',
   'Academy', 'thw-a', 'thw-a'),
  ('00000000-0000-0000-0000-0000001f7021', '00000000-0000-0000-0000-0000001f7010',
   'Elsewhere', 'thw-b', 'thw-b')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001f7030', '00000000-0000-0000-0000-0000001f7020',
   '00000000-0000-0000-0000-0000001f7001', 'owner', true),
  ('00000000-0000-0000-0000-0000001f7031', '00000000-0000-0000-0000-0000001f7021',
   '00000000-0000-0000-0000-0000001f7002', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000001f7040', '00000000-0000-0000-0000-0000001f7020',
   'Guest One', 'thw-c1@example.invalid', '00000000-0000-0000-0000-0000001f7003');

insert into public.pets (id, client_id, name, species) values
  ('00000000-0000-0000-0000-0000001f7050', '00000000-0000-0000-0000-0000001f7040', 'Rex', 'dog');

insert into public.training_series
  (id, facility_id, name, day_of_week, start_time, duration_minutes, start_date,
   number_of_sessions, status)
values
  ('00000000-0000-0000-0000-0000001f7060', '00000000-0000-0000-0000-0000001f7020',
   'Puppy Basics', 2, '18:00', 60, current_date, 4, 'active');

insert into public.training_series_enrollments (id, series_id, facility_id, pet_id, client_id)
values
  ('00000000-0000-0000-0000-0000001f7070', '00000000-0000-0000-0000-0000001f7060',
   '00000000-0000-0000-0000-0000001f7020', '00000000-0000-0000-0000-0000001f7050',
   '00000000-0000-0000-0000-0000001f7040');

-- ── T1  facility, pet and owner from the enrollment ─────────────────────────
do $$
declare v_facility uuid; v_pet uuid; v_client uuid;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7001');
  set local role authenticated;
  -- The caller names the WRONG facility; the trigger replaces it.
  insert into public.training_homework
    (id, facility_id, enrollment_id, pet_id, client_id, title, frequency, next_due_date)
  values
    ('00000000-0000-0000-0000-0000001f7080', '00000000-0000-0000-0000-0000001f7021',
     '00000000-0000-0000-0000-0000001f7070', '00000000-0000-0000-0000-0000001f7050',
     '00000000-0000-0000-0000-0000001f7040', 'Sit on cue', 'Daily, 5 minutes', current_date);
  insert into public.training_homework
    (id, facility_id, enrollment_id, pet_id, client_id, title)
  values
    ('00000000-0000-0000-0000-0000001f7081', '00000000-0000-0000-0000-0000001f7020',
     '00000000-0000-0000-0000-0000001f7070', '00000000-0000-0000-0000-0000001f7050',
     '00000000-0000-0000-0000-0000001f7040', 'Loose-leash walk');
  reset role;
  select facility_id, pet_id, client_id into v_facility, v_pet, v_client
    from public.training_homework where id = '00000000-0000-0000-0000-0000001f7080';
  perform pg_temp.t('T1  the enrollment decides the facility, pet and owner',
    v_facility = '00000000-0000-0000-0000-0000001f7020'
      and v_pet = '00000000-0000-0000-0000-0000001f7050'
      and v_client = '00000000-0000-0000-0000-0000001f7040',
    format('facility=%s pet=%s client=%s', v_facility, v_pet, v_client));
exception when others then
  reset role; perform pg_temp.t('T1  insert', false, sqlerrm);
end $$;

-- ── T2  the owner logs a practice, once a day ───────────────────────────────
do $$
declare
  v_seen  integer;
  v_first public.training_homework_practice;
  v_again public.training_homework_practice;
  v_rows  integer;
  v_due   date;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7003');
  set local role authenticated;
  select count(*) into v_seen from public.training_homework
   where client_id = '00000000-0000-0000-0000-0000001f7040';
  v_first := public.log_homework_practice('00000000-0000-0000-0000-0000001f7080', current_date);
  v_again := public.log_homework_practice('00000000-0000-0000-0000-0000001f7080', current_date);
  reset role;
  select count(*) into v_rows from public.training_homework_practice
   where homework_id = '00000000-0000-0000-0000-0000001f7080';
  select next_due_date into v_due from public.training_homework
   where id = '00000000-0000-0000-0000-0000001f7080';
  perform pg_temp.t('T2  the owner reads the homework and logs a practice, once a day',
    v_seen = 2 and v_first.id = v_again.id and v_rows = 1 and v_first.logged_by = 'owner',
    format('seen=%s same=%s rows=%s by=%s', v_seen, v_first.id = v_again.id, v_rows, v_first.logged_by));
  perform pg_temp.t('T2b a daily exercise is next due the day after it was practised',
    v_due = current_date + 1, format('due=%s', v_due));
exception when others then
  reset role; perform pg_temp.t('T2  owner practice', false, sqlerrm);
end $$;

-- ── T3  no direct writes for the owner ──────────────────────────────────────
do $$
declare v_insert_refused boolean := false; v_updated integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7003');
  set local role authenticated;
  begin
    insert into public.training_homework_practice
      (homework_id, facility_id, client_id, practice_date, logged_by)
    values
      ('00000000-0000-0000-0000-0000001f7081', '00000000-0000-0000-0000-0000001f7020',
       '00000000-0000-0000-0000-0000001f7040', current_date, 'owner');
  exception when insufficient_privilege then v_insert_refused := true;
  end;
  update public.training_homework set title = 'Owner edit'
   where id = '00000000-0000-0000-0000-0000001f7081';
  get diagnostics v_updated = row_count;
  reset role;
  perform pg_temp.t('T3  the owner can neither insert a practice nor edit the homework',
    v_insert_refused and v_updated = 0,
    format('insert refused=%s updated=%s', v_insert_refused, v_updated));
exception when others then
  reset role; perform pg_temp.t('T3  owner direct writes', false, sqlerrm);
end $$;

-- ── T4  another facility ────────────────────────────────────────────────────
do $$
declare v_seen integer; v_practice integer; v_refused boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7002');
  set local role authenticated;
  select count(*) into v_seen from public.training_homework
   where enrollment_id = '00000000-0000-0000-0000-0000001f7070';
  select count(*) into v_practice from public.training_homework_practice
   where homework_id = '00000000-0000-0000-0000-0000001f7080';
  begin
    perform public.log_homework_practice('00000000-0000-0000-0000-0000001f7081', current_date);
  exception when insufficient_privilege then v_refused := true;
  end;
  reset role;
  perform pg_temp.t('T4  another facility reads nothing and cannot log a practice',
    v_seen = 0 and v_practice = 0 and v_refused,
    format('seen=%s practice=%s refused=%s', v_seen, v_practice, v_refused));
exception when others then
  reset role; perform pg_temp.t('T4  stranger', false, sqlerrm);
end $$;

-- ── T5  staff log and respond; the day stays ────────────────────────────────
do $$
declare v_staff public.training_homework_practice; v_row public.training_homework_practice;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7001');
  set local role authenticated;
  v_staff := public.log_homework_practice('00000000-0000-0000-0000-0000001f7081', current_date - 1);
  update public.training_homework_practice
     set trainer_response = 'Lovely loose leash.',
         trainer_responded_at = now(),
         trainer_responded_by = 'Owner',
         practice_date = current_date - 5
   where homework_id = '00000000-0000-0000-0000-0000001f7080';
  reset role;
  select * into v_row from public.training_homework_practice
   where homework_id = '00000000-0000-0000-0000-0000001f7080';
  perform pg_temp.t('T5  staff log and respond, and a practice keeps its day',
    v_staff.logged_by = 'staff'
      and v_row.trainer_response = 'Lovely loose leash.'
      and v_row.practice_date = current_date,
    format('staff by=%s response=%s day=%s', v_staff.logged_by, v_row.trainer_response, v_row.practice_date));
exception when others then
  reset role; perform pg_temp.t('T5  respond', false, sqlerrm);
end $$;

-- ── T6  no practice on completed homework, or on a day to come ──────────────
do $$
declare v_future boolean := false; v_complete boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7001');
  set local role authenticated;
  begin
    perform public.log_homework_practice('00000000-0000-0000-0000-0000001f7080', current_date + 5);
  exception when invalid_parameter_value then v_future := true;
  end;
  update public.training_homework set completed_at = now()
   where id = '00000000-0000-0000-0000-0000001f7081';
  begin
    perform public.log_homework_practice('00000000-0000-0000-0000-0000001f7081', current_date);
  exception when invalid_parameter_value then v_complete := true;
  end;
  reset role;
  perform pg_temp.t('T6  completed homework, or a day not yet come, takes no practice',
    v_future and v_complete, format('future refused=%s complete refused=%s', v_future, v_complete));
exception when others then
  reset role; perform pg_temp.t('T6  refusals', false, sqlerrm);
end $$;

-- ── T7  grants ──────────────────────────────────────────────────────────────
select pg_temp.t('T7  anon holds nothing, and nobody inserts a practice directly',
  not has_table_privilege('anon', 'public.training_homework', 'select')
    and not has_table_privilege('anon', 'public.training_homework_practice', 'select')
    and not has_table_privilege('authenticated', 'public.training_homework_practice', 'insert')
    and not has_function_privilege('anon', 'public.log_homework_practice(uuid, date)', 'execute')
    and has_function_privilege('authenticated', 'public.log_homework_practice(uuid, date)', 'execute'));

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
