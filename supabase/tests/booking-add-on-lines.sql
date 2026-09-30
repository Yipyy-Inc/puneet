-- ============================================================================
-- AN ADD-ON IS A LINE ON THE BILL (2026-09-30).
--
--   bun run test:sql booking-add-on-lines
--
-- One transaction, rolled back. Its own facility, locations, client, pets,
-- staff and add-ons; fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- L1  The server prices the line: a booking's add-on is written at the
--     catalogue's price, tax and minutes, with its pet and its staff member
--     (named as the staff list names them) — never at a price in the request.
-- L2  A location's override prices the line at that location.
-- L3  A request split by DAY carries its add-ons once, on its first booking.
-- L4  A request split by ROOM puts each pet's add-on on the part holding it.
-- L5  An add-on not offered for this service, or deleted, refuses the whole
--     request — nothing is left behind.
-- L6  A customer's request carries its add-on lines at the catalogue's price
--     (the service is zeroed, the add-on is the facility's own number), and a
--     customer cannot write a line of their own.
-- L6b Staff cannot hand-write one either: not insert an add_on line, not turn
--     an item into one, not re-price the one the server wrote.
-- L7  An edit brings the booking's own add-on lines to the new selection —
--     and only those: a line still chosen is KEPT as it was sold, a new one
--     is priced from the catalogue, one no longer chosen is removed.
-- L7b Re-pricing a booking made before the lines existed gives it its lines,
--     once — leaving out one the catalogue no longer offers; a booking that
--     has them keeps them at the price it was sold at.
-- L7c An add-on deleted since stays on the booking that bought it through an
--     edit, and adding a deleted one is refused.
-- L8  An edit to one part of a request re-places the request's add-ons and
--     copies the selection to its other parts.
-- L9  A customer cannot edit somebody else's add-ons.
-- L10 "Apply the changes to all unconfirmed upcoming appointments": pending,
--     requested and waitlisted bookings that have not started take the new
--     price (at their location); confirmed and past ones keep theirs; staff
--     only.
-- L11 The booking's own add-ons stay commissionable; other extras do not.
-- L12 A groom's ready time counts its add-on lines' minutes.
-- L12b An add-on that needs somebody, with nobody named, goes to whoever the
--     booking is with; one that needs nobody stays nobody's.
-- L13 A percentage deposit is taken of the service AND its add-ons.
-- L14 The bookings page's totals count the add-ons.
-- L15 Nobody signed out can call any of it.
-- L16 The occupancy report counts a stay at its service AND its add-ons.
-- L17 A rebook reminder is credited with the service and its add-ons.
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
  ('00000000-0000-0000-0000-000000730001', 'al-owner@example.invalid'),
  ('00000000-0000-0000-0000-000000730005', 'al-cust@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-000000730001', 'al-owner@example.invalid', 'Owner'),
  ('00000000-0000-0000-0000-000000730005', 'al-cust@example.invalid', 'Customer')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-000000730010', 'AL Org', 'al-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-000000730020', '00000000-0000-0000-0000-000000730010',
   'Add-on Lines', 'al-a', 'al-a')
on conflict do nothing;

insert into public.locations (id, facility_id, name, is_primary) values
  ('00000000-0000-0000-0000-000000730021', '00000000-0000-0000-0000-000000730020',
   'AL Main', true),
  ('00000000-0000-0000-0000-000000730022', '00000000-0000-0000-0000-000000730020',
   'AL North', false);

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-000000730030', '00000000-0000-0000-0000-000000730020',
   '00000000-0000-0000-0000-000000730001', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-000000730040', '00000000-0000-0000-0000-000000730020',
   'AL Client', 'al-c1@example.invalid', '00000000-0000-0000-0000-000000730005'),
  ('00000000-0000-0000-0000-000000730041', '00000000-0000-0000-0000-000000730020',
   'AL Other', 'al-c2@example.invalid', null);

insert into public.pets (id, client_id, name, species, weight) values
  ('00000000-0000-0000-0000-000000730050', '00000000-0000-0000-0000-000000730040',
   'Rex', 'dog', 22),
  ('00000000-0000-0000-0000-000000730051', '00000000-0000-0000-0000-000000730040',
   'Bella', 'dog', 12),
  ('00000000-0000-0000-0000-000000730052', '00000000-0000-0000-0000-000000730041',
   'Other', 'dog', 30);

-- A groomer on 10%, for the commission and the staff member on a line.
insert into public.staff
  (id, facility_id, legacy_id, first_name, last_name, email, primary_role, access_level, details)
values
  ('00000000-0000-0000-0000-000000730080', '00000000-0000-0000-0000-000000730020',
   'al-staff', 'Line', 'Probe', 'al-staff@example.invalid', 'groomer', 'staff',
   jsonb_build_object('payroll', jsonb_build_object(
     'generalServiceCommission', 10, 'hourlyRate', 0, 'tipsRate', 0,
     'overrides', '[]'::jsonb)));

insert into public.grooming_services
  (id, facility_id, legacy_id, name, base_price, duration_min)
values
  ('00000000-0000-0000-0000-000000730060', '00000000-0000-0000-0000-000000730020',
   'al-groom', 'Bath', 50, 60);

-- A walk for every service: $10, NOT taxed, 20 minutes — $12 at AL North.
-- A pouch for training only. A spa nobody sells any more. A brush for every
-- service, $7, and a bow for every service, $3.
insert into public.service_add_ons
  (id, facility_id, legacy_id, name, price, taxable, duration_min,
   applies_to_all_services, service_refs, archived_at)
values
  ('00000000-0000-0000-0000-000000730070', '00000000-0000-0000-0000-000000730020',
   'al-walk', 'Walk', 10, false, 20, true, '{}', null),
  ('00000000-0000-0000-0000-000000730071', '00000000-0000-0000-0000-000000730020',
   'al-pouch', 'Treat pouch', 9, true, 0, false, array['training'], null),
  ('00000000-0000-0000-0000-000000730072', '00000000-0000-0000-0000-000000730020',
   'al-spa', 'Spa', 30, true, 0, true, '{}', now()),
  ('00000000-0000-0000-0000-000000730073', '00000000-0000-0000-0000-000000730020',
   'al-brush', 'Brush', 7, true, 5, true, '{}', null),
  ('00000000-0000-0000-0000-000000730074', '00000000-0000-0000-0000-000000730020',
   'al-bow', 'Bow', 3, true, 0, true, '{}', null);

-- A nail trim for every service that NEEDS SOMEBODY: $8.
insert into public.service_add_ons
  (id, facility_id, legacy_id, name, price, requires_staff)
values
  ('00000000-0000-0000-0000-000000730075', '00000000-0000-0000-0000-000000730020',
   'al-nails', 'Nail trim', 8, true);

insert into public.service_add_on_location_overrides (add_on_id, facility_id, location_id, price)
values ('00000000-0000-0000-0000-000000730070', '00000000-0000-0000-0000-000000730020',
        '00000000-0000-0000-0000-000000730022', 12);

-- One item for create_bookings: a $40 booking of `p_service`.
create or replace function pg_temp.item(
  p_pets uuid[],
  p_add_ons jsonb default null,
  p_service text default 'daycare',
  p_status text default 'confirmed',
  p_start timestamptz default '2027-03-10 14:00+00',
  p_location uuid default '00000000-0000-0000-0000-000000730021',
  p_group text default null,
  -- The part of its request this booking is — `details.bookingGroup` is
  -- {id, part, of}, as `expandBookingParts` writes it, NOT a bare string.
  p_part integer default 1,
  p_client uuid default '00000000-0000-0000-0000-000000730040',
  -- Who the booking is with — a groom's groomer.
  p_staff uuid default null
) returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'booking', jsonb_build_object(
      'facility_id', '00000000-0000-0000-0000-000000730020',
      'location_id', p_location,
      'client_id',   p_client,
      'service',     p_service,
      'status',      p_status,
      'start_at',    p_start,
      'end_at',      p_start + interval '3 hours',
      'base_price',  40,
      'discount',    0,
      'total_cost',  40,
      'assigned_staff_id', p_staff,
      'details',     case when p_group is null then '{}'::jsonb
                          else jsonb_build_object('bookingGroup', jsonb_build_object(
                            'id', p_group, 'part', p_part, 'of', 2)) end
    ),
    'petIds',  to_jsonb(p_pets),
    'grooming', case when p_service = 'grooming'
                     then jsonb_build_object('serviceId', 'al-groom') end,
    'addOns',  p_add_ons
  ));
$$;

create or replace function pg_temp.walk(p_pet uuid, p_qty integer default 1)
returns jsonb language sql as $$
  select jsonb_build_object(
    'serviceId', 'al-walk', 'quantity', p_qty,
    'petId', (select ref from public.pets where id = p_pet));
$$;

create or replace function pg_temp.line(p_add_on text, p_pet uuid, p_qty integer default 1)
returns jsonb language sql as $$
  select jsonb_build_object(
    'serviceId', p_add_on, 'quantity', p_qty,
    'petId', (select ref from public.pets where id = p_pet));
$$;

create or replace function pg_temp.as_owner() returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', '00000000-0000-0000-0000-000000730001', 'role', 'authenticated')::text, true);
$$;

create or replace function pg_temp.as_customer() returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', '00000000-0000-0000-0000-000000730005', 'role', 'authenticated')::text, true);
$$;

create temp table made (label text primary key, booking_id uuid);
grant all on made to authenticated;

-- ── L1 the server prices the line ──────────────────────────────────────────
do $$
declare v_id uuid; r record; b record;
begin
  perform pg_temp.as_owner();
  set local role authenticated;
  select c.booking_id into v_id from public.create_bookings(jsonb_build_array(
    pg_temp.item(array['00000000-0000-0000-0000-000000730050']::uuid[],
      jsonb_build_array(pg_temp.walk('00000000-0000-0000-0000-000000730050', 2)
        -- The staff member as the staff list names them (a legacy id), and
        -- two prices the server must not read.
        || jsonb_build_object('staffId', 'al-staff',
                              'price', 999, 'unitPrice', 999)))
  )) c where c.item_index = 0;
  reset role;
  insert into made values ('L1', v_id);

  select * into r from public.booking_line_items
   where booking_id = v_id and kind = 'add_on';
  select total_cost, add_ons_total, extras_total, taxable_extras_total, amount_due
    into b from public.bookings where id = v_id;

  perform pg_temp.t('L1  the line is the catalogue''s price, tax and minutes, with its pet and staff',
    r.unit_price = 10 and r.quantity = 2 and r.price = 20 and not r.taxable
      and r.duration_min = 20 and r.name = 'Walk'
      and r.pet_id = '00000000-0000-0000-0000-000000730050'
      and r.staff_id = '00000000-0000-0000-0000-000000730080'
      and r.add_on_id = '00000000-0000-0000-0000-000000730070'
      and r.source_id = 'booking:al-walk'
      and b.total_cost = 40 and b.add_ons_total = 20 and b.extras_total = 20
      and b.taxable_extras_total = 0 and b.amount_due = 60,
    format('line %s x%s taxable=%s min=%s staff=%s | booking cost=%s add_ons=%s extras=%s taxable_extras=%s due=%s',
      r.unit_price, r.quantity, r.taxable, r.duration_min, r.staff_id,
      b.total_cost, b.add_ons_total, b.extras_total, b.taxable_extras_total, b.amount_due));
exception when others then
  reset role; perform pg_temp.t('L1  server-priced line', false, sqlerrm);
end $$;

-- ── L2 a location's override ───────────────────────────────────────────────
do $$
declare v_id uuid; v_price numeric;
begin
  perform pg_temp.as_owner();
  set local role authenticated;
  select c.booking_id into v_id from public.create_bookings(jsonb_build_array(
    pg_temp.item(array['00000000-0000-0000-0000-000000730050']::uuid[],
      jsonb_build_array(pg_temp.walk('00000000-0000-0000-0000-000000730050')),
      p_location => '00000000-0000-0000-0000-000000730022')
  )) c where c.item_index = 0;
  reset role;

  select unit_price into v_price from public.booking_line_items
   where booking_id = v_id and kind = 'add_on';
  perform pg_temp.t('L2  at AL North the walk is North''s price',
    v_price = 12, format('unit price %s (12 expected, 10 is the base)', v_price));
exception when others then
  reset role; perform pg_temp.t('L2  location override', false, sqlerrm);
end $$;

-- ── L3 a request split by day: once, on the first day ──────────────────────
do $$
declare v_first uuid; v_second uuid; v_on_first integer; v_on_second integer;
begin
  perform pg_temp.as_owner();
  set local role authenticated;
  with made_now as (
    select * from public.create_bookings(jsonb_build_array(
      pg_temp.item(array['00000000-0000-0000-0000-000000730050']::uuid[],
        jsonb_build_array(pg_temp.walk('00000000-0000-0000-0000-000000730050', 3)),
        p_start => '2027-03-20 14:00+00', p_group => 'al-days'),
      pg_temp.item(array['00000000-0000-0000-0000-000000730050']::uuid[],
        null, p_start => '2027-03-21 14:00+00', p_group => 'al-days', p_part => 2)
    ))
  )
  select max(booking_id::text) filter (where item_index = 0)::uuid,
         max(booking_id::text) filter (where item_index = 1)::uuid
    into v_first, v_second from made_now;
  reset role;
  insert into made values ('L3-first', v_first), ('L3-second', v_second);

  select count(*) into v_on_first from public.booking_line_items
   where booking_id = v_first and kind = 'add_on' and quantity = 3;
  select count(*) into v_on_second from public.booking_line_items
   where booking_id = v_second and kind = 'add_on';
  perform pg_temp.t('L3  a two-day request bills its walks once, on the first day',
    v_on_first = 1 and v_on_second = 0,
    format('first day %s line(s), second day %s', v_on_first, v_on_second));
exception when others then
  reset role; perform pg_temp.t('L3  split by day', false, sqlerrm);
end $$;

-- ── L4 a request split by room: each pet's on its own part ─────────────────
do $$
declare v_rex_part uuid; v_bella_part uuid; v_rex_line uuid; v_bella_line uuid;
begin
  perform pg_temp.as_owner();
  set local role authenticated;
  with made_now as (
    select * from public.create_bookings(jsonb_build_array(
      pg_temp.item(array['00000000-0000-0000-0000-000000730050']::uuid[],
        jsonb_build_array(
          pg_temp.walk('00000000-0000-0000-0000-000000730051'),
          pg_temp.walk('00000000-0000-0000-0000-000000730050')),
        p_start => '2027-03-25 14:00+00', p_group => 'al-rooms'),
      pg_temp.item(array['00000000-0000-0000-0000-000000730051']::uuid[],
        null, p_start => '2027-03-25 14:00+00', p_group => 'al-rooms', p_part => 2)
    ))
  )
  select max(booking_id::text) filter (where item_index = 0)::uuid,
         max(booking_id::text) filter (where item_index = 1)::uuid
    into v_rex_part, v_bella_part from made_now;
  reset role;

  select booking_id into v_rex_line from public.booking_line_items
   where kind = 'add_on' and pet_id = '00000000-0000-0000-0000-000000730050'
     and booking_id in (v_rex_part, v_bella_part);
  select booking_id into v_bella_line from public.booking_line_items
   where kind = 'add_on' and pet_id = '00000000-0000-0000-0000-000000730051'
     and booking_id in (v_rex_part, v_bella_part);
  perform pg_temp.t('L4  each pet''s walk is billed on the room that pet is in',
    v_rex_line = v_rex_part and v_bella_line = v_bella_part,
    format('Rex''s line on %s part, Bella''s on %s part',
      case when v_rex_line = v_rex_part then 'his' else 'the wrong' end,
      case when v_bella_line = v_bella_part then 'her' else 'the wrong' end));
exception when others then
  reset role; perform pg_temp.t('L4  split by room', false, sqlerrm);
end $$;

-- ── L5 an add-on the booking may not have refuses the lot ──────────────────
do $$
declare v_before integer; v_after integer; v_pouch boolean; v_spa boolean;
begin
  select count(*) into v_before from public.bookings
   where facility_id = '00000000-0000-0000-0000-000000730020';

  perform pg_temp.as_owner();
  set local role authenticated;
  begin
    perform public.create_bookings(jsonb_build_array(
      pg_temp.item(array['00000000-0000-0000-0000-000000730050']::uuid[],
        jsonb_build_array(jsonb_build_object('serviceId', 'al-pouch', 'quantity', 1)))));
    v_pouch := false;
  exception when sqlstate '23503' then v_pouch := true; end;
  begin
    perform public.create_bookings(jsonb_build_array(
      pg_temp.item(array['00000000-0000-0000-0000-000000730050']::uuid[],
        jsonb_build_array(jsonb_build_object('serviceId', 'al-spa', 'quantity', 1)))));
    v_spa := false;
  exception when sqlstate '23503' then v_spa := true; end;
  reset role;

  select count(*) into v_after from public.bookings
   where facility_id = '00000000-0000-0000-0000-000000730020';
  perform pg_temp.t('L5  a training-only or deleted add-on refuses the request, leaving nothing',
    v_pouch and v_spa and v_after = v_before,
    format('pouch refused=%s spa refused=%s bookings before=%s after=%s',
      v_pouch, v_spa, v_before, v_after));
exception when others then
  reset role; perform pg_temp.t('L5  refused add-ons', false, sqlerrm);
end $$;

-- ── L6 a customer's request ────────────────────────────────────────────────
do $$
declare v_id uuid; b record; v_price numeric; v_own boolean;
begin
  perform pg_temp.as_customer();
  set local role authenticated;
  select c.booking_id into v_id from public.create_bookings(jsonb_build_array(
    pg_temp.item(array['00000000-0000-0000-0000-000000730050']::uuid[],
      jsonb_build_array(pg_temp.walk('00000000-0000-0000-0000-000000730050')),
      p_status => 'request_submitted', p_start => '2027-04-02 14:00+00')
  )) c where c.item_index = 0;

  begin
    insert into public.booking_line_items
      (booking_id, facility_id, kind, name, unit_price, quantity)
    values (v_id, '00000000-0000-0000-0000-000000730020', 'add_on', 'Free walk', 0, 5);
    v_own := false;
  exception when others then v_own := true; end;
  reset role;
  insert into made values ('L6', v_id);

  select status, total_cost, add_ons_total, amount_due into b
    from public.bookings where id = v_id;
  select unit_price into v_price from public.booking_line_items
   where booking_id = v_id and kind = 'add_on';
  perform pg_temp.t('L6  a customer''s request bills the add-on at the catalogue''s price, and they cannot write a line',
    b.status = 'request_submitted' and b.total_cost = 0 and v_price = 10
      and b.add_ons_total = 10 and b.amount_due = 10 and v_own,
    format('status=%s cost=%s line=%s add_ons=%s due=%s own line refused=%s',
      b.status, b.total_cost, v_price, b.add_ons_total, b.amount_due, v_own));
exception when others then
  reset role; perform pg_temp.t('L6  customer request', false, sqlerrm);
end $$;

-- ── L6b nobody hand-writes an add_on line — staff neither ──────────────────
--
-- `add_ons_total` is trusted as the catalogue's price for the booking's own
-- selection: the commission, the deposit and the percentage fees read it. So
-- an `add_on` line comes from the server's functions and nowhere else.
do $$
declare
  v_id uuid; v_item uuid; v_price numeric;
  v_insert boolean; v_turn boolean; v_reprice boolean;
begin
  select booking_id into v_id from made where label = 'L1';

  perform pg_temp.as_owner();
  set local role authenticated;
  begin
    insert into public.booking_line_items
      (booking_id, facility_id, kind, name, unit_price, quantity)
    values (v_id, '00000000-0000-0000-0000-000000730020', 'add_on', 'Hand-priced walk', 1, 1);
    v_insert := false;
  exception when insufficient_privilege then v_insert := true; end;

  -- An ordinary item is still the owner's to add...
  insert into public.booking_line_items
    (booking_id, facility_id, kind, name, unit_price, quantity)
  values (v_id, '00000000-0000-0000-0000-000000730020', 'item', 'Leash', 4, 1)
  returning id into v_item;
  -- ...but not to turn into an add-on,
  begin
    update public.booking_line_items set kind = 'add_on' where id = v_item;
    v_turn := false;
  exception when insufficient_privilege then v_turn := true; end;
  -- and the one the server wrote is not theirs to re-price.
  begin
    update public.booking_line_items set unit_price = 1
     where booking_id = v_id and kind = 'add_on';
    v_reprice := false;
  exception when insufficient_privilege then v_reprice := true; end;
  delete from public.booking_line_items where id = v_item;
  reset role;

  select unit_price into v_price from public.booking_line_items
   where booking_id = v_id and kind = 'add_on';
  perform pg_temp.t('L6b the owner cannot insert an add_on line, turn an item into one, or re-price the server''s',
    v_insert and v_turn and v_reprice and v_price = 10,
    format('insert refused=%s turning an item refused=%s re-price refused=%s (line still at %s)',
      v_insert, v_turn, v_reprice, v_price));
exception when others then
  reset role; perform pg_temp.t('L6b hand-written add_on lines', false, sqlerrm);
end $$;

-- ── L7 an edit brings the booking's own lines to the new selection ─────────
do $$
declare
  v_id uuid; v_walk uuid; v_walk_after uuid; v_walk_price numeric; v_walk_qty integer;
  v_brush numeric; v_mid integer; v_lines integer; v_item integer; v_total numeric;
begin
  select booking_id into v_id from made where label = 'L1';
  select id into v_walk from public.booking_line_items
   where booking_id = v_id and kind = 'add_on';
  -- Something added at check-in, the old way.
  insert into public.booking_line_items
    (booking_id, facility_id, kind, name, unit_price, quantity, source_id)
  values (v_id, '00000000-0000-0000-0000-000000730020', 'item', 'Bandana', 5, 1, 'al-bandana');
  -- The catalogue has moved since this booking bought its walks at $10.
  update public.service_add_ons set price = 99
   where id = '00000000-0000-0000-0000-000000730070';

  perform pg_temp.as_owner();
  set local role authenticated;
  -- One walk instead of two, and a brush as well.
  perform public.set_booking_add_ons(v_id, jsonb_build_array(
    pg_temp.walk('00000000-0000-0000-0000-000000730050', 1),
    pg_temp.line('al-brush', '00000000-0000-0000-0000-000000730050')));
  reset role;

  select count(*) into v_mid from public.booking_line_items
   where booking_id = v_id and kind = 'add_on';
  select unit_price into v_brush from public.booking_line_items
   where booking_id = v_id and kind = 'add_on' and name = 'Brush';

  set local role authenticated;
  -- And the brush comes back off.
  perform public.set_booking_add_ons(v_id, jsonb_build_array(
    pg_temp.walk('00000000-0000-0000-0000-000000730050', 1)));
  reset role;
  update public.service_add_ons set price = 10
   where id = '00000000-0000-0000-0000-000000730070';

  select id, unit_price, quantity into v_walk_after, v_walk_price, v_walk_qty
    from public.booking_line_items
   where booking_id = v_id and kind = 'add_on' and name = 'Walk';
  select count(*) into v_lines from public.booking_line_items
   where booking_id = v_id and kind = 'add_on';
  select count(*) into v_item from public.booking_line_items
   where booking_id = v_id and kind = 'item' and name = 'Bandana';
  select add_ons_total into v_total from public.bookings where id = v_id;
  perform pg_temp.t('L7  an edit keeps the walk as sold, prices the new brush from the catalogue, takes it off again, and leaves the bandana alone',
    v_walk_after = v_walk and v_walk_price = 10 and v_walk_qty = 1
      and v_mid = 2 and v_brush = 7 and v_lines = 1 and v_item = 1 and v_total = 10,
    format('walk kept=%s at %s x%s (10 x1; 99 = re-priced) | with the brush: %s lines, brush at %s | after: %s line(s), bandana kept=%s, add_ons_total=%s',
      v_walk_after = v_walk, v_walk_price, v_walk_qty, v_mid, v_brush, v_lines, v_item, v_total));
exception when others then
  reset role; perform pg_temp.t('L7  edit follows the selection', false, sqlerrm);
end $$;

-- ── L7b re-pricing an older booking gives it its lines, once ───────────────
--
-- A booking made before 2026-09-30 holds its add-on money inside total_cost
-- and has no lines. An edit that re-prices it (the wizard now writes a
-- service-only total) must give it the lines — without being stopped by one
-- the facility has deleted since, which the edit form never priced either —
-- and a second such edit must leave a booking that HAS them as it was sold.
do $$
declare v_id uuid; v_first integer; v_second integer; v_price numeric; v_names text;
begin
  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at,
     base_price, discount, total_cost, details)
  values ('00000000-0000-0000-0000-000000730020',
          '00000000-0000-0000-0000-000000730040', 'daycare', 'confirmed',
          '2027-05-10 14:00+00', '2027-05-10 17:00+00', 40, 0, 40,
          jsonb_build_object('extraServices', jsonb_build_array(
            pg_temp.walk('00000000-0000-0000-0000-000000730050'),
            pg_temp.line('al-spa', '00000000-0000-0000-0000-000000730050'))))
  returning id into v_id;
  insert into public.booking_pets (booking_id, pet_id)
  values (v_id, '00000000-0000-0000-0000-000000730050');

  perform pg_temp.as_owner();
  set local role authenticated;
  v_first := public.set_booking_add_ons(v_id, jsonb_build_array(
    pg_temp.walk('00000000-0000-0000-0000-000000730050'),
    pg_temp.line('al-spa', '00000000-0000-0000-0000-000000730050')), true);
  -- The catalogue moves; the booking that has its line keeps it.
  reset role;
  update public.service_add_ons set price = 11
   where id = '00000000-0000-0000-0000-000000730070';
  set local role authenticated;
  v_second := public.set_booking_add_ons(v_id, jsonb_build_array(
    pg_temp.walk('00000000-0000-0000-0000-000000730050'),
    pg_temp.line('al-spa', '00000000-0000-0000-0000-000000730050')), true);
  reset role;
  update public.service_add_ons set price = 10
   where id = '00000000-0000-0000-0000-000000730070';

  select max(unit_price), string_agg(name, ',' order by name) into v_price, v_names
    from public.booking_line_items
   where booking_id = v_id and kind = 'add_on';
  perform pg_temp.t('L7b re-pricing an older booking writes its add-ons once — not the deleted one — then leaves them as sold',
    v_first = 1 and v_second = 0 and v_price = 10 and v_names = 'Walk',
    format('first call wrote %s, second %s; lines: %s at %s', v_first, v_second, v_names, v_price));
exception when others then
  reset role; perform pg_temp.t('L7b only if missing', false, sqlerrm);
end $$;

-- ── L7c an add-on deleted since stays through an edit ──────────────────────
do $$
declare
  v_id uuid; v_before uuid; v_after uuid; v_walks integer; v_lines integer;
  v_refused boolean;
begin
  perform pg_temp.as_owner();
  set local role authenticated;
  select c.booking_id into v_id from public.create_bookings(jsonb_build_array(
    pg_temp.item(array['00000000-0000-0000-0000-000000730050']::uuid[],
      jsonb_build_array(
        pg_temp.walk('00000000-0000-0000-0000-000000730050'),
        pg_temp.line('al-bow', '00000000-0000-0000-0000-000000730050')),
      p_start => '2027-05-20 14:00+00'))) c where c.item_index = 0;
  reset role;
  select id into v_before from public.booking_line_items
   where booking_id = v_id and kind = 'add_on' and name = 'Bow';

  -- The facility deletes the bow.
  update public.service_add_ons set archived_at = now()
   where id = '00000000-0000-0000-0000-000000730074';

  set local role authenticated;
  -- Two walks now; the bow it already bought is still chosen.
  perform public.set_booking_add_ons(v_id, jsonb_build_array(
    pg_temp.walk('00000000-0000-0000-0000-000000730050', 2),
    pg_temp.line('al-bow', '00000000-0000-0000-0000-000000730050')));
  -- ADDING one that is deleted is another matter.
  begin
    perform public.set_booking_add_ons(v_id, jsonb_build_array(
      pg_temp.walk('00000000-0000-0000-0000-000000730050', 2),
      pg_temp.line('al-bow', '00000000-0000-0000-0000-000000730050'),
      pg_temp.line('al-spa', '00000000-0000-0000-0000-000000730050')));
    v_refused := false;
  exception when sqlstate '23503' then v_refused := true; end;
  reset role;

  select id into v_after from public.booking_line_items
   where booking_id = v_id and kind = 'add_on' and name = 'Bow';
  select quantity into v_walks from public.booking_line_items
   where booking_id = v_id and kind = 'add_on' and name = 'Walk';
  select count(*) into v_lines from public.booking_line_items
   where booking_id = v_id and kind = 'add_on';
  perform pg_temp.t('L7c a deleted add-on stays on the booking that bought it through an edit, and adding a deleted one is refused',
    v_after = v_before and v_walks = 2 and v_lines = 2 and v_refused,
    format('bow kept=%s walks=%s lines=%s adding the deleted spa refused=%s',
      v_after = v_before, v_walks, v_lines, v_refused));
exception when others then
  reset role; perform pg_temp.t('L7c deleted add-on through an edit', false, sqlerrm);
end $$;

-- ── L8 an edit to one part of a request ────────────────────────────────────
do $$
declare v_first uuid; v_second uuid; v_qty integer; v_second_lines integer; v_copied jsonb;
begin
  select booking_id into v_first from made where label = 'L3-first';
  select booking_id into v_second from made where label = 'L3-second';

  perform pg_temp.as_owner();
  set local role authenticated;
  perform public.set_booking_add_ons(v_second, jsonb_build_array(
    pg_temp.walk('00000000-0000-0000-0000-000000730050', 5)));
  reset role;

  select sum(quantity) into v_qty from public.booking_line_items
   where booking_id = v_first and kind = 'add_on';
  select count(*) into v_second_lines from public.booking_line_items
   where booking_id = v_second and kind = 'add_on';
  select details->'extraServices' into v_copied from public.bookings where id = v_first;
  perform pg_temp.t('L8  editing the second day re-bills the request once, on its first day, and copies the choice',
    v_qty = 5 and v_second_lines = 0
      and v_copied = jsonb_build_array(pg_temp.walk('00000000-0000-0000-0000-000000730050', 5)),
    format('first day walks=%s second day lines=%s first day selection=%s',
      v_qty, v_second_lines, v_copied));
exception when others then
  reset role; perform pg_temp.t('L8  edit across a request', false, sqlerrm);
end $$;

-- ── L9 a customer cannot edit somebody else's add-ons ──────────────────────
do $$
declare v_id uuid; v_refused boolean;
begin
  -- A confirmed booking of the OTHER client.
  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at,
     base_price, discount, total_cost)
  values ('00000000-0000-0000-0000-000000730020',
          '00000000-0000-0000-0000-000000730041', 'daycare', 'pending',
          '2027-05-01 14:00+00', '2027-05-01 17:00+00', 40, 0, 40)
  returning id into v_id;

  perform pg_temp.as_customer();
  set local role authenticated;
  begin
    perform public.set_booking_add_ons(v_id, jsonb_build_array(
      jsonb_build_object('serviceId', 'al-walk', 'quantity', 1)));
    v_refused := false;
  exception when sqlstate '42501' then v_refused := true; end;
  reset role;

  perform pg_temp.t('L9  a customer cannot change another client''s add-ons',
    v_refused, format('refused=%s', v_refused));
exception when others then
  reset role; perform pg_temp.t('L9  foreign edit refused', false, sqlerrm);
end $$;

-- ── L10 apply the changes to unconfirmed upcoming appointments ─────────────
do $$
declare
  v_pending uuid; v_north uuid; v_past uuid; v_waiting uuid;
  v_count integer; v_applied integer; v_refused boolean;
  v_p numeric; v_n numeric; v_past_p numeric; v_confirmed numeric; v_request numeric;
  v_w numeric;
begin
  perform pg_temp.as_owner();
  set local role authenticated;
  select c.booking_id into v_pending from public.create_bookings(jsonb_build_array(
    pg_temp.item(array['00000000-0000-0000-0000-000000730050']::uuid[],
      jsonb_build_array(pg_temp.walk('00000000-0000-0000-0000-000000730050')),
      p_status => 'pending', p_start => '2027-06-01 14:00+00'))) c where c.item_index = 0;
  select c.booking_id into v_north from public.create_bookings(jsonb_build_array(
    pg_temp.item(array['00000000-0000-0000-0000-000000730050']::uuid[],
      jsonb_build_array(pg_temp.walk('00000000-0000-0000-0000-000000730050')),
      p_status => 'pending', p_start => '2027-06-02 14:00+00',
      p_location => '00000000-0000-0000-0000-000000730022'))) c where c.item_index = 0;
  select c.booking_id into v_past from public.create_bookings(jsonb_build_array(
    pg_temp.item(array['00000000-0000-0000-0000-000000730050']::uuid[],
      jsonb_build_array(pg_temp.walk('00000000-0000-0000-0000-000000730050')),
      p_status => 'pending', p_start => '2020-01-10 14:00+00'))) c where c.item_index = 0;
  select c.booking_id into v_waiting from public.create_bookings(jsonb_build_array(
    pg_temp.item(array['00000000-0000-0000-0000-000000730050']::uuid[],
      jsonb_build_array(pg_temp.walk('00000000-0000-0000-0000-000000730050')),
      p_status => 'waitlisted', p_start => '2027-06-03 14:00+00'))) c where c.item_index = 0;
  reset role;

  -- The facility edits the walk: $15 now. North keeps its own $12.
  update public.service_add_ons set price = 15
   where id = '00000000-0000-0000-0000-000000730070';

  perform pg_temp.as_customer();
  set local role authenticated;
  begin
    perform public.apply_add_on_to_upcoming('00000000-0000-0000-0000-000000730070');
    v_refused := false;
  exception when sqlstate '42501' then v_refused := true; end;
  reset role;

  perform pg_temp.as_owner();
  set local role authenticated;
  v_count := public.add_on_upcoming_bookings('00000000-0000-0000-0000-000000730070');
  v_applied := public.apply_add_on_to_upcoming('00000000-0000-0000-0000-000000730070');
  reset role;

  select unit_price into v_p from public.booking_line_items
   where booking_id = v_pending and kind = 'add_on';
  select unit_price into v_n from public.booking_line_items
   where booking_id = v_north and kind = 'add_on';
  select unit_price into v_past_p from public.booking_line_items
   where booking_id = v_past and kind = 'add_on';
  select unit_price into v_w from public.booking_line_items
   where booking_id = v_waiting and kind = 'add_on';
  select unit_price into v_confirmed from public.booking_line_items
   where booking_id = (select booking_id from made where label = 'L1') and kind = 'add_on';
  select unit_price into v_request from public.booking_line_items
   where booking_id = (select booking_id from made where label = 'L6') and kind = 'add_on';

  -- Pending (Main), pending (North), the waitlisted one and the customer's
  -- request: 4.
  perform pg_temp.t('L10 applying reaches unconfirmed upcoming bookings only, at each one''s location, and staff only',
    v_count = 4 and v_applied = 4 and v_p = 15 and v_n = 12 and v_request = 15
      and v_w = 15 and v_past_p = 10 and v_confirmed = 10 and v_refused,
    format('count=%s applied=%s pending=%s north=%s request=%s waitlisted=%s past=%s confirmed=%s customer refused=%s',
      v_count, v_applied, v_p, v_n, v_request, v_w, v_past_p, v_confirmed, v_refused));
exception when others then
  reset role; perform pg_temp.t('L10 apply to upcoming', false, sqlerrm);
end $$;

-- ── L11 the booking's own add-ons stay commissionable ──────────────────────
do $$
declare v_id uuid; v_basis numeric; v_amount numeric;
begin
  -- $100 of daycare with a $20 add-on of its own and a $30 retail item, paid
  -- in full: 10% of the service AND its add-on is $12 — not $15 (the item
  -- counted) and not $10 (the add-on lost when it left total_cost).
  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at,
     base_price, discount, total_cost, assigned_staff_id)
  values ('00000000-0000-0000-0000-000000730020',
          '00000000-0000-0000-0000-000000730040', 'daycare', 'confirmed',
          '2027-07-01 14:00+00', '2027-07-01 17:00+00', 100, 0, 100,
          '00000000-0000-0000-0000-000000730080')
  returning id into v_id;
  insert into public.booking_line_items
    (booking_id, facility_id, kind, name, unit_price, quantity, add_on_id, source_id)
  values
    (v_id, '00000000-0000-0000-0000-000000730020', 'add_on', 'Walk', 20, 1,
     '00000000-0000-0000-0000-000000730070', 'booking:al-walk'),
    (v_id, '00000000-0000-0000-0000-000000730020', 'item', 'Shampoo', 30, 1,
     null, null);
  insert into public.payments
    (facility_id, booking_id, method, subtotal, amount_charged, grand_total)
  values ('00000000-0000-0000-0000-000000730020', v_id, 'e-transfer', 150, 150, 150);

  select basis, amount into v_basis, v_amount
    from public.booking_commission_allocations where booking_id = v_id;
  perform pg_temp.t('L11 the service and its own add-on earn commission; a retail item does not',
    v_basis = 120 and v_amount = 12,
    format('basis=%s amount=%s (150/15 = the item counted, 100/10 = the add-on lost)',
      v_basis, v_amount));
exception when others then
  perform pg_temp.t('L11 commission basis', false, sqlerrm);
end $$;

-- ── L12 a groom's ready time counts its add-ons ────────────────────────────
do $$
declare v_id uuid; v_minutes numeric;
begin
  perform pg_temp.as_owner();
  set local role authenticated;
  select c.booking_id into v_id from public.create_bookings(jsonb_build_array(
    pg_temp.item(array['00000000-0000-0000-0000-000000730050']::uuid[],
      jsonb_build_array(pg_temp.walk('00000000-0000-0000-0000-000000730050', 2)),
      p_service => 'grooming', p_start => '2027-08-01 14:00+00'))) c
   where c.item_index = 0;
  update public.bookings set status = 'checked_in' where id = v_id;
  reset role;

  select extract(epoch from (estimated_ready_at - check_in_at)) / 60 into v_minutes
    from public.grooming_appointments where booking_id = v_id;
  -- 60 for the bath, 2 × 20 for the walks.
  perform pg_temp.t('L12 a groom checked in is ready after the service AND its add-ons',
    round(v_minutes) = 100, format('%s minutes (100 expected; 60 = add-ons ignored)', round(v_minutes)));
exception when others then
  reset role; perform pg_temp.t('L12 ready time', false, sqlerrm);
end $$;

-- ── L12b an add-on that needs somebody goes to whoever the booking is with ─
do $$
declare v_id uuid; v_nails uuid; v_walk uuid;
begin
  perform pg_temp.as_owner();
  set local role authenticated;
  select c.booking_id into v_id from public.create_bookings(jsonb_build_array(
    pg_temp.item(array['00000000-0000-0000-0000-000000730050']::uuid[],
      jsonb_build_array(
        pg_temp.line('al-nails', '00000000-0000-0000-0000-000000730050'),
        pg_temp.walk('00000000-0000-0000-0000-000000730050')),
      p_service => 'grooming', p_start => '2027-08-05 14:00+00',
      p_staff => '00000000-0000-0000-0000-000000730080'))) c
   where c.item_index = 0;
  reset role;

  select staff_id into v_nails from public.booking_line_items
   where booking_id = v_id and kind = 'add_on' and name = 'Nail trim';
  select staff_id into v_walk from public.booking_line_items
   where booking_id = v_id and kind = 'add_on' and name = 'Walk';
  perform pg_temp.t('L12b the nail trim nobody was named for goes to the groomer; the walk needs nobody',
    v_nails = '00000000-0000-0000-0000-000000730080' and v_walk is null,
    format('nail trim with %s, walk with %s', coalesce(v_nails::text, 'nobody'), coalesce(v_walk::text, 'nobody')));
exception when others then
  reset role; perform pg_temp.t('L12b staff by default', false, sqlerrm);
end $$;

-- ── L13 a percentage deposit is of the service and its add-ons ─────────────
do $$
declare v_deposit numeric; b public.bookings;
begin
  insert into public.facility_settings (facility_id, domain, value)
  values ('00000000-0000-0000-0000-000000730020', 'deposit_rules',
          jsonb_build_object('rules', jsonb_build_array(jsonb_build_object(
            'enabled', true, 'scope', 'service', 'serviceType', 'daycare',
            'amountType', 'percentage', 'amount', '50'))))
  on conflict (facility_id, domain) do update set value = excluded.value;

  select * into b from public.bookings
   where id = (select booking_id from made where label = 'L1');
  v_deposit := private.deposit_for_booking(b);
  -- L1 is $40 of service and, since L7, one $10 walk.
  perform pg_temp.t('L13 half down is half of the service and its add-on',
    v_deposit = 25, format('deposit %s (25 expected; 20 = the add-on left out)', v_deposit));
exception when others then
  perform pg_temp.t('L13 deposit base', false, sqlerrm);
end $$;

-- ── L14 the bookings page's totals count the add-ons ───────────────────────
do $$
declare v_fn numeric; v_expected numeric;
begin
  select pending_revenue into v_fn
    from public.booking_facility_totals('00000000-0000-0000-0000-000000730020');
  select coalesce(sum(total_cost + add_ons_total), 0) into v_expected
    from public.bookings
   where facility_id = '00000000-0000-0000-0000-000000730020'
     and payment_status = 'pending';
  perform pg_temp.t('L14 pending revenue counts each booking''s add-ons',
    v_fn = v_expected and v_expected > 0,
    format('function %s, bookings %s', v_fn, v_expected));
exception when others then
  perform pg_temp.t('L14 facility totals', false, sqlerrm);
end $$;

-- ── L15 nobody signed out can call any of it ───────────────────────────────
do $$
declare v_anon boolean;
begin
  v_anon := has_function_privilege('anon', 'public.set_booking_add_ons(uuid, jsonb, boolean)', 'execute')
         or has_function_privilege('anon', 'public.add_on_upcoming_bookings(uuid)', 'execute')
         or has_function_privilege('anon', 'public.apply_add_on_to_upcoming(uuid)', 'execute')
         or has_function_privilege('anon', 'private.place_add_on_lines(uuid, jsonb, text)', 'execute');
  perform pg_temp.t('L15 anon can execute none of the add-on line functions',
    not v_anon, format('anon may execute one: %s', v_anon));
end $$;

-- ── L16 / L17 the two reports that measured a booking by total_cost ───────
do $$
declare v_id uuid; v_revenue numeric; v_rebooked numeric;
begin
  -- Two nights of boarding at $100 with a $20 add-on of its own, for the
  -- OTHER client — and a rebook reminder sent to them the day before.
  insert into public.message_sends
    (facility_id, client_id, channel, to_address, source_kind, body_rendered,
     status, idempotency_key, created_at, sent_at)
  values ('00000000-0000-0000-0000-000000730020',
          '00000000-0000-0000-0000-000000730041', 'email',
          'al-c2@example.invalid', 'rebook', 'Come back', 'sent',
          'rebook:boarding:al-1', now() - interval '1 day', now() - interval '1 day');

  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at,
     base_price, discount, total_cost)
  values ('00000000-0000-0000-0000-000000730020',
          '00000000-0000-0000-0000-000000730041', 'boarding', 'confirmed',
          '2027-09-01 14:00+00', '2027-09-03 14:00+00', 100, 0, 100)
  returning id into v_id;
  insert into public.booking_line_items
    (booking_id, facility_id, kind, name, unit_price, quantity, add_on_id, source_id)
  values (v_id, '00000000-0000-0000-0000-000000730020', 'add_on', 'Walk', 20, 1,
          '00000000-0000-0000-0000-000000730070', 'booking:al-walk');

  select (r->>'revenue')::numeric into v_revenue
    from jsonb_array_elements(public.facility_report_dataset(
           '00000000-0000-0000-0000-000000730020', 'occupancy-report',
           '2027-09-02 00:00+00', '2027-09-03 00:00+00',
           '2027-08-02 00:00+00', '2027-08-03 00:00+00') -> 'current') r
   where r->>'date' = '2027-09-02';
  perform pg_temp.t('L16 a night of the stay is worth half its service and its add-on',
    v_revenue = 60, format('revenue %s (60 expected; 50 = the add-on left out)', v_revenue));

  select h.rebooked_total into v_rebooked
    from public.rebook_history('00000000-0000-0000-0000-000000730020') h
   where h.client_id = '00000000-0000-0000-0000-000000730041';
  perform pg_temp.t('L17 the reminder brought back the service and its add-on',
    v_rebooked = 120, format('rebooked total %s (120 expected; 100 = the add-on left out)', v_rebooked));
exception when others then
  perform pg_temp.t('L16 / L17 report readers', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
