-- ============================================================================
-- A custom service is the facility's — and a customer is shown the ones on
-- offer, not the facility's working notes.
--
-- ── WHAT IT REPLACES ──────────────────────────────────────────────────────
--
-- Custom services lived in the browser's localStorage, seeded from a fixture,
-- so every facility showed the same invented services and the customer
-- booking flow offered them to customers of facilities that had never heard
-- of them. They are the `custom_services` settings domain now
-- (src/lib/settings/custom-services.ts), written by the facility like any
-- other setting.
--
-- ── WHY A FUNCTION, NOT THE ALLOWLIST ─────────────────────────────────────
--
-- `private.customer_visible_setting_domains()` hands a client the whole ROW,
-- and a module carries fields that are the facility's own: `internalNotes`
-- ("check van gas level before each route"), `disableReason`, the staff
-- assignment rules, the overbooking buffer, the publish workflow. So the
-- domain stays OFF the allowlist, and a customer reads this projection:
--
--   * only ACTIVE modules that are open to ONLINE booking — a draft, a
--     disabled service or a phone-only one is not on offer;
--   * only the fields the booking flow draws: identity, description, the
--     calendar, check-in, stay, online-booking rules, prices, the pre-arrival
--     form, evaluation, and the service area; of the staff assignment, only
--     whether a staff member is auto-assigned.
--
-- It is an ALLOWLIST of keys, not a list of keys to remove: a field a later
-- screen adds to the module is private until somebody decides otherwise here.
--
-- ── WHO ───────────────────────────────────────────────────────────────────
--
-- A client of the facility, a member of it, or a platform admin. Anybody
-- else gets an empty list — the same answer as a facility with nothing on
-- offer, and deliberately so: the function does not confirm which facilities
-- exist.
-- ============================================================================

create or replace function public.offered_custom_services(p_facility_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $fn$
  select coalesce(jsonb_agg(offered.module order by offered.ord), '[]'::jsonb)
    from (
      select t.ord,
             (select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
                from jsonb_each(jsonb_build_object(
                  'id',                    t.m->'id',
                  'slug',                  t.m->'slug',
                  'name',                  t.m->'name',
                  'sidebarLabel',          t.m->'sidebarLabel',
                  'icon',                  t.m->'icon',
                  'iconColor',             t.m->'iconColor',
                  'iconColorTo',           t.m->'iconColorTo',
                  'category',              t.m->'category',
                  'description',           t.m->'description',
                  'calendar',              t.m->'calendar',
                  'checkInOut',            t.m->'checkInOut',
                  'stayBased',             t.m->'stayBased',
                  'onlineBooking',         t.m->'onlineBooking',
                  'pricing',               t.m->'pricing',
                  'yipyyGoRequired',       t.m->'yipyyGoRequired',
                  'yipyyGo',               t.m->'yipyyGo',
                  'requiresEvaluation',    t.m->'requiresEvaluation',
                  'evaluationType',        t.m->'evaluationType',
                  'customEvaluationLabel', t.m->'customEvaluationLabel',
                  'geographicRestriction', t.m->'geographicRestriction',
                  'staffAssignment',
                    jsonb_build_object('autoAssign', t.m->'staffAssignment'->'autoAssign'),
                  'status',                t.m->'status'
                )) as e
               where e.value is not null and e.value <> 'null'::jsonb
             ) as module
        from public.facility_settings fs
       cross join lateral jsonb_array_elements(fs.value->'modules')
             with ordinality as t(m, ord)
       where fs.facility_id = p_facility_id
         and fs.domain = 'custom_services'
         and (
           private.is_platform_admin()
           or p_facility_id in (select private.client_facility_ids())
           or p_facility_id in (select private.member_facility_ids_all())
         )
         and t.m->>'status' = 'active'
         and coalesce((t.m->'onlineBooking'->>'enabled')::boolean, false)
    ) as offered;
$fn$;

comment on function public.offered_custom_services(uuid) is
  'The custom services a facility offers online, as a customer may see them: '
  'active, online-bookable modules, projected to an allowlist of keys. The '
  'custom_services setting itself is not customer-readable.';

revoke all on function public.offered_custom_services(uuid) from public;
revoke all on function public.offered_custom_services(uuid) from anon;
grant execute on function public.offered_custom_services(uuid) to authenticated;

do $verify$
begin
  if has_function_privilege('anon', 'public.offered_custom_services(uuid)', 'execute') then
    raise exception 'anon can call offered_custom_services';
  end if;
  if not has_function_privilege('authenticated', 'public.offered_custom_services(uuid)', 'execute') then
    raise exception 'a signed-in customer cannot call offered_custom_services';
  end if;
  if 'custom_services' = any(private.customer_visible_setting_domains()) then
    raise exception 'custom_services is on the customer allowlist, which hands over internal notes';
  end if;
end $verify$;
