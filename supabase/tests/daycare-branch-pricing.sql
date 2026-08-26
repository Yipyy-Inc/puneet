-- ============================================================================
-- A branch's own daycare rate replaces the facility-wide one, and only for
-- that branch -- 20260826160000.
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/daycare-branch-pricing.sql
--
-- One transaction, rolled back.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

do $$
declare
  v_fac         uuid;
  v_branch      uuid;
  v_branch_2    uuid;
  v_facility_id uuid;
  v_count       int;
  v_price       numeric;
begin
  select id into v_fac from public.facilities where legacy_id = '11';

  insert into public.locations (facility_id, name, is_primary)
    values (v_fac, 'Daycare Pricing Probe Branch', false)
    returning id into v_branch;
  insert into public.locations (facility_id, name, is_primary)
    values (v_fac, 'Daycare Pricing Probe Branch 2', false)
    returning id into v_branch_2;

  -- ── a branch's own row, and the trigger derives its facility ─────────────
  --
  -- Unlike boarding's price table, there is no category to derive facility_id
  -- from -- location_id alone already implies it.
  insert into public.daycare_location_prices (location_id, base_price)
    values (v_branch, 55);

  select facility_id into v_facility_id from public.daycare_location_prices
   where location_id = v_branch;
  perform pg_temp.t(1, 'the facility_id trigger derives it from the location',
    v_facility_id = v_fac, coalesce(v_facility_id::text, 'null'));

  select base_price into v_price from public.daycare_location_prices
   where location_id = v_branch;
  perform pg_temp.t(2, 'the branch row keeps its own rate', v_price = 55, v_price::text);

  -- ── a second row for the SAME branch is refused ───────────────────────────
  begin
    insert into public.daycare_location_prices (location_id, base_price)
      values (v_branch, 70);
    perform pg_temp.t(3, 'a second row for the same branch is refused', false,
      'insert succeeded, should have violated daycare_location_price_unique');
  exception when unique_violation then
    perform pg_temp.t(3, 'a second row for the same branch is refused', true, sqlerrm);
  end;

  -- ── a DIFFERENT branch can price daycare independently ────────────────────
  insert into public.daycare_location_prices (location_id, base_price)
    values (v_branch_2, 40);
  select count(*) into strict v_count from public.daycare_location_prices
   where facility_id = v_fac and location_id in (v_branch, v_branch_2);
  perform pg_temp.t(4, 'a second branch can price daycare at once',
    v_count = 2, v_count::text);

  -- ── deleting the branch cascades the price row entirely ───────────────────
  delete from public.locations where id = v_branch;
  select count(*) into strict v_count from public.daycare_location_prices
   where location_id = v_branch;
  perform pg_temp.t(5, 'deleting the branch removes its price row entirely',
    v_count = 0, v_count::text);

  select count(*) into strict v_count from public.daycare_location_prices
   where location_id = v_branch_2;
  perform pg_temp.t(6, 'the OTHER branch''s price survives, untouched',
    v_count = 1, v_count::text);
end $$;

select n, name, case when ok then 'PASS' else 'FAIL' end as result, detail
  from tap order by n;

do $$
declare v_failed int;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise exception '% assertion(s) failed', v_failed;
  end if;
end $$;

rollback;
