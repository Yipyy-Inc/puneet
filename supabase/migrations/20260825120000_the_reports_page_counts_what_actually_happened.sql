-- ============================================================================
-- The facility Reports page, answered from the ledger instead of a fixture.
--
-- `/facility/dashboard/reports` opened with `const facilityId = 11` and read
-- `revenueByService()`, `bookingsByPeriod()`, `occupancy()` and
-- `clientMetrics()` from `src/lib/report-data-sources.ts` -- which reads
-- `@/data/bookings`, `@/data/retail` and friends. Every figure on it was
-- invented, and its own comment claimed they were "derived from the real
-- stores", which was true only if "store" means a TypeScript array.
--
-- That mattered more from 2026-08-24, when the Yipyy Pay Transactions tab began
-- reporting the same kind of number from `public.payments`. Two screens, one
-- right and one invented, and the invented one looks older and more
-- established.
--
-- -- WHAT AN OWNER IS ACTUALLY ASKING -------------------------------------
--
-- Six figures, and each has exactly one honest source:
--
--   bookings        count of bookings STARTING in the window. Not created in
--                   it -- a booking made in March for a July stay belongs to
--                   July, which is the month whose occupancy it consumes.
--   revenue         `payments`, net of refunds. NOT `bookings.total_cost`:
--                   what a booking was quoted at and what was actually taken
--                   are different numbers, and only one of them is money.
--   occupancy       BOARDING room-nights over available room-nights, from
--                   `facility_rooms.capacity`.
--
--                   Boarding only, and that is not a simplification. A grooming
--                   appointment takes forty minutes and occupies no room
--                   overnight; counting it as a room-night made this facility
--                   read 0.11% instead of 0.10%, which is wrong in a way that
--                   is invisible because both look like nothing.
--
--                   `boarding_stays` is NOT the source, despite being the table
--                   that links a booking to a room: it is EMPTY, zero rows, so
--                   no stay has ever been assigned one. The fixture this
--                   replaces never used rooms either -- it counted boarding
--                   bookings overlapping each day against a constant. Same
--                   model, real capacity.
--   activeClients   clients with a booking starting in the window.
--   retentionRate   of the clients active in the PREVIOUS window, how many
--                   came back in this one. A rate needs a denominator from
--                   somewhere else, which is why it takes both windows.
--   aov             revenue / bookings, computed here so the page cannot
--                   divide by zero differently than the report does.
--
-- -- CANCELLED BOOKINGS ARE EXCLUDED FROM EVERYTHING BUT THEIR OWN REPORT --
--
-- 361 of this database's 402 bookings are `cancelled`. Counting them as
-- bookings would make every KPI on the page a measure of business that did not
-- happen. They are counted only where they are the subject.
--
-- -- NO-SHOWS ARE NOT HERE, AND THAT IS THE FINDING -----------------------
--
-- There is no `no_show` booking status and no dated no-show event anywhere in
-- this schema. `clients.no_show_count` is a LIFETIME COUNTER -- three, across
-- two clients -- with no date attached to any of them. A "No-Shows in this
-- period" report is therefore not derivable, and the fixture answered it by
-- inventing dates. The report is marked unimplemented rather than given
-- plausible numbers. Recording a no-show is a feature; it is not a conversion.
-- ============================================================================

-- Bookings are read by facility and by start date on every one of these.
create index if not exists bookings_facility_started
  on public.bookings (facility_id, start_at);

create or replace function public.facility_report_kpis(
  p_facility_id uuid,
  p_from        timestamptz,
  p_to          timestamptz,
  p_prev_from   timestamptz,
  p_prev_to     timestamptz
)
returns jsonb
language plpgsql
-- INVOKER, like `facility_takings`. RLS decides which bookings, payments and
-- clients count, so somebody without the permission gets zeros rather than
-- another business's numbers. The route still resolves the facility from the
-- session; this is the second lock.
security invoker
set search_path = ''
as $fn$
declare
  v_capacity  numeric;
  v_result    jsonb;
begin
  -- Total room-nights available per day. A facility with no rooms configured
  -- has no occupancy denominator, and 0 is returned rather than a division by
  -- zero dressed up as 0%.
  select coalesce(sum(capacity), 0) into v_capacity
    from public.facility_rooms
   where facility_id = p_facility_id and active;

  with counted as (
    select
      b.client_id,
      b.start_at,
      b.end_at,
      b.service,
      (b.start_at >= p_from      and b.start_at < p_to)      as in_now,
      (b.start_at >= p_prev_from and b.start_at < p_prev_to) as in_prev
      from public.bookings b
     where b.facility_id = p_facility_id
       and b.status <> 'cancelled'
       and b.start_at >= least(p_from, p_prev_from)
       and b.start_at <  greatest(p_to, p_prev_to)
  ),
  bookings_now as (
    select count(*) as n, count(distinct client_id) as clients
      from counted where in_now
  ),
  bookings_prev as (
    select count(*) as n, count(distinct client_id) as clients
      from counted where in_prev
  ),
  -- Came back: active in BOTH windows. The denominator is the previous
  -- window's clients, so a facility with no history has no retention rate
  -- rather than 100%.
  returning_clients as (
    select count(*) as n from (
      select client_id from counted where in_prev and client_id is not null
      intersect
      select client_id from counted where in_now  and client_id is not null
    ) both_windows
  ),
  money_now as (
    select coalesce(sum(grand_total), 0) as net
      from public.payments
     where facility_id = p_facility_id
       and created_at >= p_from and created_at < p_to
  ),
  money_prev as (
    select coalesce(sum(grand_total), 0) as net
      from public.payments
     where facility_id = p_facility_id
       and created_at >= p_prev_from and created_at < p_prev_to
  ),
  -- Room-nights consumed, clamped to the window. A stay that starts before the
  -- window or ends after it contributes only the nights inside it, which is
  -- what makes two adjacent periods add up to the whole.
  nights as (
    select
      sum(greatest(0, extract(epoch from (
            least(coalesce(end_at, start_at + interval '1 day'), p_to)
            - greatest(start_at, p_from))) / 86400.0))
        filter (where in_now and service = 'boarding')  as now_nights,
      sum(greatest(0, extract(epoch from (
            least(coalesce(end_at, start_at + interval '1 day'), p_prev_to)
            - greatest(start_at, p_prev_from))) / 86400.0))
        filter (where in_prev and service = 'boarding') as prev_nights
    from counted
  ),
  window_days as (
    select
      greatest(1, extract(epoch from (p_to - p_from)) / 86400.0)           as now_days,
      greatest(1, extract(epoch from (p_prev_to - p_prev_from)) / 86400.0) as prev_days
  )
  select jsonb_build_object(
    'bookings',      bn.n,
    'prevBookings',  bp.n,
    'revenue',       mn.net,
    'prevRevenue',   mp.net,
    'activeClients', bn.clients,
    'prevActiveClients', bp.clients,
    'capacity',      v_capacity,
    'boardingNights', coalesce(ng.now_nights, 0),
    'occupancyRate', case when v_capacity > 0
                          then least(1, coalesce(ng.now_nights, 0)
                                        / (v_capacity * wd.now_days))
                          else 0 end,
    'prevOccupancyRate', case when v_capacity > 0
                          then least(1, coalesce(ng.prev_nights, 0)
                                        / (v_capacity * wd.prev_days))
                          else 0 end,
    'retentionRate', case when bp.clients > 0
                          then rc.n::numeric / bp.clients else 0 end,
    'aov',           case when bn.n > 0 then mn.net / bn.n else 0 end,
    'prevAov',       case when bp.n > 0 then mp.net / bp.n else 0 end
  )
  into v_result
  from bookings_now bn, bookings_prev bp, returning_clients rc,
       money_now mn, money_prev mp, nights ng, window_days wd;

  return v_result;
end;
$fn$;

comment on function public.facility_report_kpis(uuid, timestamptz, timestamptz, timestamptz, timestamptz) is
  'The six figures on the facility Reports page, from bookings, payments and facility_rooms. Takes BOTH windows because retention needs a denominator from the previous one. Cancelled bookings are excluded everywhere. security invoker: RLS decides what counts.';

revoke all on function public.facility_report_kpis(uuid, timestamptz, timestamptz, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.facility_report_kpis(uuid, timestamptz, timestamptz, timestamptz, timestamptz)
  to authenticated, service_role;
