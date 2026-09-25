-- ============================================================================
-- A customer reads the boarding menu they are offered — at ONE business. See
-- 20260924220000_a_customer_reads_the_boarding_menu_they_are_offered.sql and
-- 20260925173458_a_customer_menu_carries_default_add_ons.sql
--
--   bun run test:sql boarding-customer-services
--
-- One transaction, rolled back. It provisions its own two facilities, so it
-- never depends on what any suite has left behind. NO SAVEPOINTS: a
-- `rollback to savepoint` discards the `tap` rows written since it, which
-- silently turned one of seven assertions in `lodging-area-capacity` into a
-- reported PASS on 2026-09-24.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- B0  A client is offered the ACTIVE service and never the draft.
-- B1  The projection carries NO colour, NO pet tags and NOT the STAFF
--     evaluation flag — asserted as ABSENCE, so a column a later change adds
--     has to be allowed in deliberately rather than leaking by default.
-- B2  It DOES carry the UNIT and the LODGING TYPES. The unit is half of the
--     price ("$80" means nothing without "per night"), and the lodging types
--     are what the wizard filters the kennel list by, so withholding either
--     would put the customer's arithmetic on a different footing from the
--     till's. This is the assertion that would catch somebody "tightening"
--     the projection into a bug.
-- B3  The BRANCH price wins, and a service the branch did not override keeps
--     the facility-wide price.
-- B4  THE MERGE IS GONE. This is the defect the migration exists for: the
--     client is a client of BOTH businesses, and each call returns one
--     business's services rather than both merged. Custom services, daycare
--     and grooming each shipped this first; boarding did not.
-- B5  A BLOCKED pet tag removes a service, decided server-side — the tags are
--     the facility's own classification of an animal and are never sent.
-- B6  anon cannot call it.
-- B7  It carries a service's DEFAULT ADD-ONS — what a stay of it gets by its
--     length. They are part of the price the customer is quoted, so a menu
--     without them would put the customer's total on a different footing
--     from the till's. A service with none carries an empty list, not null.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

insert into public.profiles (id, email, full_name) values
  ('user_obsAdmin000000000000000000000', 'obsadmin@yipyy.invalid', 'OBS Admin')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role) values
  ('user_obsAdmin000000000000000000000', 'superadmin')
on conflict (profile_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_obsAdmin000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000d-0000-4000-8000-000000000001'::uuid,
    'Nu Pets', 'nu-pets-obs', 'America/Toronto', 'N Owner', 'nowner@nu.invalid');
  perform public.provision_facility('0000000d-0000-4000-8000-000000000002'::uuid,
    'Xi Kennels', 'xi-kennels-obs', 'America/Toronto', 'X Owner', 'xowner@xik.invalid');
end $$;

reset role;

-- ── The menus, the branches, the prices, the pet ───────────────────────────

do $$
declare
  v_nu      uuid;
  v_xi      uuid;
  v_north   uuid;
  v_suite   uuid;
  v_condo   uuid;
  v_standard uuid;
  v_allin   uuid;
  v_tag_bad uuid;
  v_client  uuid;
  v_pet     uuid;
begin
  select id into v_nu from public.facilities where slug = 'nu-pets-obs';
  select id into v_xi from public.facilities where slug = 'xi-kennels-obs';

  insert into public.locations (facility_id, name, legacy_id, timezone)
  values (v_nu, 'OBS North', 'nu-north-obs', 'America/Toronto')
  returning id into v_north;

  -- Two lodging types, so B2's restriction is a real narrowing rather than a
  -- list that happens to hold everything.
  insert into public.room_categories
    (facility_id, legacy_id, service, name, default_capacity, default_base_price)
  values (v_nu, 'obs-suite', 'boarding', 'OBS Suite', 2, 80)
  returning id into v_suite;

  insert into public.room_categories
    (facility_id, legacy_id, service, name, default_capacity, default_base_price)
  values (v_nu, 'obs-condo', 'boarding', 'OBS Condo', 1, 38)
  returning id into v_condo;

  -- THE THING PHASE 5 MADE POSSIBLE: two priced services in ONE lodging type.
  insert into public.boarding_services
    (facility_id, legacy_id, name, description, price, unit,
     lodging_type_ids, color, requires_evaluation, requires_evaluation_online,
     display_order)
  values (v_nu, 'obs-standard', 'OBS Standard stay', 'A kennel and four walks',
          80, 'night', array[v_suite], '#123456', true, false, 1)
  returning id into v_standard;

  -- B7: two walks a day, every day, once a stay is three nights.
  insert into public.boarding_service_default_addons
    (service_id, facility_id, addon_id, applies_on, quantity_per_day, min_nights)
  values (v_standard, v_nu, 'obs-walk', 'every_day', 2, 3);

  -- Per DAY, unrestricted, so B2 measures both values of `unit` and the
  -- "empty means every type" convention in the same call.
  insert into public.boarding_services
    (facility_id, legacy_id, name, price, unit, display_order)
  values (v_nu, 'obs-allin', 'OBS All-inclusive', 130, 'day', 2)
  returning id into v_allin;

  -- The branch overrides ONE of the two. A partial override is the normal
  -- case and the easy one to get wrong.
  insert into public.boarding_service_location_prices
    (service_id, facility_id, location_id, price)
  values (v_standard, v_nu, null,    80),
         (v_standard, v_nu, v_north, 95),
         (v_allin,    v_nu, null,    130);

  -- A draft, which nobody may be offered.
  insert into public.boarding_services
    (facility_id, legacy_id, name, price, is_active, display_order)
  values (v_nu, 'obs-draft', 'OBS Draft stay', 50, false, 3);

  -- Xi has its own menu, so B4 measures the SCOPING and not an empty list.
  insert into public.boarding_services
    (facility_id, legacy_id, name, price, display_order)
  values (v_xi, 'obs-xi', 'OBS Xi stay', 40, 1);

  -- A behavioural code, and a service that refuses it.
  insert into public.facility_tags (facility_id, entity_type, name, color)
  values (v_nu, 'pet', 'OBS Not for boarding', '#B23B3B')
  returning id into v_tag_bad;

  insert into public.boarding_services
    (facility_id, legacy_id, name, price, blocked_pet_tags, display_order)
  values (v_nu, 'obs-tagged', 'OBS Tag-gated stay', 60,
          array[v_tag_bad::text], 4);

  -- One person, a client of BOTH businesses. This is the whole point of B4.
  insert into public.clients (facility_id, name, email, status, details)
  values (v_nu, 'Priya Raman', 'priya@raman.invalid', 'active', '{}'::jsonb)
  returning id into v_client;
  insert into public.clients (facility_id, name, email, status, details)
  values (v_xi, 'Priya Raman', 'priya@raman.invalid', 'active', '{}'::jsonb);

  insert into public.pets (facility_id, client_id, name, species, breed, status)
  values (v_nu, v_client, 'Kofi', 'Dog', 'Boxer', 'active')
  returning id into v_pet;

  insert into public.facility_tag_assignments
    (facility_id, tag_id, entity_type, entity_id)
  values (v_nu, v_tag_bad, 'pet', v_pet);
end $$;

insert into public.profiles (id, email, full_name) values
  ('user_obsPriya0000000000000000000000', 'priya@raman.invalid', 'Priya Raman')
on conflict (id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_obsPriya0000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.link_client_record('nu-pets-obs');
  perform public.link_client_record('xi-kennels-obs');
end $$;

-- ── B0-B2 the projection ───────────────────────────────────────────────────

do $$
declare offered jsonb; standard jsonb; allin jsonb; v_fac uuid;
begin
  select id into v_fac from public.facilities where slug = 'nu-pets-obs';
  offered := public.offered_boarding_services(v_fac);

  select e into standard from jsonb_array_elements(offered) e
   where e->>'name' = 'OBS Standard stay';
  select e into allin from jsonb_array_elements(offered) e
   where e->>'name' = 'OBS All-inclusive';

  perform pg_temp.t(0,
    'a client is offered the active services and never the draft',
    standard is not null and allin is not null
      and not exists (select 1 from jsonb_array_elements(offered) e
                       where e->>'name' = 'OBS Draft stay'),
    offered::text);

  perform pg_temp.t(1,
    'no colour, no pet tags, and not the STAFF evaluation flag',
    not (standard ? 'color')
      and not (standard ? 'eligiblePetTags')
      and not (standard ? 'blockedPetTags')
      and not (standard ? 'requiresEvaluation')
      and not (standard ? 'legacyId')
      and not (standard ? 'facilityId')
      -- The one that IS sent is the online question, because the flow has to
      -- be able to say why a service is not bookable yet.
      and (standard ? 'requiresEvaluationOnline')
      and (standard->>'requiresEvaluationOnline')::boolean = false,
    coalesce(standard::text, 'no row'));

  perform pg_temp.t(2,
    'the UNIT and the LODGING TYPES are sent — half the price, and the filter',
    standard->>'unit' = 'night'
      and allin->>'unit' = 'day'
      and jsonb_array_length(standard->'lodgingTypeIds') = 1
      -- Empty means EVERY type, the convention this schema uses throughout,
      -- so an unrestricted service must arrive as [] and not as null.
      and allin->'lodgingTypeIds' = '[]'::jsonb,
    format('standard=%s allin=%s',
           coalesce(standard->>'unit', 'null'), coalesce(allin->>'unit', 'null')));
end $$;

-- ── B3 the branch price, with a PARTIAL override ───────────────────────────

do $$
declare
  facility_wide jsonb; at_north jsonb; v_fac uuid; v_north uuid;
  v_std_wide numeric; v_std_north numeric;
  v_all_wide numeric; v_all_north numeric;
begin
  select id into v_fac from public.facilities where slug = 'nu-pets-obs';
  select id into v_north from public.locations where legacy_id = 'nu-north-obs';

  facility_wide := public.offered_boarding_services(v_fac);
  at_north      := public.offered_boarding_services(v_fac, v_north);

  select (e->>'price')::numeric into v_std_wide
    from jsonb_array_elements(facility_wide) e where e->>'name' = 'OBS Standard stay';
  select (e->>'price')::numeric into v_std_north
    from jsonb_array_elements(at_north) e where e->>'name' = 'OBS Standard stay';
  select (e->>'price')::numeric into v_all_wide
    from jsonb_array_elements(facility_wide) e where e->>'name' = 'OBS All-inclusive';
  select (e->>'price')::numeric into v_all_north
    from jsonb_array_elements(at_north) e where e->>'name' = 'OBS All-inclusive';

  perform pg_temp.t(3,
    'the branch price wins where it exists, and the facility price stands where it does not',
    v_std_wide = 80 and v_std_north = 95
      and v_all_wide = 130 and v_all_north = 130,
    format('standard %s/%s, all-inclusive %s/%s (facility/north)',
           v_std_wide, v_std_north, v_all_wide, v_all_north));
end $$;

-- ── B4 the merge, which is the whole point ─────────────────────────────────

do $$
declare
  at_nu jsonb; at_xi jsonb; v_nu uuid; v_xi uuid;
begin
  select id into v_nu from public.facilities where slug = 'nu-pets-obs';
  select id into v_xi from public.facilities where slug = 'xi-kennels-obs';

  at_nu := public.offered_boarding_services(v_nu);
  at_xi := public.offered_boarding_services(v_xi);

  -- One household, two businesses. `/api/boarding/services` scopes with
  -- `activeFacilityIdForStaff()`, which is NULL for somebody holding no
  -- membership, so the query falls through to RLS — and
  -- `private.client_facility_ids()` is `setof uuid`, plural by design.
  perform pg_temp.t(4,
    'a client of two businesses gets ONE business per call, never both merged',
    exists (select 1 from jsonb_array_elements(at_nu) e
             where e->>'name' = 'OBS Standard stay')
      and not exists (select 1 from jsonb_array_elements(at_nu) e
                       where e->>'name' = 'OBS Xi stay')
      and exists (select 1 from jsonb_array_elements(at_xi) e
                   where e->>'name' = 'OBS Xi stay')
      and not exists (select 1 from jsonb_array_elements(at_xi) e
                       where e->>'name' = 'OBS Standard stay'),
    format('nu=%s xi=%s',
           jsonb_array_length(at_nu), jsonb_array_length(at_xi)));
end $$;

-- ── B5 the pet tag, applied server-side ────────────────────────────────────

do $$
declare
  without_pet jsonb; with_pet jsonb; v_fac uuid; v_pet uuid;
begin
  select id into v_fac from public.facilities where slug = 'nu-pets-obs';
  select id into v_pet from public.pets where name = 'Kofi' and facility_id = v_fac;

  without_pet := public.offered_boarding_services(v_fac);
  with_pet    := public.offered_boarding_services(v_fac, null, array[v_pet]);

  -- Naming no pet cannot apply a pet rule, so the gated service is offered;
  -- naming the pet that carries the blocking code removes it. The tag itself
  -- is never sent either way (B1) — the DECISION crosses the wire, not the
  -- facility's classification of the animal.
  perform pg_temp.t(5,
    'a blocked pet tag removes the service, and the tag itself never leaves the server',
    exists (select 1 from jsonb_array_elements(without_pet) e
             where e->>'name' = 'OBS Tag-gated stay')
      and not exists (select 1 from jsonb_array_elements(with_pet) e
                       where e->>'name' = 'OBS Tag-gated stay'),
    format('without pet=%s with pet=%s',
           jsonb_array_length(without_pet), jsonb_array_length(with_pet)));
end $$;

reset role;

-- ── B6 anon ────────────────────────────────────────────────────────────────

do $$
declare v_anon boolean; v_auth boolean;
begin
  select has_function_privilege('anon', p.oid, 'execute'),
         has_function_privilege('authenticated', p.oid, 'execute')
    into v_anon, v_auth
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'offered_boarding_services';

  -- A revoke naming a privilege the role does not hold succeeds SILENTLY and
  -- looks identical to one that worked, which is why this is asserted rather
  -- than assumed. `from public` and `from anon` are different grants and
  -- 20260822610000 exists because one attempt named only one of them.
  perform pg_temp.t(6,
    'anon cannot call it, and authenticated can',
    v_anon = false and v_auth = true,
    format('anon=%s authenticated=%s', v_anon, v_auth));
end $$;

-- ── B7 the default add-ons, which are part of the price ───────────────────

select set_config('request.jwt.claims',
  json_build_object('sub','user_obsPriya0000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare offered jsonb; standard jsonb; allin jsonb; v_fac uuid;
begin
  select id into v_fac from public.facilities where slug = 'nu-pets-obs';
  offered := public.offered_boarding_services(v_fac);
  select e into standard from jsonb_array_elements(offered) e
   where e->>'name' = 'OBS Standard stay';
  select e into allin from jsonb_array_elements(offered) e
   where e->>'name' = 'OBS All-inclusive';

  perform pg_temp.t(7,
    'the default add-ons are sent, and a service with none sends an empty list',
    standard->'defaultAddOns' = jsonb_build_array(jsonb_build_object(
        'addon_id', 'obs-walk', 'applies_on', 'every_day',
        'quantity_per_day', 2, 'min_nights', 3))
      and allin->'defaultAddOns' = '[]'::jsonb,
    format('standard=%s allin=%s',
           coalesce(standard->>'defaultAddOns', 'absent'),
           coalesce(allin->>'defaultAddOns', 'absent')));
end $$;

reset role;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
