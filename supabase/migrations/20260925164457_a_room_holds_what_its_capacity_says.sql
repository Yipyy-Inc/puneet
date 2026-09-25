-- ============================================================================
-- A room holds as many of one family's pets as its capacity says, and nothing
-- else decides it.
--
-- ── THREE RULES THAT DECIDED NOTHING ──────────────────────────────────────
--
-- The Rooms page offered six rule types for a kennel class. `petMatchesRules`
-- read three of them. The other three were stored, shown on the card, and
-- consulted by nothing:
--
--   single_pet_only   "Suites accommodate one pet per booking."
--   max_pets          "Deluxe Suites accommodate up to 2 pets from the same
--                      household."
--   size_restriction  "Size Group — Small (under 20 lbs)…"
--
-- The engine said of the first two "evaluated by the caller when assigning
-- multiple pets". No caller did.
--
-- ── WHY THEY ARE FOLDED, NOT ENFORCED ─────────────────────────────────────
--
-- Read the words on them: both are the class's "Max # of pets (same family)
-- per room", which is `default_capacity` (20260924180000 says so on the
-- column) — and that one IS enforced. `roomsForAssignments` never puts more
-- of one booking's pets in a unit than it holds, and a booking whose pets need
-- two rooms is saved as two parts, one per room. Enforcing the rules as well
-- would have given one meaning three spellings, free to disagree.
--
-- Measured 2026-09-25, all four agreed with the capacity already: three
-- single_pet_only on classes of capacity 1 (Doggieville's own "Suites" among
-- them) and one max_pets 2 on a class of capacity 2. So this changes no
-- number today. It is written to fold anyway, taking the SMALLER of the two,
-- because a rule's words are what a client was promised — never more pets in
-- a room than the class said.
--
-- `size_restriction` was carried by no row, and its bands (under 20, 20–50,
-- 50–90, 90+) matched none of the three sets the product already has. Weight
-- is `min_weight` / `max_weight`, in pounds, and the Rooms page now picks it
-- by size tier on top of those — one representation for one meaning.
--
-- ── REFUSED AT THE DOOR FROM NOW ON ───────────────────────────────────────
--
-- A rule the engine does not read is the defect, so the tables now admit only
-- the three it does. An allow-list rather than a ban on these three: a typo,
-- or a fourth type added in a component and never taught to the engine, is
-- the same defect again. `facility_rooms.rules` carries a daycare section's
-- own rules (20260822800000) and takes the same list.
-- ============================================================================

-- ── Fold: an enabled rule that promises fewer pets lowers the capacity ─────

do $$
declare
  v_folded   int;
  v_stripped int;
  v_units    int;
begin
  with said as (
    select c.id,
           min(case r->>'type'
                 when 'single_pet_only' then 1
                 when 'max_pets' then
                   case when r->>'value' ~ '^[0-9]+(\.[0-9]+)?$'
                        then floor((r->>'value')::numeric)::int end
               end) as pets
      from public.room_categories c,
           jsonb_array_elements(c.rules) r
     where r->>'type' in ('single_pet_only', 'max_pets')
       and coalesce((r->>'enabled')::boolean, true)
     group by c.id
  )
  update public.room_categories c
     set default_capacity = said.pets
    from said
   where said.id = c.id
     and c.space_type = 'room'
     and said.pets > 0
     and said.pets < c.default_capacity;
  get diagnostics v_folded = row_count;

  -- ── Strip the three from every class ─────────────────────────────────────
  update public.room_categories c
     set rules = coalesce(
           (select jsonb_agg(e.r order by e.ord)
              from jsonb_array_elements(c.rules) with ordinality as e(r, ord)
             where e.r->>'type' in ('min_weight', 'max_weight', 'pet_type')),
           '[]'::jsonb)
   where c.rules @? '$[*] ? (!exists(@.type) || !(@.type == "min_weight" || @.type == "max_weight" || @.type == "pet_type"))';
  get diagnostics v_stripped = row_count;

  -- None today (measured), but the constraint below would refuse to be added
  -- over one, and a migration that fails on a row nobody looked at is worse.
  update public.facility_rooms fr
     set rules = coalesce(
           (select jsonb_agg(e.r order by e.ord)
              from jsonb_array_elements(fr.rules) with ordinality as e(r, ord)
             where e.r->>'type' in ('min_weight', 'max_weight', 'pet_type')),
           '[]'::jsonb)
   where jsonb_typeof(fr.rules) = 'array'
     and fr.rules @? '$[*] ? (!exists(@.type) || !(@.type == "min_weight" || @.type == "max_weight" || @.type == "pet_type"))';
  get diagnostics v_units = row_count;

  raise notice 'capacity lowered by a rule: %, classes stripped: %, units stripped: %',
    v_folded, v_stripped, v_units;
end $$;

-- ── Only the rules the engine reads ─────────────────────────────────────────

alter table public.room_categories
  add constraint room_category_rules_are_read
  check (not rules @? '$[*] ? (!exists(@.type) || !(@.type == "min_weight" || @.type == "max_weight" || @.type == "pet_type"))');

alter table public.facility_rooms
  add constraint facility_room_rules_are_read
  check (not rules @? '$[*] ? (!exists(@.type) || !(@.type == "min_weight" || @.type == "max_weight" || @.type == "pet_type"))');

comment on constraint room_category_rules_are_read on public.room_categories is
  'Only the rule types petMatchesRules reads: min_weight, max_weight, pet_type. '
  'single_pet_only and max_pets were default_capacity spelled twice more, and '
  'size_restriction was read by nothing (20260925164457).';

comment on constraint facility_room_rules_are_read on public.facility_rooms is
  'The same allow-list as room_category_rules_are_read (20260925164457).';
