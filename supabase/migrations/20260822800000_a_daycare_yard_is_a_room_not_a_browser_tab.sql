-- ============================================================================
-- A daycare yard is a room, not a browser tab.
--
-- ── WHAT THIS REPLACES, AND WHY IT IS NOT A SETTINGS SCREEN ───────────────
--
-- `src/hooks/use-daycare-areas.tsx` kept a facility's play areas and sections
-- in **localStorage**, under `daycare-play-areas` and `daycare-sections`.
--
-- That would be bad enough as configuration. It is worse than that, because
-- the booking flow reads it: `BookingModal` and `DaycareDetails` both call
-- `useDaycareAreas()`, and `getDaycareAvailabilitySummary` computes whether a
-- day has room from those sections. So a section's CAPACITY — the number that
-- decides whether a dog can be booked in — lived in one browser.
--
-- Two members of staff on two terminals could hold different capacities for
-- the same yard, and each would be told the day was fine. The booking that
-- came out the other end was real, written to `bookings` in Postgres. The
-- kennel-view screen says so out loud today:
--
--     "The SECTIONS on this half are still fixtures — there is no
--      daycare-areas table — but the BOOKING it creates is real."
--
-- ── WHY THE EXISTING ROOM TABLES AND NOT NEW ONES ─────────────────────────
--
-- `room_categories.service` has distinguished boarding/daycare/grooming/
-- training since 20260806660000, `FacilityRoomService` names all four, and
-- `/api/rooms/categories` already accepts any of them. The multi-service
-- intent is not something being invented here; it was designed and then never
-- populated.
--
-- A play area maps onto a category (a named grouping with an image and an
-- order) and a section onto a room (a concrete space with a capacity). Giving
-- daycare its own pair of tables would mean two answers to "what spaces does
-- this facility have", and would leave `service` still unrealised.
--
-- The cost of using them is that anything reading these tables must scope by
-- service. Every consumer already did — BoardingRoomsClient, BoardingDetails,
-- and `autoAssignBoardingUnit` all filter `service === 'boarding'` — except
-- the kennel board's own read, which took every row and was fixed separately
-- before this migration so that no daycare row could ever appear on it.
-- ============================================================================

-- ── The columns a play area and a section need ────────────────────────────
--
-- A category had no `active`: boarding categories are all live, so nothing
-- needed to turn one off. A play area closes for the season.
alter table public.room_categories
  add column if not exists active boolean not null default true;

comment on column public.room_categories.active is
  'Whether this category is currently offered. Added for daycare play areas, which close seasonally; boarding categories default to true and nothing turns them off today.';

-- A room had `staff_notes` but no customer-facing `description`, and neither
-- `rules` nor `color` — both of which a category already has, because for
-- boarding those live at the category level. For daycare they live on the
-- SECTION: "Small Dogs" and "Large Dogs" sit in the same yard and admit
-- different animals.
alter table public.facility_rooms
  add column if not exists description text,
  add column if not exists color text,
  add column if not exists rules jsonb not null default '[]'::jsonb;

comment on column public.facility_rooms.rules is
  'Eligibility rules for this specific room. For BOARDING these live on the category and this stays empty; for DAYCARE two sections of one yard admit different weights, so the rules belong here.';

-- ── The demo facility's yards ─────────────────────────────────────────────
--
-- Copied from `src/data/daycare-areas.ts` — generated from the fixture rather
-- than retyped, after a hand-written seed in 20260822700000 got six fields
-- wrong across eight rows.
--
-- Only the demo facility (legacy_id 11), which is the one the fixture
-- described. A facility with no daycare yards gets an empty screen and builds
-- its own, which is the honest default: inventing two play areas for a
-- business that has never mentioned them is how fixtures become furniture.
do $$
declare
  v_fac uuid;
  v_indoor uuid;
  v_outdoor uuid;
begin
  select id into v_fac from public.facilities where legacy_id = '11';
  if v_fac is null then
    raise notice 'No demo facility (legacy_id 11) -- no daycare areas seeded.';
    return;
  end if;

  if exists (
    select 1 from public.room_categories
     where facility_id = v_fac and service = 'daycare'
  ) then
    raise notice 'Daycare areas already present -- not seeding again.';
    return;
  end if;

  -- `default_capacity` is deliberately omitted, taking the column default of
  -- 1. It is a FALLBACK — the capacity engine reads `unit.capacity ??
  -- cat.defaultCapacity` — and every section below carries its own capacity,
  -- so for these rows it never fires. The constraint is `> 0`, so 0 (the
  -- honest "not applicable at this level") is not available, and inventing a
  -- number for a yard whose capacity lives on its sections would put a
  -- meaningless figure somewhere a total could pick it up. 1 errs toward
  -- under-booking, which is the safe direction for a capacity fallback.
  insert into public.room_categories
    (facility_id, legacy_id, service, name, description, color, sort_order,
     default_base_price, visible_to_clients, image_url, rules, active)
  values
    (v_fac, 'area-indoor', 'daycare', 'Indoor Park',
     'Climate-controlled indoor play space — open year-round',
     'slate', 1, null, true,
     'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=480&fit=crop',
     '[]'::jsonb, true),
    (v_fac, 'area-outdoor', 'daycare', 'Outdoor Yard',
     'Open-air supervised play area — seasonal',
     'slate', 2, null, true,
     'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=480&fit=crop',
     '[]'::jsonb, true);

  select id into v_indoor from public.room_categories
   where facility_id = v_fac and legacy_id = 'area-indoor';
  select id into v_outdoor from public.room_categories
   where facility_id = v_fac and legacy_id = 'area-outdoor';

  insert into public.facility_rooms
    (facility_id, category_id, legacy_id, name, description, image_url,
     active, capacity, sort_order, color, rules)
  values
    (v_fac, v_indoor, 'sec-indoor-small', 'Small Dogs',
     'Cozy section for dogs under 20 lbs',
     'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=480&fit=crop',
     true, 20, 1, 'emerald',
     '[{"id":"rule-is-1","type":"max_weight","value":20,"clientMessage":"This section is reserved for dogs under 20 lbs.","enabled":true},{"id":"rule-is-2","type":"pet_type","value":"dog","clientMessage":"This section is for dogs only.","enabled":true}]'::jsonb),
    (v_fac, v_indoor, 'sec-indoor-medium', 'Medium Dogs',
     'Active section for dogs 20–50 lbs',
     'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=480&fit=crop',
     true, 30, 2, 'blue',
     '[{"id":"rule-im-1","type":"min_weight","value":20,"clientMessage":"This section is for dogs 20 lbs and above.","enabled":true},{"id":"rule-im-2","type":"max_weight","value":50,"clientMessage":"This section is for dogs up to 50 lbs.","enabled":true},{"id":"rule-im-3","type":"pet_type","value":"dog","clientMessage":"This section is for dogs only.","enabled":true}]'::jsonb),
    (v_fac, v_indoor, 'sec-indoor-large', 'Large Dogs',
     'Spacious section for dogs over 50 lbs',
     'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&h=480&fit=crop',
     true, 50, 3, 'amber',
     '[{"id":"rule-il-1","type":"min_weight","value":50,"clientMessage":"This section is for dogs 50 lbs and above.","enabled":true},{"id":"rule-il-2","type":"pet_type","value":"dog","clientMessage":"This section is for dogs only.","enabled":true}]'::jsonb),
    (v_fac, v_outdoor, 'sec-outdoor-main', 'Main Yard',
     'Open outdoor play for all sizes',
     'https://images.unsplash.com/photo-1534361960057-19889db9621e?w=800&h=480&fit=crop',
     true, 25, 1, 'orange',
     '[{"id":"rule-om-1","type":"pet_type","value":"dog","clientMessage":"Outdoor yard is for dogs only.","enabled":true}]'::jsonb),
    (v_fac, v_outdoor, 'sec-outdoor-agility', 'Agility Zone',
     'Obstacle course for energetic dogs',
     'https://images.unsplash.com/photo-1546527868-ccb7ee7dfa6a?w=800&h=480&fit=crop',
     true, 10, 2, 'violet',
     '[{"id":"rule-oa-1","type":"min_weight","value":15,"clientMessage":"Agility zone is for dogs 15 lbs and above.","enabled":true},{"id":"rule-oa-2","type":"pet_type","value":"dog","clientMessage":"Agility zone is for dogs only.","enabled":true}]'::jsonb);
end $$;
