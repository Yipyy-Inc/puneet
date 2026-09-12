-- ============================================================================
-- Mobile grooming is the facility's — and a customer is shown what is
-- offered, not the vans or who drives them.
--
-- ── WHAT IT REPLACES ──────────────────────────────────────────────────────
--
-- Vans, service areas, travel zones and the per-groomer area schedules lived
-- in the browser's localStorage, seeded with two invented vans and two
-- Montréal areas: every facility's booking form offered a van visit priced
-- with those zones, and nothing a facility set up reached another device or a
-- customer. They are the `mobile_grooming` settings domain now
-- (src/lib/settings/mobile-grooming.ts), off until configured.
--
-- ── WHY A FUNCTION, NOT THE ALLOWLIST ─────────────────────────────────────
--
-- The row carries vans — licence plates, a home-base address, who drives —
-- and the schedules that say which groomer covers which area on which day.
-- None of that is a customer's to read, so the domain stays OFF
-- `private.customer_visible_setting_domains()` and a customer reads this
-- projection instead:
--
--   enabled, arrivalWindowMinutes, certainAreaEnabled  the switches
--   hasActiveVans      whether any active van has a groomer — not the vans
--   serviceAreas       ACTIVE areas, projected to an allowlist of keys
--   travelZones        ACTIVE zones, projected to an allowlist of keys
--   basePostalCode     the facility's own postal code, which distance to a
--                      travel zone is measured from (it was a constant in
--                      two booking screens, "H2X 1Z4", for every facility)
--
-- ── WHO ───────────────────────────────────────────────────────────────────
--
-- A client of the facility, a member of it, or a platform admin. Anybody
-- else gets the switched-off answer with no postal code — the same shape as
-- a facility that offers no van visits, so the function confirms nothing.
-- ============================================================================

create or replace function public.offered_mobile_grooming(p_facility_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $fn$
  with allowed as (
    select (
      private.is_platform_admin()
      or p_facility_id in (select private.client_facility_ids())
      or p_facility_id in (select private.member_facility_ids_all())
    ) as ok
  ),
  setting as (
    select fs.value as v
      from public.facility_settings fs
      cross join allowed
     where allowed.ok
       and fs.facility_id = p_facility_id
       and fs.domain = 'mobile_grooming'
  ),
  base as (
    select nullif(btrim(f.address->>'zipCode'), '') as postal
      from public.facilities f
      cross join allowed
     where allowed.ok
       and f.id = p_facility_id
  )
  select jsonb_build_object(
    'enabled', coalesce((s.v->>'enabled')::boolean, false),
    'hasActiveVans', coalesce((
      select bool_or(
               coalesce((van->>'active')::boolean, false)
               and jsonb_array_length(coalesce(van->'assignedStaffIds', '[]'::jsonb)) > 0
             )
        from jsonb_array_elements(coalesce(s.v->'vans', '[]'::jsonb)) as van
    ), false),
    'arrivalWindowMinutes', coalesce((s.v->>'arrivalWindowMinutes')::int, 60),
    'certainAreaEnabled', coalesce((s.v->>'certainAreaEnabled')::boolean, false),
    'serviceAreas', coalesce((
      select jsonb_agg(p.obj order by t.ord)
        from jsonb_array_elements(coalesce(s.v->'serviceAreas', '[]'::jsonb))
             with ordinality as t(a, ord)
        cross join lateral (
          select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) as obj
            from jsonb_each(jsonb_build_object(
              'id',            t.a->'id',
              'name',          t.a->'name',
              'type',          t.a->'type',
              'polygon',       t.a->'polygon',
              'postalCodes',   t.a->'postalCodes',
              'centerAddress', t.a->'centerAddress',
              'centerLat',     t.a->'centerLat',
              'centerLng',     t.a->'centerLng',
              'radiusKm',      t.a->'radiusKm',
              'daysOfWeek',    t.a->'daysOfWeek',
              'active',        t.a->'active',
              'color',         t.a->'color'
            )) as e
           where e.value is not null and e.value <> 'null'::jsonb
        ) as p
       where coalesce((t.a->>'active')::boolean, false)
    ), '[]'::jsonb),
    'travelZones', coalesce((
      select jsonb_agg(p.obj order by t.ord)
        from jsonb_array_elements(coalesce(s.v->'travelZones', '[]'::jsonb))
             with ordinality as t(z, ord)
        cross join lateral (
          select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) as obj
            from jsonb_each(jsonb_build_object(
              'id',              t.z->'id',
              'label',           t.z->'label',
              'maxMiles',        t.z->'maxMiles',
              'surchargeMode',   t.z->'surchargeMode',
              'surchargeAmount', t.z->'surchargeAmount',
              'active',          t.z->'active'
            )) as e
           where e.value is not null and e.value <> 'null'::jsonb
        ) as p
       where coalesce((t.z->>'active')::boolean, false)
    ), '[]'::jsonb),
    'basePostalCode', (select postal from base)
  )
  from (select 1) as one
  left join setting s on true;
$fn$;

comment on function public.offered_mobile_grooming(uuid) is
  'Mobile grooming as a customer may see it: whether van visits are offered, '
  'the arrival window, active service areas and travel zones, and the base '
  'postal code. Vans and staff area schedules are never returned; the '
  'mobile_grooming setting itself is not customer-readable.';

revoke all on function public.offered_mobile_grooming(uuid) from public;
revoke all on function public.offered_mobile_grooming(uuid) from anon;
grant execute on function public.offered_mobile_grooming(uuid) to authenticated;

do $verify$
begin
  if has_function_privilege('anon', 'public.offered_mobile_grooming(uuid)', 'execute') then
    raise exception 'anon can call offered_mobile_grooming';
  end if;
  if not has_function_privilege('authenticated', 'public.offered_mobile_grooming(uuid)', 'execute') then
    raise exception 'a signed-in customer cannot call offered_mobile_grooming';
  end if;
  if 'mobile_grooming' = any(private.customer_visible_setting_domains()) then
    raise exception 'mobile_grooming is on the customer allowlist, which hands over vans and staff schedules';
  end if;
end $verify$;
