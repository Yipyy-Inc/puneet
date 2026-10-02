-- ============================================================================
-- A room card says what the room is: its size, what comes with it, and what a
-- second pet sharing it costs.
--
-- The booking wizard's "Choose a room" (the client's mock, 2026-10-01) draws
-- each card as a photo with its nightly price, then
--
--   Condo                                     8 of 14 free   ← staff only
--   4 × 4 ft · pets up to 25 lb
--   [Raised bed] [Climate control] [2 potty breaks]
--
-- and, with two pets of one household, "Bubu & Mango share a room — 2nd pet
-- $45/night · Suites only". None of the three facts existed:
--
--   room_categories.dimensions_label   "4 × 4 ft", "Quiet wing" — the
--                                       facility's own words, not a measured
--                                       number: nothing computes with it.
--   room_categories.features           the chips. Eight at most — a card has
--                                       room for a line of them, not a brochure.
--   boarding_services.additional_pet_price
--                                       each pet after the first sharing ONE
--                                       room of this service. NULL keeps what a
--                                       shared room has always cost: the room,
--                                       once (`boardingPricing`, "a Deluxe
--                                       Suite holds two pets from one
--                                       household … paid for once").
--
-- ── WHY THE CUSTOMER'S MENU CARRIES THE LODGING NOW ─────────────────────────
--
-- A customer cannot read `room_categories` (members only), so the wizard drew
-- a customer's cards from the menu alone — no size line, no features, and no
-- way to know that a Suite holds two pets, so "share a room" could never be
-- offered to the people it is for. `offered_boarding_services()` therefore
-- carries, per service, the lodging types it may be booked into, PROJECTED:
-- the name, photo, words, size and features the facility writes for clients,
-- whether it holds more than one pet, and the enabled rules with the message
-- the facility wrote FOR CLIENTS (`clientMessage`). Never a count, never a
-- unit, never anything about who is in them — the client's own words: "only
-- the facility side needs to see how many rooms are left". A type the
-- facility hides from clients or has retired is not sent.
--
-- The function is otherwise exactly 20260925173458's.
-- ============================================================================

alter table public.room_categories
  add column dimensions_label text
    constraint room_categories_dimensions_label_length
      check (dimensions_label is null or char_length(dimensions_label) <= 60),
  add column features text[] not null default '{}'::text[]
    constraint room_categories_features_count
      check (cardinality(features) <= 8);

comment on column public.room_categories.dimensions_label is
  'The size line a client reads on the room card ("4 × 4 ft", "Quiet wing"). '
  'Words, not a measurement: nothing computes with it.';
comment on column public.room_categories.features is
  'What comes with the room, as the card''s chips ("Raised bed", "Webcam"). '
  'At most eight.';

alter table public.boarding_services
  add column additional_pet_price numeric
    constraint boarding_services_additional_pet_price_check
      check (additional_pet_price is null or additional_pet_price >= 0);

comment on column public.boarding_services.additional_pet_price is
  'Per night or per day (the service''s unit), for EACH pet after the first '
  'sharing one room of this service. NULL = a shared room is the room''s '
  'price, once — what it cost before this column.';

create or replace function public.offered_boarding_services(
  p_facility_id uuid,
  p_location_id uuid default null,
  p_pet_ids uuid[] default '{}'::uuid[]
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $fn$
  with allowed as (
    select private.is_platform_admin()
        or p_facility_id in (select private.client_facility_ids())
        or p_facility_id in (select private.member_facility_ids_all()) as ok
  ),
  -- Every pet tag carried by the pets the customer named, as text, so the
  -- service's own `text[]` columns compare against it directly.
  pet_tags as (
    select coalesce(array_agg(distinct ta.tag_id::text), '{}'::text[]) as tags
      from public.facility_tag_assignments ta
     where ta.entity_type = 'pet'
       and ta.entity_id = any (p_pet_ids)
       and ta.facility_id = p_facility_id
       and (ta.expires_at is null or ta.expires_at > now())
  ),
  offered as (
    select s.display_order,
           s.name,
           jsonb_build_object(
             'id',                  s.id,
             'categoryId',          s.category_id,
             'name',                s.name,
             'description',         s.description,
             'imageUrl',            s.image_url,
             -- What it costs HERE: the branch's own row where it set one, the
             -- facility-wide row next, the service's own column last. The same
             -- order `effectiveBoardingPrice()` resolves in TypeScript,
             -- because a customer quoted a different number from the till is
             -- the whole class of bug this phase exists to close.
             'price',               coalesce(branch.price, facility_wide.price, s.price),
             'facilityPrice',       coalesce(facility_wide.price, s.price),
             -- PER NIGHT OR PER DAY. Not withholdable: it is half of the price.
             'unit',                s.unit::text,
             'taxable',             s.taxable,
             -- Each pet after the first, sharing one room. Part of the price.
             'additionalPetPrice',  s.additional_pet_price,
             -- Which lodging types this may be booked into. The wizard filters
             -- the kennel list by it AFTER the service is picked, so a customer
             -- is never offered a kennel the service cannot be sold into.
             'lodgingTypeIds',      to_jsonb(s.lodging_type_ids),
             -- Those types, as the room card shows them (20261001190000).
             -- Words, photo, size, features, whether it holds more than one
             -- pet, and the enabled rules with the message the facility wrote
             -- for clients. No count and no unit: the facility's alone.
             'lodging',             coalesce((
               select jsonb_agg(jsonb_build_object(
                        'id',           c.id,
                        'name',         c.name,
                        'description',  c.description,
                        'imageUrl',     c.image_url,
                        'dimensions',   c.dimensions_label,
                        'features',     to_jsonb(c.features),
                        'holdsSeveral', (c.space_type = 'area'
                                         or c.default_capacity > 1),
                        'rules',        coalesce((
                          select jsonb_agg(jsonb_build_object(
                                   'type',          r->>'type',
                                   'value',         r->'value',
                                   'clientMessage', coalesce(r->>'clientMessage', '')))
                            from jsonb_array_elements(c.rules) r
                           where coalesce((r->>'enabled')::boolean, true)),
                          '[]'::jsonb))
                      order by c.sort_order, c.name)
                 from public.room_categories c
                where c.facility_id = p_facility_id
                  and c.service = 'boarding'
                  and c.active
                  and c.visible_to_clients
                  -- Empty means EVERY type, the convention this schema uses
                  -- for every eligibility array.
                  and (cardinality(s.lodging_type_ids) = 0
                       or c.id = any (s.lodging_type_ids))), '[]'::jsonb),
             -- These describe the SERVICE ("for dogs under 20 lb"), which is
             -- exactly what a customer needs to understand the menu. The pet
             -- TAG rules describe the PET, and are applied above instead.
             'eligibleSpecies',     to_jsonb(s.eligible_species),
             'eligibleBreeds',      to_jsonb(s.eligible_breeds),
             'eligibleWeightTiers', to_jsonb(s.eligible_weight_tiers),
             'locationIds',         to_jsonb(s.location_ids),
             -- Kept, because the flow has to be able to SAY why a service is
             -- not bookable yet rather than silently omitting it.
             'requiresEvaluationOnline', s.requires_evaluation_online,
             'displayOrder',        s.display_order,
             -- What a stay of it gets by its length. Part of the price.
             'defaultAddOns',       coalesce((
               select jsonb_agg(jsonb_build_object(
                        'addon_id',         d.addon_id,
                        'applies_on',       d.applies_on,
                        'quantity_per_day', d.quantity_per_day,
                        'min_nights',       d.min_nights)
                      order by d.created_at, d.id)
                 from public.boarding_service_default_addons d
                where d.service_id = s.id), '[]'::jsonb)
           ) as service
      from public.boarding_services s
      cross join allowed
      cross join pet_tags
      left join public.boarding_service_location_prices branch
        on branch.service_id = s.id and branch.location_id = p_location_id
      left join public.boarding_service_location_prices facility_wide
        on facility_wide.service_id = s.id and facility_wide.location_id is null
     where allowed.ok
       and s.facility_id = p_facility_id
       -- A draft is not on offer.
       and s.is_active
       -- Empty `location_ids` means every branch, which is why this is not a
       -- plain `@>`: an unrestricted service must survive a null branch too.
       and (cardinality(s.location_ids) = 0
            or p_location_id is null
            or p_location_id = any (s.location_ids))
       -- Blocked beats eligible, the rule the editor states and
       -- `isPetEligibleForBoarding` implements. Both are no-ops on an empty
       -- array.
       and not (cardinality(s.blocked_pet_tags) > 0
                and s.blocked_pet_tags && pet_tags.tags)
       and (cardinality(s.eligible_pet_tags) = 0
            or s.eligible_pet_tags && pet_tags.tags)
  )
  select coalesce(
           jsonb_agg(offered.service order by offered.display_order, offered.name),
           '[]'::jsonb)
    from offered;
$fn$;

comment on function public.offered_boarding_services(uuid, uuid, uuid[]) is
  'The boarding services a facility offers online, as a customer may see them: '
  'active, offered at that branch, pet-tag rules already applied, projected to '
  'an allowlist of keys. Colour, pet tags and the STAFF evaluation flag are the '
  'facility own and are not returned. The unit, the second-pet rate and the '
  'lodging types ARE — the lodging as the room card shows it (words, photo, '
  'size, features, whether it holds several pets, enabled rules with their '
  'client message), never a count. Default add-ons are part of the price.';

-- `create or replace` keeps the grants, but they are restated so this file
-- says what it leaves behind. Both revokes are asserted in the test: `from
-- public` and `from anon` are different grants (20260822610000).
revoke all on function public.offered_boarding_services(uuid, uuid, uuid[]) from public;
revoke all on function public.offered_boarding_services(uuid, uuid, uuid[]) from anon;
grant execute on function public.offered_boarding_services(uuid, uuid, uuid[])
  to authenticated, service_role;
