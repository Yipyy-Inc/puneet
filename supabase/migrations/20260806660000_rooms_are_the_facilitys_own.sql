-- ============================================================================
-- One room model, and it is the one the facility edits.
--
-- ── WHAT WAS WRONG ────────────────────────────────────────────────────────
--
-- Two disjoint room models, and bookings used the one nobody could edit:
--
--   boarding_rooms    R-STD-01..    6 rooms    Postgres      seeded only
--   facilityRooms     room-ds-01..  29 units   localStorage  /boarding/rooms
--
-- A manager adding a kennel on the Rooms page added it to ONE BROWSER, and no
-- booking could ever be placed in it. Meanwhile the rooms bookings did use had
-- no editor at all. `NewBooking.unitAssignment` documented itself as holding a
-- `FacilityRoom.id` while carrying a `boarding_rooms` legacy id.
--
-- `facilityRooms` + `roomCategories` wins. It is richer -- categories carry
-- booking rules, default pricing, client visibility and photos, none of which
-- `boarding_rooms` had anywhere to put -- and it is what the facility's own
-- admin screen manages. `boarding_rooms` is dropped rather than kept as a
-- second table nobody edits.
--
-- ── DECISION 1: RULES ARE jsonb ───────────────────────────────────────────
--
-- A rule's `value` is `number | string | string[]` depending on its `type`
-- (min_weight 80, pet_type "dog", size_restriction [...]). The set is written
-- whole by the category editor, read whole to display or evaluate, and never
-- filtered or joined on. That is the jsonb case, and a rules TABLE would need
-- a value column that is three types at once.
--
-- The check keeps it an array so a caller cannot store an object the editor
-- would render as blank rows it could not explain — the same guard
-- `grooming_appointments.session_progress` carries (20260806140000).
--
-- ── DECISION 2: CAPACITY LIVES IN TWO PLACES, ON PURPOSE ──────────────────
--
-- `room_categories.default_capacity` with `facility_rooms.capacity` nullable
-- over the top. That is the fixture's own model and it is right: a category
-- says what its rooms normally hold, one odd room may differ, and a NULL means
-- "whatever the category says" rather than a copy that silently stops tracking
-- it.
--
-- Note this does NOT change the occupancy invariant. The exclusion constraint
-- on `boarding_stays` is one BOOKING per room per overlapping range
-- (20260806600000); capacity limits pets within that booking.
--
-- ── DECISION 3: THE STAY'S FK MOVES, THE CONSTRAINT DOES NOT ──────────────
--
-- `boarding_stays.room_id` re-points from `boarding_rooms` to `facility_rooms`.
-- The exclusion constraint is untouched: it keys on `room_id`, and which table
-- that refers to is not its business. Nothing live was pointing at the old
-- table (24 stays existed, all released, all from e2e runs on cancelled
-- bookings — cleared by hand first).
-- ============================================================================

create table if not exists public.room_categories (
  id                 uuid primary key default gen_random_uuid(),
  facility_id        uuid not null references public.facilities(id) on delete cascade,
  legacy_id          text not null,
  service            public.service_module not null,
  name               text not null,
  description        text,
  color              text not null default 'slate',
  sort_order         integer not null default 0,
  default_capacity   integer not null default 1 check (default_capacity > 0),
  default_base_price numeric check (default_base_price is null or default_base_price >= 0),
  visible_to_clients boolean not null default true,
  image_url          text,
  rules              jsonb not null default '[]'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (facility_id, legacy_id),
  constraint room_category_rules_is_array check (jsonb_typeof(rules) = 'array')
);

create table if not exists public.facility_rooms (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null references public.facilities(id) on delete cascade,
  category_id  uuid not null references public.room_categories(id) on delete restrict,
  legacy_id    text not null,
  name         text not null,
  active       boolean not null default true,
  -- NULL means "use the category's default_capacity". Not defaulted to 1: a
  -- copy would stop tracking the category the moment somebody edited it.
  capacity     integer check (capacity is null or capacity > 0),
  staff_notes  text,
  image_url    text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (facility_id, legacy_id)
);

-- ON DELETE RESTRICT on the category: removing one with rooms still in it
-- should be refused, not cascade away a wing of the building.

create index if not exists facility_rooms_category_idx
  on public.facility_rooms (category_id);

-- ── Who may see and change them ────────────────────────────────────────────
--
-- Read mirrors `boarding_rooms_read`: anyone working here needs the room list.
-- Writes are `manage_services`, which is what the Rooms admin screen is for.

alter table public.room_categories enable row level security;
alter table public.facility_rooms  enable row level security;

create policy room_categories_read on public.room_categories
  for select using (
    private.is_platform_admin()
    or exists (
      select 1 from public.facility_memberships m
       where m.facility_id = room_categories.facility_id
         and m.profile_id = (select auth.uid())
         and m.is_active
    )
  );

create policy room_categories_insert on public.room_categories
  for insert with check (private.has_permission(facility_id, 'manage_services'));
create policy room_categories_update on public.room_categories
  for update using (private.has_permission(facility_id, 'manage_services'))
          with check (private.has_permission(facility_id, 'manage_services'));
create policy room_categories_delete on public.room_categories
  for delete using (private.has_permission(facility_id, 'manage_services'));

create policy facility_rooms_read on public.facility_rooms
  for select using (
    private.is_platform_admin()
    or exists (
      select 1 from public.facility_memberships m
       where m.facility_id = facility_rooms.facility_id
         and m.profile_id = (select auth.uid())
         and m.is_active
    )
  );

create policy facility_rooms_insert on public.facility_rooms
  for insert with check (private.has_permission(facility_id, 'manage_services'));
create policy facility_rooms_update on public.facility_rooms
  for update using (private.has_permission(facility_id, 'manage_services'))
          with check (private.has_permission(facility_id, 'manage_services'));
create policy facility_rooms_delete on public.facility_rooms
  for delete using (private.has_permission(facility_id, 'manage_services'));

-- ── The demo facility's rooms ──────────────────────────────────────────────
--
-- Copied from src/data/rooms.ts as it stands, legacy ids preserved exactly.
-- The units are generated the same way the fixture generates them, including
-- which ones are inactive: Deluxe 05, and Condos 14-15 pending deep clean.
do $$
declare
  v_fac uuid;
  v_pcs uuid; v_dlx uuid; v_ste uuid; v_con uuid;
begin
  select id into v_fac from public.facilities where legacy_id = '11';
  if v_fac is null then
    raise notice 'No demo facility (legacy_id 11) -- no rooms seeded.';
    return;
  end if;

  insert into public.room_categories
    (facility_id, legacy_id, service, name, description, color, sort_order,
     default_capacity, default_base_price, visible_to_clients, image_url, rules)
  values
    (v_fac, 'cat-private-care', 'boarding', 'Private Care Suite',
     'Exclusive private suites for premium guests — multi-large-dog stays or dogs 80 lbs+',
     'amber', 1, 2, 125, true, '/rooms/room-3.jpg',
     '[{"id":"rule-pcs-1","type":"min_weight","value":80,"clientMessage":"Private Care Suites are reserved for dogs 80 lbs or more, or multiple large dogs. For smaller dogs, please choose a Suite.","enabled":true},
       {"id":"rule-pcs-2","type":"pet_type","value":"dog","clientMessage":"Private Care Suites accommodate dogs only.","enabled":true}]'::jsonb),
    (v_fac, 'cat-deluxe', 'boarding', 'Deluxe Suite',
     'Spacious suites with premium bedding — ideal for dogs 40–80 lbs or multi-pet stays',
     'violet', 2, 2, 85, true, '/rooms/room-2.jpg',
     '[{"id":"rule-ds-1","type":"max_pets","value":2,"clientMessage":"Deluxe Suites accommodate up to 2 pets from the same household.","enabled":true},
       {"id":"rule-ds-2","type":"min_weight","value":40,"clientMessage":"Deluxe Suites are designed for dogs 40 lbs and above. For smaller dogs, please select a Suite.","enabled":true}]'::jsonb),
    (v_fac, 'cat-suite', 'boarding', 'Suite',
     'Comfortable private suites — best for dogs up to 80 lbs, single pet per booking',
     'blue', 3, 1, 55, true, '/rooms/room-1.jpg',
     '[{"id":"rule-s-1","type":"max_weight","value":80,"clientMessage":"Suites are designed for dogs up to 80 lbs. For larger dogs, please select a Deluxe Suite.","enabled":true},
       {"id":"rule-s-2","type":"single_pet_only","value":1,"clientMessage":"Suites accommodate one pet per booking. Multi-pet stays are available in Deluxe Suites.","enabled":true}]'::jsonb),
    (v_fac, 'cat-condo', 'boarding', 'Condominium',
     'Standard comfortable kennels — economical and efficient for all dogs up to 60 lbs',
     'slate', 4, 1, 38, true,
     'https://images.unsplash.com/photo-1583511655826-05700d52f4d9?w=800&h=480&fit=crop',
     '[{"id":"rule-c-1","type":"max_weight","value":60,"clientMessage":"Condominiums are best suited for dogs up to 60 lbs. For larger dogs, please select a Suite.","enabled":true},
       {"id":"rule-c-2","type":"single_pet_only","value":1,"clientMessage":"Condominiums are single-pet only. For multi-pet stays please choose a Deluxe Suite.","enabled":true}]'::jsonb)
  on conflict (facility_id, legacy_id) do nothing;

  select id into v_pcs from public.room_categories where facility_id = v_fac and legacy_id = 'cat-private-care';
  select id into v_dlx from public.room_categories where facility_id = v_fac and legacy_id = 'cat-deluxe';
  select id into v_ste from public.room_categories where facility_id = v_fac and legacy_id = 'cat-suite';
  select id into v_con from public.room_categories where facility_id = v_fac and legacy_id = 'cat-condo';

  insert into public.facility_rooms
    (facility_id, category_id, legacy_id, name, active, staff_notes, sort_order)
  values (v_fac, v_pcs, 'room-pcs-01', 'Private Care 01', true, null, 1)
  on conflict (facility_id, legacy_id) do nothing;

  insert into public.facility_rooms
    (facility_id, category_id, legacy_id, name, active, sort_order)
  select v_fac, v_dlx,
         'room-ds-' || lpad(i::text, 2, '0'),
         'Deluxe ' || lpad(i::text, 2, '0'),
         i < 5,                       -- Deluxe 05 is inactive in the fixture
         i
    from generate_series(1, 5) i
  on conflict (facility_id, legacy_id) do nothing;

  insert into public.facility_rooms
    (facility_id, category_id, legacy_id, name, active, sort_order)
  select v_fac, v_ste,
         'room-s-' || lpad(i::text, 2, '0'),
         'Suite ' || lpad(i::text, 2, '0'),
         true, i
    from generate_series(1, 8) i
  on conflict (facility_id, legacy_id) do nothing;

  insert into public.facility_rooms
    (facility_id, category_id, legacy_id, name, active, staff_notes, sort_order)
  select v_fac, v_con,
         'room-c-' || lpad(i::text, 2, '0'),
         'Condo ' || lpad(i::text, 2, '0'),
         i <= 13,                     -- Condos 14-15 pending deep clean
         case when i > 13 then 'Pending deep clean & inspection' end,
         i
    from generate_series(1, 15) i
  on conflict (facility_id, legacy_id) do nothing;
end $$;

-- ── The writers resolve the new table ──────────────────────────────────────
--
-- BEFORE the drop, and in the same migration. plpgsql resolves table names at
-- RUN time, so dropping `boarding_rooms` out from under these would leave two
-- functions that compile fine and fail on the first booking — the drop is not
-- what would have told us.
--
-- Only the room lookup changes in each; everything else is as it was
-- (20260806620000, 20260806640000). Note `active`, not `is_active`: the
-- fixture's column name came with it.

create or replace function public.assign_boarding_room(
  p_booking_ref    bigint,
  p_room_id        text default null,
  p_override_reason text default null
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_booking_id  uuid;
  v_facility_id uuid;
  v_start       timestamptz;
  v_end         timestamptz;
  v_room_id     uuid;
  v_override    text;
  v_touched     integer;
  v_existing    boolean;
begin
  select b.id, b.facility_id, b.start_at, b.end_at
    into v_booking_id, v_facility_id, v_start, v_end
    from public.bookings b
   where b.ref = p_booking_ref;

  if v_booking_id is null then
    raise exception 'That booking does not exist, or is not yours.'
      using errcode = '42501';
  end if;

  if p_room_id is null then
    select exists (
      select 1 from public.boarding_stays s where s.booking_id = v_booking_id
    ) into v_existing;

    if not v_existing then
      return null;
    end if;

    delete from public.boarding_stays where booking_id = v_booking_id;
    get diagnostics v_touched = row_count;

    if v_touched = 0 then
      raise exception 'Not allowed to change this booking''s room.'
        using errcode = '42501';
    end if;
    return null;
  end if;

  select r.id into v_room_id
    from public.facility_rooms r
   where r.facility_id = v_facility_id
     and r.legacy_id = p_room_id
     and r.active;

  if v_room_id is null then
    raise exception 'This facility has no room %.', p_room_id
      using errcode = '23503';
  end if;

  v_override := nullif(trim(coalesce(p_override_reason, '')), '');

  if v_override is not null
     and not private.has_permission(v_facility_id, 'override_booking_capacity')
  then
    raise exception 'Not allowed to override capacity limits.'
      using errcode = '42501';
  end if;

  select exists (
    select 1 from public.boarding_stays s where s.booking_id = v_booking_id
  ) into v_existing;

  if v_existing then
    update public.boarding_stays
       set room_id         = v_room_id,
           occupies        = tstzrange(v_start, v_end, '[)'),
           override_reason = v_override,
           released_at     = null,
           updated_at      = now()
     where booking_id = v_booking_id;

    get diagnostics v_touched = row_count;
    if v_touched = 0 then
      raise exception 'Not allowed to change this booking''s room.'
        using errcode = '42501';
    end if;
  else
    insert into public.boarding_stays
      (booking_id, facility_id, room_id, occupies, override_reason)
    values
      (v_booking_id, v_facility_id, v_room_id,
       tstzrange(v_start, v_end, '[)'), v_override);
  end if;

  return p_room_id;
end;
$$;

revoke all on function public.assign_boarding_room(bigint, text, text) from public;
revoke all on function public.assign_boarding_room(bigint, text, text) from anon;
grant execute on function public.assign_boarding_room(bigint, text, text) to authenticated;

-- `create_booking`'s boarding branch, same one-line change. Kept in THIS
-- migration rather than a following one: splitting them would leave a replay
-- passing through a state where no booking can be created at all.
--
-- The full body is re-stated because `create or replace function` has no way
-- to patch one statement. Only the `from public.boarding_rooms` lookup and its
-- error message differ from 20260806620000.
create or replace function public.create_booking(
  p_booking  jsonb,
  p_pet_ids  uuid[] default '{}',
  p_grooming jsonb  default null,
  p_boarding jsonb  default null
)
returns table (booking_id uuid, booking_ref bigint)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_known        text[] := array[
    'facility_id', 'location_id', 'client_id', 'service', 'service_type',
    'status', 'payment_status', 'start_at', 'end_at',
    'assigned_staff_id', 'assigned_staff_name',
    'base_price', 'discount', 'total_cost', 'tip_amount',
    'special_requests', 'details'
  ];
  v_unknown      text[];
  v_booking_id   uuid;
  v_ref          bigint;
  v_facility_id  uuid;
  v_start        timestamptz;
  v_end          timestamptz;
  v_is_staff     boolean;
  v_service_id   uuid;
  v_service_name text;
  v_price        numeric;
  v_duration     integer;
  v_size         text;
  v_size_price   numeric;
  v_size_dur     integer;
  v_weight       numeric;
  v_station_id   uuid;
  v_written      integer;
  v_requested    integer;
  v_room_id      uuid;
  v_override     text;
begin
  select array_agg(k) into v_unknown
    from jsonb_object_keys(p_booking) k where k <> all (v_known);

  if v_unknown is not null then
    raise exception 'create_booking does not handle booking column(s): %',
      array_to_string(v_unknown, ', ') using errcode = '22023';
  end if;

  if p_booking->>'service' = 'grooming' and p_grooming is null then
    raise exception 'A grooming booking needs its appointment details.'
      using errcode = '22023';
  end if;

  insert into public.bookings (
    facility_id, location_id, client_id, service, service_type,
    status, payment_status, start_at, end_at,
    assigned_staff_id, assigned_staff_name,
    base_price, discount, total_cost, tip_amount,
    special_requests, details
  )
  select
    b.facility_id, b.location_id, b.client_id, b.service, b.service_type,
    coalesce(b.status, 'pending'::public.booking_status),
    coalesce(b.payment_status, 'pending'),
    b.start_at, b.end_at,
    b.assigned_staff_id, b.assigned_staff_name,
    coalesce(b.base_price, 0), coalesce(b.discount, 0),
    coalesce(b.total_cost, 0), b.tip_amount,
    b.special_requests, coalesce(b.details, '{}'::jsonb)
    from jsonb_populate_record(null::public.bookings, p_booking) b
  returning id, ref, facility_id, start_at, end_at
       into v_booking_id, v_ref, v_facility_id, v_start, v_end;

  if array_length(p_pet_ids, 1) > 0 then
    insert into public.booking_pets (booking_id, pet_id)
    select v_booking_id, unnest(p_pet_ids);
  end if;

  if p_boarding is not null and p_boarding->>'roomId' is not null then
    select r.id into v_room_id
      from public.facility_rooms r
     where r.facility_id = v_facility_id
       and r.legacy_id = p_boarding->>'roomId'
       and r.active;

    if v_room_id is null then
      raise exception 'This facility has no room %.',
        p_boarding->>'roomId' using errcode = '23503';
    end if;

    v_override := nullif(trim(coalesce(p_boarding->>'overrideReason', '')), '');

    if v_override is not null
       and not private.has_permission(v_facility_id, 'override_booking_capacity')
    then
      raise exception 'Not allowed to override capacity limits.'
        using errcode = '42501';
    end if;

    insert into public.boarding_stays
      (booking_id, facility_id, room_id, occupies, override_reason)
    values
      (v_booking_id, v_facility_id, v_room_id,
       tstzrange(v_start, v_end, '[)'), v_override);
  end if;

  if p_grooming is null then
    booking_id := v_booking_id; booking_ref := v_ref; return next; return;
  end if;

  v_is_staff := private.has_permission(v_facility_id, 'create_bookings');

  select s.id, s.name, s.base_price, s.duration_min
    into v_service_id, v_service_name, v_price, v_duration
    from public.grooming_services s
   where s.facility_id = v_facility_id
     and s.legacy_id = p_grooming->>'serviceId';

  if v_service_id is null then
    raise exception 'This facility has no grooming service %.',
      coalesce(p_grooming->>'serviceId', '(none given)') using errcode = '23503';
  end if;

  select p.weight into v_weight from public.pets p where p.id = p_pet_ids[1];

  if v_weight is not null then
    select t->>'id' into v_size
      from public.grooming_config c,
           lateral jsonb_array_elements(c.pet_size_tiers) t
     where c.facility_id = v_facility_id
       and (t->>'maxWeightLbs' is null
            or v_weight <= (t->>'maxWeightLbs')::numeric)
     order by coalesce((t->>'maxWeightLbs')::numeric, 999999)
     limit 1;
  end if;

  if v_size is not null then
    select sp.price, sp.duration_min into v_size_price, v_size_dur
      from public.grooming_service_size_prices sp
     where sp.service_id = v_service_id and sp.size_label = v_size;
    if v_size_price is not null then v_price := v_size_price; end if;
    if v_size_dur   is not null then v_duration := v_size_dur; end if;
  end if;

  if (p_grooming->>'durationOverrideMin') is not null then
    v_duration := (p_grooming->>'durationOverrideMin')::integer;
  end if;

  if p_grooming->>'stationId' is not null then
    select st.id into v_station_id
      from public.grooming_stations st
     where st.facility_id = v_facility_id
       and st.legacy_id = p_grooming->>'stationId';
  end if;

  insert into public.grooming_appointments (
    booking_id, facility_id, service_id, service_name,
    size_label, service_price, service_duration_min, station_id
  )
  values (
    v_booking_id, v_facility_id, v_service_id, v_service_name, v_size,
    case when v_is_staff then v_price else 0 end,
    greatest(coalesce(v_duration, 60), 1), v_station_id
  );

  if jsonb_typeof(p_grooming->'addOnIds') = 'array' then
    insert into public.grooming_appointment_add_ons (
      booking_id, facility_id, add_on_id, name, price, duration_min
    )
    select v_booking_id, v_facility_id, a.id, a.name,
           case when v_is_staff then a.price else 0 end, a.duration_min
      from jsonb_array_elements_text(p_grooming->'addOnIds') requested
      join public.grooming_add_ons a
        on a.facility_id = v_facility_id and a.legacy_id = requested;

    get diagnostics v_written = row_count;
    v_requested := jsonb_array_length(p_grooming->'addOnIds');

    if v_written <> v_requested then
      raise exception 'This facility has % of the % grooming add-ons requested.',
        v_written, v_requested using errcode = '23503';
    end if;
  end if;

  booking_id := v_booking_id; booking_ref := v_ref; return next;
end;
$$;

revoke all on function public.create_booking(jsonb, uuid[], jsonb, jsonb) from public;
revoke all on function public.create_booking(jsonb, uuid[], jsonb, jsonb) from anon;
grant execute on function public.create_booking(jsonb, uuid[], jsonb, jsonb) to authenticated;

-- ── The stay points at the real rooms now ──────────────────────────────────

alter table public.boarding_stays
  drop constraint if exists boarding_stays_room_id_fkey;

alter table public.boarding_stays
  add constraint boarding_stays_room_id_fkey
  foreign key (room_id) references public.facility_rooms(id) on delete restrict;

drop table if exists public.boarding_rooms;
