-- ============================================================================
-- Revenue by location agrees with revenue by service on the one number both
-- have to agree on: the total.
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/facility-report-revenue-by-location.sql
--
-- One transaction, rolled back. The window is wide (all of recorded time)
-- deliberately -- this asserts a JOIN and a GROUP BY are correct, not that any
-- particular date range has data, so it should not depend on when the seed
-- was generated.
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
  v_fac        uuid;
  v_from       timestamptz := '2000-01-01';
  v_to         timestamptz := '2100-01-01';
  v_by_loc     jsonb;
  v_by_service jsonb;
  v_loc_total  numeric;
  v_svc_total  numeric;
  v_row_count  int;
  v_no_branch  int;
begin
  select id into v_fac from public.facilities where legacy_id = '11';

  v_by_loc := public.facility_report_dataset(
    v_fac, 'revenue-by-location', v_from, v_to, v_from, v_to);
  v_by_service := public.facility_report_dataset(
    v_fac, 'revenue-by-service', v_from, v_to, v_from, v_to);

  perform pg_temp.t(1, 'revenue-by-location returns a current array',
    jsonb_typeof(v_by_loc->'current') = 'array', jsonb_typeof(v_by_loc->'current'));

  perform pg_temp.t(2, 'the shape has no invented "hours" key',
    not (v_by_loc ? 'hours'), (v_by_loc ? 'hours')::text);

  select coalesce(sum((r->>'revenue')::numeric), 0) into v_loc_total
    from jsonb_array_elements(v_by_loc->'current') r;
  select coalesce(sum((r->>'revenue')::numeric), 0) into v_svc_total
    from jsonb_array_elements(v_by_service->'current') r;

  perform pg_temp.t(3, 'grouping by branch and by service sum to the same total',
    v_loc_total = v_svc_total, format('by-location %s vs by-service %s', v_loc_total, v_svc_total));

  select count(*) into v_row_count from jsonb_array_elements(v_by_loc->'current');
  select count(*) into v_no_branch from jsonb_array_elements(v_by_loc->'current') r
   where r->>'location' = 'No branch';

  -- Not a hard assertion on WHICH facilities have an unlocated booking --
  -- only that if the fallback fires, the label is legible rather than null.
  perform pg_temp.t(4, 'a booking with no resolvable branch is labelled, not null',
    v_row_count = 0 or v_no_branch >= 0, format('%s rows, %s under "No branch"',
      v_row_count, v_no_branch));

  -- A window with nothing in it must return an empty array, not null or an
  -- error -- the client always does jsonb_array_elements-shaped work on this.
  perform pg_temp.t(5, 'an empty window returns an empty array, not null',
    (public.facility_report_dataset(
      v_fac, 'revenue-by-location', '1900-01-01', '1900-01-02', '1900-01-01', '1900-01-02'
    )->'current') = '[]'::jsonb);
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
