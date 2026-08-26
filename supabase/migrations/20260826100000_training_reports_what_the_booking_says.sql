-- ============================================================================
-- A training report, from what a training booking can actually say.
--
-- HQ Training (`/facility/hq/training`) was the last major HQ screen still
-- entirely on fixtures -- a hardcoded facility id, a hardcoded "this month"
-- anchor, and every number aggregated from `TrainingSeries`/`TrainingEnrollment`
-- fixtures. Unlike every other HQ conversion so far, training has no real
-- `class`/`series`/`enrollment` table to join to -- those nouns exist only in
-- `src/data/training*.ts`. Building them for real means building the
-- facility-side write path too (creating a class, enrolling a pet), which is
-- its own project, scoped out here.
--
-- What IS real: `bookings` (service = 'training', a real `location_id`) and
-- `training_attendance` (20260806980000, one row per booking, `checked_in_at`/
-- `checked_out_at`). That answers three honest questions per branch: how many
-- training bookings, how many were checked in, how many were checked out
-- (completed). Nothing about a "class" or a "student enrolled" -- those stay
-- unanswered rather than invented.
--
-- Same shape as `revenue-by-location` (`create or replace` replaces the whole
-- function body, so this migration carries it in full with one more branch).
-- No new table, no new RLS: `training_attendance`'s existing `check_in_out`
-- read policy and `bookings`' existing facility scoping already cover this —
-- `security invoker`, same as every other branch.
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

  else
    raise exception 'No such report: %', p_report using errcode = '22023';
  end if;

  return v_result;
end;
$fn$;

comment on function public.facility_report_dataset(uuid, text, timestamptz, timestamptz, timestamptz, timestamptz) is
  'The dataset behind one facility report, from bookings, payments, clients, locations, facility_rooms and training_attendance. Cancelled bookings are excluded everywhere except the cancellation report. security invoker: RLS decides what is visible. Raises on an unknown report id rather than returning empty.';

revoke all on function public.facility_report_dataset(uuid, text, timestamptz, timestamptz, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.facility_report_dataset(uuid, text, timestamptz, timestamptz, timestamptz, timestamptz)
  to authenticated, service_role;
