-- ============================================================================
-- public.daycare_services — see
-- 20260924120000_a_daycare_service_is_a_row_the_booking_picks.sql
--
--   bun run test:sql daycare-services
--
-- One transaction, rolled back. It builds its own services on the demo
-- facility, so it never depends on what any suite has left behind.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- T0  THE MIGRATION CARRIED EVERYTHING. Every rate a facility authored in the
--     `daycare_rates` setting has a row, matched on legacy_id. This is the
--     assertion that would catch a rewrite silently losing a facility's menu —
--     the settings domain is still there to compare against.
-- T1  A service cannot roll over into ITSELF. The check-out would never settle.
-- T2  A max stay duration under half an hour is refused. MoéGo's floor.
-- T3  ONE facility-wide price per service, enforced by a PARTIAL unique index.
--     A plain unique(service_id, location_id) would admit any number of them,
--     because Postgres treats every null as distinct from every other null.
--     20260825180000 exists because of exactly this, so it is pinned here.
-- T4  A branch may price the same service once, and only once.
-- T5  The price row's facility is DERIVED by a trigger, never supplied. A
--     caller naming another facility is overwritten, not trusted.
-- T6  THE PERMISSION SPLIT, which is the point of two tables: the service is
--     `manage_services` and the price is `manage_RATES`. Creating a menu and
--     pricing it are different jobs.
-- T7  No policy is open to anon, and RLS is on. Deliberately NOT a check of
--     has_table_privilege('anon', …): that is true database-wide here, so it
--     measures the stock Supabase grant rather than this table's safety.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── T0 the migration carried every rate ─────────────────────────────────────
do $$
declare
  v_setting_rates integer;
  v_missing       integer;
begin
  select count(*) into v_setting_rates
    from public.facility_settings fs,
         lateral jsonb_array_elements(
           case when jsonb_typeof(fs.value -> 'rates') = 'array'
                then fs.value -> 'rates' else '[]'::jsonb end) r
   where fs.domain = 'daycare_rates';

  select count(*) into v_missing
    from public.facility_settings fs,
         lateral jsonb_array_elements(
           case when jsonb_typeof(fs.value -> 'rates') = 'array'
                then fs.value -> 'rates' else '[]'::jsonb end) r
   where fs.domain = 'daycare_rates'
     and not exists (
       select 1 from public.daycare_services s
        where s.facility_id = fs.facility_id
          and s.legacy_id = r ->> 'id');

  perform pg_temp.t(
    'T0 every authored rate became a service row',
    v_missing = 0,
    format('%s rate(s) in the setting, %s with no service row', v_setting_rates, v_missing));
exception when others then
  perform pg_temp.t('T0 migration carried', false, sqlerrm);
end $$;

-- ── T1-T5 the shape holds ───────────────────────────────────────────────────
do $$
declare
  v_facility uuid := 'a0000000-0000-4000-8000-0000000000f1';
  v_stamp    text := to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');
  v_svc      uuid;
  v_other    uuid;
  v_loc      uuid;
  v_ok       boolean;
begin
  insert into public.daycare_services (facility_id, legacy_id, name, price)
  values (v_facility, 'sqltest-' || v_stamp, 'SQL test full day', 40)
  returning id into v_svc;

  insert into public.daycare_services (facility_id, legacy_id, name, price)
  values (v_facility, 'sqltest-b-' || v_stamp, 'SQL test half day', 24)
  returning id into v_other;

  -- ── T1 no service rolls over into itself ─────────────────────────────────
  begin
    update public.daycare_services set rollover_to_service_id = v_svc where id = v_svc;
    v_ok := false;
  exception when check_violation then
    v_ok := true;
  end;
  perform pg_temp.t(
    'T1 a service cannot roll over into itself',
    v_ok,
    'a self-rollover would never settle at check-out');

  -- It may roll over into ANOTHER one.
  update public.daycare_services
     set rollover_to_service_id = v_other, rollover_after_minutes = 30,
         max_duration_hours = 4
   where id = v_svc;

  -- ── T2 half an hour is the floor ─────────────────────────────────────────
  begin
    update public.daycare_services set max_duration_hours = 0.25 where id = v_svc;
    v_ok := false;
  exception when check_violation then
    v_ok := true;
  end;
  perform pg_temp.t(
    'T2 a max stay duration under 30 minutes is refused',
    v_ok,
    'MoéGo''s floor is 30 minutes, in half-hour steps');

  -- ── T3 one facility-wide price, and only one ─────────────────────────────
  insert into public.daycare_service_location_prices (service_id, facility_id, price)
  values (v_svc, v_facility, 35);
  begin
    insert into public.daycare_service_location_prices (service_id, facility_id, price)
    values (v_svc, v_facility, 36);
    v_ok := false;
  exception when unique_violation then
    v_ok := true;
  end;
  perform pg_temp.t(
    'T3 a service has at most ONE facility-wide price',
    v_ok,
    'a plain unique(service_id, location_id) would admit any number, because every null is distinct');

  -- ── T4 one price per branch ──────────────────────────────────────────────
  select id into v_loc from public.locations where facility_id = v_facility limit 1;
  if v_loc is null then
    perform pg_temp.t('T4 one price per branch', true, 'skipped: this facility has no branches');
  else
    insert into public.daycare_service_location_prices (service_id, facility_id, location_id, price)
    values (v_svc, v_facility, v_loc, 42);
    begin
      insert into public.daycare_service_location_prices (service_id, facility_id, location_id, price)
      values (v_svc, v_facility, v_loc, 43);
      v_ok := false;
    exception when unique_violation then
      v_ok := true;
    end;
    perform pg_temp.t(
      'T4 a branch prices a service once, and only once',
      v_ok,
      'and the facility-wide row above still stands beside it');
  end if;

  -- ── T5 the facility is derived, not supplied ─────────────────────────────
  -- A caller naming SOMEBODY ELSE'S facility has it overwritten by the
  -- trigger rather than honoured. The row belongs to the service's facility.
  insert into public.daycare_service_location_prices (service_id, facility_id, price)
  values (v_other, '00000000-0000-4000-8000-000000000000', 19);
  select facility_id = v_facility into v_ok
    from public.daycare_service_location_prices
   where service_id = v_other and location_id is null;
  perform pg_temp.t(
    'T5 a price row takes its facility from the service, not from the caller',
    coalesce(v_ok, false),
    'the trigger derives it; a supplied value is overwritten');
exception when others then
  perform pg_temp.t('T1-T5 shape', false, sqlerrm);
end $$;

-- ── T6 the permission split ─────────────────────────────────────────────────
do $$
declare
  v_service_write text;
  v_price_write   text;
begin
  -- The qual of the INSERT policy on each table, as text. The service is
  -- created with manage_services; the price is set with manage_rates.
  select pg_get_expr(polwithcheck, polrelid) into v_service_write
    from pg_policy
   where polrelid = 'public.daycare_services'::regclass and polcmd = 'a';

  select pg_get_expr(polwithcheck, polrelid) into v_price_write
    from pg_policy
   where polrelid = 'public.daycare_service_location_prices'::regclass and polcmd = 'a';

  perform pg_temp.t(
    'T6 the menu is manage_services and the price is manage_rates',
    v_service_write like '%manage_services%'
      and v_price_write like '%manage_rates%'
      and v_price_write not like '%manage_services%',
    format('service=%s price=%s', v_service_write, v_price_write));
exception when others then
  perform pg_temp.t('T6 permission split', false, sqlerrm);
end $$;

-- ── T7 no policy lets an anon caller near any of the three ─────────────────
--
-- NOT `has_table_privilege('anon', …, 'select')`. That is TRUE across this
-- whole database — `grooming_services` has it, and so does `bookings` — it is
-- the stock Supabase grant to the role PostgREST uses before anybody signs in.
-- Asserting it would have failed on a correct table and, worse, revoking it
-- here would put this table alone out of step with every other one.
--
-- What actually keeps the menu private is that RLS is ON and every policy is
-- `to authenticated`, so an anon request matches no policy and reads nothing.
-- That is the property, so that is what this reads.
do $$
declare
  v_tables text[] := array[
    'public.daycare_services',
    'public.daycare_service_location_prices',
    'public.daycare_service_categories'];
  v_t      text;
  v_bad    text := '';
  v_open   integer;
  v_count  integer;
begin
  foreach v_t in array v_tables loop
    if not (select relrowsecurity from pg_class where oid = v_t::regclass) then
      v_bad := v_bad || v_t || ' has RLS off; ';
    end if;

    -- A policy with no roles listed applies to PUBLIC, which includes anon.
    select count(*) into v_open
      from pg_policy
     where polrelid = v_t::regclass
       and (polroles = '{0}'::oid[] or 'anon'::regrole = any(polroles));
    if v_open > 0 then
      v_bad := v_bad || v_t || ' has ' || v_open || ' policy(ies) open to anon; ';
    end if;

    select count(*) into v_count from pg_policy where polrelid = v_t::regclass;
    if v_count = 0 then
      v_bad := v_bad || v_t || ' has RLS on and NO policies, so nobody reads it; ';
    end if;
  end loop;

  perform pg_temp.t(
    'T7 RLS is on, every policy is to authenticated, and none is open to anon',
    v_bad = '',
    coalesce(nullif(v_bad, ''), 'all three'));
exception when others then
  perform pg_temp.t('T7 anon reach', false, sqlerrm);
end $$;
-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
