-- ============================================================================
-- A customer's boarding menu carries each service's DEFAULT ADD-ONS.
--
-- A facility can attach add-ons to a boarding service by length of stay — "a
-- daily walk on every day", "a bath on the last day once the stay is five
-- nights" (`boarding_service_default_addons`, 20260924210000). They are part
-- of what a stay of that service costs, so the customer's wizard has to know
-- them to quote the same number the till will charge.
--
-- They are not a secret in the way colour and pet tags are: they are the
-- facility telling the customer what the service includes, and billed as
-- lines the customer sees. So they join the projection's allow-list, as the
-- stored row (`addon_id`, `applies_on`, `quantity_per_day`, `min_nights`) —
-- the add-on's name and price come from the facility's add-on catalogue,
-- which customers already read (20260919182016).
--
-- The function is otherwise exactly 20260924220000's. A service with none
-- carries an empty list, never null, so the reader has one shape to handle.
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
  'facility own and are not returned. The unit and the lodging types ARE, '
  'because the unit is half of the price and the types decide which kennels the '
  'wizard may then offer. Default add-ons are part of the price.';

-- A revoke naming a privilege the role does not hold succeeds SILENTLY and
-- looks identical to one that worked, so both are named and both are asserted
-- in the test rather than trusted. `from public` and `from anon` are different
-- grants and 20260822610000 exists because one attempt named only one of them.
revoke all on function public.offered_boarding_services(uuid, uuid, uuid[]) from public;
revoke all on function public.offered_boarding_services(uuid, uuid, uuid[]) from anon;
grant execute on function public.offered_boarding_services(uuid, uuid, uuid[])
  to authenticated, service_role;
