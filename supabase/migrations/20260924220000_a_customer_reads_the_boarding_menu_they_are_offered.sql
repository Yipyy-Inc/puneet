-- ============================================================================
-- A CUSTOMER READS THE BOARDING MENU THEY ARE OFFERED — not the facility's.
--
-- The third time this exact defect has been found, and the reason it is worth
-- writing down rather than just fixing: a SHARED component reads a FACILITY
-- route, the route scopes by `activeFacilityIdForStaff()`, and that returns
-- NULL for somebody holding no membership. `inFacility(null)` is `{}`, so the
-- query falls through to RLS alone — and RLS admits active rows at EVERY
-- facility the caller is a client of, because `private.client_facility_ids()`
-- is `setof uuid` and plural by design. One household using two businesses
-- sees both menus merged, with nothing on screen saying which is which.
--
-- Found in custom services (2026-09-19), daycare (20260924140000) and grooming
-- (20260924160000). Boarding would have been the fourth the moment Phase 6's
-- picker shipped, so it is closed in the same commit that creates the picker
-- rather than after somebody notices.
--
-- ── AND IT IS A PROJECTION, NOT JUST A SCOPE ──────────────────────────────
--
-- `/api/boarding/services` hands over the whole row. Three of those columns are
-- the facility's own business and not a customer's:
--
--   · `color`           — our own setup screen labels it "internal only";
--   · `*_pet_tags`      — the facility's behavioural classification of animals,
--                         which is why the tag rules are applied HERE, server
--                         side, against the pets the caller actually named;
--   · `requires_evaluation` — the STAFF question. `requires_evaluation_online`
--                         is the customer's and is the one returned.
--
-- ── WHAT BOARDING ADDS THAT DAYCARE DID NOT HAVE ──────────────────────────
--
-- `unit` and `lodgingTypeIds`. Both are needed on the customer's side and
-- neither is a secret: the unit is how the price is read ("$80 per night"), and
-- the lodging types are what the wizard filters the kennel list by after the
-- service is picked. Withholding either would put the customer's wizard on
-- different arithmetic from the till, which is the whole class of bug this
-- phase exists to close.
-- ============================================================================

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
             -- Which lodging types this may be booked into. The wizard filters
             -- the kennel list by it AFTER the service is picked, so a customer
             -- is never offered a kennel the service cannot be sold into.
             'lodgingTypeIds',      to_jsonb(s.lodging_type_ids),
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
             'displayOrder',        s.display_order
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
  'facility own and are not returned. The unit and the lodging types ARE, '
  'because the unit is half of the price and the types decide which kennels the '
  'wizard may then offer.';

-- A revoke naming a privilege the role does not hold succeeds SILENTLY and
-- looks identical to one that worked, so both are named and both are asserted
-- in the test rather than trusted. `from public` and `from anon` are different
-- grants and 20260822610000 exists because one attempt named only one of them.
revoke all on function public.offered_boarding_services(uuid, uuid, uuid[]) from public;
revoke all on function public.offered_boarding_services(uuid, uuid, uuid[]) from anon;
grant execute on function public.offered_boarding_services(uuid, uuid, uuid[])
  to authenticated, service_role;
