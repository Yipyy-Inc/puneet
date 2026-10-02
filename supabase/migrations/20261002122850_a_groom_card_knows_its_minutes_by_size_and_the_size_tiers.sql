-- ============================================================================
-- A groom card knows how long it takes for THIS pet, and which size the pet is.
--
-- The booking wizard's "Choose the groom" (the client's mock, 2026-10-01)
-- prices and times each package for the pet in front of it:
--
--   Full Groom                                         ◷ 1h 30m
--   $85   Small base $75 · +$10 curly coat
--   S $75 · M $90 · L $110 · XL $135
--
-- and "Groomer & time" fits the pets' appointments back to back. Three facts
-- were missing for that, each for a customer:
--
--   the SIZE TIERS   `grooming_config.pet_size_tiers` decides which size a pet
--                    is — `create_booking` reads it (20260915104919) — but it
--                    is members-only, so a customer's wizard guessed with its
--                    own 20/40/80 lb bands while the database used the
--                    facility's 15/35/70, and the quote and the booking
--                    disagreed for every dog of 15-20, 35-40 or 70-80 lb.
--                    `grooming_size_tiers()` hands the bands — weight limits,
--                    nothing else — to a client of that facility.
--   the MINUTES      `grooming_service_size_prices.duration_min` is how long a
--                    groom takes per size, and `create_booking` books it; the
--                    customer's menu sent the base length only.
--   the ROW ID       an add-on offered for one service names it by uuid, and
--                    the customer's menu carried the legacy id alone, so those
--                    rules never matched a customer.
--
-- And one for staff: matting. The mock's "Bubu has matting — adds $20 and 15
-- min" is set at intake; the money already exists (`coat_adjustments.matted`,
-- `matted_surcharge_default`), the minutes did not. `matted_extra_minutes` is
-- the facility's own number, 0 by default, so nothing changes until it is set.
--
-- `offered_grooming_services` is otherwise exactly 20260924160000's.
-- ============================================================================

alter table public.grooming_services
  add column matted_extra_minutes integer not null default 0
    constraint grooming_services_matted_extra_minutes_check
      check (matted_extra_minutes between 0 and 240);

comment on column public.grooming_services.matted_extra_minutes is
  'Minutes a matted coat adds to this groom, set by staff at booking or '
  'intake. 0 = no extra time.';

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
             -- The uuid: what an add-on rule for one service names it by.
             'rowId',                 s.id,
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
             ), '{}'::jsonb),
             -- The minutes per size, resolved the same way (20261001200000).
             -- A size with no minutes is absent: it takes `duration`.
             'sizeDurations', coalesce((
               select jsonb_object_agg(size_label, duration_min)
                 from (
                   select distinct on (sp.size_label)
                          sp.size_label, sp.duration_min
                     from public.grooming_service_size_prices sp
                    where sp.service_id = s.id
                      and sp.duration_min is not null
                      and (sp.location_id is null
                           or sp.location_id = p_location_id)
                      and sp.size_label in ('small','medium','large','giant')
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
  'active, size prices and minutes resolved for one branch, projected to an '
  'allowlist of keys. Colour, required skill level, per-day capacity and the '
  'cross-branch price breakdown are the facility own and are not returned.';

revoke all on function public.offered_grooming_services(uuid, uuid) from public;
revoke all on function public.offered_grooming_services(uuid, uuid) from anon;
grant execute on function public.offered_grooming_services(uuid, uuid)
  to authenticated, service_role;

-- ── The size bands ──────────────────────────────────────────────────────────
--
-- `create_booking`'s own rule reads these; a pet with no matching band is
-- priced at the base. No row for the facility is no bands — `[]`, not the
-- column default — because that is what `create_booking` finds too. Null
-- for somebody who is neither a client nor a member there, the same answer
-- as for a facility that does not exist.
create or replace function public.grooming_size_tiers(p_facility_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $fn$
  select case
           when private.is_platform_admin()
             or p_facility_id in (select private.client_facility_ids())
             or p_facility_id in (select private.member_facility_ids_all())
           then coalesce(
                  (select coalesce(jsonb_agg(jsonb_build_object(
                                     'id',           t.tier->>'id',
                                     'label',        t.tier->>'label',
                                     'maxWeightLbs', t.tier->'maxWeightLbs')
                                   order by t.n), '[]'::jsonb)
                     from public.grooming_config c,
                          lateral jsonb_array_elements(c.pet_size_tiers)
                            with ordinality as t(tier, n)
                    where c.facility_id = p_facility_id),
                  '[]'::jsonb)
         end;
$fn$;

comment on function public.grooming_size_tiers(uuid) is
  'The facility''s grooming size bands (id, label, maxWeightLbs) for a client '
  'or member of it — the bands create_booking prices by. [] with no config '
  'row; null for anybody else.';

revoke all on function public.grooming_size_tiers(uuid) from public;
revoke all on function public.grooming_size_tiers(uuid) from anon;
grant execute on function public.grooming_size_tiers(uuid)
  to authenticated, service_role;
