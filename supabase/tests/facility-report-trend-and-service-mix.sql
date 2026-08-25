-- ============================================================================
-- The revenue trend function and the service-mix-by-location report agree
-- with the reports they're built from the same join as.
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/facility-report-trend-and-service-mix.sql
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
  v_from     timestamptz := '2000-01-01';
  v_to       timestamptz := '2100-01-01';
  v_trend    jsonb;
  v_mix      jsonb;
  v_by_loc   jsonb;
  v_mix_total numeric;
  v_loc_total numeric;
  v_row      jsonb;
begin
  select id into v_fac from public.facilities where legacy_id = '11';

  -- ── Revenue trend by location ─────────────────────────────────────────
  v_trend := public.facility_revenue_trend_by_location(v_fac, 12);
  perform pg_temp.t(1, 'trend returns an array', jsonb_typeof(v_trend) = 'array');

  if jsonb_array_length(v_trend) > 0 then
    v_row := v_trend->0;
    perform pg_temp.t(2, 'a trend row has month/location/revenue keys',
      (v_row ? 'month') and (v_row ? 'location') and (v_row ? 'revenue'));
  else
    perform pg_temp.t(2, 'a trend row has month/location/revenue keys (empty, skipped)', true);
  end if;

  -- Zero months back to before any booking could exist -- must not error,
  -- must return an array.
  perform pg_temp.t(3, 'a window with nothing in it is an empty array, not null',
    public.facility_revenue_trend_by_location(v_fac, 1) is not null);

  -- ── Service mix by location vs. revenue by location ─────────────────────
  v_mix := public.facility_report_dataset(
    v_fac, 'service-mix-by-location', v_from, v_to, v_from, v_to);
  v_by_loc := public.facility_report_dataset(
    v_fac, 'revenue-by-location', v_from, v_to, v_from, v_to);

  perform pg_temp.t(4, 'service-mix-by-location has no invented "hours" key',
    not (v_mix ? 'hours'));

  select coalesce(sum((r->>'revenue')::numeric), 0) into v_mix_total
    from jsonb_array_elements(v_mix->'current') r;
  select coalesce(sum((r->>'revenue')::numeric), 0) into v_loc_total
    from jsonb_array_elements(v_by_loc->'current') r;

  perform pg_temp.t(5, 'summed across (service, location) equals summed across location alone',
    v_mix_total = v_loc_total,
    format('service-mix %s vs revenue-by-location %s', v_mix_total, v_loc_total));
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
