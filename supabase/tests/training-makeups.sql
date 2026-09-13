-- ============================================================================
-- training_makeups and the make-up functions (see the migration
-- a_missed_training_session_can_be_made_up).
--
--   bun run test:sql training-makeups
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- T1  A missed session is derived: the owner sees the booking that never
--     checked in, and not the one that did.
-- T2  The owner asks for a make-up; asking twice is one row.
-- T3  Nobody writes the table directly.
-- T4  Staff are offered only future sessions of the same course, with room,
--     in another series — and an offer into another course is refused.
-- T5  An offer books the dog a confirmed seat at $0.
-- T6  The owner declines it, and the seat's booking is cancelled.
-- T7  The owner skips the session, and staff can no longer offer.
-- T8  Staff mark it ineligible only with a reason, and the owner can no
--     longer ask.
-- T9  Another facility reads nothing and can do nothing.
-- T10 anon holds nothing, and authenticated only reads the table.
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
  ('00000000-0000-0000-0000-0000001f8001', 'tmk-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001f8002', 'tmk-other@example.invalid'),
  ('00000000-0000-0000-0000-0000001f8003', 'tmk-client@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001f8001', 'tmk-owner@example.invalid', 'Owner'),
  ('00000000-0000-0000-0000-0000001f8002', 'tmk-other@example.invalid', 'Other'),
  ('00000000-0000-0000-0000-0000001f8003', 'tmk-client@example.invalid', 'Client')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001f8010', 'TMK Org', 'tmk-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001f8020', '00000000-0000-0000-0000-0000001f8010',
   'Academy', 'tmk-a', 'tmk-a'),
  ('00000000-0000-0000-0000-0000001f8021', '00000000-0000-0000-0000-0000001f8010',
   'Elsewhere', 'tmk-b', 'tmk-b')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001f8030', '00000000-0000-0000-0000-0000001f8020',
   '00000000-0000-0000-0000-0000001f8001', 'owner', true),
  ('00000000-0000-0000-0000-0000001f8031', '00000000-0000-0000-0000-0000001f8021',
   '00000000-0000-0000-0000-0000001f8002', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000001f8040', '00000000-0000-0000-0000-0000001f8020',
   'Guest One', 'tmk-c1@example.invalid', '00000000-0000-0000-0000-0000001f8003');

insert into public.pets (id, client_id, name, species) values
  ('00000000-0000-0000-0000-0000001f8050', '00000000-0000-0000-0000-0000001f8040', 'Rex', 'dog');

-- The dog's own series, another of the same course, and one of another course.
insert into public.training_series
  (id, facility_id, name, course_type_name, day_of_week, start_time, duration_minutes,
   start_date, number_of_sessions, capacity, status)
values
  ('00000000-0000-0000-0000-0000001f8060', '00000000-0000-0000-0000-0000001f8020',
   'Puppy Basics Tuesday', 'Puppy Basics', 2, '18:00', 60, current_date - 7, 4, 6, 'active'),
  ('00000000-0000-0000-0000-0000001f8061', '00000000-0000-0000-0000-0000001f8020',
   'Puppy Basics Saturday', 'Puppy Basics', 6, '10:00', 60, current_date, 4, 1, 'active'),
  ('00000000-0000-0000-0000-0000001f8062', '00000000-0000-0000-0000-0000001f8020',
   'Agility Intro', 'Agility', 4, '19:00', 60, current_date, 4, 6, 'active');

insert into public.training_series_sessions
  (id, series_id, facility_id, session_number, start_at, end_at, status)
values
  -- Two held sessions of the dog's own series.
  ('00000000-0000-0000-0000-0000001f8070', '00000000-0000-0000-0000-0000001f8060',
   '00000000-0000-0000-0000-0000001f8020', 1, now() - interval '9 days', now() - interval '9 days' + interval '1 hour', 'completed'),
  ('00000000-0000-0000-0000-0000001f8071', '00000000-0000-0000-0000-0000001f8060',
   '00000000-0000-0000-0000-0000001f8020', 2, now() - interval '2 days', now() - interval '2 days' + interval '1 hour', 'completed'),
  -- Ahead: the same course in another series, and another course.
  ('00000000-0000-0000-0000-0000001f8072', '00000000-0000-0000-0000-0000001f8061',
   '00000000-0000-0000-0000-0000001f8020', 1, now() + interval '3 days', now() + interval '3 days' + interval '1 hour', 'scheduled'),
  ('00000000-0000-0000-0000-0000001f8073', '00000000-0000-0000-0000-0000001f8062',
   '00000000-0000-0000-0000-0000001f8020', 1, now() + interval '4 days', now() + interval '4 days' + interval '1 hour', 'scheduled');

insert into public.training_series_enrollments (id, series_id, facility_id, pet_id, client_id)
values
  ('00000000-0000-0000-0000-0000001f8080', '00000000-0000-0000-0000-0000001f8060',
   '00000000-0000-0000-0000-0000001f8020', '00000000-0000-0000-0000-0000001f8050',
   '00000000-0000-0000-0000-0000001f8040');

-- Session 1 was attended; session 2 was missed.
insert into public.bookings
  (id, facility_id, client_id, service, service_type, status, start_at, end_at,
   base_price, total_cost, training_series_session_id)
values
  ('00000000-0000-0000-0000-0000001f8090', '00000000-0000-0000-0000-0000001f8020',
   '00000000-0000-0000-0000-0000001f8040', 'training', 'Puppy Basics', 'completed',
   now() - interval '9 days', now() - interval '9 days' + interval '1 hour', 50, 50,
   '00000000-0000-0000-0000-0000001f8070'),
  ('00000000-0000-0000-0000-0000001f8091', '00000000-0000-0000-0000-0000001f8020',
   '00000000-0000-0000-0000-0000001f8040', 'training', 'Puppy Basics', 'confirmed',
   now() - interval '2 days', now() - interval '2 days' + interval '1 hour', 50, 50,
   '00000000-0000-0000-0000-0000001f8071');

insert into public.booking_pets (booking_id, pet_id) values
  ('00000000-0000-0000-0000-0000001f8090', '00000000-0000-0000-0000-0000001f8050'),
  ('00000000-0000-0000-0000-0000001f8091', '00000000-0000-0000-0000-0000001f8050');

insert into public.training_attendance (booking_id, facility_id, checked_in_at, checked_out_at)
values
  ('00000000-0000-0000-0000-0000001f8090', '00000000-0000-0000-0000-0000001f8020',
   now() - interval '9 days', now() - interval '9 days' + interval '1 hour');

-- ── T1  a missed session is derived ─────────────────────────────────────────
do $$
declare v_missed integer; v_attended integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f8003');
  set local role authenticated;
  select count(*) filter (where booking_id = '00000000-0000-0000-0000-0000001f8091'),
         count(*) filter (where booking_id = '00000000-0000-0000-0000-0000001f8090')
    into v_missed, v_attended
    from public.training_missed_sessions();
  reset role;
  perform pg_temp.t('T1  the owner sees the missed session, and not the attended one',
    v_missed = 1 and v_attended = 0, format('missed=%s attended=%s', v_missed, v_attended));
exception when others then
  reset role; perform pg_temp.t('T1  missed sessions', false, sqlerrm);
end $$;

-- ── T2  the owner asks, once ────────────────────────────────────────────────
do $$
declare v_first public.training_makeups; v_again public.training_makeups; v_rows integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f8003');
  set local role authenticated;
  v_first := public.request_training_makeup('00000000-0000-0000-0000-0000001f8091', 'Rex was sick.');
  v_again := public.request_training_makeup('00000000-0000-0000-0000-0000001f8091');
  reset role;
  select count(*) into v_rows from public.training_makeups
   where missed_booking_id = '00000000-0000-0000-0000-0000001f8091';
  perform pg_temp.t('T2  the owner asks for a make-up; asking twice is one row',
    v_first.status = 'requested' and v_first.id = v_again.id and v_rows = 1
      and v_first.facility_id = '00000000-0000-0000-0000-0000001f8020',
    format('status=%s same=%s rows=%s', v_first.status, v_first.id = v_again.id, v_rows));
exception when others then
  reset role; perform pg_temp.t('T2  request', false, sqlerrm);
end $$;

-- ── T3  no direct writes ────────────────────────────────────────────────────
do $$
declare v_insert_refused boolean := false; v_update_refused boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f8001');
  set local role authenticated;
  begin
    insert into public.training_makeups
      (facility_id, missed_booking_id, pet_id, client_id, status)
    values
      ('00000000-0000-0000-0000-0000001f8020', '00000000-0000-0000-0000-0000001f8090',
       '00000000-0000-0000-0000-0000001f8050', '00000000-0000-0000-0000-0000001f8040', 'requested');
  exception when insufficient_privilege then v_insert_refused := true;
  end;
  begin
    update public.training_makeups set status = 'ineligible', ineligible_reason = 'x'
     where missed_booking_id = '00000000-0000-0000-0000-0000001f8091';
  exception when insufficient_privilege then v_update_refused := true;
  end;
  reset role;
  perform pg_temp.t('T3  nobody writes the table directly, staff included',
    v_insert_refused and v_update_refused,
    format('insert refused=%s update refused=%s', v_insert_refused, v_update_refused));
exception when others then
  reset role; perform pg_temp.t('T3  direct writes', false, sqlerrm);
end $$;

-- ── T4  the seats on offer ──────────────────────────────────────────────────
do $$
declare v_ids uuid[]; v_other_course boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f8001');
  set local role authenticated;
  select array_agg(session_id) into v_ids
    from public.training_makeup_host_sessions('00000000-0000-0000-0000-0000001f8091');
  begin
    perform public.offer_training_makeup('00000000-0000-0000-0000-0000001f8091',
      '00000000-0000-0000-0000-0000001f8073', 'Owner');
  exception when invalid_parameter_value then v_other_course := true;
  end;
  reset role;
  perform pg_temp.t('T4  only a future session of the same course, in another series, is offered',
    v_ids = array['00000000-0000-0000-0000-0000001f8072']::uuid[] and v_other_course,
    format('offered=%s other course refused=%s', v_ids, v_other_course));
exception when others then
  reset role; perform pg_temp.t('T4  host sessions', false, sqlerrm);
end $$;

-- ── T5  an offer books a confirmed seat at $0 ───────────────────────────────
do $$
declare v_row public.training_makeups; v_status text; v_total numeric; v_left integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f8001');
  set local role authenticated;
  v_row := public.offer_training_makeup('00000000-0000-0000-0000-0000001f8091',
    '00000000-0000-0000-0000-0000001f8072', 'Owner');
  select count(*) into v_left
    from public.training_makeup_host_sessions('00000000-0000-0000-0000-0000001f8091');
  reset role;
  select b.status::text, b.total_cost into v_status, v_total
    from public.bookings b where b.id = v_row.host_booking_id;
  perform pg_temp.t('T5  an offer books the dog a confirmed seat at $0, and fills the session',
    v_row.status = 'offered' and v_status = 'confirmed' and v_total = 0 and v_left = 0,
    format('makeup=%s booking=%s total=%s seats listed after=%s', v_row.status, v_status, v_total, v_left));
exception when others then
  reset role; perform pg_temp.t('T5  offer', false, sqlerrm);
end $$;

-- ── T6  the owner declines, and the seat is given back ──────────────────────
do $$
declare v_row public.training_makeups; v_status text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f8003');
  set local role authenticated;
  select id into v_row.id from public.training_makeups
   where missed_booking_id = '00000000-0000-0000-0000-0000001f8091';
  v_row := public.decline_training_makeup(v_row.id);
  reset role;
  select b.status::text into v_status from public.bookings b where b.id = v_row.host_booking_id;
  perform pg_temp.t('T6  the owner declines the seat, and its booking is cancelled',
    v_row.status = 'declined' and v_status = 'cancelled',
    format('makeup=%s booking=%s', v_row.status, v_status));
exception when others then
  reset role; perform pg_temp.t('T6  decline', false, sqlerrm);
end $$;

-- ── T7  the owner skips, and staff cannot offer ─────────────────────────────
do $$
declare v_row public.training_makeups; v_offer_refused boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f8003');
  set local role authenticated;
  v_row := public.skip_training_makeup('00000000-0000-0000-0000-0000001f8091');
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f8001');
  begin
    perform public.offer_training_makeup('00000000-0000-0000-0000-0000001f8091',
      '00000000-0000-0000-0000-0000001f8072', 'Owner');
  exception when invalid_parameter_value then v_offer_refused := true;
  end;
  reset role;
  perform pg_temp.t('T7  the owner skips the session, and staff can no longer offer',
    v_row.status = 'skipped' and v_offer_refused,
    format('makeup=%s offer refused=%s', v_row.status, v_offer_refused));
exception when others then
  reset role; perform pg_temp.t('T7  skip', false, sqlerrm);
end $$;

-- ── T8  ineligible only with a reason ───────────────────────────────────────
do $$
declare
  v_row public.training_makeups;
  v_no_reason boolean := false;
  v_request_refused boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f8001');
  set local role authenticated;
  begin
    perform public.mark_training_makeup_ineligible('00000000-0000-0000-0000-0000001f8091', '  ', 'Owner');
  exception when invalid_parameter_value then v_no_reason := true;
  end;
  v_row := public.mark_training_makeup_ineligible('00000000-0000-0000-0000-0000001f8091',
    'No notice given.', 'Owner');
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f8003');
  begin
    perform public.request_training_makeup('00000000-0000-0000-0000-0000001f8091');
  exception when invalid_parameter_value then v_request_refused := true;
  end;
  reset role;
  perform pg_temp.t('T8  ineligible needs a reason, and then the owner cannot ask',
    v_no_reason and v_row.status = 'ineligible' and v_row.ineligible_reason = 'No notice given.'
      and v_request_refused,
    format('no reason refused=%s status=%s request refused=%s', v_no_reason, v_row.status, v_request_refused));
exception when others then
  reset role; perform pg_temp.t('T8  ineligible', false, sqlerrm);
end $$;

-- ── T9  another facility ────────────────────────────────────────────────────
do $$
declare
  v_seen integer; v_missed integer;
  v_request_refused boolean := false; v_offer_refused boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f8002');
  set local role authenticated;
  select count(*) into v_seen from public.training_makeups
   where missed_booking_id = '00000000-0000-0000-0000-0000001f8091';
  select count(*) into v_missed from public.training_missed_sessions()
   where booking_id = '00000000-0000-0000-0000-0000001f8091';
  begin
    perform public.request_training_makeup('00000000-0000-0000-0000-0000001f8091');
  exception when insufficient_privilege then v_request_refused := true;
  end;
  begin
    perform public.mark_training_makeup_ineligible('00000000-0000-0000-0000-0000001f8091', 'Mine now.');
  exception when insufficient_privilege then v_offer_refused := true;
  end;
  reset role;
  perform pg_temp.t('T9  another facility reads nothing and can decide nothing',
    v_seen = 0 and v_missed = 0 and v_request_refused and v_offer_refused,
    format('seen=%s missed=%s request refused=%s decide refused=%s',
      v_seen, v_missed, v_request_refused, v_offer_refused));
exception when others then
  reset role; perform pg_temp.t('T9  stranger', false, sqlerrm);
end $$;

-- ── T10 grants ──────────────────────────────────────────────────────────────
select pg_temp.t('T10 anon holds nothing, and authenticated only reads the table',
  not has_table_privilege('anon', 'public.training_makeups', 'select')
    and has_table_privilege('authenticated', 'public.training_makeups', 'select')
    and not has_table_privilege('authenticated', 'public.training_makeups', 'insert')
    and not has_table_privilege('authenticated', 'public.training_makeups', 'update')
    and not has_function_privilege('anon', 'public.offer_training_makeup(uuid, uuid, text)', 'execute')
    and not has_function_privilege('anon', 'public.training_missed_sessions(uuid)', 'execute')
    and has_function_privilege('authenticated', 'public.decline_training_makeup(uuid)', 'execute'));

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
