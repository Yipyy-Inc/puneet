-- ============================================================================
-- Training attendance by location: bookings, checked-in and checked-out counts
-- per branch reconcile against a direct count over bookings + training_attendance.
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/facility-report-training-attendance-by-location.sql
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
  v_fac         uuid;
  v_from        timestamptz := '2000-01-01';
  v_to          timestamptz := '2100-01-01';
  v_report      jsonb;
  v_row_count   int;
  v_bookings    int;
  v_checked_in  int;
  v_checked_out int;
  v_direct_bookings    int;
  v_direct_checked_in  int;
  v_direct_checked_out int;
begin
  select id into v_fac from public.facilities where legacy_id = '11';

  v_report := public.facility_report_dataset(
    v_fac, 'training-attendance-by-location', v_from, v_to, v_from, v_to);

  perform pg_temp.t(1, 'returns a current array',
    jsonb_typeof(v_report->'current') = 'array', jsonb_typeof(v_report->'current'));

  select coalesce(sum((r->>'bookings')::int), 0),
         coalesce(sum((r->>'checkedIn')::int), 0),
         coalesce(sum((r->>'checkedOut')::int), 0)
    into v_bookings, v_checked_in, v_checked_out
    from jsonb_array_elements(v_report->'current') r;

  select count(distinct b.id) filter (where b.status <> 'cancelled'),
         count(distinct b.id) filter (where b.status <> 'cancelled' and ta.checked_in_at is not null),
         count(distinct b.id) filter (where b.status <> 'cancelled' and ta.checked_out_at is not null)
    into v_direct_bookings, v_direct_checked_in, v_direct_checked_out
    from public.bookings b
    left join public.training_attendance ta on ta.booking_id = b.id
   where b.facility_id = v_fac
     and b.service = 'training'
     and b.start_at >= v_from and b.start_at < v_to;

  perform pg_temp.t(2, 'bookings total reconciles against a direct count',
    v_bookings = v_direct_bookings,
    format('report %s vs direct %s', v_bookings, v_direct_bookings));

  perform pg_temp.t(3, 'checked-in total reconciles against a direct count',
    v_checked_in = v_direct_checked_in,
    format('report %s vs direct %s', v_checked_in, v_direct_checked_in));

  perform pg_temp.t(4, 'checked-out total reconciles against a direct count',
    v_checked_out = v_direct_checked_out,
    format('report %s vs direct %s', v_checked_out, v_direct_checked_out));

  perform pg_temp.t(5, 'checked-out never exceeds checked-in',
    v_checked_out <= v_checked_in,
    format('checked-out %s, checked-in %s', v_checked_out, v_checked_in));

  select count(*) into v_row_count from jsonb_array_elements(v_report->'current');

  -- A window with nothing in it must return an empty array, not null or an
  -- error -- the client always does jsonb_array_elements-shaped work on this.
  perform pg_temp.t(6, 'an empty window returns an empty array, not null',
    (public.facility_report_dataset(
      v_fac, 'training-attendance-by-location', '1900-01-01', '1900-01-02', '1900-01-01', '1900-01-02'
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
