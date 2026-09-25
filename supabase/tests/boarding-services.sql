-- ============================================================================
-- A boarding service is a menu item, not a kennel. See
-- 20260924210000_a_boarding_service_is_a_menu_item_not_a_kennel.sql
--
--   bun run test:sql boarding-services
--
-- One transaction, rolled back, on a facility it provisions for itself. It
-- reads no live rows since S0 was retired (below).
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- S0  RETIRED 2026-09-25 — the migration carried every priced class. It did,
--     and the record of it is where the assertion was, below.
-- S1  THE THING THAT WAS IMPOSSIBLE BEFORE: two priced services in ONE lodging
--     type. The whole point of splitting the row.
-- S2  Empty `lodging_type_ids` means EVERY type, not none — the convention
--     this schema uses for every eligibility array.
-- S3  ONE facility-wide price per service, enforced by a PARTIAL unique index.
--     A plain unique(service_id, location_id) would admit any number, because
--     Postgres treats every null as distinct.
-- S4  A branch may price the same service once, and only once.
-- S5  The price row's facility is DERIVED by a trigger, never supplied — a
--     caller naming another facility is overwritten, not trusted.
-- S6  THE PERMISSION SPLIT: the service is `manage_services` and the price is
--     `manage_RATES`. Creating a menu and pricing it are different jobs.
-- S7  A default add-on is billed per MoéGo's four schedules and no others.
-- S8  No policy is open to anon, and RLS is on for all four tables.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

-- ── S0, retired 2026-09-25: the migration carried every priced class ──────
--
-- It asserted that every priced boarding class had a service at the same
-- price, per night, bookable in its own class — the promise of
-- 20260924210000, which had 459 boarding bookings resting on those rates.
--
-- THE MIGRATION KEPT IT. S0 passed in CI the day it ran, and again by hand on
-- 2026-09-25: 10 priced classes, 0 without a service, 0 carried wrongly.
--
-- WHY IT IS NOT A STANDING CHECK. It compared the migration's promise against
-- TODAY's rows, and those are the facility's to change. Each of these fails
-- it, and none is a migration fault:
--
--   - a new priced kennel class — nothing creates its service, by design;
--   - a service repriced, or a kennel class repriced on the rooms screen;
--   - a service opened to more kennels, or charged by the day;
--   - a migrated service deleted from the menu (a hard delete).
--
-- Neither table records edits (no trigger stamps `updated_at`), so no scoping
-- can tell a lost rate from a changed one. And `sql` gates the image: on
-- 2026-09-25 a kennel class `rooms-admin` had left behind failed S0, and
-- `be16ac28` passed every other gate and did not deploy. The day the facility
-- added a priced class the same way, every deploy would have stopped.
--
-- To measure it again by hand — expect a non-zero count once the facility has
-- changed its menu, and read each one before calling it a loss:
--
--   select count(*) filter (where s.id is null) as without_a_service,
--          count(*) filter (where s.id is not null
--                             and (s.price is distinct from rc.default_base_price
--                                  or s.unit <> 'night'
--                                  or not (rc.id = any (s.lodging_type_ids))))
--            as differing
--     from public.room_categories rc
--     left join public.boarding_services s
--       on s.facility_id = rc.facility_id and s.legacy_id = 'svc-' || rc.legacy_id
--    where rc.service = 'boarding' and rc.default_base_price is not null;

-- ── A facility of this file's own for everything else ─────────────────────

insert into public.profiles (id, email, full_name) values
  ('user_bsvAdmin000000000000000000000', 'bsvadmin@yipyy.invalid', 'BSV Admin')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role) values
  ('user_bsvAdmin000000000000000000000', 'superadmin')
on conflict (profile_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_bsvAdmin000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000b-0000-4000-8000-00000000000b'::uuid,
    'Xi Pets', 'xi-pets-bsv', 'America/Toronto', 'X Owner', 'xowner@xi.invalid');
end $$;

reset role;

-- ── S1-S2 two services in one class, and empty meaning all ────────────────

do $$
declare
  v_fac uuid; v_suite uuid; v_basic uuid; v_lux uuid; v_any uuid;
begin
  select id into v_fac from public.facilities where slug = 'xi-pets-bsv';

  insert into public.room_categories
    (facility_id, legacy_id, service, name, default_capacity, default_base_price)
  values (v_fac, 'bsv-suite', 'boarding', 'BSV Suite', 2, 80)
  returning id into v_suite;

  -- THE THING THAT WAS IMPOSSIBLE. Two priced menu items in ONE kennel class:
  -- when the class WAS the rate, "Standard stay" and "All-inclusive" in the
  -- same suite could not both exist.
  insert into public.boarding_services
    (facility_id, legacy_id, name, price, unit, lodging_type_ids)
  values (v_fac, 'bsv-standard', 'BSV Standard stay', 80, 'night', array[v_suite])
  returning id into v_basic;

  insert into public.boarding_services
    (facility_id, legacy_id, name, price, unit, lodging_type_ids)
  values (v_fac, 'bsv-allin', 'BSV All-inclusive', 130, 'night', array[v_suite])
  returning id into v_lux;

  -- And one restricted to nothing, which means everything.
  insert into public.boarding_services
    (facility_id, legacy_id, name, price, unit)
  values (v_fac, 'bsv-any', 'BSV Anywhere', 60, 'day')
  returning id into v_any;

  perform pg_temp.t(1,
    'two priced services may share ONE lodging type — impossible while the class was the rate',
    v_basic is not null and v_lux is not null
      and (select count(*) from public.boarding_services
            where facility_id = v_fac and v_suite = any(lodging_type_ids)) = 2,
    'BSV Standard stay and BSV All-inclusive, both in BSV Suite');

  perform pg_temp.t(2,
    'an empty lodging_type_ids means EVERY type, and a day unit is storable',
    (select cardinality(lodging_type_ids) from public.boarding_services where id = v_any) = 0
      and (select unit::text from public.boarding_services where id = v_any) = 'day',
    'empty = no restriction, the convention every eligibility array here uses');
end $$;

-- ── S3-S5 the prices ──────────────────────────────────────────────────────

do $$
declare
  v_fac uuid; v_svc uuid; v_loc uuid; v_other uuid; v_ok boolean; v_derived uuid;
begin
  select id into v_fac from public.facilities where slug = 'xi-pets-bsv';
  select id into v_svc from public.boarding_services
   where facility_id = v_fac and legacy_id = 'bsv-standard';

  insert into public.locations (facility_id, name, legacy_id, timezone)
  values (v_fac, 'BSV North', 'bsv-north', 'America/Toronto') returning id into v_loc;

  insert into public.boarding_service_location_prices (service_id, facility_id, location_id, price)
  values (v_svc, v_fac, null, 80);

  begin
    insert into public.boarding_service_location_prices (service_id, facility_id, location_id, price)
    values (v_svc, v_fac, null, 95);
    v_ok := false;
  exception when unique_violation then
    v_ok := true;
  end;
  perform pg_temp.t(3,
    'a service has ONE facility-wide price, enforced by a partial unique index',
    v_ok,
    'a plain unique(service_id, location_id) would admit any number — every null is distinct');

  insert into public.boarding_service_location_prices (service_id, facility_id, location_id, price)
  values (v_svc, v_fac, v_loc, 95);

  begin
    insert into public.boarding_service_location_prices (service_id, facility_id, location_id, price)
    values (v_svc, v_fac, v_loc, 99);
    v_ok := false;
  exception when unique_violation then
    v_ok := true;
  end;
  perform pg_temp.t(4,
    'a branch prices a service once, and only once',
    v_ok, 'the second partial index');

  -- A caller naming SOMEBODY ELSE'S facility is overwritten, not trusted.
  select id into v_other from public.facilities where id <> v_fac limit 1;
  insert into public.boarding_service_location_prices (service_id, facility_id, location_id, price)
  values (v_svc, coalesce(v_other, v_fac), null, 70)
  on conflict do nothing;

  select facility_id into v_derived from public.boarding_service_location_prices
   where service_id = v_svc and location_id is null;

  perform pg_temp.t(5,
    'the price row facility is DERIVED from the service, never taken from the caller',
    v_derived = v_fac,
    format('claimed %s, stored %s', coalesce(v_other::text, '(none)'), v_derived));
end $$;

-- ── S6 the permission split ───────────────────────────────────────────────

do $$
declare v_svc_perm text; v_price_perm text; v_addon_perm text;
begin
  select pg_get_expr(polwithcheck, polrelid) into v_svc_perm
    from pg_policy where polname = 'boarding_services_insert';
  select pg_get_expr(polwithcheck, polrelid) into v_price_perm
    from pg_policy where polname = 'boarding_service_prices_insert';
  select pg_get_expr(polwithcheck, polrelid) into v_addon_perm
    from pg_policy where polname = 'boarding_default_addons_write';

  perform pg_temp.t(6,
    'the menu is manage_services and the price is manage_RATES — different jobs',
    v_svc_perm like '%manage_services%'
      and v_price_perm like '%manage_rates%'
      and v_addon_perm like '%manage_rates%',
    format('service=%s price=%s addon=%s',
           coalesce(v_svc_perm, 'missing'), coalesce(v_price_perm, 'missing'),
           coalesce(v_addon_perm, 'missing')));
end $$;

-- ── S7 default add-ons ────────────────────────────────────────────────────

do $$
declare v_fac uuid; v_svc uuid; v_ok boolean; v_dup boolean;
begin
  select id into v_fac from public.facilities where slug = 'xi-pets-bsv';
  select id into v_svc from public.boarding_services
   where facility_id = v_fac and legacy_id = 'bsv-allin';

  insert into public.boarding_service_default_addons
    (service_id, facility_id, addon_id, applies_on, quantity_per_day, min_nights)
  values (v_svc, v_fac, 'addon-nail-trim', 'last_day', 1, 3);

  -- MoeGo's four schedules and no others.
  begin
    insert into public.boarding_service_default_addons
      (service_id, facility_id, addon_id, applies_on)
    values (v_svc, v_fac, 'addon-walk', 'whenever_we_feel_like_it');
    v_ok := false;
  exception when check_violation then
    v_ok := true;
  end;

  begin
    insert into public.boarding_service_default_addons
      (service_id, facility_id, addon_id, applies_on)
    values (v_svc, v_fac, 'addon-nail-trim', 'last_day');
    v_dup := false;
  exception when unique_violation then
    v_dup := true;
  end;

  perform pg_temp.t(7,
    'a default add-on takes one of MoeGo four schedules, and is attached once',
    v_ok and v_dup,
    format('bad schedule refused=%s duplicate refused=%s', v_ok, v_dup));
end $$;

-- ── S8 anon ───────────────────────────────────────────────────────────────

do $$
declare v_open integer; v_norls integer;
begin
  select count(*) into v_open
    from pg_policy p join pg_class c on c.oid = p.polrelid
   where c.relname in ('boarding_services', 'boarding_service_categories',
                       'boarding_service_location_prices',
                       'boarding_service_default_addons')
     and 'anon' = any (select rolname from pg_roles where oid = any (p.polroles));

  select count(*) into v_norls
    from pg_class c
   where c.relname in ('boarding_services', 'boarding_service_categories',
                       'boarding_service_location_prices',
                       'boarding_service_default_addons')
     and not c.relrowsecurity;

  -- Deliberately NOT has_table_privilege('anon', …): that is true database-wide
  -- on stock Supabase, so it measures the grant rather than this table's
  -- safety. What protects these rows is that every policy is `to authenticated`.
  perform pg_temp.t(8,
    'no policy on the four tables is open to anon, and RLS is on for all of them',
    v_open = 0 and v_norls = 0,
    format('%s anon policy(ies), %s table(s) without RLS', v_open, v_norls));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
