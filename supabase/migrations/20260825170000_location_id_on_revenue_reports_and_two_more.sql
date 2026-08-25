-- ============================================================================
-- `location_id` on the revenue-by-location rows, plus two more reports.
--
-- The revenue-by-location branch (20260825160000) returned only a name --
-- fine for a report table, but HQ Overview's charts (RevenueTrendLineChart,
-- RevenueByLocationBar) key their data by location ID, matching it back to
-- `useFacilityLocations()` for color/name. Matching by NAME instead would be
-- fragile the moment two branches share a display name. Adding the id is a
-- one-line change to two `jsonb_build_object` calls, not a new join.
--
-- `facility_revenue_trend_by_location` is a new, separate function (not a
-- branch on `facility_report_dataset`) because it answers a different
-- question -- N trailing months, not a current/previous window -- and takes
-- different arguments. `service-mix-by-location` DOES fit the existing
-- current/previous shape, so it's a branch like its siblings.
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
                             'bookings', count(distinct b.id)) as r
                             from public.bookings b
                             left join public.payments p on p.booking_id = b.id
                            where b.facility_id = p_facility_id
                              and b.status <> 'cancelled'
                              and b.start_at >= p_from and b.start_at < p_to
                            group by b.service) x), '[]'::jsonb),
      'previous', coalesce((select jsonb_agg(r order by r->>'service')
                     from (select jsonb_build_object(
                             'service', b.service,
                             'revenue', coalesce(sum(p.grand_total), 0),
                             'bookings', count(distinct b.id)) as r
                             from public.bookings b
                             left join public.payments p on p.booking_id = b.id
                            where b.facility_id = p_facility_id
                              and b.status <> 'cancelled'
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
                                    'bookings', count(distinct b.id)) as r
                             from public.bookings b
                             left join public.payments p on p.booking_id = b.id
                             left join public.locations l on l.id = b.location_id
                            where b.facility_id = p_facility_id
                              and b.status <> 'cancelled'
                              and b.start_at >= p_from and b.start_at < p_to
                            group by l.id, l.name) x), '[]'::jsonb),
      'previous', coalesce((select jsonb_agg(r order by r->>'location')
                     from (select coalesce(l.id::text, 'none') as loc_key,
                                  jsonb_build_object(
                                    'locationId', l.id,
                                    'location', coalesce(l.name, 'No branch'),
                                    'revenue', coalesce(sum(p.grand_total), 0),
                                    'bookings', count(distinct b.id)) as r
                             from public.bookings b
                             left join public.payments p on p.booking_id = b.id
                             left join public.locations l on l.id = b.location_id
                            where b.facility_id = p_facility_id
                              and b.status <> 'cancelled'
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
                                    'bookings', count(distinct b.id)) as r
                             from public.bookings b
                             left join public.payments p on p.booking_id = b.id
                             left join public.locations l on l.id = b.location_id
                            where b.facility_id = p_facility_id
                              and b.status <> 'cancelled'
                              and b.start_at >= p_from and b.start_at < p_to
                            group by b.service, l.id, l.name) x), '[]'::jsonb),
      'previous', coalesce((select jsonb_agg(r order by r->>'service', r->>'location')
                     from (select jsonb_build_object(
                                    'service', b.service,
                                    'locationId', l.id,
                                    'location', coalesce(l.name, 'No branch'),
                                    'revenue', coalesce(sum(p.grand_total), 0),
                                    'bookings', count(distinct b.id)) as r
                             from public.bookings b
                             left join public.payments p on p.booking_id = b.id
                             left join public.locations l on l.id = b.location_id
                            where b.facility_id = p_facility_id
                              and b.status <> 'cancelled'
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
            'totalSpent', coalesce(sum(p.grand_total) filter (where p.grand_total > 0), 0),
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

-- ============================================================================
-- Trailing N months of revenue, per branch. A different shape than
-- facility_report_dataset's current/previous window, so it's its own
-- function rather than a branch that would need two extra arguments every
-- other report ignores.
-- ============================================================================

create or replace function public.facility_revenue_trend_by_location(
  p_facility_id uuid,
  p_months      int default 12
)
returns jsonb
language sql
security invoker
set search_path = ''
stable
as $fn$
  select coalesce(jsonb_agg(jsonb_build_object(
           'month', to_char(month_start, 'YYYY-MM'),
           'locationId', location_id,
           'location', location_name,
           'revenue', revenue
         ) order by month_start, location_name), '[]'::jsonb)
    from (
      select date_trunc('month', b.start_at) as month_start,
             l.id as location_id,
             coalesce(l.name, 'No branch') as location_name,
             coalesce(sum(p.grand_total), 0) as revenue
        from public.bookings b
        left join public.payments p on p.booking_id = b.id
        left join public.locations l on l.id = b.location_id
       where b.facility_id = p_facility_id
         and b.status <> 'cancelled'
         and b.start_at >= date_trunc('month', now()) - (make_interval(months => p_months - 1))
         and b.start_at < date_trunc('month', now()) + interval '1 month'
       group by 1, 2, 3
    ) t;
$fn$;

comment on function public.facility_revenue_trend_by_location(uuid, int) is
  'Trailing N months of revenue per branch, from bookings/payments/locations. security invoker: RLS decides what is visible.';

revoke all on function public.facility_revenue_trend_by_location(uuid, int)
  from public, anon;
grant execute on function public.facility_revenue_trend_by_location(uuid, int)
  to authenticated, service_role;
