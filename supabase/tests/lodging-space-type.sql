-- ============================================================================
-- A lodging type knows what kind of space it is. See
-- 20260924180000_a_lodging_type_knows_what_kind_of_space_it_is.sql
--
--   bun run test:sql lodging-space-type
--
-- One transaction, rolled back. It provisions its own facility, so it never
-- depends on what any suite has left behind.
--
-- ── WHY THIS IS A SEPARATE FILE FROM boarding-occupancy.sql ───────────────
--
-- That file is the regression suite for `boarding_stay_no_double_booking`, and
-- this change RE-PREDICATES that constraint. Keeping it untouched means a
-- green run there is still evidence about the old behaviour rather than
-- evidence about the new assertions sitting beside it. K2 in particular is the
-- positive control for the whole kennel model: if it ever passes for the wrong
-- reason, a kennel is double-sold.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- L0  A room type still refuses a second live stay on the same nights. This is
--     the assertion that must NOT have moved — it is the money rule.
-- L1  An AREA admits overlapping stays, which is the whole point of an area
--     and which the old constraint forbade.
-- L2  A room type may still be overbooked with a recorded reason, and the
--     checkout day is still free. Both predicates survived the rewrite.
-- L3  `space_type` on the stay is DERIVED. A caller naming the wrong one is
--     overwritten, not trusted.
-- L4  Changing a category to an area flips what its rooms allow. The stay's
--     copy is refreshed when the room is reassigned.
-- L5  An area must carry a maximum, and a room must not carry a stale one.
--     Exactly one meaning per row.
-- L6  A maximum of zero or less is refused.
-- L7  A class may carry only the rules the engine reads. `single_pet_only`
--     and `max_pets` were its capacity spelled twice more, `size_restriction`
--     was read by nothing (20260925164457) — each is refused now.
-- L8  A daycare section's own rules (`facility_rooms.rules`) take the same
--     list, and so does a rule with no type at all.
-- L9  The positive control: the three it reads are still admitted, on both.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

-- ── A facility, a client, a pet, two lodging types and their units ────────

insert into public.profiles (id, email, full_name) values
  ('user_lstAdmin000000000000000000000', 'lstadmin@yipyy.invalid', 'LST Admin')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role) values
  ('user_lstAdmin000000000000000000000', 'superadmin')
on conflict (profile_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_lstAdmin000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000e-0000-4000-8000-000000000001'::uuid,
    'Lambda Pets', 'lambda-pets-lst', 'America/Toronto', 'L Owner', 'lowner@lambda.invalid');
end $$;

reset role;

do $$
declare
  v_fac    uuid;
  v_client uuid;
  v_pet    uuid;
  v_kennel uuid;
  v_yard   uuid;
  v_room1  uuid;
  v_area1  uuid;
begin
  select id into v_fac from public.facilities where slug = 'lambda-pets-lst';

  insert into public.room_categories
    (facility_id, legacy_id, service, name, default_capacity)
  values (v_fac, 'lst-kennel', 'boarding', 'LST Kennels', 2)
  returning id into v_kennel;

  insert into public.facility_rooms (facility_id, category_id, legacy_id, name)
  values (v_fac, v_kennel, 'lst-room-1', 'LST Room 1')
  returning id into v_room1;

  -- An AREA. `max_pets_per_area` is required for one, which L5 proves.
  insert into public.room_categories
    (facility_id, legacy_id, service, name, default_capacity,
     space_type, max_pets_per_area)
  values (v_fac, 'lst-yard', 'boarding', 'LST Play Yard', 1, 'area', 60)
  returning id into v_yard;

  insert into public.facility_rooms (facility_id, category_id, legacy_id, name)
  values (v_fac, v_yard, 'lst-area-1', 'LST Yard 1')
  returning id into v_area1;

  insert into public.clients (facility_id, name, email, status, details)
  values (v_fac, 'Lena Sato', 'lena@sato.invalid', 'active', '{}'::jsonb)
  returning id into v_client;

  insert into public.pets (facility_id, client_id, name, species)
  values (v_fac, v_client, 'Mochi', 'Dog')
  returning id into v_pet;
end $$;

-- A helper that makes a boarding booking and its stay, so each assertion below
-- reads as the thing it is testing rather than as twelve lines of setup.
create or replace function pg_temp.stay(
  p_room_legacy text,
  p_from date,
  p_to date,
  p_reason text default null
) returns uuid
language plpgsql
as $$
declare
  v_fac     uuid;
  v_client  uuid;
  v_room    uuid;
  v_booking uuid;
begin
  select id into v_fac from public.facilities where slug = 'lambda-pets-lst';
  select id into v_client from public.clients
   where facility_id = v_fac and email = 'lena@sato.invalid';
  select id into v_room from public.facility_rooms
   where facility_id = v_fac and legacy_id = p_room_legacy;

  insert into public.bookings
    (facility_id, client_id, service, service_type, status, start_at, end_at,
     base_price, total_cost)
  values (v_fac, v_client, 'boarding', 'LST stay', 'confirmed',
          p_from::timestamptz, p_to::timestamptz, 100, 100)
  returning id into v_booking;

  insert into public.boarding_stays
    (booking_id, facility_id, room_id, occupies, override_reason)
  values (v_booking, v_fac, v_room,
          tstzrange(p_from::timestamptz, p_to::timestamptz, '[)'), p_reason);

  return v_booking;
end;
$$;

-- ── L0 a room still refuses a second live stay ────────────────────────────

do $$
declare v_ok boolean;
begin
  perform pg_temp.stay('lst-room-1', '2027-03-01', '2027-03-05');
  begin
    perform pg_temp.stay('lst-room-1', '2027-03-02', '2027-03-04');
    v_ok := false;
  exception when exclusion_violation then
    v_ok := true;
  end;
  perform pg_temp.t(0,
    'a ROOM still refuses a second live stay on overlapping nights',
    v_ok,
    'this is the money rule; if it moved, a kennel is double-sold');
end $$;

-- ── L1 an area admits overlap, which the old constraint forbade ───────────

do $$
declare v_ok boolean; v_err text;
begin
  begin
    perform pg_temp.stay('lst-area-1', '2027-03-01', '2027-03-05');
    perform pg_temp.stay('lst-area-1', '2027-03-02', '2027-03-04');
    perform pg_temp.stay('lst-area-1', '2027-03-03', '2027-03-06');
    v_ok := true;
  exception when others then
    v_ok := false;
    v_err := sqlerrm;
  end;
  perform pg_temp.t(1,
    'an AREA admits overlapping stays — the old constraint forbade all three',
    v_ok, coalesce(v_err, 'three overlapping stays accepted'));
end $$;

-- ── L2 the other two predicates survived ──────────────────────────────────

do $$
declare v_override boolean; v_adjacent boolean; v_err text;
begin
  begin
    perform pg_temp.stay('lst-room-1', '2027-03-02', '2027-03-04', 'e2e override');
    v_override := true;
  exception when others then
    v_override := false; v_err := sqlerrm;
  end;

  begin
    -- Half-open [): the day one guest leaves is the day the next may arrive.
    -- MoeGo says the same thing as "pets checking out that date are not
    -- counted toward occupancy".
    perform pg_temp.stay('lst-room-1', '2027-03-05', '2027-03-08');
    v_adjacent := true;
  exception when others then
    v_adjacent := false; v_err := coalesce(v_err, sqlerrm);
  end;

  perform pg_temp.t(2,
    'a recorded override still overbooks a room, and check-out day is still free',
    v_override and v_adjacent,
    coalesce(v_err, format('override=%s adjacent=%s', v_override, v_adjacent)));
end $$;

-- ── L3 the stay's space_type is derived, never supplied ───────────────────

do $$
declare
  v_fac uuid; v_client uuid; v_room uuid; v_booking uuid; v_stored text;
begin
  select id into v_fac from public.facilities where slug = 'lambda-pets-lst';
  select id into v_client from public.clients
   where facility_id = v_fac and email = 'lena@sato.invalid';
  select id into v_room from public.facility_rooms
   where facility_id = v_fac and legacy_id = 'lst-area-1';

  insert into public.bookings
    (facility_id, client_id, service, service_type, status, start_at, end_at,
     base_price, total_cost)
  values (v_fac, v_client, 'boarding', 'LST lie', 'confirmed',
          '2027-04-01'::timestamptz, '2027-04-03'::timestamptz, 100, 100)
  returning id into v_booking;

  -- Claim it is a room, on a room that belongs to an AREA.
  insert into public.boarding_stays
    (booking_id, facility_id, room_id, occupies, space_type)
  values (v_booking, v_fac, v_room,
          tstzrange('2027-04-01'::timestamptz, '2027-04-03'::timestamptz, '[)'),
          'room');

  select space_type::text into v_stored
    from public.boarding_stays where booking_id = v_booking;

  perform pg_temp.t(3,
    'the stay space_type is derived from the category, not taken from the caller',
    v_stored = 'area',
    format('caller said room, stored %s', v_stored));
end $$;

-- ── L4 changing the type changes what its rooms allow ─────────────────────

do $$
declare v_fac uuid; v_ok boolean; v_err text;
begin
  select id into v_fac from public.facilities where slug = 'lambda-pets-lst';

  -- A second kennel type, turned into an area after its room exists.
  insert into public.room_categories
    (facility_id, legacy_id, service, name, default_capacity)
  values (v_fac, 'lst-flex', 'boarding', 'LST Flex', 1);

  insert into public.facility_rooms (facility_id, category_id, legacy_id, name)
  select v_fac, id, 'lst-flex-1', 'LST Flex 1'
    from public.room_categories where facility_id = v_fac and legacy_id = 'lst-flex';

  perform pg_temp.stay('lst-flex-1', '2027-05-01', '2027-05-05');

  update public.room_categories
     set space_type = 'area', max_pets_per_area = 20
   where facility_id = v_fac and legacy_id = 'lst-flex';

  -- The new stay derives 'area' and is admitted. The OLD stay still reads
  -- 'room' until its room is reassigned, which is honest: it was booked under
  -- the old rule. The exclusion constraint compares pairs, and a pair needs
  -- both rows to be rooms to conflict — so this succeeds.
  begin
    perform pg_temp.stay('lst-flex-1', '2027-05-02', '2027-05-04');
    v_ok := true;
  exception when others then
    v_ok := false; v_err := sqlerrm;
  end;

  perform pg_temp.t(4,
    'turning a type into an area lets its rooms take overlapping stays',
    v_ok, coalesce(v_err, 'accepted'));
end $$;

-- ── L5-L6 exactly one meaning per row ─────────────────────────────────────

do $$
declare v_fac uuid; v_area_no_max boolean; v_room_with_max boolean; v_zero boolean;
begin
  select id into v_fac from public.facilities where slug = 'lambda-pets-lst';

  begin
    insert into public.room_categories
      (facility_id, legacy_id, service, name, default_capacity, space_type)
    values (v_fac, 'lst-bad-1', 'boarding', 'LST Bad 1', 1, 'area');
    v_area_no_max := false;
  exception when check_violation then
    v_area_no_max := true;
  end;

  begin
    insert into public.room_categories
      (facility_id, legacy_id, service, name, default_capacity,
       space_type, max_pets_per_area)
    values (v_fac, 'lst-bad-2', 'boarding', 'LST Bad 2', 1, 'room', 30);
    v_room_with_max := false;
  exception when check_violation then
    v_room_with_max := true;
  end;

  perform pg_temp.t(5,
    'an area must carry a maximum, and a room must not carry a stale one',
    v_area_no_max and v_room_with_max,
    format('area-without-max refused=%s room-with-max refused=%s',
           v_area_no_max, v_room_with_max));

  begin
    insert into public.room_categories
      (facility_id, legacy_id, service, name, default_capacity,
       space_type, max_pets_per_area)
    values (v_fac, 'lst-bad-3', 'boarding', 'LST Bad 3', 1, 'area', 0);
    v_zero := false;
  exception when check_violation then
    v_zero := true;
  end;

  perform pg_temp.t(6,
    'an area that holds nobody is refused',
    v_zero, 'max_pets_per_area must be positive');
end $$;

-- ── L7-L9 only the rules the engine reads ──────────────────────────────────

do $$
declare
  v_fac     uuid;
  v_kennel  uuid;
  v_room    uuid;
  v_refused text[] := '{}';
  v_kind    text;
  v_err     text;
begin
  select id into v_fac from public.facilities where slug = 'lambda-pets-lst';
  select id into v_kennel from public.room_categories
   where facility_id = v_fac and legacy_id = 'lst-kennel';
  select id into v_room from public.facility_rooms
   where facility_id = v_fac and legacy_id = 'lst-room-1';

  foreach v_kind in array array['single_pet_only', 'max_pets', 'size_restriction']
  loop
    begin
      update public.room_categories
         set rules = jsonb_build_array(jsonb_build_object(
               'id', 'lst-' || v_kind, 'type', v_kind, 'value', 1,
               'clientMessage', '', 'enabled', true))
       where id = v_kennel;
    exception when check_violation then
      v_refused := v_refused || v_kind;
    end;
  end loop;

  perform pg_temp.t(7,
    'a class refuses a rule the engine does not read',
    cardinality(v_refused) = 3,
    format('refused: %s of single_pet_only, max_pets, size_restriction',
           array_to_string(v_refused, ', ')));

  v_refused := '{}';
  begin
    update public.facility_rooms
       set rules = '[{"id":"lst-u","type":"max_pets","value":2,"clientMessage":"","enabled":true}]'::jsonb
     where id = v_room;
  exception when check_violation then
    v_refused := v_refused || 'unit max_pets'::text;
  end;
  begin
    update public.room_categories
       set rules = '[{"id":"lst-x","value":2,"clientMessage":"","enabled":true}]'::jsonb
     where id = v_kennel;
  exception when check_violation then
    v_refused := v_refused || 'class rule with no type'::text;
  end;

  perform pg_temp.t(8,
    'a section refuses one too, and so does a rule with no type',
    cardinality(v_refused) = 2,
    format('refused: %s', array_to_string(v_refused, ', ')));

  begin
    update public.room_categories
       set rules = '[{"id":"lst-a","type":"min_weight","value":15,"clientMessage":"","enabled":true},
                     {"id":"lst-b","type":"max_weight","value":70,"clientMessage":"","enabled":true},
                     {"id":"lst-c","type":"pet_type","value":["Dog","Cat"],"clientMessage":"","enabled":true}]'::jsonb
     where id = v_kennel;
    update public.facility_rooms
       set rules = '[{"id":"lst-d","type":"pet_type","value":"dog","clientMessage":"","enabled":false}]'::jsonb
     where id = v_room;
  exception when others then
    v_err := sqlerrm;
  end;

  perform pg_temp.t(9,
    'the three it reads are still admitted, on a class and on a section',
    v_err is null, coalesce(v_err, 'min_weight, max_weight and pet_type saved'));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
