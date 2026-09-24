-- ============================================================================
-- AN AREA IS COUNTED IN PETS, NOT IN ROOMS.
--
-- Phase 2 of the MoéGo lodging work. Phase 1 (20260924180000) gave a lodging
-- type a `space_type` and stopped the exclusion constraint applying to areas —
-- which left an area with NO limit at all. This gives it its own.
--
-- MoéGo, on the two kinds:
--
--   Room / Kennel — "Based on the number of rooms. Each room is either occupied
--                    or available — regardless of how many pets are inside it."
--   Area          — "Based on the number of individual pets. An area stays
--                    available until the total pet count reaches the configured
--                    maximum."
--
-- So a room is limited by the exclusion constraint (one live stay per room per
-- overlapping range) and an area is limited by this: the sum of PETS across
-- every overlapping live stay in that unit.
--
-- ── WHY A DEFERRED CONSTRAINT TRIGGER ─────────────────────────────────────
--
-- The count needs `booking_pets`, and `create_booking` writes the booking, then
-- its pets, then the boarding stay. A row-level BEFORE trigger would run before
-- the pets exist and would measure every booking as zero pets — a capacity
-- check that always passes is worse than none, because it looks like one.
--
-- `deferrable initially deferred` runs it at COMMIT, when the whole booking is
-- present. That is the pattern `booking_tip_allocations_within_tips`
-- (20260806940000) and `retail_sales_discount_is_permitted` (20260918083126)
-- already use here, for the same reason: a multi-row invariant cannot be
-- checked one row at a time.
--
-- ── THE CHECK-OUT DAY IS FREE, AND IT IS FREE FOR AREAS TOO ───────────────
--
-- MoéGo: "For both space types, boarding pets that are scheduled to check out
-- on that date are not counted toward occupancy."
--
-- `occupies` is a half-open `[)` range and this counts with `&&`, so a stay
-- ending on the 5th does not overlap one starting on the 5th. The rule is
-- already ours and this inherits it rather than re-implementing it.
--
-- ── ONE DELIBERATE DEVIATION FROM MoéGo, STATED ───────────────────────────
--
-- MoéGo says of the area maximum: "An alert will be triggered by the system
-- when the specified criteria are met." An ALERT. This REFUSES instead, unless
-- the stay carries an `override_reason`.
--
-- Two reasons. Our rooms have always refused-with-override, and an area that
-- merely warned would make one half of the same screen weaker than the other.
-- And MoéGo's own capacity guide describes the room case as exactly this —
-- "MoeGo marks a full unit and stops recommending it — but the filter can be
-- toggled off to override this" — which is a refusal with an escape hatch
-- wearing different words. `override_booking_capacity` is that hatch, and it
-- records WHO decided and WHY, which an alert does not.
--
-- SQL A0-A5 in lodging-area-capacity.sql.
-- ============================================================================

-- ── How many pets are already in this area, over this range ────────────────
--
-- `p_exclude_booking` leaves the row being checked out of its own count, so an
-- UPDATE that does not change the pets is not measured against itself.
create or replace function private.area_pets_in_use(
  p_room_id uuid,
  p_range tstzrange,
  p_exclude_booking uuid default null
)
returns integer
language sql
stable
security definer
set search_path = ''
as $fn$
  select coalesce(sum(
           (select count(*) from public.booking_pets bp
             where bp.booking_id = s.booking_id)
         ), 0)::integer
    from public.boarding_stays s
   where s.room_id = p_room_id
     and s.space_type = 'area'
     -- A cancelled stay frees its space, exactly as it does for a room.
     and s.released_at is null
     -- Half-open, so the day a guest leaves is not a day they occupy.
     and s.occupies && p_range
     and (p_exclude_booking is null or s.booking_id <> p_exclude_booking);
$fn$;

comment on function private.area_pets_in_use(uuid, tstzrange, uuid) is
  'Pets already in an area unit over a range — MoeGo area occupancy. Counts '
  'pets, not stays; ignores released stays; and because occupies is half-open, '
  'a pet checking out on a date is not counted on that date.';

revoke all on function private.area_pets_in_use(uuid, tstzrange, uuid) from public;
revoke all on function private.area_pets_in_use(uuid, tstzrange, uuid) from anon;
grant execute on function private.area_pets_in_use(uuid, tstzrange, uuid)
  to authenticated, service_role;

-- ── The limit ──────────────────────────────────────────────────────────────

create or replace function private.boarding_area_within_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_max   integer;
  v_used  integer;
  v_mine  integer;
  v_name  text;
begin
  -- Rooms are the exclusion constraint's business, not this trigger's.
  if new.space_type <> 'area' then
    return null;
  end if;

  -- A cancelled stay holds nothing.
  if new.released_at is not null then
    return null;
  end if;

  -- The recorded override, the same hatch a room has. Somebody with
  -- `override_booking_capacity` decided, and said why.
  if new.override_reason is not null then
    return null;
  end if;

  select rc.max_pets_per_area, rc.name
    into v_max, v_name
    from public.facility_rooms fr
    join public.room_categories rc on rc.id = fr.category_id
   where fr.id = new.room_id;

  -- An area always has a maximum: room_categories_area_max_pets says so. If
  -- this is ever null the row is not an area any more, so there is nothing to
  -- enforce rather than something to guess.
  if v_max is null then
    return null;
  end if;

  v_used := private.area_pets_in_use(new.room_id, new.occupies, new.booking_id);

  select count(*) into v_mine
    from public.booking_pets bp where bp.booking_id = new.booking_id;

  -- A stay with no pets on it yet occupies nothing. `create_booking` writes
  -- the pets before it commits, and this is deferred, so by the time it runs
  -- the real number is there.
  if v_used + v_mine > v_max then
    raise exception
      '% holds % pet(s) and % more would not fit.', v_name, v_used, v_mine
      using errcode = '23514', hint = 'area_full';
  end if;

  return null;
end;
$fn$;

comment on function private.boarding_area_within_capacity() is
  'Refuses a stay that would put an area over max_pets_per_area, unless it '
  'carries an override_reason. Deferred, because booking_pets is written after '
  'the stay and a check that runs first would measure every booking as empty.';

revoke all on function private.boarding_area_within_capacity() from public;
revoke all on function private.boarding_area_within_capacity() from anon;

drop trigger if exists boarding_stays_area_within_capacity on public.boarding_stays;
create constraint trigger boarding_stays_area_within_capacity
  after insert or update on public.boarding_stays
  deferrable initially deferred
  for each row
  execute function private.boarding_area_within_capacity();

-- ── What a screen asks ─────────────────────────────────────────────────────
--
-- The occupancy a board draws, for ONE unit on ONE date, in MoéGo's own shape:
-- X of Y. A room answers in units (0 or 1 of 1); an area answers in pets.
-- Public because every board needs it and RLS on the underlying tables still
-- decides what the caller may see.
create or replace function public.lodging_occupancy(
  p_room_id uuid,
  p_on date
)
returns table (space_type text, used integer, capacity integer)
language sql
stable
security definer
set search_path = ''
as $fn$
  with unit as (
    select fr.id,
           rc.space_type,
           rc.max_pets_per_area,
           coalesce(fr.capacity, rc.default_capacity) as unit_capacity,
           fr.facility_id
      from public.facility_rooms fr
      join public.room_categories rc on rc.id = fr.category_id
     where fr.id = p_room_id
       and (
         private.is_platform_admin()
         or private.has_permission(fr.facility_id, 'view_services')
         or fr.facility_id in (select private.client_facility_ids())
       )
  ),
  day as (
    select tstzrange(p_on::timestamptz, (p_on + 1)::timestamptz, '[)') as r
  )
  select u.space_type::text,
         case
           when u.space_type = 'area'
             then private.area_pets_in_use(u.id, d.r, null)
           else (
             select count(*)::integer from public.boarding_stays s
              where s.room_id = u.id
                and s.released_at is null
                and s.occupies && d.r
           )
         end as used,
         case when u.space_type = 'area'
              then u.max_pets_per_area
              else 1
         end as capacity
    from unit u cross join day d;
$fn$;

comment on function public.lodging_occupancy(uuid, date) is
  'X of Y for one lodging unit on one date, MoeGo style: a room is 0 or 1 of 1, '
  'an area is pets of max_pets_per_area. A pet checking out that date is not '
  'counted, because occupies is half-open.';

revoke all on function public.lodging_occupancy(uuid, date) from public;
revoke all on function public.lodging_occupancy(uuid, date) from anon;
grant execute on function public.lodging_occupancy(uuid, date)
  to authenticated, service_role;
