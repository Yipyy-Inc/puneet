-- ============================================================================
-- A booking follows its pet in and out (20260918151018_a_booking_follows_its_pet_
-- in_and_out).
--
-- The attendance records (daycare_attendance, boarding_stays,
-- training_attendance) are the truth of arrival, and until this migration the
-- booking's status never heard about them: a dog checked in on the daycare
-- board stayed "confirmed", a dog checked out stayed "confirmed", and the
-- booking page — which wrote only the status — left the boards saying
-- "expected". Twenty-odd live rows disagreed by the time it was measured.
--
--   M  the mirror: arrival → checked_in, departure → completed, reopen →
--      checked_in, revert → confirmed — for the people who check pets in and
--      hold NO edit_bookings (caretaker, boarding attendant), which is why the
--      mirror has its own narrow pass through enforce_booking_integrity
--   G  the guard: a request, a waitlisted or estimated booking, and a
--      cancelled, declined, no-show or completed one cannot be checked in
--   F  the pass is narrow: it is transaction-local, it resets, and it lets
--      nothing but those status moves through
--   R  grooming's revert clears the arrival too (status drives grooming)
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000003f1001', 'pm-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000003f1002', 'pm-caretaker@example.invalid'),
  ('00000000-0000-0000-0000-0000003f1003', 'pm-boarding@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000003f1001', 'pm-owner@example.invalid', 'Owner'),
  ('00000000-0000-0000-0000-0000003f1002', 'pm-caretaker@example.invalid', 'Caretaker'),
  ('00000000-0000-0000-0000-0000003f1003', 'pm-boarding@example.invalid', 'Attendant')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000003f1010', 'PM Org', 'pm-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000003f1020', '00000000-0000-0000-0000-0000003f1010',
   'PM Facility', 'pm-a', 'pm-a')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000003f1030', '00000000-0000-0000-0000-0000003f1020',
   '00000000-0000-0000-0000-0000003f1001', 'owner', true),
  ('00000000-0000-0000-0000-0000003f1031', '00000000-0000-0000-0000-0000003f1020',
   '00000000-0000-0000-0000-0000003f1002', 'caretaker', true),
  ('00000000-0000-0000-0000-0000003f1032', '00000000-0000-0000-0000-0000003f1020',
   '00000000-0000-0000-0000-0000003f1003', 'boarding_attendant', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000003f1040', '00000000-0000-0000-0000-0000003f1020',
   'Client', 'pm-c@example.invalid');

insert into public.room_categories
  (id, facility_id, legacy_id, service, name, color, sort_order, default_capacity) values
  ('00000000-0000-0000-0000-0000003f1050', '00000000-0000-0000-0000-0000003f1020',
   'pm-cat', 'boarding', 'Standard', 'blue', 1, 1);

insert into public.facility_rooms (id, facility_id, category_id, legacy_id, name) values
  ('00000000-0000-0000-0000-0000003f1060', '00000000-0000-0000-0000-0000003f1020',
   '00000000-0000-0000-0000-0000003f1050', 'PM-01', 'Kennel 1');

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then ''
         else json_build_object('sub', p_uid::text, 'role', 'authenticated')::text end,
    true);
end $$;

/** A booking, inserted by the test itself. Returns its id. */
create or replace function pg_temp.bk(
  p_service text, p_status text default 'confirmed', p_days int default 0
) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at,
     base_price, discount, total_cost)
  values
    ('00000000-0000-0000-0000-0000003f1020', '00000000-0000-0000-0000-0000003f1040',
     p_service, p_status::public.booking_status,
     now() + (p_days || ' days')::interval,
     now() + (p_days || ' days')::interval + interval '8 hours',
     50, 0, 50)
  returning id into v_id;
  return v_id;
end $$;

create or replace function pg_temp.status_of(p_id uuid) returns text
language sql as $$ select status::text from public.bookings where id = p_id $$;

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated;
insert into ids values
  ('dc',  pg_temp.bk('daycare')),
  ('dc2', pg_temp.bk('daycare', 'pending')),
  ('bd',  pg_temp.bk('boarding', 'confirmed', 30)),
  ('tr',  pg_temp.bk('training')),
  ('rq',  pg_temp.bk('daycare', 'request_submitted')),
  ('cx',  pg_temp.bk('daycare', 'cancelled')),
  ('gr',  pg_temp.bk('grooming'));

insert into public.boarding_stays (booking_id, facility_id, room_id, occupies)
select v, '00000000-0000-0000-0000-0000003f1020', '00000000-0000-0000-0000-0000003f1060',
       tstzrange(now() + interval '30 days', now() + interval '30 days 8 hours')
  from ids where k = 'bd';

insert into public.grooming_appointments
  (booking_id, facility_id, service_name, service_price, service_duration_min)
select v, '00000000-0000-0000-0000-0000003f1020', 'Bath', 40, 60 from ids where k = 'gr';

-- ── M: the mirror, as the people who actually check pets in ────────────────
do $$
declare v_b uuid := (select v from ids where k = 'dc'); v_s text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003f1002');
  set local role authenticated;
  insert into public.daycare_attendance (booking_id, facility_id, checked_in_at)
  values (v_b, '00000000-0000-0000-0000-0000003f1020', now());
  reset role;
  v_s := pg_temp.status_of(v_b);
  perform pg_temp.t('M1  a caretaker checks a dog in, and the booking is checked in',
    v_s = 'checked_in', format('status=%s', v_s));
exception when others then
  reset role; perform pg_temp.t('M1  caretaker check-in', false, sqlerrm);
end $$;

do $$
declare v_b uuid := (select v from ids where k = 'dc'); v_s text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003f1002');
  set local role authenticated;
  update public.daycare_attendance set notes = 'second press' where booking_id = v_b;
  reset role;
  v_s := pg_temp.status_of(v_b);
  perform pg_temp.t('M2  a change that is not an arrival moves nothing',
    v_s = 'checked_in', format('status=%s', v_s));
exception when others then
  reset role; perform pg_temp.t('M2  non-arrival change', false, sqlerrm);
end $$;

do $$
declare v_b uuid := (select v from ids where k = 'dc'); v_out text; v_back text; v_rev text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003f1002');
  set local role authenticated;
  update public.daycare_attendance set checked_out_at = now() where booking_id = v_b;
  v_out := pg_temp.status_of(v_b);
  update public.daycare_attendance set checked_out_at = null where booking_id = v_b;
  v_back := pg_temp.status_of(v_b);
  delete from public.daycare_attendance where booking_id = v_b;
  v_rev := pg_temp.status_of(v_b);
  reset role;
  perform pg_temp.t('M3  collecting the dog completes the booking', v_out = 'completed', v_out);
  perform pg_temp.t('M4  reopening a collection puts it back on site', v_back = 'checked_in', v_back);
  perform pg_temp.t('M5  reverting the check-in puts it back to confirmed', v_rev = 'confirmed', v_rev);
exception when others then
  reset role; perform pg_temp.t('M3  daycare out / reopen / revert', false, sqlerrm);
end $$;

do $$
declare v_b uuid := (select v from ids where k = 'dc2'); v_s text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003f1002');
  set local role authenticated;
  insert into public.daycare_attendance (booking_id, facility_id, checked_in_at)
  values (v_b, '00000000-0000-0000-0000-0000003f1020', now());
  reset role;
  v_s := pg_temp.status_of(v_b);
  perform pg_temp.t('M6  a pending booking checks in too',
    v_s = 'checked_in', format('status=%s', v_s));
exception when others then
  reset role; perform pg_temp.t('M6  pending check-in', false, sqlerrm);
end $$;

do $$
declare
  v_b uuid := (select v from ids where k = 'bd');
  v_ref bigint := (select ref from public.bookings where id = (select v from ids where k = 'bd'));
  v_in text; v_out text; v_re text; v_rev text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003f1003');
  set local role authenticated;
  perform public.record_boarding_arrival(v_ref, 'check_in');
  v_in := pg_temp.status_of(v_b);
  perform public.record_boarding_arrival(v_ref, 'check_out');
  v_out := pg_temp.status_of(v_b);
  perform public.record_boarding_arrival(v_ref, 'reopen');
  v_re := pg_temp.status_of(v_b);
  perform public.record_boarding_arrival(v_ref, 'revert');
  v_rev := pg_temp.status_of(v_b);
  reset role;
  perform pg_temp.t('M7  a boarding attendant''s arrival, departure, reopen and revert all follow',
    v_in = 'checked_in' and v_out = 'completed' and v_re = 'checked_in' and v_rev = 'confirmed',
    format('%s → %s → %s → %s', v_in, v_out, v_re, v_rev));
exception when others then
  reset role; perform pg_temp.t('M7  boarding', false, sqlerrm);
end $$;

do $$
declare v_b uuid := (select v from ids where k = 'tr'); v_s text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003f1001');
  set local role authenticated;
  insert into public.training_attendance (booking_id, facility_id, checked_in_at)
  values (v_b, '00000000-0000-0000-0000-0000003f1020', now());
  reset role;
  v_s := pg_temp.status_of(v_b);
  perform pg_temp.t('M8  a training check-in follows as well',
    v_s = 'checked_in', format('status=%s', v_s));
exception when others then
  reset role; perform pg_temp.t('M8  training', false, sqlerrm);
end $$;

-- ── G: some bookings cannot be checked in at all ───────────────────────────
do $$
declare v_state text := 'none';
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003f1002');
  set local role authenticated;
  begin
    insert into public.daycare_attendance (booking_id, facility_id, checked_in_at)
    values ((select v from ids where k = 'rq'), '00000000-0000-0000-0000-0000003f1020', now());
  exception when others then v_state := sqlstate; end;
  reset role;
  perform pg_temp.t('G1  a request cannot be checked in — it has not been approved',
    v_state = '22023', format('sqlstate=%s', v_state));
end $$;

do $$
declare v_state text := 'none';
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003f1002');
  set local role authenticated;
  begin
    insert into public.daycare_attendance (booking_id, facility_id, checked_in_at)
    values ((select v from ids where k = 'cx'), '00000000-0000-0000-0000-0000003f1020', now());
  exception when others then v_state := sqlstate; end;
  reset role;
  perform pg_temp.t('G2  a cancelled booking cannot be checked in',
    v_state = '22023', format('sqlstate=%s', v_state));
end $$;

-- ── F: the pass is narrow ──────────────────────────────────────────────────
select pg_temp.t('F1  the pass is off again after the mirror',
  coalesce(current_setting('yipyy.presence_sync', true), '') = '',
  coalesce(current_setting('yipyy.presence_sync', true), '<null>'));

do $$
declare v_b uuid := (select v from ids where k = 'dc2'); v_rows integer; v_price numeric;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003f1002');
  set local role authenticated;
  perform set_config('yipyy.presence_sync', 'on', true);
  begin
    update public.bookings set base_price = 1, total_cost = 1 where id = v_b;
    get diagnostics v_rows = row_count;
  exception when others then v_rows := -1;
  end;
  perform set_config('yipyy.presence_sync', '', true);
  reset role;
  select base_price into v_price from public.bookings where id = v_b;
  perform pg_temp.t('F2  holding the pass does not let a caretaker reprice a booking',
    v_price = 50, format('rows=%s price=%s', v_rows, v_price));
exception when others then
  reset role; perform pg_temp.t('F2  narrow pass', false, sqlerrm);
end $$;

-- ── R: grooming's revert clears the arrival ────────────────────────────────
do $$
declare v_b uuid := (select v from ids where k = 'gr'); v_in timestamptz; v_eta timestamptz;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003f1001');
  set local role authenticated;
  update public.bookings set status = 'checked_in' where id = v_b;
  update public.bookings set status = 'confirmed' where id = v_b;
  reset role;
  select check_in_at, estimated_ready_at into v_in, v_eta
    from public.grooming_appointments where booking_id = v_b;
  perform pg_temp.t('R1  undoing a groom''s check-in clears its arrival and ready time',
    v_in is null and v_eta is null, format('check_in_at=%s eta=%s', v_in, v_eta));
exception when others then
  reset role; perform pg_temp.t('R1  grooming revert', false, sqlerrm);
end $$;

-- ── the functions are not callable by anyone ───────────────────────────────
select pg_temp.t('P1  the mirror and the guard are not callable by anon or authenticated',
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'private'
       and p.proname in ('mirror_presence_to_booking', 'arrival_needs_a_live_booking')
       and (has_function_privilege('anon', p.oid, 'execute')
            or has_function_privilege('authenticated', p.oid, 'execute'))
  )
  and exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'private' and p.proname = 'mirror_presence_to_booking'
  ));

select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
