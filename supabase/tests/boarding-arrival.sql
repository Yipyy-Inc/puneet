-- ============================================================================
-- A boarding arrival is the stay beginning (20260806900000, 20260806920000).
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/boarding-arrival.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. THE PERSON AT THE DOOR CAN OPEN IT (B1). `boarding_attendant` holds
--    `check_in_out` and NOT `edit_bookings`, so the direct UPDATE that
--    20260806900000 first invited matched zero rows AND REPORTED SUCCESS. B1
--    asserts both halves: the raw update still does nothing, and the function
--    lets them through. Delete `record_boarding_arrival` and B1 goes red.
--
-- 2. A REFUSAL IS LOUD (B2). An accountant holds neither permission and gets a
--    42501 with a sentence, not a silent no-op. The positive control is B1.
--
-- 3. THE PAPERWORK LOSES TO THE HEADCOUNT (B4). Cancelling a booking whose dog
--    is in the building leaves the stay reading `checked-in`, not `released`.
--    A board that drops a guest off the list because of an office decision is
--    how an animal gets left behind at closing.
--
-- 4. UNDO RUNS BACKWARDS (B6). "Never arrived" cannot be reached in one press
--    from "collected".
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
  ('00000000-0000-0000-0000-0000002d0001', 'ba-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000002d0002', 'ba-attend@example.invalid'),
  ('00000000-0000-0000-0000-0000002d0003', 'ba-acct@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000002d0001', 'ba-owner@example.invalid',  'Owner'),
  ('00000000-0000-0000-0000-0000002d0002', 'ba-attend@example.invalid', 'Attendant'),
  ('00000000-0000-0000-0000-0000002d0003', 'ba-acct@example.invalid',   'Accountant')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000002d0010', 'BA Org', 'ba-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000002d0020', '00000000-0000-0000-0000-0000002d0010',
   'BA Facility', 'ba-a', 'ba-a')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000002d0030', '00000000-0000-0000-0000-0000002d0020',
   '00000000-0000-0000-0000-0000002d0001', 'owner', true),
  ('00000000-0000-0000-0000-0000002d0031', '00000000-0000-0000-0000-0000002d0020',
   '00000000-0000-0000-0000-0000002d0002', 'boarding_attendant', true),
  ('00000000-0000-0000-0000-0000002d0032', '00000000-0000-0000-0000-0000002d0020',
   '00000000-0000-0000-0000-0000002d0003', 'accountant', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000002d0040', '00000000-0000-0000-0000-0000002d0020',
   'Owner', 'ba-c@example.invalid');

insert into public.room_categories
  (id, facility_id, legacy_id, service, name, color, sort_order, default_capacity) values
  ('00000000-0000-0000-0000-0000002d0050', '00000000-0000-0000-0000-0000002d0020',
   'ba-cat', 'boarding', 'Standard', 'blue', 1, 1);

insert into public.facility_rooms (id, facility_id, category_id, legacy_id, name) values
  ('00000000-0000-0000-0000-0000002d0060', '00000000-0000-0000-0000-0000002d0020',
   '00000000-0000-0000-0000-0000002d0050', 'BA-01', 'Kennel 1'),
  ('00000000-0000-0000-0000-0000002d0061', '00000000-0000-0000-0000-0000002d0020',
   '00000000-0000-0000-0000-0000002d0050', 'BA-02', 'Kennel 2');

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
end $$;

/** A boarding booking, optionally with a kennel. Returns its ref. */
create or replace function pg_temp.bk(p_room uuid default null, p_offset int default 0)
returns bigint language plpgsql as $$
declare v_id uuid; v_ref bigint;
begin
  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at,
     base_price, discount, total_cost)
  values
    ('00000000-0000-0000-0000-0000002d0020', '00000000-0000-0000-0000-0000002d0040',
     'boarding', 'confirmed',
     now() + (p_offset || ' days')::interval,
     now() + ((p_offset + 2) || ' days')::interval,
     200, 0, 200)
  returning id, ref into v_id, v_ref;

  if p_room is not null then
    insert into public.boarding_stays (booking_id, facility_id, room_id, occupies)
    values (v_id, '00000000-0000-0000-0000-0000002d0020', p_room,
            tstzrange(now() + (p_offset || ' days')::interval,
                      now() + ((p_offset + 2) || ' days')::interval));
  end if;
  return v_ref;
end $$;

-- ── B1: the person at the door can open it ─────────────────────────────────
do $$
declare
  v_ref bigint; v_raw_status text; v_rpc_status text;
  v_can_edit boolean; v_can_check boolean;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002d0001');
  set local role authenticated;
  v_ref := pg_temp.bk('00000000-0000-0000-0000-0000002d0060', 0);
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000002d0002');
  set local role authenticated;
  v_can_edit  := private.has_permission(
    '00000000-0000-0000-0000-0000002d0020', 'edit_bookings');
  v_can_check := private.has_permission(
    '00000000-0000-0000-0000-0000002d0020', 'check_in_out');

  -- The direct write the schema alone invited. It does nothing, and says so to
  -- nobody: this is the whole reason the function exists.
  update public.boarding_stays set checked_in_at = now()
   where booking_id = (select id from public.bookings where ref = v_ref);
  reset role;
  select status into v_raw_status from public.boarding_stays
   where booking_id = (select id from public.bookings where ref = v_ref);

  perform pg_temp.as_user('00000000-0000-0000-0000-0000002d0002');
  set local role authenticated;
  v_rpc_status := public.record_boarding_arrival(v_ref, 'check_in');
  reset role;

  perform pg_temp.t(
    'B1  a boarding attendant has check_in_out and not edit_bookings',
    v_can_check and not v_can_edit,
    format('check_in_out=%s edit_bookings=%s', v_can_check, v_can_edit));
  perform pg_temp.t(
    'B1b the direct UPDATE does nothing and raises nothing',
    v_raw_status = 'scheduled', format('status=%s', v_raw_status));
  perform pg_temp.t(
    'B1c the function lets the same person through',
    v_rpc_status = 'checked-in', format('status=%s', v_rpc_status));
exception when others then
  reset role; perform pg_temp.t('B1  attendant check-in', false, sqlerrm);
end $$;

-- ── B2: a refusal is loud ──────────────────────────────────────────────────
do $$
declare v_ref bigint; v_err text := 'no error'; v_state text := ''; v_status text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002d0001');
  set local role authenticated;
  v_ref := pg_temp.bk('00000000-0000-0000-0000-0000002d0061', 10);
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000002d0003');
  set local role authenticated;
  begin
    perform public.record_boarding_arrival(v_ref, 'check_in');
  exception when others then
    v_err := sqlerrm; v_state := sqlstate;
  end;
  reset role;
  select status into v_status from public.boarding_stays
   where booking_id = (select id from public.bookings where ref = v_ref);

  perform pg_temp.t(
    'B2  an accountant is refused with 42501, not with silence',
    v_state = '42501' and v_status = 'scheduled',
    format('sqlstate=%s status=%s err=%s', v_state, v_status, left(v_err, 40)));
end $$;

-- ── B3: the status is the timestamps, and time runs forwards ───────────────
do $$
declare v_ref bigint; v_e1 text := 'no error'; v_e2 text := 'no error'; v_bid uuid;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002d0001');
  set local role authenticated;
  v_ref := pg_temp.bk('00000000-0000-0000-0000-0000002d0060', 20);
  reset role;
  select id into v_bid from public.bookings where ref = v_ref;

  begin
    update public.boarding_stays set status = 'checked-in' where booking_id = v_bid;
  exception when others then v_e1 := sqlerrm; end;

  begin
    update public.boarding_stays set checked_out_at = now() where booking_id = v_bid;
  exception when others then v_e2 := sqlerrm; end;

  perform pg_temp.t('B3  status cannot be written at all',
    v_e1 like '%only be updated to DEFAULT%', left(v_e1, 50));
  perform pg_temp.t('B3b a guest cannot be collected before it arrives',
    v_e2 like '%leaves_after_arriving%', left(v_e2, 60));
end $$;

-- ── B4: the paperwork loses to the headcount ───────────────────────────────
do $$
declare v_ref bigint; v_bid uuid; v_status text; v_released timestamptz;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002d0001');
  set local role authenticated;
  v_ref := pg_temp.bk('00000000-0000-0000-0000-0000002d0061', 30);
  perform public.record_boarding_arrival(v_ref, 'check_in');

  -- The office cancels the booking while the dog is asleep in kennel 2.
  select id into v_bid from public.bookings where ref = v_ref;
  update public.bookings set status = 'cancelled' where id = v_bid;
  reset role;

  select status, released_at into v_status, v_released
    from public.boarding_stays where booking_id = v_bid;

  perform pg_temp.t(
    'B4  a cancelled booking whose dog is on site still reads checked-in',
    v_status = 'checked-in' and v_released is not null,
    format('status=%s released=%s', v_status, v_released is not null));
exception when others then
  reset role; perform pg_temp.t('B4  cancelled while on site', false, sqlerrm);
end $$;

-- ── B5: no kennel, no arrival ──────────────────────────────────────────────
do $$
declare v_ref bigint; v_state text := ''; v_err text := 'no error';
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002d0001');
  set local role authenticated;
  v_ref := pg_temp.bk(null, 40);          -- booked, never assigned a kennel
  begin
    perform public.record_boarding_arrival(v_ref, 'check_in');
  exception when others then v_state := sqlstate; v_err := sqlerrm; end;
  reset role;

  perform pg_temp.t(
    'B5  a guest with no kennel cannot be checked in, and is told why',
    v_state = '55000' and v_err like '%no kennel%',
    format('sqlstate=%s err=%s', v_state, left(v_err, 50)));
end $$;

-- ── B6: undo runs backwards, and check-in does not repeat ──────────────────
do $$
declare
  v_ref bigint; v_bid uuid; v_first timestamptz; v_second timestamptz;
  v_revert_state text := ''; v_after text; v_room uuid;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002d0001');
  set local role authenticated;
  v_ref := pg_temp.bk('00000000-0000-0000-0000-0000002d0060', 50);
  select id into v_bid from public.bookings where ref = v_ref;

  perform public.record_boarding_arrival(v_ref, 'check_in');
  select checked_in_at into v_first from public.boarding_stays where booking_id = v_bid;
  perform pg_sleep(0.05);
  perform public.record_boarding_arrival(v_ref, 'check_in');
  select checked_in_at into v_second from public.boarding_stays where booking_id = v_bid;

  perform public.record_boarding_arrival(v_ref, 'check_out');
  begin
    perform public.record_boarding_arrival(v_ref, 'revert');
  exception when others then v_revert_state := sqlstate; end;

  -- Reopen first, THEN revert. That order is allowed.
  perform public.record_boarding_arrival(v_ref, 'reopen');
  perform public.record_boarding_arrival(v_ref, 'revert');
  select status, room_id into v_after, v_room
    from public.boarding_stays where booking_id = v_bid;
  reset role;

  perform pg_temp.t('B6  checking in twice does not move the arrival time',
    v_first = v_second, format('%s = %s', v_first, v_second));
  perform pg_temp.t('B6b revert is refused while the stay is checked out',
    v_revert_state = '22023', format('sqlstate=%s', v_revert_state));
  perform pg_temp.t('B6c reopen then revert puts it back to scheduled',
    v_after = 'scheduled', format('status=%s', v_after));
  -- The whole reason a boarding revert is an UPDATE and not the DELETE daycare
  -- uses: this row IS the kennel assignment.
  perform pg_temp.t('B6d and the guest still holds their kennel',
    v_room = '00000000-0000-0000-0000-0000002d0060',
    format('room=%s', v_room));
exception when others then
  reset role; perform pg_temp.t('B6  undo order', false, sqlerrm);
end $$;

-- ── B8: a daycare booking is not a boarding arrival ────────────────────────
do $$
declare v_id uuid; v_ref bigint; v_state text := '';
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002d0001');
  set local role authenticated;
  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at,
     base_price, discount, total_cost)
  values
    ('00000000-0000-0000-0000-0000002d0020', '00000000-0000-0000-0000-0000002d0040',
     'daycare', 'confirmed', now(), now() + interval '8 hours', 50, 0, 50)
  returning id, ref into v_id, v_ref;

  begin
    perform public.record_boarding_arrival(v_ref, 'check_in');
  exception when others then v_state := sqlstate; end;
  reset role;

  perform pg_temp.t('B8  a daycare booking cannot be checked in to boarding',
    v_state = '22023', format('sqlstate=%s', v_state));
end $$;

-- ── Results ────────────────────────────────────────────────────────────────

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise warning '% assertion(s) FAILED', v_failed;
  else
    raise warning 'all % assertions passed', (select count(*) from tap);
  end if;
end $$;

select n, case when ok then 'PASS' else 'FAIL' end as result, name, detail
  from tap order by n;

rollback;
