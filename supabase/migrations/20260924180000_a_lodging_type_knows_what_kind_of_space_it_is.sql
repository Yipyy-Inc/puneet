-- ============================================================================
-- A LODGING TYPE KNOWS WHAT KIND OF SPACE IT IS.
--
-- Phase 1 of the MoéGo lodging work. MoéGo asks one question about every
-- lodging type that we have never asked, and everything else about capacity
-- follows from the answer:
--
--   Room / Kennel — "Capacity is based on individual rooms. Once a pet (or pet
--                    family) is assigned to a lodging, it is considered fully
--                    occupied. (Only one family per room)"
--   Area          — "Capacity is based on the number of pets. An area remains
--                    available until the number of assigned pets reaches the
--                    maximum limit."
--
-- ── WE ALREADY IMPLEMENT ROOM/KENNEL, EXACTLY ─────────────────────────────
--
-- `boarding_stay_no_double_booking` (20260806600000) is an exclusion
-- constraint: one live stay per room per overlapping range. That IS MoéGo's
-- Room/Kennel rule, and `override_reason` is already MoéGo's "turn off Only
-- show applicable lodging" escape hatch — recorded with a reason rather than
-- silently allowed.
--
-- So this migration does not change how a room behaves. It names the behaviour
-- and makes room for the other kind.
--
-- ── WHY THE PREDICATE, AND WHY THE COLUMN IS DENORMALISED ─────────────────
--
-- An Area is the opposite rule: overlap is the POINT. A play area holding 60
-- pets is 60 overlapping stays, every one of which the exclusion constraint
-- currently forbids. The constraint therefore has to stop applying to areas.
--
-- A constraint cannot reach into another table, and `space_type` lives on
-- `room_categories` — two joins away from `boarding_stays`. So it is
-- denormalised onto the stay by trigger, the way `facility_id` already is on
-- `room_category_location_prices` (20260826150000). The trigger derives it and
-- never trusts a caller, which is the rule the other derive-triggers follow.
--
-- Area capacity itself — counting PETS rather than units — is Phase 2. After
-- this migration an area is simply unconstrained, which is safe because no
-- facility can create one yet: `max_pets_per_area` is required for an area and
-- the screen that writes it arrives in Phase 4.
--
-- SQL L0-L6 in lodging-space-type.sql.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'lodging_space_type') then
    create type public.lodging_space_type as enum ('room', 'area');
  end if;
end $$;

comment on type public.lodging_space_type is
  'How a lodging type counts capacity. room = one family per unit, counted in '
  'units (MoeGo Room/Kennel). area = counted in pets, overlap expected.';

-- ── The lodging type ───────────────────────────────────────────────────────

alter table public.room_categories
  add column if not exists space_type public.lodging_space_type not null default 'room',
  add column if not exists max_pets_per_area integer;

comment on column public.room_categories.space_type is
  'MoeGo Space type. Every row existing before 20260924180000 is a room, which '
  'is what boarding_stay_no_double_booking has always assumed.';

comment on column public.room_categories.default_capacity is
  'MoeGo "Max # of Pets (same family) per room" — the pets one FAMILY may put '
  'in one unit. Not a limit on unrelated bookings: the exclusion constraint '
  'already allows only one live stay per room.';

comment on column public.room_categories.max_pets_per_area is
  'MoeGo "Max # of pets per area" — pets in the area at once, regardless of '
  'family. Null for a room type, and required for an area.';

-- Exactly one meaning per row: an area carries its maximum, a room does not
-- carry a stale one. A number that is stored and ignored is the defect this
-- codebase keeps finding (size_pricing, requires_evaluation_online), so it is
-- refused at the door rather than tolerated.
alter table public.room_categories
  drop constraint if exists room_categories_area_max_pets;
alter table public.room_categories
  add constraint room_categories_area_max_pets
  check ((space_type = 'area') = (max_pets_per_area is not null));

alter table public.room_categories
  drop constraint if exists room_categories_area_max_pets_positive;
alter table public.room_categories
  add constraint room_categories_area_max_pets_positive
  check (max_pets_per_area is null or max_pets_per_area > 0);

-- ── The stay carries the answer, derived and never supplied ────────────────

alter table public.boarding_stays
  add column if not exists space_type public.lodging_space_type not null default 'room';

comment on column public.boarding_stays.space_type is
  'Copied from the room category by private.boarding_stay_space_type(). Here '
  'so boarding_stay_no_double_booking can be predicated on it — an exclusion '
  'constraint cannot join.';

create or replace function private.boarding_stay_space_type()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_space public.lodging_space_type;
begin
  select rc.space_type into v_space
    from public.facility_rooms fr
    join public.room_categories rc on rc.id = fr.category_id
   where fr.id = new.room_id;

  if v_space is null then
    -- The room FK catches a missing room. A room whose CATEGORY went missing
    -- would otherwise fall through to the column default and silently become a
    -- 'room' — and a default that decides a money rule is not a default worth
    -- having.
    raise exception 'That room has no lodging type.' using errcode = '23503';
  end if;

  new.space_type := v_space;
  return new;
end;
$fn$;

comment on function private.boarding_stay_space_type() is
  'Derives boarding_stays.space_type from the room category. Never trusts a '
  'supplied value, as the facility_id triggers do not either.';

revoke all on function private.boarding_stay_space_type() from public;
revoke all on function private.boarding_stay_space_type() from anon;

drop trigger if exists boarding_stays_set_space_type on public.boarding_stays;
create trigger boarding_stays_set_space_type
  before insert or update of room_id on public.boarding_stays
  for each row execute function private.boarding_stay_space_type();

-- Backfill. Every existing category is a room, so this changes nothing today —
-- it is here so the column is TRUE rather than merely defaulted, and so the
-- constraint below rebuilds over real values.
update public.boarding_stays s
   set space_type = rc.space_type
  from public.facility_rooms fr
  join public.room_categories rc on rc.id = fr.category_id
 where fr.id = s.room_id
   and s.space_type is distinct from rc.space_type;

-- ── The money rule, re-predicated ──────────────────────────────────────────
--
-- Byte-for-byte the constraint from 20260806600000 with one clause added. A
-- room behaves exactly as it did; an area is no longer forbidden from
-- overlapping, which is what an area IS. Phase 2 gives the area its own limit.
alter table public.boarding_stays
  drop constraint if exists boarding_stay_no_double_booking;

alter table public.boarding_stays
  add constraint boarding_stay_no_double_booking
  exclude using gist (
    room_id  with =,
    occupies with &&
  ) where (released_at is null and override_reason is null and space_type = 'room');

comment on constraint boarding_stay_no_double_booking on public.boarding_stays is
  'One booking per ROOM per overlapping range. Released (cancelled) stays are '
  'excluded so a cancellation frees the kennel without losing the record; so '
  'are stays carrying an override_reason, which is the recorded form of the '
  'override_booking_capacity permission; and so are AREAS, which count pets '
  'rather than units and are limited by their own trigger (Phase 2).';
