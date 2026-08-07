-- ============================================================================
-- What a facility actually did, month by month.
--
-- The Reports tab on the superadmin's facility page said "nothing stores this
-- yet". That was wrong, and it is the only one of the five where it was wrong:
-- bookings and payments have been real tables for a fortnight. Nothing had put
-- them together.
--
-- Four decisions, each of which changes the numbers.
--
-- ── 1. DATED BY WHEN THE SERVICE HAPPENED ─────────────────────────────────
--
-- `payments` carries created_at and nothing else — when the ROW was written.
-- For anything imported, seeded or backfilled that is the import date, not the
-- day the card was charged. Our own demo facility proves the point: 252
-- payments spanning 2026-08-01 to 2026-08-06, against bookings spanning
-- 2024-06 to 2027-04. A revenue-by-month chart off created_at would show one
-- spike in August and call it a business.
--
-- So money is attributed to the month of the BOOKING it paid for. The chart
-- says "service month" and means it. That is accrual rather than cash basis;
-- for judging how a facility is doing it is the more useful of the two, and it
-- is the only one that survives an import.
--
-- ── 2. REVENUE EXCLUDES TIPS ──────────────────────────────────────────────
--
-- payments.grand_total includes the tip; the tip is not the facility's money,
-- it is the groomer's — booking_tip_allocations exists to divide it. So
-- revenue is sum(grand_total - tip), exactly as private.booking_amount_paid
-- already computes it per booking, and tips are reported as their own figure.
--
-- Measured before writing this: the demo facility's two totals differ by
-- $504.00, and every penny of that difference is tips. A report that showed
-- $3,799.75 as revenue would be overstating it by the staff's money.
--
-- ── 3. A REFUND NETS ITSELF ───────────────────────────────────────────────
--
-- Refunds are negative rows in the ledger (20260804202828), so summing the
-- ledger nets them without a special case. Money taken on a booking that was
-- later cancelled is still money taken until it is given back — cancellation
-- is counted separately rather than subtracted from revenue.
--
-- ── 4. GROUPED BY `service`, NOT `service_type` ───────────────────────────
--
-- bookings.service holds daycare/boarding/grooming/training and the custom
-- module slugs. bookings.service_type holds a mixture of size variants
-- (full_groom, half-day) and raw package ids (groom-pkg-004), and is null on
-- 122 of the demo facility's 155 rows. Grouping by it would produce a chart
-- with `groom-pkg-004` as a category and most of the business in "unknown".
--
-- ── EMPTY MONTHS ARE ZEROS, NOT GAPS ──────────────────────────────────────
--
-- The month series is generated, so a month with no bookings appears with
-- zeros. A chart that omits it draws a straight line through the quiet period
-- and hides exactly the thing someone opened the tab to find.
--
-- SECURITY INVOKER: bookings, payments and clients each already admit a
-- platform admin and refuse everyone else. A definer would hand every
-- facility's takings to any authenticated caller to save a check RLS performs.
-- ============================================================================

create or replace function public.facility_report(
  p_facility_id uuid,
  p_months      integer default 6
)
returns jsonb
language sql
stable
set search_path = ''
as $fn$
  with bounds as (
    select date_trunc('month', now())
             - make_interval(months => greatest(coalesce(p_months, 6), 1) - 1) as lo,
           date_trunc('month', now()) + interval '1 month'                     as hi
  ),
  months as (
    select generate_series(
             (select lo from bounds),
             (select hi from bounds) - interval '1 month',
             interval '1 month')::date as month
  ),
  booking as (
    select b.id,
           b.client_id,
           coalesce(nullif(trim(b.service), ''), 'unspecified') as service,
           b.status::text                                       as status,
           date_trunc('month', b.start_at)::date                as month,
           coalesce(b.amount_due, 0)                            as amount_due,
           coalesce(b.amount_paid, 0)                           as amount_paid
      from public.bookings b, bounds
     where b.facility_id = p_facility_id
       and b.start_at >= bounds.lo
       and b.start_at <  bounds.hi
  ),
  -- Money, attributed to the month and service of the booking it paid for.
  money as (
    select bk.month,
           bk.service,
           sum(p.grand_total - p.tip) as revenue,
           sum(p.tip)                 as tips
      from public.payments p
      join booking bk on bk.id = p.booking_id
     where p.facility_id = p_facility_id
     group by bk.month, bk.service
  ),
  booking_month as (
    select month,
           count(*)                                      as bookings,
           count(*) filter (where status = 'cancelled')   as cancelled,
           count(*) filter (where status = 'completed')   as completed
      from booking
     group by month
  ),
  money_month as (
    select month, sum(revenue) as revenue, sum(tips) as tips
      from money
     group by month
  ),
  service_bookings as (
    select service,
           count(*)                                    as bookings,
           count(*) filter (where status = 'cancelled') as cancelled
      from booking
     group by service
  ),
  service_money as (
    select service, sum(revenue) as revenue, sum(tips) as tips
      from money
     group by service
  )
  select jsonb_build_object(
    'from', (select lo from bounds),
    'to',   (select hi from bounds),
    'months', coalesce((
      select jsonb_agg(jsonb_build_object(
               'month',        to_char(m.month, 'YYYY-MM'),
               'bookings',     coalesce(bm.bookings, 0),
               'cancelled',    coalesce(bm.cancelled, 0),
               'completed',    coalesce(bm.completed, 0),
               'revenueCents', round(coalesce(mm.revenue, 0) * 100)::bigint,
               'tipsCents',    round(coalesce(mm.tips, 0) * 100)::bigint
             ) order by m.month)
        from months m
        left join booking_month bm on bm.month = m.month
        left join money_month  mm on mm.month = m.month), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
               'service',      sb.service,
               'bookings',     sb.bookings,
               'cancelled',    sb.cancelled,
               'revenueCents', round(coalesce(sm.revenue, 0) * 100)::bigint
             ) order by coalesce(sm.revenue, 0) desc, sb.service)
        from service_bookings sb
        left join service_money sm on sm.service = sb.service), '[]'::jsonb),
    'totals', jsonb_build_object(
      'bookings',        (select count(*) from booking),
      'cancelled',       (select count(*) from booking where status = 'cancelled'),
      'completed',       (select count(*) from booking where status = 'completed'),
      'revenueCents',    (select round(coalesce(sum(revenue), 0) * 100)::bigint from money),
      'tipsCents',       (select round(coalesce(sum(tips), 0) * 100)::bigint from money),
      -- What is still owed on anything not cancelled. Negative differences are
      -- credits on account, not debts, so they do not net off what is owed.
      'outstandingCents',(select round(coalesce(sum(greatest(amount_due - amount_paid, 0)), 0) * 100)::bigint
                            from booking where status <> 'cancelled'),
      'activeClients',   (select count(distinct client_id) from booking where client_id is not null),
      'newClients',      (select count(*) from public.clients c, bounds
                           where c.facility_id = p_facility_id
                             and c.created_at >= bounds.lo
                             and c.created_at <  bounds.hi)
    )
  );
$fn$;

comment on function public.facility_report(uuid, integer) is
  'One facility''s bookings and takings by service month. Revenue excludes tips; money is dated by the booking it paid for, not by when the payment row was written — see the header of 20260807620000.';

revoke execute on function public.facility_report(uuid, integer) from anon;
