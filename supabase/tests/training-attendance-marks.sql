-- ============================================================================
-- training_attendance.mark and training_attendance_history() (see the
-- migration a_training_absence_is_recorded).
--
--   bun run test:sql training-attendance-marks
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- T1  Staff record a late arrival and an absence.
-- T2  A mark agrees with the times: no absence with a check-in, no late
--     without one, and no word that is not a mark.
-- T3  The history is every ended or recorded session of an enrolled dog — a
--     session ahead with nothing recorded is not in it, and an ended one with
--     no row still is.
-- T4  The owner reads their own dog's history.
-- T5  Another facility reads none of it.
-- T6  anon cannot read it.
-- T7  Staff save a dog's exercise ratings, and the history returns them.
-- T8  A rating is a whole 1-5 on a named exercise, and an absent or excused
--     dog has none (20260913104649).
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
  ('00000000-0000-0000-0000-0000001f9001', 'tam-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001f9002', 'tam-other@example.invalid'),
  ('00000000-0000-0000-0000-0000001f9003', 'tam-client@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001f9001', 'tam-owner@example.invalid', 'Owner'),
  ('00000000-0000-0000-0000-0000001f9002', 'tam-other@example.invalid', 'Other'),
  ('00000000-0000-0000-0000-0000001f9003', 'tam-client@example.invalid', 'Client')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001f9010', 'TAM Org', 'tam-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001f9020', '00000000-0000-0000-0000-0000001f9010',
   'Academy', 'tam-a', 'tam-a'),
  ('00000000-0000-0000-0000-0000001f9021', '00000000-0000-0000-0000-0000001f9010',
   'Elsewhere', 'tam-b', 'tam-b')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001f9030', '00000000-0000-0000-0000-0000001f9020',
   '00000000-0000-0000-0000-0000001f9001', 'owner', true),
  ('00000000-0000-0000-0000-0000001f9031', '00000000-0000-0000-0000-0000001f9021',
   '00000000-0000-0000-0000-0000001f9002', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000001f9040', '00000000-0000-0000-0000-0000001f9020',
   'Guest One', 'tam-c1@example.invalid', '00000000-0000-0000-0000-0000001f9003');

insert into public.pets (id, client_id, name, species) values
  ('00000000-0000-0000-0000-0000001f9050', '00000000-0000-0000-0000-0000001f9040', 'Rex', 'dog');

insert into public.training_series
  (id, facility_id, name, course_type_name, day_of_week, start_time, duration_minutes,
   start_date, number_of_sessions, capacity, status)
values
  ('00000000-0000-0000-0000-0000001f9060', '00000000-0000-0000-0000-0000001f9020',
   'Puppy Basics Tuesday', 'Puppy Basics', 2, '18:00', 60, current_date - 14, 4, 6, 'active');

insert into public.training_series_sessions
  (id, series_id, facility_id, session_number, start_at, end_at, status)
values
  ('00000000-0000-0000-0000-0000001f9070', '00000000-0000-0000-0000-0000001f9060',
   '00000000-0000-0000-0000-0000001f9020', 1, now() - interval '9 days', now() - interval '9 days' + interval '1 hour', 'completed'),
  ('00000000-0000-0000-0000-0000001f9071', '00000000-0000-0000-0000-0000001f9060',
   '00000000-0000-0000-0000-0000001f9020', 2, now() - interval '2 days', now() - interval '2 days' + interval '1 hour', 'completed'),
  ('00000000-0000-0000-0000-0000001f9072', '00000000-0000-0000-0000-0000001f9060',
   '00000000-0000-0000-0000-0000001f9020', 3, now() + interval '5 days', now() + interval '5 days' + interval '1 hour', 'scheduled');

insert into public.training_series_enrollments (id, series_id, facility_id, pet_id, client_id)
values
  ('00000000-0000-0000-0000-0000001f9080', '00000000-0000-0000-0000-0000001f9060',
   '00000000-0000-0000-0000-0000001f9020', '00000000-0000-0000-0000-0000001f9050',
   '00000000-0000-0000-0000-0000001f9040');

insert into public.bookings
  (id, facility_id, client_id, service, service_type, status, start_at, end_at,
   base_price, total_cost, training_series_session_id)
values
  ('00000000-0000-0000-0000-0000001f9090', '00000000-0000-0000-0000-0000001f9020',
   '00000000-0000-0000-0000-0000001f9040', 'training', 'Puppy Basics', 'confirmed',
   now() - interval '9 days', now() - interval '9 days' + interval '1 hour', 50, 50,
   '00000000-0000-0000-0000-0000001f9070'),
  ('00000000-0000-0000-0000-0000001f9091', '00000000-0000-0000-0000-0000001f9020',
   '00000000-0000-0000-0000-0000001f9040', 'training', 'Puppy Basics', 'confirmed',
   now() - interval '2 days', now() - interval '2 days' + interval '1 hour', 50, 50,
   '00000000-0000-0000-0000-0000001f9071'),
  ('00000000-0000-0000-0000-0000001f9092', '00000000-0000-0000-0000-0000001f9020',
   '00000000-0000-0000-0000-0000001f9040', 'training', 'Puppy Basics', 'confirmed',
   now() + interval '5 days', now() + interval '5 days' + interval '1 hour', 50, 50,
   '00000000-0000-0000-0000-0000001f9072');

insert into public.booking_pets (booking_id, pet_id) values
  ('00000000-0000-0000-0000-0000001f9090', '00000000-0000-0000-0000-0000001f9050'),
  ('00000000-0000-0000-0000-0000001f9091', '00000000-0000-0000-0000-0000001f9050'),
  ('00000000-0000-0000-0000-0000001f9092', '00000000-0000-0000-0000-0000001f9050');

-- ── T1  staff record late and absent ────────────────────────────────────────
do $$
declare v_late text; v_absent text; v_in timestamptz;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f9001');
  set local role authenticated;
  insert into public.training_attendance (booking_id, facility_id, checked_in_at, checked_out_at, mark)
  values ('00000000-0000-0000-0000-0000001f9090', '00000000-0000-0000-0000-0000001f9020',
          now() - interval '9 days' + interval '10 minutes', now() - interval '9 days' + interval '1 hour', 'late');
  insert into public.training_attendance (booking_id, facility_id, mark, session_notes)
  values ('00000000-0000-0000-0000-0000001f9091', '00000000-0000-0000-0000-0000001f9020',
          'absent', 'No call.');
  reset role;
  select mark into v_late from public.training_attendance where booking_id = '00000000-0000-0000-0000-0000001f9090';
  select mark, checked_in_at into v_absent, v_in from public.training_attendance where booking_id = '00000000-0000-0000-0000-0000001f9091';
  perform pg_temp.t('T1  staff record a late arrival and an absence',
    v_late = 'late' and v_absent = 'absent' and v_in is null,
    format('late=%s absent=%s check_in=%s', v_late, v_absent, coalesce(v_in::text, '<null>')));
exception when others then
  reset role; perform pg_temp.t('T1  record', false, sqlerrm);
end $$;

-- ── T2  a mark agrees with the times ────────────────────────────────────────
do $$
declare v_absent_in boolean := false; v_late_out boolean := false; v_word boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f9001');
  set local role authenticated;
  begin
    update public.training_attendance set checked_in_at = now()
     where booking_id = '00000000-0000-0000-0000-0000001f9091';
  exception when check_violation then v_absent_in := true;
  end;
  begin
    update public.training_attendance set checked_in_at = null, checked_out_at = null
     where booking_id = '00000000-0000-0000-0000-0000001f9090';
  exception when check_violation then v_late_out := true;
  end;
  begin
    update public.training_attendance set mark = 'sick'
     where booking_id = '00000000-0000-0000-0000-0000001f9091';
  exception when check_violation then v_word := true;
  end;
  reset role;
  perform pg_temp.t('T2  no absence with a check-in, no late without one, no unknown mark',
    v_absent_in and v_late_out and v_word,
    format('absent+in=%s late-no-in=%s unknown=%s', v_absent_in, v_late_out, v_word));
exception when others then
  reset role; perform pg_temp.t('T2  constraints', false, sqlerrm);
end $$;

-- ── T3  the history ─────────────────────────────────────────────────────────
do $$
declare
  v_ref bigint;
  v_rows integer; v_ahead integer; v_late text; v_absent text;
  v_after integer; v_unrecorded text;
begin
  select ref into v_ref from public.pets where id = '00000000-0000-0000-0000-0000001f9050';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f9001');
  set local role authenticated;
  select count(*),
         count(*) filter (where booking_id = '00000000-0000-0000-0000-0000001f9092'),
         max(mark) filter (where booking_id = '00000000-0000-0000-0000-0000001f9090'),
         max(mark) filter (where booking_id = '00000000-0000-0000-0000-0000001f9091')
    into v_rows, v_ahead, v_late, v_absent
    from public.training_attendance_history('00000000-0000-0000-0000-0000001f9020', v_ref);
  delete from public.training_attendance where booking_id = '00000000-0000-0000-0000-0000001f9091';
  select count(*), coalesce(max(mark) filter (where booking_id = '00000000-0000-0000-0000-0000001f9091'), '<none>')
    into v_after, v_unrecorded
    from public.training_attendance_history('00000000-0000-0000-0000-0000001f9020', v_ref);
  reset role;
  perform pg_temp.t('T3  every ended or recorded session, and an ended one with no row still',
    v_rows = 2 and v_ahead = 0 and v_late = 'late' and v_absent = 'absent'
      and v_after = 2 and v_unrecorded = '<none>',
    format('rows=%s ahead=%s late=%s absent=%s after delete=%s unrecorded mark=%s',
      v_rows, v_ahead, v_late, v_absent, v_after, v_unrecorded));
exception when others then
  reset role; perform pg_temp.t('T3  history', false, sqlerrm);
end $$;

-- ── T4  the owner reads their own ───────────────────────────────────────────
do $$
declare v_rows integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f9003');
  set local role authenticated;
  select count(*) into v_rows from public.training_attendance_history()
   where booking_id in ('00000000-0000-0000-0000-0000001f9090', '00000000-0000-0000-0000-0000001f9091');
  reset role;
  perform pg_temp.t('T4  the owner reads their own dog''s history', v_rows = 2,
    format('rows=%s', v_rows));
exception when others then
  reset role; perform pg_temp.t('T4  owner', false, sqlerrm);
end $$;

-- ── T5  another facility ────────────────────────────────────────────────────
do $$
declare v_rows integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f9002');
  set local role authenticated;
  select count(*) into v_rows from public.training_attendance_history()
   where booking_id in ('00000000-0000-0000-0000-0000001f9090', '00000000-0000-0000-0000-0000001f9091');
  reset role;
  perform pg_temp.t('T5  another facility reads none of it', v_rows = 0,
    format('rows=%s', v_rows));
exception when others then
  reset role; perform pg_temp.t('T5  stranger', false, sqlerrm);
end $$;

-- ── T6  grants ──────────────────────────────────────────────────────────────
select pg_temp.t('T6  anon cannot read the history',
  not has_function_privilege('anon', 'public.training_attendance_history(uuid, bigint)', 'execute')
    and has_function_privilege('authenticated', 'public.training_attendance_history(uuid, bigint)', 'execute'));

-- ── T7  exercise ratings are kept and read back ─────────────────────────────
do $$
declare v_ref bigint; v_name text; v_rating text;
begin
  select ref into v_ref from public.pets where id = '00000000-0000-0000-0000-0000001f9050';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f9001');
  set local role authenticated;
  update public.training_attendance
     set exercises = '[{"exerciseName": "Sit", "rating": 4}, {"exerciseName": "Recall", "rating": 2}]'
   where booking_id = '00000000-0000-0000-0000-0000001f9090';
  select exercises -> 0 ->> 'exerciseName', exercises -> 0 ->> 'rating'
    into v_name, v_rating
    from public.training_attendance_history('00000000-0000-0000-0000-0000001f9020', v_ref)
   where booking_id = '00000000-0000-0000-0000-0000001f9090';
  reset role;
  perform pg_temp.t('T7  staff save a dog''s exercise ratings and the history returns them',
    v_name = 'Sit' and v_rating = '4',
    format('name=%s rating=%s', v_name, v_rating));
exception when others then
  reset role; perform pg_temp.t('T7  ratings', false, sqlerrm);
end $$;

-- ── T8  a rating is a rating, and an absent dog has none ────────────────────
do $$
declare v_six boolean := false; v_nameless boolean := false; v_absent boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f9001');
  set local role authenticated;
  begin
    update public.training_attendance set exercises = '[{"exerciseName": "Sit", "rating": 6}]'
     where booking_id = '00000000-0000-0000-0000-0000001f9090';
  exception when check_violation then v_six := true;
  end;
  begin
    update public.training_attendance set exercises = '[{"rating": 3}]'
     where booking_id = '00000000-0000-0000-0000-0000001f9090';
  exception when check_violation then v_nameless := true;
  end;
  begin
    insert into public.training_attendance (booking_id, facility_id, mark, exercises)
    values ('00000000-0000-0000-0000-0000001f9092', '00000000-0000-0000-0000-0000001f9020',
            'excused', '[{"exerciseName": "Sit", "rating": 3}]');
  exception when check_violation then v_absent := true;
  end;
  reset role;
  perform pg_temp.t('T8  no rating outside 1-5, no nameless exercise, no exercises for an absent dog',
    v_six and v_nameless and v_absent,
    format('six=%s nameless=%s absent=%s', v_six, v_nameless, v_absent));
exception when others then
  reset role; perform pg_temp.t('T8  rating constraints', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
