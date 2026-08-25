-- ============================================================================
-- Money kept on a cancelled booking is still money, and a refund is not spend.
--
-- Two reporting faults, found 2026-08-25 while tracing where refunds land.
--
-- ── 1. THE REVENUE REPORTS COULD NOT SEE A CANCELLATION FEE ───────────────
--
-- `revenue-by-service`, `revenue-by-location` and `service-mix-by-location`
-- joined `and b.status <> 'cancelled'`. Payments hang off the booking, so that
-- one line dropped BOTH signs: the fee a facility keeps when somebody cancels,
-- and any refund against it. Measured on the demo facility before this change:
--
--   300 cancelled bookings carrying payments
--   $35,760.00 gross, -$6,344.00 refunded, $29,416.00 NET kept
--
-- — none of it visible on the three reports a manager reads to see what the
-- business earned, while the Yipyy Pay tile (`facility_takings`, which filters
-- payments by facility and date and nothing else) counted every cent of it.
-- Two tiles on the same screen, disagreeing by exactly the money that was kept.
--
-- The fix is `or p.id is not null`, not simply deleting the filter: a cancelled
-- booking that was never paid should still contribute nothing, or every empty
-- cancellation would add a service row worth zero.
--
-- **The booking COUNTS still exclude cancellations**, via `filter`. That is the
-- point of separating them: a cancellation is not a booking served, but the fee
-- charged for it IS revenue earned. One row now answers both honestly.
--
-- ── 2. `customer-value` RANKED CUSTOMERS BY WHAT THEY PAID BEFORE REFUNDS ──
--
--   'totalSpent', coalesce(sum(p.grand_total) filter (where p.grand_total > 0), 0)
--
-- Positive rows only, so refunds were never subtracted. A customer who paid
-- $800 and was given $200 back reads as having spent $800, and one who returned
-- everything still ranks as a top customer. Every other figure in this function
-- nets; this one did not, and it is the one the list is SORTED by.
--
-- Now `sum(p.grand_total)`, which nets, because that is what the signed ledger
-- is for (20260806220000, Decision 2).
--
-- ── WHAT THIS DOES NOT SETTLE ─────────────────────────────────────────────
--
-- These reports bucket by `b.start_at` — the day the service happened — while
-- `facility_takings` buckets by `p.created_at`, the day the money moved. So a
-- September refund against an August booking still lands in different months on
-- two tiles read side by side. Both bases are defensible; having both unlabelled
-- is not. That is a product decision about what each report SAYS it measures,
-- and it is left open here rather than guessed at.
-- ============================================================================

create or replace function public.facility_report_dataset(
  p_facility_id uuid,
  p_report      text,
  p_from        timestamptz,
  p_to          timestamptz,
  p_prev_from   timestamptz,
  p_prev_to     timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_result jsonb;
begin
  -- ── Revenue by service ────────────────────────────────────────────────
  if p_report = 'revenue-by-service' then
    select jsonb_build_object(
      'current',  coalesce((select jsonb_agg(r order by r->>'service')
                     from (select jsonb_build_object(
                             'service', b.service,
                             'revenue', coalesce(sum(p.grand_total), 0),
                             'bookings', count(distinct b.id) filter (where b.status <> 'cancelled')) as r
                             from public.bookings b
                             left join public.payments p on p.booking_id = b.id
                            where b.facility_id = p_facility_id
                              and (b.status <> 'cancelled' or p.id is not null)
                              and b.start_at >= p_from and b.start_at < p_to
                            group by b.service) x), '[]'::jsonb),
      'previous', coalesce((select jsonb_agg(r order by r->>'service')
                     from (select jsonb_build_object(
                             'service', b.service,
                             'revenue', coalesce(sum(p.grand_total), 0),
                             'bookings', count(distinct b.id) filter (where b.status <> 'cancelled')) as r
                             from public.bookings b
                             left join public.payments p on p.booking_id = b.id
                            where b.facility_id = p_facility_id
                              and (b.status <> 'cancelled' or p.id is not null)
                              and b.start_at >= p_prev_from and b.start_at < p_prev_to
                            group by b.service) x), '[]'::jsonb),
      'hours',    coalesce((select jsonb_agg(r order by r->>'service')
                     from (select jsonb_build_object(
                             'service', b.service,
                             'hours', round(sum(extract(epoch from
                               (coalesce(b.end_at, b.start_at + interval '1 hour')
                                - b.start_at)) / 3600.0)::numeric, 1)) as r
                             from public.bookings b
                            where b.facility_id = p_facility_id
                              and b.status <> 'cancelled'
                              and b.start_at >= p_from and b.start_at < p_to
                            group by b.service) x), '[]'::jsonb)
    ) into v_result;

  -- ── Revenue by location ───────────────────────────────────────────────
  elsif p_report = 'revenue-by-location' then
    select jsonb_build_object(
      'current',  coalesce((select jsonb_agg(r order by r->>'location')
                     from (select coalesce(l.id::text, 'none') as loc_key,
                                  jsonb_build_object(
                                    'locationId', l.id,
                                    'location', coalesce(l.name, 'No branch'),
                                    'revenue', coalesce(sum(p.grand_total), 0),
                                    'bookings', count(distinct b.id) filter (where b.status <> 'cancelled')) as r
                             from public.bookings b
                             left join public.payments p on p.booking_id = b.id
                             left join public.locations l on l.id = b.location_id
                            where b.facility_id = p_facility_id
                              and (b.status <> 'cancelled' or p.id is not null)
                              and b.start_at >= p_from and b.start_at < p_to
                            group by l.id, l.name) x), '[]'::jsonb),
      'previous', coalesce((select jsonb_agg(r order by r->>'location')
                     from (select coalesce(l.id::text, 'none') as loc_key,
                                  jsonb_build_object(
                                    'locationId', l.id,
                                    'location', coalesce(l.name, 'No branch'),
                                    'revenue', coalesce(sum(p.grand_total), 0),
                                    'bookings', count(distinct b.id) filter (where b.status <> 'cancelled')) as r
                             from public.bookings b
                             left join public.payments p on p.booking_id = b.id
                             left join public.locations l on l.id = b.location_id
                            where b.facility_id = p_facility_id
                              and (b.status <> 'cancelled' or p.id is not null)
                              and b.start_at >= p_prev_from and b.start_at < p_prev_to
                            group by l.id, l.name) x), '[]'::jsonb)
    ) into v_result;

  -- ── Service mix by location ────────────────────────────────────────────
  --
  -- Same join as revenue-by-location, grouped by (service, location) instead
  -- of just location. Powers the Service Mix chart and the per-location
  -- service breakdown on the Command Center KPI tiles.
  elsif p_report = 'service-mix-by-location' then
    select jsonb_build_object(
      'current',  coalesce((select jsonb_agg(r order by r->>'service', r->>'location')
                     from (select jsonb_build_object(
                                    'service', b.service,
                                    'locationId', l.id,
                                    'location', coalesce(l.name, 'No branch'),
                                    'revenue', coalesce(sum(p.grand_total), 0),
                                    'bookings', count(distinct b.id) filter (where b.status <> 'cancelled')) as r
                             from public.bookings b
                             left join public.payments p on p.booking_id = b.id
                             left join public.locations l on l.id = b.location_id
                            where b.facility_id = p_facility_id
                              and (b.status <> 'cancelled' or p.id is not null)
                              and b.start_at >= p_from and b.start_at < p_to
                            group by b.service, l.id, l.name) x), '[]'::jsonb),
      'previous', coalesce((select jsonb_agg(r order by r->>'service', r->>'location')
                     from (select jsonb_build_object(
                                    'service', b.service,
                                    'locationId', l.id,
                                    'location', coalesce(l.name, 'No branch'),
                                    'revenue', coalesce(sum(p.grand_total), 0),
                                    'bookings', count(distinct b.id) filter (where b.status <> 'cancelled')) as r
                             from public.bookings b
                             left join public.payments p on p.booking_id = b.id
                             left join public.locations l on l.id = b.location_id
                            where b.facility_id = p_facility_id
                              and (b.status <> 'cancelled' or p.id is not null)
                              and b.start_at >= p_prev_from and b.start_at < p_prev_to
                            group by b.service, l.id, l.name) x), '[]'::jsonb)
    ) into v_result;

  -- ── Occupancy, per day ────────────────────────────────────────────────
  elsif p_report = 'occupancy-report' then
    with capacity as (
      select coalesce(sum(capacity), 0) as total
        from public.facility_rooms
       where facility_id = p_facility_id and active
    ),
    days as (
      select g::date as the_day, 'current' as win
        from generate_series(p_from::date, (p_to - interval '1 day')::date,
                             interval '1 day') g
      union all
      select g::date, 'previous'
        from generate_series(p_prev_from::date, (p_prev_to - interval '1 day')::date,
                             interval '1 day') g
    ),
    stays as (
      select b.start_at, b.end_at, b.total_cost,
             greatest(1, extract(epoch from
               (coalesce(b.end_at, b.start_at + interval '1 day') - b.start_at))
               / 86400.0) as nights
        from public.bookings b
       where b.facility_id = p_facility_id
         and b.service = 'boarding'
         and b.status <> 'cancelled'
    ),
    rows as (
      select d.win, d.the_day, o.occupied, c.total,
             case when c.total > 0
                  then round((o.occupied::numeric / c.total) * 100, 2)
                  else 0 end as rate,
             round(o.revenue, 2) as revenue
        from days d
        cross join capacity c
        cross join lateral (
          select count(*) as occupied,
                 coalesce(sum(s.total_cost / s.nights), 0) as revenue
            from stays s
           where s.start_at::date <= d.the_day
             and coalesce(s.end_at, s.start_at + interval '1 day')::date >= d.the_day
        ) o
    )
    select jsonb_build_object(
      'current',  coalesce((select jsonb_agg(jsonb_build_object(
                     'date', the_day, 'occupied', occupied, 'capacity', total,
                     'occupancyRate', rate, 'revenue', revenue) order by the_day)
                     from rows where win = 'current'), '[]'::jsonb),
      'previous', coalesce((select jsonb_agg(jsonb_build_object(
                     'date', the_day, 'occupied', occupied, 'capacity', total,
                     'occupancyRate', rate, 'revenue', revenue) order by the_day)
                     from rows where win = 'previous'), '[]'::jsonb)
    ) into v_result;

  -- ── Cancelled bookings ────────────────────────────────────────────────
  elsif p_report = 'cancelled-bookings' then
    select jsonb_build_object(
      'current', coalesce((select jsonb_agg(r order by r->>'date' desc) from (
          select jsonb_build_object(
            'date', b.start_at,
            'service', b.service,
            'clientName', coalesce(c.name, 'Unknown'),
            'petName', coalesce((select string_agg(pt.name, ', ')
                                   from public.booking_pets bp
                                   join public.pets pt on pt.id = bp.pet_id
                                  where bp.booking_id = b.id), 'Unknown'),
            'reason', b.special_requests,
            'refundAmount', coalesce((select -sum(p.grand_total)
                                        from public.payments p
                                       where p.booking_id = b.id
                                         and p.grand_total < 0), 0)
          ) as r
            from public.bookings b
            left join public.clients c on c.id = b.client_id
           where b.facility_id = p_facility_id
             and b.status = 'cancelled'
             and b.start_at >= p_from and b.start_at < p_to) x), '[]'::jsonb),
      'previousRefunds', coalesce((
          select -sum(p.grand_total)
            from public.payments p
            join public.bookings b on b.id = p.booking_id
           where b.facility_id = p_facility_id
             and b.status = 'cancelled'
             and b.start_at >= p_prev_from and b.start_at < p_prev_to
             and p.grand_total < 0), 0),
      'previousCount', (select count(*) from public.bookings b
                         where b.facility_id = p_facility_id
                           and b.status = 'cancelled'
                           and b.start_at >= p_prev_from and b.start_at < p_prev_to)
    ) into v_result;

  -- ── Customer value ────────────────────────────────────────────────────
  elsif p_report = 'customer-value' then
    select jsonb_build_object(
      'customers', coalesce((select jsonb_agg(r order by (r->>'totalSpent')::numeric desc) from (
          select jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'totalSpent', coalesce(sum(p.grand_total), 0),
            'totalBookings', count(distinct b.id),
            'lastVisit', max(b.start_at)
          ) as r
            from public.clients c
            join public.bookings b on b.client_id = c.id
                 and b.status <> 'cancelled'
                 and b.start_at >= p_from and b.start_at < p_to
            left join public.payments p on p.booking_id = b.id
           where c.facility_id = p_facility_id
           group by c.id, c.name) x), '[]'::jsonb),
      'activeClients', (select count(distinct b.client_id) from public.bookings b
                         where b.facility_id = p_facility_id
                           and b.status <> 'cancelled'
                           and b.start_at >= p_from and b.start_at < p_to),
      'prevActiveClients', (select count(distinct b.client_id) from public.bookings b
                             where b.facility_id = p_facility_id
                               and b.status <> 'cancelled'
                               and b.start_at >= p_prev_from and b.start_at < p_prev_to),
      'returningClients', (select count(*) from (
          select b.client_id from public.bookings b
           where b.facility_id = p_facility_id and b.status <> 'cancelled'
             and b.start_at >= p_prev_from and b.start_at < p_prev_to
             and b.client_id is not null
          intersect
          select b.client_id from public.bookings b
           where b.facility_id = p_facility_id and b.status <> 'cancelled'
             and b.start_at >= p_from and b.start_at < p_to
             and b.client_id is not null) z)
    ) into v_result;

  -- ── Total revenue ─────────────────────────────────────────────────────
  elsif p_report = 'total-revenue' then
    select jsonb_build_object(
      'daily', coalesce((select jsonb_agg(jsonb_build_object(
                   'date', day, 'gross', gross, 'refunded', refunded,
                   'net', net, 'transactions', txns) order by day)
                 from (select p.created_at::date as day,
                              coalesce(sum(p.grand_total) filter (where p.grand_total > 0), 0) as gross,
                              coalesce(-sum(p.grand_total) filter (where p.grand_total < 0), 0) as refunded,
                              sum(p.grand_total) as net,
                              count(*) filter (where p.grand_total > 0) as txns
                         from public.payments p
                        where p.facility_id = p_facility_id
                          and p.created_at >= p_from and p.created_at < p_to
                        group by 1) d), '[]'::jsonb),
      'transactions', (select count(*) from public.payments
                        where facility_id = p_facility_id
                          and created_at >= p_from and created_at < p_to
                          and grand_total > 0),
      'gross', coalesce((select sum(grand_total) from public.payments
                          where facility_id = p_facility_id
                            and created_at >= p_from and created_at < p_to
                            and grand_total > 0), 0),
      'refunded', coalesce((select -sum(grand_total) from public.payments
                             where facility_id = p_facility_id
                               and created_at >= p_from and created_at < p_to
                               and grand_total < 0), 0),
      'prevGross', coalesce((select sum(grand_total) from public.payments
                              where facility_id = p_facility_id
                                and created_at >= p_prev_from and created_at < p_prev_to
                                and grand_total > 0), 0)
    ) into v_result;

  else
    raise exception 'No such report: %', p_report using errcode = '22023';
  end if;

  return v_result;
end;
$fn$;

comment on function public.facility_report_dataset(uuid, text, timestamptz, timestamptz, timestamptz, timestamptz) is
  'The dataset behind one facility report, from bookings, payments, clients, locations and facility_rooms. Cancelled bookings are excluded everywhere except the cancellation report. security invoker: RLS decides what is visible. Raises on an unknown report id rather than returning empty.';

revoke all on function public.facility_report_dataset(uuid, text, timestamptz, timestamptz, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.facility_report_dataset(uuid, text, timestamptz, timestamptz, timestamptz, timestamptz)
  to authenticated, service_role;
