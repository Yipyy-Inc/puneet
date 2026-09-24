-- ============================================================================
-- A CUSTOMER READS THE GROOMING MENU THEY ARE OFFERED — AT ONE BUSINESS.
--
-- The same defect Phase 6 closed for daycare (20260924140000), in the service
-- that has had it longer. `/api/grooming/services` scopes with
-- `activeFacilityIdForStaff()`, which returns NULL for somebody holding no
-- membership, so `inFacility(null)` is `{}` and the query falls through to RLS.
--
-- `grooming_services_read` (20260805100000) admits active services at every
-- facility the caller is a CLIENT of — correctly, because that is the rule for
-- a row, not for a screen — and `private.client_facility_ids()` is `setof uuid`.
-- Plural, deliberately: one household can use two businesses.
--
-- ── WHY THIS IS WORSE HERE THAN IT WAS FOR DAYCARE ────────────────────────
--
-- Daycare's merge showed a customer two menus. Grooming's does that AND can
-- charge for it: the wizard prices the package the customer picked, so picking
-- facility B's "Full Groom" while booking at facility A quotes B's price on A's
-- booking. The customer's own booking is a REQUEST with the price zeroed
-- (20260806840000), so the till is not wrong — but the QUOTE the customer
-- agreed to is, and that is the number they remember.
--
-- ── AND THE ROUTE ATTACHES THE CROSS-BRANCH BREAKDOWN ─────────────────────
--
-- `perLocationSizePricing()` rides along on EVERY response, so a customer is
-- handed what each of the business's branches charges for each pet size. It
-- was added for HQ Services, which is a head-office screen.
--
-- ── THE ALLOWLIST ─────────────────────────────────────────────────────────
--
-- Same reasoning as `offered_custom_services` (20260912172123) and
-- `offered_daycare_services`: RLS hands over the whole ROW, and a projection
-- decides what a customer may read. Withheld, each for a reason:
--
--   * `color` — the calendar's colour code, internal like daycare's.
--   * `required_skill_level` — which tier of groomer may perform it. Staff
--     rostering; a customer does not pick a groomer by skill band here.
--   * `max_per_day` — a capacity limit, which is operations.
--   * `legacy_id`, `facility_id`, the timestamps — plumbing.
--   * the per-branch breakdown — replaced by ONE resolved price set, for the
--     branch that was asked about.
--
-- KEPT, INCLUDING THE PARTS THAT COST MONEY. `coat_adjustments`,
-- `coat_adjustment_mode` and `matted_surcharge_default` all move what the
-- customer pays, and a quote a customer cannot reconstruct is worse than one
-- they can argue with. `min_booking_notice_hours` is kept for the same reason:
-- "book 24 hours ahead" is a rule they need before they choose a day.
--
-- Grooming needs no pet argument, unlike daycare. Its eligibility is
-- `eligible_pet_sizes`, `eligible_coat_types` and `eligible_breeds` — all of
-- them descriptions of the SERVICE ("for short-coated dogs under 20 lb"),
-- which a customer may read. Daycare's pet TAGS describe the ANIMAL, which is
-- why those had to be applied server-side and these do not.
--
-- SQL G0-G6 in grooming-customer-services.sql.
-- ============================================================================

create or replace function public.offered_grooming_services(
  p_facility_id uuid,
  p_location_id uuid default null
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
  offered as (
    select s.display_order,
           s.name,
           jsonb_build_object(
             'id',                    coalesce(s.legacy_id, s.id::text),
             'name',                  s.name,
             'description',           s.description,
             'basePrice',             s.base_price,
             'duration',              s.duration_min,
             -- These three decide what the customer is actually charged, so
             -- withholding them would leave a quote nobody could check.
             'coatAdjustments',       s.coat_adjustments,
             'coatAdjustmentMode',    s.coat_adjustment_mode,
             'mattedSurchargeDefault', s.matted_surcharge_default,
             'includes',              to_jsonb(coalesce(s.includes, '{}'::text[])),
             'taxable',               s.taxable,
             'isPopular',             s.is_popular,
             'imageUrl',              s.image_url,
             'minBookingNoticeHours', s.min_booking_notice_hours,
             -- Descriptions of the SERVICE, which is why they are here: a
             -- customer needs to know a package is for short coats.
             'eligiblePetSizes',      to_jsonb(coalesce(s.eligible_pet_sizes, '{}'::text[])),
             'eligibleCoatTypes',     to_jsonb(coalesce(s.eligible_coat_types, '{}'::text[])),
             'eligibleBreeds',        to_jsonb(coalesce(s.eligible_breeds, '{}'::text[])),
             'displayOrder',          s.display_order,
             -- ONE price set: the branch's own row per size where it set one,
             -- the facility-wide row otherwise. The same resolution order
             -- `effectiveSizePricing()` applies in TypeScript, because a
             -- customer quoted a different number from the till is the whole
             -- class of bug this closes.
             'sizePricing', coalesce((
               select jsonb_object_agg(size_label, price)
                 from (
                   select distinct on (sp.size_label)
                          sp.size_label, sp.price
                     from public.grooming_service_size_prices sp
                    where sp.service_id = s.id
                      and (sp.location_id is null
                           or sp.location_id = p_location_id)
                      and sp.size_label in ('small','medium','large','giant')
                    -- The branch's own row sorts first, so `distinct on` keeps
                    -- it and falls back to the facility-wide one.
                    order by sp.size_label,
                             (sp.location_id is not null) desc
                 ) resolved
             ), '{}'::jsonb)
           ) as service
      from public.grooming_services s
      cross join allowed
     where allowed.ok
       and s.facility_id = p_facility_id
       -- A draft is not on offer. RLS says the same for a client; this says it
       -- for everybody, because the function is SECURITY DEFINER and a member
       -- calling it is asking what a CUSTOMER would see.
       and s.is_active
  )
  select coalesce(
           jsonb_agg(offered.service order by offered.display_order, offered.name),
           '[]'::jsonb)
    from offered;
$fn$;

comment on function public.offered_grooming_services(uuid, uuid) is
  'The grooming services a facility offers, as a customer may see them: '
  'active, size prices resolved for one branch, projected to an allowlist of '
  'keys. Colour, required skill level, per-day capacity and the cross-branch '
  'price breakdown are the facility own and are not returned.';

revoke all on function public.offered_grooming_services(uuid, uuid) from public;
revoke all on function public.offered_grooming_services(uuid, uuid) from anon;
grant execute on function public.offered_grooming_services(uuid, uuid)
  to authenticated, service_role;
