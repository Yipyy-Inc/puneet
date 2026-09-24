-- ============================================================================
-- A customer reads the grooming menu they are offered — at ONE business. See
-- 20260924160000_a_customer_reads_the_grooming_menu_they_are_offered.sql
--
--   bun run test:sql grooming-customer-services
--
-- One transaction, rolled back. It provisions its own two facilities, so it
-- never depends on what any suite has left behind.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- G0  A client is offered the ACTIVE service and never the draft.
-- G1  The projection carries NO colour, NO required skill level, NO per-day
--     cap and NO cross-branch breakdown — asserted as ABSENCE, so a column a
--     later change adds has to be allowed in deliberately rather than leaking
--     by default.
-- G2  It DOES carry what the price is made of. A quote a customer cannot
--     reconstruct is worse than one they can argue with, so the coat
--     adjustments, the matted surcharge and the booking notice are kept.
-- G3  The BRANCH price wins per SIZE, and a size the branch did not override
--     keeps the facility-wide price. This is the money assertion: partial
--     overrides are the normal case and the easy one to get wrong.
-- G4  A client is offered NOTHING at a facility they are not a client of —
--     the same answer as an empty menu, so the function does not confirm
--     which facilities exist.
-- G5  THE MERGE IS GONE. This is the defect the migration exists for: the
--     client is a client of BOTH businesses, and each call returns one
--     business's services rather than both merged.
-- G6  anon cannot call it.
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
  ('user_ogsAdmin000000000000000000000', 'ogsadmin@yipyy.invalid', 'OGS Admin')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role) values
  ('user_ogsAdmin000000000000000000000', 'superadmin')
on conflict (profile_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_ogsAdmin000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000c-0000-4000-8000-000000000001'::uuid,
    'Iota Pets', 'iota-pets-ogs', 'America/Toronto', 'I Owner', 'iowner@iota.invalid');
  perform public.provision_facility('0000000c-0000-4000-8000-000000000002'::uuid,
    'Kappa Pets', 'kappa-pets-ogs', 'America/Toronto', 'K Owner', 'kowner@kappa.invalid');
end $$;

reset role;

-- ── The menus, the branches and the prices ─────────────────────────────────

do $$
declare
  v_iota  uuid;
  v_kappa uuid;
  v_north uuid;
  v_full  uuid;
begin
  select id into v_iota  from public.facilities where slug = 'iota-pets-ogs';
  select id into v_kappa from public.facilities where slug = 'kappa-pets-ogs';

  insert into public.locations (facility_id, name, legacy_id, timezone)
  values (v_iota, 'OGS North', 'iota-north-ogs', 'America/Toronto')
  returning id into v_north;

  insert into public.grooming_services
    (facility_id, name, description, base_price, duration_min,
     coat_adjustment_mode, matted_surcharge_default, required_skill_level,
     max_per_day, color, min_booking_notice_hours, display_order)
  values (v_iota, 'OGS Full groom', 'Bath, cut and nails', 70, 90,
          'flat', 15, 'senior', 4, '#654321', 24, 1)
  returning id into v_full;

  -- Facility-wide for all four sizes; the branch overrides only TWO of them.
  -- A partial override is the normal case and the one a naive join gets wrong.
  insert into public.grooming_service_size_prices
    (service_id, location_id, size_label, price, duration_min)
  values (v_full, null, 'small',  70,  90),
         (v_full, null, 'medium', 85,  105),
         (v_full, null, 'large',  100, 120),
         (v_full, null, 'giant',  120, 150),
         (v_full, v_north, 'small',  95,  90),
         (v_full, v_north, 'medium', 110, 105);

  -- A draft, which nobody may be offered.
  insert into public.grooming_services
    (facility_id, name, base_price, duration_min, is_active, display_order)
  values (v_iota, 'OGS Draft groom', 50, 60, false, 2);

  -- Kappa has its own menu, so G5 measures the SCOPING and not an empty list.
  insert into public.grooming_services
    (facility_id, name, base_price, duration_min, display_order)
  values (v_kappa, 'OGS Kappa groom', 40, 45, 1);

  -- One person, a client of BOTH businesses. This is the whole point.
  insert into public.clients (facility_id, name, email, status, details)
  values (v_iota, 'Amara Osei', 'amara@osei.invalid', 'active', '{}'::jsonb);
  insert into public.clients (facility_id, name, email, status, details)
  values (v_kappa, 'Amara Osei', 'amara@osei.invalid', 'active', '{}'::jsonb);
end $$;

insert into public.profiles (id, email, full_name) values
  ('user_ogsAmara0000000000000000000000', 'amara@osei.invalid', 'Amara Osei')
on conflict (id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_ogsAmara0000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.link_client_record('iota-pets-ogs');
  perform public.link_client_record('kappa-pets-ogs');
end $$;

-- ── G0-G2 the projection ───────────────────────────────────────────────────

do $$
declare offered jsonb; groom jsonb; v_fac uuid;
begin
  select id into v_fac from public.facilities where slug = 'iota-pets-ogs';
  offered := public.offered_grooming_services(v_fac);

  select e into groom from jsonb_array_elements(offered) e
   where e->>'name' = 'OGS Full groom';

  perform pg_temp.t(0,
    'a client is offered the active service and never the draft',
    groom is not null
      and not exists (select 1 from jsonb_array_elements(offered) e
                       where e->>'name' = 'OGS Draft groom'),
    offered::text);

  perform pg_temp.t(1,
    'no colour, no required skill level, no per-day cap, no cross-branch breakdown',
    not (groom ? 'color')
      and not (groom ? 'requiredSkillLevel')
      and not (groom ? 'maxPerDay')
      and not (groom ? 'locationPricing')
      and not (groom ? 'legacyId')
      and not (groom ? 'facilityId'),
    coalesce(groom::text, 'no row'));

  perform pg_temp.t(2,
    'but it does carry what the price is made of, and the booking notice',
    (groom->>'mattedSurchargeDefault')::numeric = 15
      and groom->>'coatAdjustmentMode' = 'flat'
      and (groom->>'minBookingNoticeHours')::int = 24
      and (groom->>'basePrice')::numeric = 70,
    coalesce(groom::text, 'no row'));
end $$;

-- ── G3 the branch price, per size, with a PARTIAL override ─────────────────

do $$
declare
  facility_wide jsonb; at_north jsonb; v_fac uuid; v_north uuid;
begin
  select id into v_fac from public.facilities where slug = 'iota-pets-ogs';
  select id into v_north from public.locations where legacy_id = 'iota-north-ogs';

  select e->'sizePricing' into facility_wide
    from jsonb_array_elements(public.offered_grooming_services(v_fac)) e
   where e->>'name' = 'OGS Full groom';

  select e->'sizePricing' into at_north
    from jsonb_array_elements(public.offered_grooming_services(v_fac, v_north)) e
   where e->>'name' = 'OGS Full groom';

  perform pg_temp.t(3,
    'the branch price wins per size, and a size it did not override keeps the facility one',
    (facility_wide->>'small')::numeric  = 70
      and (facility_wide->>'giant')::numeric = 120
      -- Overridden at North.
      and (at_north->>'small')::numeric  = 95
      and (at_north->>'medium')::numeric = 110
      -- NOT overridden at North, so the facility-wide price stands.
      and (at_north->>'large')::numeric  = 100
      and (at_north->>'giant')::numeric  = 120,
    format('facility=%s north=%s', facility_wide::text, at_north::text));
end $$;

-- ── G4-G5 one business per call, never both merged ─────────────────────────

do $$
declare
  iota jsonb; kappa jsonb; v_iota uuid; v_kappa uuid; v_stranger uuid;
begin
  select id into v_iota  from public.facilities where slug = 'iota-pets-ogs';
  select id into v_kappa from public.facilities where slug = 'kappa-pets-ogs';

  iota  := public.offered_grooming_services(v_iota);
  kappa := public.offered_grooming_services(v_kappa);

  -- A facility this person is a client of NEITHER. provision one on the fly
  -- would need the admin, so the demo facility stands in: Amara is not a
  -- client there, and it certainly exists, which is the point of G4 — the
  -- answer must be the same as for a facility with nothing on offer.
  select id into v_stranger from public.facilities
   where id <> v_iota and id <> v_kappa
     and id not in (select facility_id from public.clients c
                     where c.email = 'amara@osei.invalid')
   limit 1;

  perform pg_temp.t(4,
    'a client is offered nothing at a facility they are not a client of',
    v_stranger is null
      or public.offered_grooming_services(v_stranger) = '[]'::jsonb,
    coalesce(public.offered_grooming_services(v_stranger)::text, 'no other facility'));

  -- THE DEFECT THIS MIGRATION EXISTS FOR. Amara is a client of both, so the
  -- staff route's RLS-only read handed her both menus in one list. Each call
  -- here answers for ONE business.
  perform pg_temp.t(5,
    'a client of two businesses gets one menu per call, never both merged',
    exists (select 1 from jsonb_array_elements(iota) e
             where e->>'name' = 'OGS Full groom')
      and not exists (select 1 from jsonb_array_elements(iota) e
                       where e->>'name' = 'OGS Kappa groom')
      and exists (select 1 from jsonb_array_elements(kappa) e
                   where e->>'name' = 'OGS Kappa groom')
      and not exists (select 1 from jsonb_array_elements(kappa) e
                       where e->>'name' = 'OGS Full groom'),
    format('iota=%s kappa=%s', iota::text, kappa::text));
end $$;

reset role;

-- ── G6 anon ────────────────────────────────────────────────────────────────

do $$
begin
  perform pg_temp.t(6,
    'anon cannot call offered_grooming_services',
    not has_function_privilege('anon',
          'public.offered_grooming_services(uuid,uuid)', 'execute')
      and has_function_privilege('authenticated',
          'public.offered_grooming_services(uuid,uuid)', 'execute'));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
