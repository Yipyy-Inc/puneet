-- ============================================================================
-- A kennel holds one booking at a time
-- (20260806600000 + 20260806620000 + 20260806660000).
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/boarding-occupancy.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. THE ROOM IS STILL BOOKABLE (K1). The positive control, and the one that
--    matters most: a constraint that refuses everything would make every deny
--    below pass. Same room on non-overlapping dates, and overlapping dates in
--    different rooms, both succeed.
--
-- 2. THE DOUBLE BOOKING IS REFUSED, AND NOTHING SURVIVES IT (K2). Asserts the
--    BOOKING COUNT afterwards, not merely that an error was raised: the whole
--    reason this is an RPC is that `bookings` has no DELETE policy.
--
-- 3. CHECK-OUT DAY IS CHECK-IN DAY (K3). `[)` is a decision, not a default. A
--    guest leaving Friday morning and one arriving Friday afternoon share a
--    date and must not collide, or every room loses a night per stay.
--
-- 4. CANCELLING FREES THE KENNEL, REOPENING TAKES IT BACK (K4/K5). The
--    constraint cannot see `bookings.status`, so `released_at` and a trigger
--    stand in for it. K5 is the half that is easy to forget: re-opening a
--    cancelled booking whose room was given away must fail.
--
-- 5. MOVING THE DATES IS JUDGED TOO (K6). A booking edited onto an occupied
--    range is refused, which is what makes the stored range trustworthy.
--
-- 6. OVERBOOKING IS A PERMISSION (K7). `override_booking_capacity` exists and
--    `RoomAssignmentBoard` already honours it, so the constraint carries an
--    escape hatch rather than pretending the capability does not exist. A
--    receptionist cannot use it; an owner can, and the reason is recorded.
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
  ('00000000-0000-0000-0000-0000001b0001', 'bd-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001b0002', 'bd-recep@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001b0001', 'bd-owner@example.invalid', 'Owner'),
  ('00000000-0000-0000-0000-0000001b0002', 'bd-recep@example.invalid', 'Reception')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001b0010', 'BD Org', 'bd-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001b0020', '00000000-0000-0000-0000-0000001b0010',
   'Kennels', 'bd-a', 'bd-a'),
  ('00000000-0000-0000-0000-0000001b0021', '00000000-0000-0000-0000-0000001b0010',
   'Other Kennels', 'bd-b', 'bd-b')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001b0030', '00000000-0000-0000-0000-0000001b0020',
   '00000000-0000-0000-0000-0000001b0001', 'owner', true),
  -- reception: create_bookings + edit_bookings, and NO override_booking_capacity
  ('00000000-0000-0000-0000-0000001b0031', '00000000-0000-0000-0000-0000001b0020',
   '00000000-0000-0000-0000-0000001b0002', 'reception', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000001b0040', '00000000-0000-0000-0000-0000001b0020',
   'Guest One', 'bd-c1@example.invalid'),
  ('00000000-0000-0000-0000-0000001b0041', '00000000-0000-0000-0000-0000001b0020',
   'Guest Two', 'bd-c2@example.invalid');

insert into public.pets (id, client_id, name, species) values
  ('00000000-0000-0000-0000-0000001b0050', '00000000-0000-0000-0000-0000001b0040', 'Rex', 'dog'),
  ('00000000-0000-0000-0000-0000001b0051', '00000000-0000-0000-0000-0000001b0041', 'Bo', 'dog');

-- Rooms belong to a CATEGORY now (20260806660000), which is where capacity and
-- the booking rules live. Two categories so the cross-facility case (K8) has a
-- room that genuinely belongs elsewhere.
insert into public.room_categories
  (id, facility_id, legacy_id, service, name, default_capacity, sort_order)
values
  ('00000000-0000-0000-0000-0000001b0070', '00000000-0000-0000-0000-0000001b0020',
   'bd-cat', 'boarding', 'Kennels', 1, 1),
  ('00000000-0000-0000-0000-0000001b0071', '00000000-0000-0000-0000-0000001b0021',
   'bd-cat-b', 'boarding', 'Kennels at B', 1, 1);

insert into public.facility_rooms
  (id, facility_id, category_id, legacy_id, name, active)
values
  ('00000000-0000-0000-0000-0000001b0060', '00000000-0000-0000-0000-0000001b0020',
   '00000000-0000-0000-0000-0000001b0070', 'BD-01', 'Kennel 1', true),
  ('00000000-0000-0000-0000-0000001b0061', '00000000-0000-0000-0000-0000001b0020',
   '00000000-0000-0000-0000-0000001b0070', 'BD-02', 'Kennel 2', true),
  -- The other facility's room. This facility's bookings must not reach it.
  ('00000000-0000-0000-0000-0000001b0062', '00000000-0000-0000-0000-0000001b0021',
   '00000000-0000-0000-0000-0000001b0071', 'BD-ELSEWHERE', 'Kennel at B', true);

/** A boarding booking body for the given nights. */
create or replace function pg_temp.stay(p_client uuid, p_from text, p_to text)
returns jsonb language sql as $$
  select jsonb_build_object(
    'facility_id', '00000000-0000-0000-0000-0000001b0020',
    'client_id',   p_client,
    'service',     'boarding',
    'status',      'confirmed',
    -- No payment_status: create_booking rejects the column outright since
    -- 20260806720000, because the database derives it.
    'start_at',    p_from,
    'end_at',      p_to,
    'base_price',  100, 'discount', 0, 'total_cost', 100
  );
$$;

create or replace function pg_temp.as_owner() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000001b0001', true);
end $$;

-- ── K1: the kennel is still bookable ───────────────────────────────────────
--
-- Two stays in the SAME room on different weeks, and two overlapping stays in
-- DIFFERENT rooms. A constraint that simply refused everything would make
-- every assertion below this one pass.
do $$
declare v_a uuid; v_b uuid; v_c uuid; v_stays integer;
begin
  perform pg_temp.as_owner();
  set local role authenticated;

  select booking_id into v_a from public.create_booking(
    pg_temp.stay('00000000-0000-0000-0000-0000001b0040', '2026-09-01', '2026-09-05'),
    array['00000000-0000-0000-0000-0000001b0050']::uuid[], null,
    jsonb_build_object('roomId', 'BD-01'));

  -- same room, a week later
  select booking_id into v_b from public.create_booking(
    pg_temp.stay('00000000-0000-0000-0000-0000001b0041', '2026-09-10', '2026-09-14'),
    array['00000000-0000-0000-0000-0000001b0051']::uuid[], null,
    jsonb_build_object('roomId', 'BD-01'));

  -- overlapping the first, but a different room
  select booking_id into v_c from public.create_booking(
    pg_temp.stay('00000000-0000-0000-0000-0000001b0041', '2026-09-01', '2026-09-05'),
    array['00000000-0000-0000-0000-0000001b0051']::uuid[], null,
    jsonb_build_object('roomId', 'BD-02'));

  reset role;

  select count(*) into v_stays from public.boarding_stays
   where booking_id in (v_a, v_b, v_c);

  perform pg_temp.t('K1  the same kennel takes another guest next week, and two kennels run in parallel',
    v_stays = 3, format('stays written=%s', v_stays));
exception when others then
  reset role; perform pg_temp.t('K1  rooms are bookable', false, sqlerrm);
end $$;

-- ── K2: the same nights in the same kennel are refused ─────────────────────
do $$
declare v_before integer; v_after integer; v_raised boolean; v_msg text;
begin
  select count(*) into v_before from public.bookings
   where facility_id = '00000000-0000-0000-0000-0000001b0020';

  perform pg_temp.as_owner();
  set local role authenticated;
  begin
    perform public.create_booking(
      pg_temp.stay('00000000-0000-0000-0000-0000001b0041', '2026-09-03', '2026-09-07'),
      array['00000000-0000-0000-0000-0000001b0051']::uuid[], null,
      jsonb_build_object('roomId', 'BD-01'));
    v_raised := false;
  exception when others then v_raised := true; v_msg := sqlerrm; end;
  reset role;

  select count(*) into v_after from public.bookings
   where facility_id = '00000000-0000-0000-0000-0000001b0020';

  perform pg_temp.t('K2  a kennel cannot be double-booked, and no orphan booking survives it',
    v_raised and v_after = v_before,
    format('raised=%s bookings before=%s after=%s', v_raised, v_before, v_after));
exception when others then
  reset role; perform pg_temp.t('K2  double booking refused', false, sqlerrm);
end $$;

-- ── K3: check-out day is the next guest's check-in day ─────────────────────
--
-- `[)` is why. With `[]` the room would be unbookable on every changeover day,
-- silently costing a night per stay.
do $$
declare v_id uuid;
begin
  perform pg_temp.as_owner();
  set local role authenticated;
  select booking_id into v_id from public.create_booking(
    pg_temp.stay('00000000-0000-0000-0000-0000001b0041', '2026-09-05', '2026-09-08'),
    array['00000000-0000-0000-0000-0000001b0051']::uuid[], null,
    jsonb_build_object('roomId', 'BD-01'));
  reset role;

  perform pg_temp.t('K3  a guest may arrive the day the last one leaves',
    v_id is not null, format('booking=%s', coalesce(v_id::text, 'refused')));
exception when others then
  reset role; perform pg_temp.t('K3  adjacent stays', false, sqlerrm);
end $$;

-- ── K4: cancelling frees the kennel ────────────────────────────────────────
do $$
declare v_first uuid; v_second uuid; v_released timestamptz;
begin
  perform pg_temp.as_owner();
  set local role authenticated;

  select booking_id into v_first from public.create_booking(
    pg_temp.stay('00000000-0000-0000-0000-0000001b0040', '2026-10-01', '2026-10-04'),
    array['00000000-0000-0000-0000-0000001b0050']::uuid[], null,
    jsonb_build_object('roomId', 'BD-02'));

  update public.bookings set status = 'cancelled' where id = v_first;

  -- The same nights, same room, now that the first guest has cancelled.
  select booking_id into v_second from public.create_booking(
    pg_temp.stay('00000000-0000-0000-0000-0000001b0041', '2026-10-01', '2026-10-04'),
    array['00000000-0000-0000-0000-0000001b0051']::uuid[], null,
    jsonb_build_object('roomId', 'BD-02'));
  reset role;

  select released_at into v_released
    from public.boarding_stays where booking_id = v_first;

  perform pg_temp.t('K4  a cancelled stay frees the kennel and keeps its record',
    v_second is not null and v_released is not null,
    format('rebooked=%s released_at=%s', v_second is not null, v_released is not null));
exception when others then
  reset role; perform pg_temp.t('K4  cancellation frees the room', false, sqlerrm);
end $$;

-- ── K5: reopening cannot steal the kennel back ─────────────────────────────
--
-- The half that is easy to miss. The room was given away while the booking sat
-- cancelled, so un-cancelling it must fail rather than quietly double-book.
do $$
declare v_first uuid; v_raised boolean; v_status text;
begin
  perform pg_temp.as_owner();
  set local role authenticated;

  select b.id into v_first
    from public.bookings b
    join public.boarding_stays s on s.booking_id = b.id
   where b.status = 'cancelled' and s.released_at is not null
   limit 1;

  begin
    update public.bookings set status = 'confirmed' where id = v_first;
    v_raised := false;
  exception when others then v_raised := true; end;
  reset role;

  select status::text into v_status from public.bookings where id = v_first;

  perform pg_temp.t('K5  re-opening a cancelled booking cannot take back an occupied kennel',
    v_raised and v_status = 'cancelled',
    format('raised=%s status=%s', v_raised, v_status));
exception when others then
  reset role; perform pg_temp.t('K5  reopen refused', false, sqlerrm);
end $$;

-- ── K6: moving the dates is judged too ─────────────────────────────────────
do $$
declare v_id uuid; v_raised boolean; v_range text;
begin
  perform pg_temp.as_owner();
  set local role authenticated;

  select booking_id into v_id from public.create_booking(
    pg_temp.stay('00000000-0000-0000-0000-0000001b0040', '2026-11-01', '2026-11-03'),
    array['00000000-0000-0000-0000-0000001b0050']::uuid[], null,
    jsonb_build_object('roomId', 'BD-01'));

  -- Shove it onto the September stay already in BD-01.
  begin
    update public.bookings
       set start_at = '2026-09-02', end_at = '2026-09-04'
     where id = v_id;
    v_raised := false;
  exception when others then v_raised := true; end;
  reset role;

  select occupies::text into v_range
    from public.boarding_stays where booking_id = v_id;

  perform pg_temp.t('K6  a booking cannot be moved onto an occupied kennel',
    v_raised and v_range like '%2026-11%',
    format('raised=%s occupies=%s', v_raised, v_range));
exception when others then
  reset role; perform pg_temp.t('K6  date move refused', false, sqlerrm);
end $$;

-- ── K7: overbooking is a permission, and it is recorded ────────────────────
do $$
declare v_recep_raised boolean; v_owner_id uuid; v_reason text;
begin
  -- Reception holds create_bookings and edit_bookings, not the override.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000001b0002', true);
  set local role authenticated;
  begin
    perform public.create_booking(
      pg_temp.stay('00000000-0000-0000-0000-0000001b0041', '2026-09-02', '2026-09-04'),
      array['00000000-0000-0000-0000-0000001b0051']::uuid[], null,
      jsonb_build_object('roomId', 'BD-01', 'overrideReason', 'Squeeze them in'));
    v_recep_raised := false;
  exception when others then v_recep_raised := true; end;
  reset role;

  -- The owner does hold it, and the same overlap is allowed.
  perform pg_temp.as_owner();
  set local role authenticated;
  select booking_id into v_owner_id from public.create_booking(
    pg_temp.stay('00000000-0000-0000-0000-0000001b0041', '2026-09-02', '2026-09-04'),
    array['00000000-0000-0000-0000-0000001b0051']::uuid[], null,
    jsonb_build_object('roomId', 'BD-01', 'overrideReason', 'Owner authorised, litter mates'));
  reset role;

  select override_reason into v_reason
    from public.boarding_stays where booking_id = v_owner_id;

  perform pg_temp.t('K7  reception cannot overbook a kennel; an owner can, with the reason on the record',
    v_recep_raised and v_owner_id is not null and v_reason is not null,
    format('reception refused=%s owner booked=%s reason=%s',
           v_recep_raised, v_owner_id is not null, coalesce(v_reason, '-')));
exception when others then
  reset role; perform pg_temp.t('K7  override is a permission', false, sqlerrm);
end $$;

-- ── K8: another facility's kennel is not this one's to fill ────────────────
do $$
declare v_raised boolean;
begin
  perform pg_temp.as_owner();
  set local role authenticated;
  begin
    perform public.create_booking(
      pg_temp.stay('00000000-0000-0000-0000-0000001b0040', '2026-12-01', '2026-12-03'),
      array['00000000-0000-0000-0000-0000001b0050']::uuid[], null,
      jsonb_build_object('roomId', 'BD-ELSEWHERE'));
    v_raised := false;
  exception when others then v_raised := true; end;
  reset role;

  perform pg_temp.t('K8  a booking cannot be put in another facility''s kennel',
    v_raised, format('raised=%s', v_raised));
exception when others then
  reset role; perform pg_temp.t('K8  cross-facility room', false, sqlerrm);
end $$;

-- ============================================================================
-- Moving a guest between kennels (20260806640000).
--
-- `create_booking` places a guest at booking time; this is the ops board's
-- actual job -- assign later, move, or pull back to unassigned. Uses the same
-- fixtures above, on dates nothing else touches.
-- ============================================================================

-- ── A1: assigned after the fact, moved, then cleared ───────────────────────
do $$
declare v_ref bigint; v_room text; v_after text; v_gone integer;
begin
  perform pg_temp.as_owner();
  set local role authenticated;

  -- Deliberately created with NO room: the state the board exists to resolve.
  select booking_ref into v_ref from public.create_booking(
    pg_temp.stay('00000000-0000-0000-0000-0000001b0040', '2027-01-01', '2027-01-04'),
    array['00000000-0000-0000-0000-0000001b0050']::uuid[], null, null);

  v_room  := public.assign_boarding_room(v_ref, 'BD-01');
  v_after := public.assign_boarding_room(v_ref, 'BD-02');
  perform public.assign_boarding_room(v_ref, null);
  reset role;

  select count(*) into v_gone
    from public.boarding_stays s
    join public.bookings b on b.id = s.booking_id
   where b.ref = v_ref;

  -- Unassigning DELETES the stay rather than releasing it: the guest was never
  -- placed there, so there is no history worth keeping. `released_at` is for a
  -- cancelled booking, where the stay happened and then stopped.
  perform pg_temp.t('A1  a kennel can be assigned after the fact, moved, and cleared',
    v_room = 'BD-01' and v_after = 'BD-02' and v_gone = 0,
    format('assigned=%s moved=%s remaining=%s', v_room, v_after, v_gone));
exception when others then
  reset role; perform pg_temp.t('A1  assign / move / clear', false, sqlerrm);
end $$;

-- ── A2: a refused move leaves the guest where they were ────────────────────
--
-- The half that matters. A move that fails must not also lose the room the
-- guest already had.
do $$
declare v_a bigint; v_b bigint; v_raised boolean; v_still text;
begin
  perform pg_temp.as_owner();
  set local role authenticated;

  select booking_ref into v_a from public.create_booking(
    pg_temp.stay('00000000-0000-0000-0000-0000001b0040', '2027-02-01', '2027-02-05'),
    array['00000000-0000-0000-0000-0000001b0050']::uuid[], null,
    jsonb_build_object('roomId', 'BD-01'));

  select booking_ref into v_b from public.create_booking(
    pg_temp.stay('00000000-0000-0000-0000-0000001b0041', '2027-02-02', '2027-02-06'),
    array['00000000-0000-0000-0000-0000001b0051']::uuid[], null,
    jsonb_build_object('roomId', 'BD-02'));

  begin
    perform public.assign_boarding_room(v_b, 'BD-01');
    v_raised := false;
  exception when others then v_raised := true; end;
  reset role;

  select r.legacy_id into v_still
    from public.boarding_stays s
    join public.bookings b on b.id = s.booking_id
    join public.facility_rooms r on r.id = s.room_id
   where b.ref = v_b;

  perform pg_temp.t('A2  a refused move does not cost the guest the kennel they had',
    v_raised and v_still = 'BD-02',
    format('raised=%s still in=%s', v_raised, v_still));
exception when others then
  reset role; perform pg_temp.t('A2  refused move', false, sqlerrm);
end $$;

-- ── A3: reception may place a guest, not overbook ──────────────────────────
--
-- Both halves. A permission check that refused everything would pass the deny
-- on its own.
do $$
declare v_ref bigint; v_moved text; v_raised boolean;
begin
  perform pg_temp.as_owner();
  set local role authenticated;
  select booking_ref into v_ref from public.create_booking(
    pg_temp.stay('00000000-0000-0000-0000-0000001b0040', '2027-03-01', '2027-03-03'),
    array['00000000-0000-0000-0000-0000001b0050']::uuid[], null, null);
  reset role;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000001b0002', true);
  set local role authenticated;
  v_moved := public.assign_boarding_room(v_ref, 'BD-01');
  begin
    perform public.assign_boarding_room(v_ref, 'BD-02', 'squeeze them in');
    v_raised := false;
  exception when others then v_raised := true; end;
  reset role;

  perform pg_temp.t('A3  reception can place a guest but cannot overbook',
    v_moved = 'BD-01' and v_raised,
    format('placed=%s override refused=%s', v_moved, v_raised));
exception when others then
  reset role; perform pg_temp.t('A3  reception scope', false, sqlerrm);
end $$;

-- ── A4: anon cannot call it ────────────────────────────────────────────────
do $$
declare v_allowed boolean;
begin
  set local role anon;
  begin
    perform public.assign_boarding_room(1, 'BD-01');
    v_allowed := true;
  exception when others then v_allowed := false; end;
  reset role;

  perform pg_temp.t('A4  anon cannot execute assign_boarding_room',
    not v_allowed, format('allowed=%s', v_allowed));
exception when others then
  reset role; perform pg_temp.t('A4  anon execute', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
