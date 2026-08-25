-- ============================================================================
-- A cancellation fee is revenue, a cancellation is not a booking, and a refund
-- is not spend (20260825200000).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/report-cancelled-and-refunds.sql
--
-- One transaction, rolled back. Its own facility, so the assertions are exact
-- figures rather than "greater than" — the three faults this guards against all
-- hide comfortably inside an inequality.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. THE FEE SURVIVES THE CANCELLATION (R1/R4/R6). `revenue-by-service`,
--    `revenue-by-location` and `service-mix-by-location` joined
--    `and b.status <> 'cancelled'`, and payments hang off the booking, so that
--    line dropped the money as well as the booking. On the demo facility it
--    was hiding $29,416 net.
--
-- 2. BUT THE COUNT DOES NOT (R2/R5/R7). The reason this needed a `filter`
--    rather than deleting the line: a cancellation is not a booking served,
--    while the fee charged for it IS revenue earned. If a later change makes
--    the count follow the revenue, these are what say so.
--
-- 3. AN UNPAID CANCELLATION STILL CONTRIBUTES NOTHING (R3). `or p.id is not
--    null`, not a bare deletion — otherwise every empty cancellation adds a
--    service row worth zero and the report grows rows nobody can act on.
--
-- 4. A REFUND IS NOT SPEND (R8). `customer-value` summed
--    `filter (where p.grand_total > 0)`, so refunds never came off the figure
--    the customer list is SORTED by. Someone who paid and was refunded in full
--    ranked as a top customer.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000002ca010', 'Cancel Org', 'cancel-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000002ca020', '00000000-0000-0000-0000-0000002ca010',
   'Cancel Facility', 'cancel-a', 'cancel-a')
on conflict do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000002ca040', '00000000-0000-0000-0000-0000002ca020',
   'Cancelled Carla', 'cancel-c1@example.invalid');

-- Four bookings, all daycare, all in one window. Written straight to the table
-- as the owner of the transaction, because this file is about the REPORT and
-- not about who may write a booking.
--
--   A  kept        $100 paid, then CANCELLED and nothing given back
--   B  refunded    $100 paid, $40 back, then CANCELLED  -> $60 kept
--   C  empty       cancelled, never paid                -> contributes nothing
--   D  ordinary    $200 paid, $50 refunded, not cancelled
--
-- Revenue must be 100 + 60 + 0 + 150 = 310. Bookings served must be 1.
insert into public.bookings
  (id, facility_id, client_id, service, status, start_at, end_at,
   base_price, discount, total_cost)
values
  ('00000000-0000-0000-0000-0000002cb001', '00000000-0000-0000-0000-0000002ca020',
   '00000000-0000-0000-0000-0000002ca040', 'daycare', 'confirmed',
   '2031-03-10T09:00Z', '2031-03-10T17:00Z', 100, 0, 100),
  ('00000000-0000-0000-0000-0000002cb002', '00000000-0000-0000-0000-0000002ca020',
   '00000000-0000-0000-0000-0000002ca040', 'daycare', 'confirmed',
   '2031-03-11T09:00Z', '2031-03-11T17:00Z', 100, 0, 100),
  ('00000000-0000-0000-0000-0000002cb003', '00000000-0000-0000-0000-0000002ca020',
   '00000000-0000-0000-0000-0000002ca040', 'daycare', 'confirmed',
   '2031-03-12T09:00Z', '2031-03-12T17:00Z', 100, 0, 100),
  ('00000000-0000-0000-0000-0000002cb004', '00000000-0000-0000-0000-0000002ca020',
   '00000000-0000-0000-0000-0000002ca040', 'daycare', 'confirmed',
   '2031-03-13T09:00Z', '2031-03-13T17:00Z', 200, 0, 200);

insert into public.payments
  (facility_id, booking_id, client_id, method,
   subtotal, tax, tip, amount_charged, grand_total, refund_of_payment_id)
values
  ('00000000-0000-0000-0000-0000002ca020', '00000000-0000-0000-0000-0000002cb001',
   '00000000-0000-0000-0000-0000002ca040', 'new-card', 100, 0, 0, 100, 100, null),
  ('00000000-0000-0000-0000-0000002ca020', '00000000-0000-0000-0000-0000002cb002',
   '00000000-0000-0000-0000-0000002ca040', 'new-card', 100, 0, 0, 100, 100, null),
  ('00000000-0000-0000-0000-0000002ca020', '00000000-0000-0000-0000-0000002cb002',
   '00000000-0000-0000-0000-0000002ca040', 'new-card', -40, 0, 0, -40, -40, null),
  ('00000000-0000-0000-0000-0000002ca020', '00000000-0000-0000-0000-0000002cb004',
   '00000000-0000-0000-0000-0000002ca040', 'new-card', 200, 0, 0, 200, 200, null),
  ('00000000-0000-0000-0000-0000002ca020', '00000000-0000-0000-0000-0000002cb004',
   '00000000-0000-0000-0000-0000002ca040', 'new-card', -50, 0, 0, -50, -50, null);

-- Cancelled AFTER the money moved, which is the order it happens in real life.
update public.bookings set status = 'cancelled'
 where id in ('00000000-0000-0000-0000-0000002cb001',
              '00000000-0000-0000-0000-0000002cb002',
              '00000000-0000-0000-0000-0000002cb003');

do $$
declare
  v_fac   uuid := '00000000-0000-0000-0000-0000002ca020';
  v_from  timestamptz := '2031-03-01';
  v_to    timestamptz := '2031-04-01';
  v_svc   jsonb;
  v_loc   jsonb;
  v_mix   jsonb;
  v_val   jsonb;
begin
  v_svc := public.facility_report_dataset(v_fac, 'revenue-by-service', v_from, v_to, v_from, v_to);
  v_loc := public.facility_report_dataset(v_fac, 'revenue-by-location', v_from, v_to, v_from, v_to);
  v_mix := public.facility_report_dataset(v_fac, 'service-mix-by-location', v_from, v_to, v_from, v_to);
  v_val := public.facility_report_dataset(v_fac, 'customer-value', v_from, v_to, v_from, v_to);

  -- ── revenue-by-service ──────────────────────────────────────────────────
  perform pg_temp.t(1, 'R1  revenue-by-service keeps the money on cancelled bookings',
    (select sum((r->>'revenue')::numeric) from jsonb_array_elements(v_svc->'current') r) = 310,
    format('got %s, want 310', (select sum((r->>'revenue')::numeric) from jsonb_array_elements(v_svc->'current') r)));

  perform pg_temp.t(2, 'R2  ...and still counts only the booking that was served',
    (select sum((r->>'bookings')::numeric) from jsonb_array_elements(v_svc->'current') r) = 1,
    format('got %s, want 1', (select sum((r->>'bookings')::numeric) from jsonb_array_elements(v_svc->'current') r)));

  perform pg_temp.t(3, 'R3  an unpaid cancellation adds no row of its own',
    jsonb_array_length(v_svc->'current') = 1,
    format('%s row(s): %s', jsonb_array_length(v_svc->'current'), v_svc->'current'));

  -- ── revenue-by-location ─────────────────────────────────────────────────
  perform pg_temp.t(4, 'R4  revenue-by-location agrees on the total',
    (select sum((r->>'revenue')::numeric) from jsonb_array_elements(v_loc->'current') r) = 310,
    format('got %s, want 310', (select sum((r->>'revenue')::numeric) from jsonb_array_elements(v_loc->'current') r)));

  perform pg_temp.t(5, 'R5  ...and on the count',
    (select sum((r->>'bookings')::numeric) from jsonb_array_elements(v_loc->'current') r) = 1,
    format('got %s, want 1', (select sum((r->>'bookings')::numeric) from jsonb_array_elements(v_loc->'current') r)));

  -- ── service-mix-by-location ─────────────────────────────────────────────
  perform pg_temp.t(6, 'R6  service-mix-by-location agrees on the total',
    (select sum((r->>'revenue')::numeric) from jsonb_array_elements(v_mix->'current') r) = 310,
    format('got %s, want 310', (select sum((r->>'revenue')::numeric) from jsonb_array_elements(v_mix->'current') r)));

  perform pg_temp.t(7, 'R7  ...and on the count',
    (select sum((r->>'bookings')::numeric) from jsonb_array_elements(v_mix->'current') r) = 1,
    format('got %s, want 1', (select sum((r->>'bookings')::numeric) from jsonb_array_elements(v_mix->'current') r)));

  -- ── customer-value ──────────────────────────────────────────────────────
  --
  -- Only booking D is not cancelled, so this branch sees $200 paid and $50
  -- refunded. Gross would read 200; net reads 150. That difference is the bug.
  perform pg_temp.t(8, 'R8  customer-value nets the refund off what was spent',
    (select sum((r->>'totalSpent')::numeric) from jsonb_array_elements(v_val->'customers') r) = 150,
    format('got %s, want 150', (select sum((r->>'totalSpent')::numeric) from jsonb_array_elements(v_val->'customers') r)));
end $$;

-- ── Results ────────────────────────────────────────────────────────────────

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise warning '% assertion(s) FAILED', v_failed;
  else
    raise warning 'all % assertions passed', (select count(*) from tap);
  end if;
end $$;

select n, case when ok then 'PASS' else 'FAIL' end as result, name, detail
  from tap order by n;

rollback;
