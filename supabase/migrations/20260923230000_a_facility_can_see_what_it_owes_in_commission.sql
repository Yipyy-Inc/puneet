-- ============================================================================
-- A facility can see what it owes in commission.
--
-- ── WHY ───────────────────────────────────────────────────────────────────
--
-- 20260923220000 made commission a real figure instead of a rate on a form.
-- A figure nothing displays is the same problem one step along, and the
-- reports hub has carried a "Commission Report" tile marked
-- `implemented: false` the whole time.
--
-- ── REBUILT FROM pg_get_functiondef, NOT FROM A MIGRATION ─────────────────
--
-- `facility_report_dataset` has been extended by several migrations and no
-- single file holds its current body. This one was dumped from the live
-- database, given one more branch, and written back whole — the same way
-- 20260923140000 added 'service-charges'. Editing the oldest copy would
-- silently delete every branch added since.
--
-- Two things that cost time the first time round, kept here so they do not
-- cost it again:
--
--   * `pg_get_functiondef` ends with `$function$` and NO trailing semicolon.
--     Without one added, the `revoke` below parses as part of the function
--     body and the whole migration is refused.
--   * The grants must be RESTATED. `create or replace` keeps them in
--     Postgres, but restating them is what makes this file readable on its
--     own — and `revoke from public` and `revoke from anon` are different
--     grants, so both are named.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.facility_report_dataset(p_facility_id uuid, p_report text, p_from timestamp with time zone, p_to timestamp with time zone, p_prev_from timestamp with time zone, p_prev_to timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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

  -- ── Training attendance by location ─────────────────────────────────────
  --
  -- Bookings + check-in facts only -- no class/series/enrollment table exists,
  -- so this cannot answer "active classes" or "students enrolled". `bookings`
  -- counts exclude cancellations, same as every other report here.
  elsif p_report = 'training-attendance-by-location' then
    select jsonb_build_object(
      'current',  coalesce((select jsonb_agg(r order by r->>'location')
                     from (select jsonb_build_object(
                                    'locationId', l.id,
                                    'location', coalesce(l.name, 'No branch'),
                                    'bookings', count(distinct b.id) filter (where b.status <> 'cancelled'),
                                    'checkedIn', count(distinct b.id) filter (
                                      where b.status <> 'cancelled' and ta.checked_in_at is not null),
                                    'checkedOut', count(distinct b.id) filter (
                                      where b.status <> 'cancelled' and ta.checked_out_at is not null)) as r
                             from public.bookings b
                             left join public.training_attendance ta on ta.booking_id = b.id
                             left join public.locations l on l.id = b.location_id
                            where b.facility_id = p_facility_id
                              and b.service = 'training'
                              and b.start_at >= p_from and b.start_at < p_to
                            group by l.id, l.name) x), '[]'::jsonb),
      'previous', coalesce((select jsonb_agg(r order by r->>'location')
                     from (select jsonb_build_object(
                                    'locationId', l.id,
                                    'location', coalesce(l.name, 'No branch'),
                                    'bookings', count(distinct b.id) filter (where b.status <> 'cancelled'),
                                    'checkedIn', count(distinct b.id) filter (
                                      where b.status <> 'cancelled' and ta.checked_in_at is not null),
                                    'checkedOut', count(distinct b.id) filter (
                                      where b.status <> 'cancelled' and ta.checked_out_at is not null)) as r
                             from public.bookings b
                             left join public.training_attendance ta on ta.booking_id = b.id
                             left join public.locations l on l.id = b.location_id
                            where b.facility_id = p_facility_id
                              and b.service = 'training'
                              and b.start_at >= p_prev_from and b.start_at < p_prev_to
                            group by l.id, l.name) x), '[]'::jsonb)
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

  -- ── Service charges ───────────────────────────────────────────────────
  --
  -- What a facility's own pricing rules earned, under the name it gave each
  -- one. `fee_id is not null` is what tells a service charge from a retail
  -- item or a line somebody typed: the rule that charged it is on the row
  -- (20260923090000).
  --
  -- GROUPED BY `fee_id`, NOT BY NAME. The name is what the invoice said and a
  -- facility may fix a typo in it at any time; the id is the durable identity,
  -- which is the whole reason it is on the row. Grouping by name would split
  -- one fee's history in two the day somebody corrected its spelling. The name
  -- shown is the one on the most recent line.
  --
  -- The window is the BOOKING's start, as `revenue-by-service` beside it uses,
  -- so the two can be read against each other — a charge added at the till
  -- still belongs to the stay it was added to.
  --
  -- A DISCOUNT authored as a custom fee is a negative line, and it is counted
  -- rather than filtered out: the question is what the facility's charges did
  -- to its revenue, and dropping the negatives answers a different one.
  elsif p_report = 'service-charges' then
    select jsonb_build_object(
      'current', coalesce((select jsonb_agg(r order by (r->>'revenue')::numeric desc, r->>'name')
          from (select jsonb_build_object(
                  'feeId', li.fee_id,
                  'name', (array_agg(li.name order by li.created_at desc))[1],
                  'revenue', coalesce(sum(li.price), 0),
                  'timesCharged', count(*),
                  'bookings', count(distinct li.booking_id)) as r
                  from public.booking_line_items li
                  join public.bookings b on b.id = li.booking_id
                 where li.facility_id = p_facility_id
                   and li.fee_id is not null
                   and b.status <> 'cancelled'
                   and b.start_at >= p_from and b.start_at < p_to
                 group by li.fee_id) x), '[]'::jsonb),
      'total', coalesce((select sum(li.price)
                           from public.booking_line_items li
                           join public.bookings b on b.id = li.booking_id
                          where li.facility_id = p_facility_id
                            and li.fee_id is not null
                            and b.status <> 'cancelled'
                            and b.start_at >= p_from and b.start_at < p_to), 0),
      'previousTotal', coalesce((select sum(li.price)
                           from public.booking_line_items li
                           join public.bookings b on b.id = li.booking_id
                          where li.facility_id = p_facility_id
                            and li.fee_id is not null
                            and b.status <> 'cancelled'
                            and b.start_at >= p_prev_from and b.start_at < p_prev_to), 0)
    ) into v_result;
  -- ── WHAT EACH PERSON EARNED ─────────────────────────────────────────────
  --
  -- Straight off `booking_commission_allocations`, which is already the
  -- answer: service only, net of discounts, before tax, in proportion to what
  -- was paid, with service charges excluded by construction
  -- (20260923220000). Recomputing any of that here would be a second opinion
  -- about somebody's pay.
  --
  -- `unpaid` is the figure a payout run needs — what is earned but not yet
  -- handed over — and it is a SUM over rows with no `paid_at`, never a count.
  --
  -- Windowed on the BOOKING's start, like every other report here, so a
  -- month's commission lines up with the month's revenue rather than with
  -- whenever the card happened to settle.
  elsif p_report = 'commission' then
    select jsonb_build_object(
      'current', coalesce((select jsonb_agg(r order by (r->>'earned')::numeric desc, r->>'name')
          from (select jsonb_build_object(
                  'staffId', a.staff_id,
                  'name', (array_agg(btrim(s.first_name || ' ' || s.last_name)))[1],
                  'earned', coalesce(sum(a.amount), 0),
                  'basis', coalesce(sum(a.basis), 0),
                  'bookings', count(distinct a.booking_id),
                  'unpaid', coalesce(sum(a.amount) filter (where a.paid_at is null), 0)) as r
                  from public.booking_commission_allocations a
                  join public.staff s on s.id = a.staff_id
                  join public.bookings b on b.id = a.booking_id
                 where a.facility_id = p_facility_id
                   and b.status <> 'cancelled'
                   and b.start_at >= p_from and b.start_at < p_to
                 group by a.staff_id) x), '[]'::jsonb),
      'total', coalesce((select sum(a.amount)
                           from public.booking_commission_allocations a
                           join public.bookings b on b.id = a.booking_id
                          where a.facility_id = p_facility_id
                            and b.status <> 'cancelled'
                            and b.start_at >= p_from and b.start_at < p_to), 0),
      'previousTotal', coalesce((select sum(a.amount)
                           from public.booking_commission_allocations a
                           join public.bookings b on b.id = a.booking_id
                          where a.facility_id = p_facility_id
                            and b.status <> 'cancelled'
                            and b.start_at >= p_prev_from and b.start_at < p_prev_to), 0)
    ) into v_result;

  else
    raise exception 'No such report: %', p_report using errcode = '22023';
  end if;

  return v_result;
end;
$function$;

revoke execute on function public.facility_report_dataset(uuid, text, timestamptz, timestamptz, timestamptz, timestamptz) from public;
revoke execute on function public.facility_report_dataset(uuid, text, timestamptz, timestamptz, timestamptz, timestamptz) from anon;
grant execute on function public.facility_report_dataset(uuid, text, timestamptz, timestamptz, timestamptz, timestamptz) to authenticated;
grant execute on function public.facility_report_dataset(uuid, text, timestamptz, timestamptz, timestamptz, timestamptz) to service_role;
