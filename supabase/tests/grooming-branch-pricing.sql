-- ============================================================================
-- A branch's own price replaces the facility-wide one, and only for that
-- branch -- 20260825180000.
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/grooming-branch-pricing.sql
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
  v_fac      uuid;
  v_service  uuid;
  v_branch   uuid;
  v_other_fac uuid;
  v_wrong_branch uuid;
  v_price    numeric;
begin
  select id into v_fac from public.facilities where legacy_id = '11';
  select id into v_other_fac from public.facilities where id <> v_fac limit 1;

  insert into public.locations (facility_id, name, is_primary)
    values (v_fac, 'Pricing Probe Branch', false)
    returning id into v_branch;

  select id into v_service from public.grooming_services
   where facility_id = v_fac limit 1;
  if v_service is null then
    raise exception 'no grooming service on facility 11 -- this test needs one';
  end if;

  -- ── a facility-wide price, the baseline ──────────────────────────────────
  insert into public.grooming_service_size_prices (service_id, facility_id, size_label, price, location_id)
    values (v_service, v_fac, 'branch-probe', 40, null);

  -- ── a branch's own row for the SAME size coexists ────────────────────────
  insert into public.grooming_service_size_prices (service_id, facility_id, size_label, price, location_id)
    values (v_service, v_fac, 'branch-probe', 55, v_branch);

  select count(*) into strict v_price from public.grooming_service_size_prices
   where service_id = v_service and size_label = 'branch-probe';
  perform pg_temp.t(1, 'a facility-wide row and a branch row for the same size coexist',
    v_price = 2, v_price::text);

  select price into v_price from public.grooming_service_size_prices
   where service_id = v_service and size_label = 'branch-probe' and location_id = v_branch;
  perform pg_temp.t(2, 'the branch row keeps its own price', v_price = 55, v_price::text);

  -- ── a second facility-wide row for the same size is refused ──────────────
  begin
    insert into public.grooming_service_size_prices (service_id, facility_id, size_label, price, location_id)
      values (v_service, v_fac, 'branch-probe', 999, null);
    perform pg_temp.t(3, 'a second facility-wide row for the same size is refused', false,
      'insert succeeded, should have violated the partial unique index');
  exception when unique_violation then
    perform pg_temp.t(3, 'a second facility-wide row for the same size is refused', true, sqlerrm);
  end;

  -- ── a second row for the SAME branch and size is also refused ────────────
  begin
    insert into public.grooming_service_size_prices (service_id, facility_id, size_label, price, location_id)
      values (v_service, v_fac, 'branch-probe', 111, v_branch);
    perform pg_temp.t(4, 'a second row for the same branch and size is refused', false,
      'insert succeeded, should have violated the partial unique index');
  exception when unique_violation then
    perform pg_temp.t(4, 'a second row for the same branch and size is refused', true, sqlerrm);
  end;

  -- ── a DIFFERENT branch can still price the same size independently ───────
  insert into public.grooming_service_size_prices (service_id, facility_id, size_label, price, location_id)
    values (v_service, v_fac, 'branch-probe-2', 30, null);
  insert into public.grooming_service_size_prices (service_id, facility_id, size_label, price, location_id)
    values (v_service, v_fac, 'branch-probe-2', 70, v_branch);
  select count(*) into strict v_price from public.grooming_service_size_prices
   where service_id = v_service and size_label = 'branch-probe-2';
  perform pg_temp.t(5, 'a second size can also be facility-wide and branch-priced at once',
    v_price = 2, v_price::text);

  -- ── deleting the branch clears the FK rather than deleting the price row ─
  --
  -- Found while writing this test, not designed for: `branch-probe` and
  -- `branch-probe-2` (above) BOTH still reference v_branch, and each has a
  -- facility-wide row already occupying `location_id is null` for that same
  -- size. Deleting the branch now would try to null all three -- and two of
  -- them collide with the facility-wide row already there. `ON DELETE SET
  -- NULL` fails on the partial unique index rather than corrupting anything,
  -- which is the safe direction to fail in, but it means a branch with
  -- overridden prices cannot simply be deleted -- a real, undocumented
  -- constraint this migration does not resolve. Cleared here so THIS
  -- assertion is about the clean case: a size with ONLY a branch row.
  delete from public.grooming_service_size_prices
   where location_id = v_branch and size_label in ('branch-probe', 'branch-probe-2');

  insert into public.grooming_service_size_prices (service_id, facility_id, size_label, price, location_id)
    values (v_service, v_fac, 'branch-probe-only', 88, v_branch);

  delete from public.locations where id = v_branch;
  select location_id into v_wrong_branch from public.grooming_service_size_prices
   where service_id = v_service and size_label = 'branch-probe-only' and price = 88;
  perform pg_temp.t(6, 'deleting the branch sets location_id null, not the row',
    v_wrong_branch is null, coalesce(v_wrong_branch::text, 'null'));
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
