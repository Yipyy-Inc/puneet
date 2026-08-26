-- ============================================================================
-- A branch's own boarding rate replaces the facility-wide one, and only for
-- that branch -- 20260826150000.
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/boarding-branch-pricing.sql
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
  v_category    uuid;
  v_branch      uuid;
  v_branch_2    uuid;
  v_facility_id uuid;
  v_count       int;
  v_price       numeric;
begin
  select id into v_fac from public.facilities where legacy_id = '11';

  insert into public.locations (facility_id, name, is_primary)
    values (v_fac, 'Pricing Probe Branch', false)
    returning id into v_branch;
  insert into public.locations (facility_id, name, is_primary)
    values (v_fac, 'Pricing Probe Branch 2', false)
    returning id into v_branch_2;

  select id into v_category from public.room_categories
   where facility_id = v_fac and service = 'boarding' limit 1;
  if v_category is null then
    raise exception 'no boarding category on facility 11 -- this test needs one';
  end if;

  -- ── the facility-wide default stays where it is, unlike grooming's model ─
  --
  -- There is no "facility-wide row" in this table -- room_categories.
  -- default_base_price already IS that number. This table holds only
  -- overrides, so a fresh category has zero rows here.
  select count(*) into strict v_count from public.room_category_location_prices
   where category_id = v_category;
  perform pg_temp.t(1, 'a boarding category starts with no branch overrides',
    v_count = 0, v_count::text);

  -- ── a branch's own row, and the trigger derives its facility ─────────────
  insert into public.room_category_location_prices (category_id, location_id, price)
    values (v_category, v_branch, 199);

  select facility_id into v_facility_id from public.room_category_location_prices
   where category_id = v_category and location_id = v_branch;
  perform pg_temp.t(2, 'the facility_id trigger derives it from the category',
    v_facility_id = v_fac, coalesce(v_facility_id::text, 'null'));

  select price into v_price from public.room_category_location_prices
   where category_id = v_category and location_id = v_branch;
  perform pg_temp.t(3, 'the branch row keeps its own price', v_price = 199, v_price::text);

  -- ── a second row for the SAME category and branch is refused ─────────────
  begin
    insert into public.room_category_location_prices (category_id, location_id, price)
      values (v_category, v_branch, 250);
    perform pg_temp.t(4, 'a second row for the same category and branch is refused', false,
      'insert succeeded, should have violated room_category_location_price_unique');
  exception when unique_violation then
    perform pg_temp.t(4, 'a second row for the same category and branch is refused', true, sqlerrm);
  end;

  -- ── a DIFFERENT branch can price the same category independently ─────────
  insert into public.room_category_location_prices (category_id, location_id, price)
    values (v_category, v_branch_2, 175);
  select count(*) into strict v_count from public.room_category_location_prices
   where category_id = v_category;
  perform pg_temp.t(5, 'a second branch can price the same category at once',
    v_count = 2, v_count::text);

  -- ── deleting the branch cascades the price row, not just clears it ───────
  --
  -- Unlike grooming's nullable location_id (ON DELETE SET NULL), this table
  -- has no facility-wide row to fall back to, so location_id is NOT NULL and
  -- the FK is ON DELETE CASCADE: the override simply stops existing, and the
  -- category falls back to its own default_base_price -- which was never
  -- touched by any of this.
  delete from public.locations where id = v_branch;
  select count(*) into strict v_count from public.room_category_location_prices
   where category_id = v_category and location_id = v_branch;
  perform pg_temp.t(6, 'deleting the branch removes its price row entirely',
    v_count = 0, v_count::text);

  select count(*) into strict v_count from public.room_category_location_prices
   where category_id = v_category and location_id = v_branch_2;
  perform pg_temp.t(7, 'the OTHER branch''s price survives, untouched',
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
