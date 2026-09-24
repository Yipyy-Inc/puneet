-- ============================================================================
-- An area is counted in pets, not rooms. See
-- 20260924190000_an_area_is_counted_in_pets_not_rooms.sql
--
--   bun run test:sql lodging-area-capacity
--
-- One transaction, rolled back. It provisions its own facility.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- A0  An area fills up by PETS. Three stays of two pets each fit a max of 6;
--     one more pet does not. This is the assertion the phase exists for.
-- A1  It counts PETS, not stays. One stay of five pets fills a five-pet area,
--     even though it is a single row — which is the difference from a room.
-- A2  The CHECK-OUT DAY IS FREE. An area at its maximum accepts a stay
--     starting the day the others leave. MoéGo says pets checking out that
--     date are not counted, and the half-open range already says it.
-- A3  A recorded override still gets in, the same hatch a room has.
-- A4  A cancelled stay frees its pets.
-- A5  `lodging_occupancy` answers X of Y in MoéGo's shape for both kinds, and
--     anon can call neither it nor the counting function.
--
-- ── WHICH OF THESE ACTUALLY PROVE THE TRIGGER ─────────────────────────────
--
-- Measured by running the file with the trigger disabled: A0 and A1 FAIL and
-- the rest pass. So those two are the refusal, and A2-A4 are the opposite
-- guard-rail — they assert ACCEPTANCE, and would catch a trigger that refused
-- a stay it should not. Both halves are worth having; only the first half is
-- evidence that a limit exists.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

insert into public.profiles (id, email, full_name) values
  ('user_lacAdmin000000000000000000000', 'lacadmin@yipyy.invalid', 'LAC Admin')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role) values
  ('user_lacAdmin000000000000000000000', 'superadmin')
on conflict (profile_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_lacAdmin000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000a-0000-4000-8000-000000000001'::uuid,
    'Mu Pets', 'mu-pets-lac', 'America/Toronto', 'M Owner', 'mowner@mu.invalid');
end $$;

reset role;

-- ── A yard that holds six pets, a kennel that holds one family, and pets ──

do $$
declare
  v_fac uuid; v_yard uuid; v_kennel uuid; v_client uuid; i int;
begin
  select id into v_fac from public.facilities where slug = 'mu-pets-lac';

  insert into public.room_categories
    (facility_id, legacy_id, service, name, default_capacity,
     space_type, max_pets_per_area)
  values (v_fac, 'lac-yard', 'boarding', 'LAC Play Yard', 1, 'area', 6)
  returning id into v_yard;

  insert into public.facility_rooms (facility_id, category_id, legacy_id, name)
  values (v_fac, v_yard, 'lac-yard-1', 'LAC Yard 1');

  insert into public.room_categories
    (facility_id, legacy_id, service, name, default_capacity)
  values (v_fac, 'lac-kennel', 'boarding', 'LAC Kennels', 2)
  returning id into v_kennel;

  insert into public.facility_rooms (facility_id, category_id, legacy_id, name)
  values (v_fac, v_kennel, 'lac-kennel-1', 'LAC Kennel 1');

  insert into public.clients (facility_id, name, email, status, details)
  values (v_fac, 'Marco Ruiz', 'marco@ruiz.invalid', 'active', '{}'::jsonb)
  returning id into v_client;

  -- Ten pets, so every test below can bring as many as it needs.
  for i in 1..10 loop
    insert into public.pets (facility_id, client_id, name, species)
    values (v_fac, v_client, 'LAC pet ' || i, 'Dog');
  end loop;
end $$;

-- A stay with N pets on it. Returns the booking id.
create or replace function pg_temp.stay(
  p_room_legacy text,
  p_from date,
  p_to date,
  p_pets int,
  p_offset int default 0,
  p_reason text default null
) returns uuid
language plpgsql
as $$
declare
  v_fac uuid; v_client uuid; v_room uuid; v_booking uuid;
begin
  select id into v_fac from public.facilities where slug = 'mu-pets-lac';
  select id into v_client from public.clients
   where facility_id = v_fac and email = 'marco@ruiz.invalid';
  select id into v_room from public.facility_rooms
   where facility_id = v_fac and legacy_id = p_room_legacy;

  insert into public.bookings
    (facility_id, client_id, service, service_type, status, start_at, end_at,
     base_price, total_cost)
  values (v_fac, v_client, 'boarding', 'LAC stay', 'confirmed',
          p_from::timestamptz, p_to::timestamptz, 100, 100)
  returning id into v_booking;

  insert into public.booking_pets (booking_id, pet_id)
  select v_booking, p.id
    from (select id, row_number() over (order by name) as rn
            from public.pets
           where facility_id = v_fac and name like 'LAC pet %') p
   where p.rn > p_offset and p.rn <= p_offset + p_pets;

  insert into public.boarding_stays
    (booking_id, facility_id, room_id, occupies, override_reason)
  values (v_booking, v_fac, v_room,
          tstzrange(p_from::timestamptz, p_to::timestamptz, '[)'), p_reason);

  return v_booking;
end;
$$;

-- The trigger is DEFERRED so that create_booking can write its pets after the
-- stay. This file writes them BEFORE, so making it immediate lets each
-- assertion be measured where it is written instead of at commit — which a
-- rolled-back test transaction never reaches.
--
-- There are deliberately NO savepoints: rolling back to one would discard the
-- tap rows written since it, and the file would report a fraction of its own
-- assertions as a pass. Each block books its own month instead.
set constraints all immediate;

-- ── A0 an area fills up by pets ───────────────────────────────────────────

do $$
declare v_filled boolean; v_refused boolean; v_err text;
begin
  begin
    perform pg_temp.stay('lac-yard-1', '2027-06-01', '2027-06-05', 2, 0);
    perform pg_temp.stay('lac-yard-1', '2027-06-01', '2027-06-05', 2, 2);
    perform pg_temp.stay('lac-yard-1', '2027-06-01', '2027-06-05', 2, 4);
    v_filled := true;
  exception when others then
    v_filled := false; v_err := sqlerrm;
  end;

  begin
    perform pg_temp.stay('lac-yard-1', '2027-06-02', '2027-06-04', 1, 6);
    v_refused := false;
  exception when others then
    v_refused := true;
  end;

  perform pg_temp.t(0,
    'an area holds six pets and refuses the seventh',
    v_filled and v_refused,
    coalesce(v_err, format('six fit=%s seventh refused=%s', v_filled, v_refused)));
end $$;

-- ── A1 it counts pets, not stays ──────────────────────────────────────────

do $$
declare v_one boolean; v_two boolean;
begin
  begin
    -- ONE stay carrying six pets fills the whole yard. A room would call this
    -- a single occupant; an area calls it six.
    perform pg_temp.stay('lac-yard-1', '2027-07-01', '2027-07-05', 6, 0);
    v_one := true;
  exception when others then
    v_one := false;
  end;

  begin
    perform pg_temp.stay('lac-yard-1', '2027-07-02', '2027-07-03', 1, 6);
    v_two := false;
  exception when others then
    v_two := true;
  end;

  perform pg_temp.t(1,
    'one stay of six pets fills a six-pet area — it counts pets, not stays',
    v_one and v_two,
    format('six-pet stay accepted=%s next pet refused=%s', v_one, v_two));
end $$;

-- ── A2 the check-out day is free ──────────────────────────────────────────

do $$
declare v_ok boolean; v_err text;
begin
  perform pg_temp.stay('lac-yard-1', '2027-08-01', '2027-08-05', 6, 0);

  begin
    -- They leave on the 5th; these arrive on the 5th. MoeGo: "pets scheduled
    -- to check out on that date are not counted toward occupancy."
    perform pg_temp.stay('lac-yard-1', '2027-08-05', '2027-08-08', 4, 6);
    v_ok := true;
  exception when others then
    v_ok := false; v_err := sqlerrm;
  end;

  perform pg_temp.t(2,
    'a full area accepts arrivals on the day the others check out',
    v_ok, coalesce(v_err, 'accepted'));
end $$;

-- ── A3-A4 the override, and a cancellation ────────────────────────────────

do $$
declare v_override boolean; v_freed boolean; v_err text;
begin
  perform pg_temp.stay('lac-yard-1', '2027-09-01', '2027-09-05', 6, 0);

  begin
    perform pg_temp.stay('lac-yard-1', '2027-09-02', '2027-09-03', 2, 6,
                         'e2e area override');
    v_override := true;
  exception when others then
    v_override := false; v_err := sqlerrm;
  end;

  perform pg_temp.t(3,
    'a recorded override still gets into a full area, as it does a full room',
    v_override, coalesce(v_err, 'accepted'));
end $$;

do $$
declare v_booking uuid; v_ok boolean; v_err text;
begin
  v_booking := pg_temp.stay('lac-yard-1', '2027-10-01', '2027-10-05', 6, 0);

  update public.boarding_stays set released_at = now() where booking_id = v_booking;

  begin
    perform pg_temp.stay('lac-yard-1', '2027-10-02', '2027-10-04', 4, 6);
    v_ok := true;
  exception when others then
    v_ok := false; v_err := sqlerrm;
  end;

  perform pg_temp.t(4,
    'a released stay frees its pets, exactly as it frees a room',
    v_ok, coalesce(v_err, 'accepted'));
end $$;

-- ── A5 what a board asks, and who may ask it ──────────────────────────────

do $$
declare
  v_area_used int; v_area_cap int; v_area_kind text;
  v_room_used int; v_room_cap int; v_room_kind text;
  v_yard uuid; v_kennel uuid; v_fac uuid;
begin
  select id into v_fac from public.facilities where slug = 'mu-pets-lac';
  select id into v_yard from public.facility_rooms
   where facility_id = v_fac and legacy_id = 'lac-yard-1';
  select id into v_kennel from public.facility_rooms
   where facility_id = v_fac and legacy_id = 'lac-kennel-1';

  perform pg_temp.stay('lac-yard-1', '2027-11-01', '2027-11-05', 4, 0);
  perform pg_temp.stay('lac-kennel-1', '2027-11-01', '2027-11-05', 2, 4);

  select space_type, used, capacity into v_area_kind, v_area_used, v_area_cap
    from public.lodging_occupancy(v_yard, '2027-11-02');
  select space_type, used, capacity into v_room_kind, v_room_used, v_room_cap
    from public.lodging_occupancy(v_kennel, '2027-11-02');

  perform pg_temp.t(5,
    'lodging_occupancy answers 4 of 6 for the area and 1 of 1 for the room',
    v_area_kind = 'area' and v_area_used = 4 and v_area_cap = 6
      and v_room_kind = 'room' and v_room_used = 1 and v_room_cap = 1,
    format('area %s/%s (%s), room %s/%s (%s)',
           v_area_used, v_area_cap, v_area_kind,
           v_room_used, v_room_cap, v_room_kind));
end $$;

do $$
begin
  perform pg_temp.t(6,
    'anon can call neither the occupancy read nor the pet count',
    not has_function_privilege('anon', 'public.lodging_occupancy(uuid,date)', 'execute')
      and not has_function_privilege('anon',
            'private.area_pets_in_use(uuid,tstzrange,uuid)', 'execute')
      and has_function_privilege('authenticated',
            'public.lodging_occupancy(uuid,date)', 'execute'));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
