-- ============================================================================
-- What a facility took, added up the way an owner asks the question.
--
-- The Yipyy Pay dashboard answers "how much did we take today, in tips, in
-- refunds, and for what" -- and every one of those numbers is already in
-- `public.payments`. Clover's REST API is NOT the read path for this, for four
-- reasons worth writing down because the brief assumed the opposite:
--
--   1. Clover cannot answer it. "Boarding $3,800 / Daycare $2,200" needs to
--      know a payment was for a boarding stay. Clover has no such concept;
--      only the booking does, and 454 of 458 payment rows carry a booking_id.
--   2. Neither can it name the customer or the pet. Same reason.
--   3. Clover rate-limits 16 req/sec PER TOKEN with 5 concurrent in flight. A
--      dashboard somebody is clicking filters on would contend with the sweep
--      that keeps this ledger true. A reporting screen must never be able to
--      starve the reconciliation it depends on.
--   4. Clover's own documentation says to use the Export API rather than REST
--      for anything older than two months.
--
-- So the sweep keeps the ledger honest and the ledger answers the questions.
-- That is the same split that made the reconcile work.
--
-- -- THE DAY BOUNDARY IS THE FACILITY'S, NOT UTC ----------------------------
--
-- `created_at` is timestamptz. Bucketing by a UTC day puts an 8pm Toronto
-- payment into tomorrow, so a facility closing at 9pm would see its takings
-- split across two rows every single day. This repo has already paid for that
-- lesson once, when a UTC window dropped every night shift out of its own day
-- in the scheduling module. The zone is a parameter and the caller passes the
-- facility's own.
--
-- -- GROSS AND NET ARE BOTH REPORTED, DELIBERATELY --------------------------
--
-- A refund is a NEGATIVE row in `payments` (see `refund_of_payment_id`), so
-- `sum(grand_total)` is already net, and free. That is exactly why net alone is
-- the wrong headline: a day with $4,000 of sales and $4,000 of refunds nets to
-- zero and reads identically to a day when nobody came in. Both, always.
-- ============================================================================

-- The access pattern the whole dashboard is built on, and it had no index.
-- `payments_client_idx` leads with (facility_id, client_id), so it cannot serve
-- a facility-and-date scan.
create index if not exists payments_facility_taken
  on public.payments (facility_id, created_at desc);

create or replace function public.facility_takings(
  p_facility_id uuid,
  p_from        timestamptz,
  p_to          timestamptz,
  p_time_zone   text default 'UTC'
)
returns jsonb
language plpgsql
-- INVOKER. The caller's own policies decide which rows count, so somebody who
-- cannot see this facility's amounts gets zeros rather than another business's
-- takings. The route still resolves the facility from the session; this is the
-- second lock, not the first.
security invoker
set search_path = ''
as $fn$
declare
  v_zone   text := coalesce(nullif(trim(p_time_zone), ''), 'UTC');
  v_result jsonb;
begin
  -- An unrecognised zone name raises inside the aggregate, which would reach a
  -- dashboard as a 500. Checked once, here, and fallen back instead.
  begin
    perform now() at time zone v_zone;
  exception
    when others then v_zone := 'UTC';
  end;

  with scoped as (
    select p.grand_total,
           p.tip,
           p.tax,
           p.method,
           p.processor,
           p.booking_id,
           (p.created_at at time zone v_zone)::date as local_day
      from public.payments p
     where p.facility_id = p_facility_id
       and p.created_at >= p_from
       and p.created_at <  p_to
  ),
  totals as (
    select
      coalesce(sum(grand_total) filter (where grand_total > 0), 0)  as gross,
      coalesce(-sum(grand_total) filter (where grand_total < 0), 0) as refunded,
      coalesce(sum(grand_total), 0)                                 as net,
      -- Net of reversals: a tip handed back is not a tip earned.
      coalesce(sum(tip), 0)                                         as tips,
      coalesce(sum(tax), 0)                                         as tax,
      count(*) filter (where grand_total > 0)                       as sales,
      count(*) filter (where grand_total < 0)                       as refunds,
      count(*) filter (where processor = 'clover' and grand_total > 0)
                                                                    as clover_sales,
      coalesce(sum(grand_total)
        filter (where processor = 'clover' and grand_total > 0), 0) as clover_gross
    from scoped
  ),
  -- A failed payment never becomes a `payments` row at all; it lives and dies
  -- in `payment_intents`. Counting failures from `payments` would always return
  -- zero, which is the kind of number that reads as good news.
  failures as (
    select count(*) as failed
      from public.payment_intents pi
     where pi.facility_id = p_facility_id
       and pi.created_at >= p_from
       and pi.created_at <  p_to
       and pi.status in ('failed', 'declined')
  ),
  by_service as (
    select coalesce(b.service, 'other')             as service,
           sum(s.grand_total)                       as net,
           count(*) filter (where s.grand_total > 0) as sales
      from scoped s
      left join public.bookings b on b.id = s.booking_id
     group by 1
  ),
  by_day as (
    select local_day,
           coalesce(sum(grand_total) filter (where grand_total > 0), 0)  as gross,
           coalesce(-sum(grand_total) filter (where grand_total < 0), 0) as refunded,
           sum(grand_total)                                              as net,
           count(*) filter (where grand_total > 0)                       as sales
      from scoped
     group by 1
  ),
  by_method as (
    select method,
           sum(grand_total)                        as net,
           count(*) filter (where grand_total > 0) as sales
      from scoped
     group by 1
  ),
  -- Card-present vs card-not-present, and a third bucket that is neither.
  -- Folding cash into "online" would be a lie an owner would spot immediately.
  by_channel as (
    select case
             when method = 'terminal' then 'in_person'
             when method in ('new-card', 'card-on-file') then 'online'
             else 'other'
           end                                     as channel,
           sum(grand_total)                        as net,
           count(*) filter (where grand_total > 0) as sales
      from scoped
     group by 1
  )
  select jsonb_build_object(
    'gross',       t.gross,
    'refunded',    t.refunded,
    'net',         t.net,
    'tips',        t.tips,
    'tax',         t.tax,
    'sales',       t.sales,
    'refunds',     t.refunds,
    'failed',      f.failed,
    'cloverSales', t.clover_sales,
    'cloverGross', t.clover_gross,
    'timeZone',    v_zone,
    'byService', coalesce((select jsonb_agg(jsonb_build_object(
                    'service', service, 'net', net, 'sales', sales)
                    order by net desc) from by_service), '[]'::jsonb),
    'byDay',     coalesce((select jsonb_agg(jsonb_build_object(
                    'day', local_day, 'gross', gross, 'refunded', refunded,
                    'net', net, 'sales', sales)
                    order by local_day) from by_day), '[]'::jsonb),
    'byMethod',  coalesce((select jsonb_agg(jsonb_build_object(
                    'method', method, 'net', net, 'sales', sales)
                    order by net desc) from by_method), '[]'::jsonb),
    'byChannel', coalesce((select jsonb_agg(jsonb_build_object(
                    'channel', channel, 'net', net, 'sales', sales)
                    order by net desc) from by_channel), '[]'::jsonb)
  )
  into v_result
  from totals t cross join failures f;

  return v_result;
end;
$fn$;

comment on function public.facility_takings(uuid, timestamptz, timestamptz, text) is
  'What a facility took over a window, bucketed in ITS OWN timezone. Gross and net both, because a refunded day and a quiet day net the same. Failed payments come from payment_intents, the only place they exist. security invoker: RLS decides which rows count.';

revoke all on function public.facility_takings(uuid, timestamptz, timestamptz, text)
  from public, anon;
grant execute on function public.facility_takings(uuid, timestamptz, timestamptz, text)
  to authenticated, service_role;
