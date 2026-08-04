-- ============================================================================
-- A booking is paid when the ledger says so
-- (20260806680000 + 20260806700000 + 20260806720000 + 20260806740000).
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/booking-payment-derivation.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. THE NUMBER MOVES (P1/P2/P3). The positive control, and the one that has
--    to come first: a derivation that answered 'pending' unconditionally would
--    make most of the denials below pass. A booking starts at zero, a full
--    payment settles it, and a PART payment moves the figure without settling
--    anything — so the number is real, not a flag in disguise.
--
-- 2. A TIP DOES NOT PAY THE BILL (P4). `grand_total = subtotal + tax + tip`,
--    so the naive sum lets a generous tip close a shortfall. $80 against a
--    $100 booking with a $25 tip is $105 received and $20 still owed.
--
-- 3. CREDIT AND PASSES DO PAY IT (P5). They reduce what the CARD is asked for,
--    not what the customer owes — which is why the measure is `grand_total`
--    and not `amount_charged`. A booking settled entirely with store credit is
--    settled.
--
-- 4. NOBODY CAN SAY OTHERWISE (P6). Not a customer, not staff with
--    `edit_bookings`, not the seed path. The seed is the pointed one: thirteen
--    bookings claiming $790.75 with an empty ledger is what the old rule
--    produced, and it produced it silently.
--
-- 5. A REFUND IS NOT THE SAME AS NEVER PAYING (P7). Paid then fully refunded
--    sums to ZERO, exactly like a booking nobody paid. One needs chasing and
--    one is closed. This is the bug 20260806740000 exists for, and it was
--    found by writing this test rather than by reading the code.
--
-- 6. THE CASHIER IS NOT A BOOKING EDITOR (P8). `retail` holds
--    `financial_take_payment` and NOT `edit_bookings` — a real preset, not a
--    hypothetical. Without the DEFINER trigger the booking would never move
--    and nothing would raise; without the pass-through in
--    `enforce_booking_integrity` the payment itself would be refused. Both
--    halves are load-bearing and this is the test that would catch either.
--
-- 7. THE STATUS SURVIVES A READER WHO CANNOT SEE MONEY (P9). A groomer has no
--    `financial_view_amounts`, so a read-time `sum(payments)` would return
--    ZERO for them and every paid booking would read 'pending'. Not an error —
--    a wrong answer. This is why the figure is denormalised onto the booking.
--
-- 8. THE DERIVATION IS NOT A PUBLIC API (P10). Both helpers see every payment
--    regardless of the caller, so being able to call them would be a way to
--    ask "how much has been paid" without the permission that question needs.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000001c0001', 'pay-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001c0002', 'pay-retail@example.invalid'),
  ('00000000-0000-0000-0000-0000001c0003', 'pay-acct@example.invalid'),
  ('00000000-0000-0000-0000-0000001c0004', 'pay-groomer@example.invalid'),
  ('00000000-0000-0000-0000-0000001c0005', 'pay-customer@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001c0001', 'pay-owner@example.invalid',   'Owner'),
  ('00000000-0000-0000-0000-0000001c0002', 'pay-retail@example.invalid',  'Retail'),
  ('00000000-0000-0000-0000-0000001c0003', 'pay-acct@example.invalid',    'Accountant'),
  ('00000000-0000-0000-0000-0000001c0004', 'pay-groomer@example.invalid', 'Groomer'),
  ('00000000-0000-0000-0000-0000001c0005', 'pay-customer@example.invalid','Customer')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001c0010', 'Pay Org', 'pay-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001c0020', '00000000-0000-0000-0000-0000001c0010',
   'Pay Facility', 'pay-a', 'pay-a')
on conflict do nothing;

-- retail:     financial_take_payment, NO edit_bookings, NO process_refund
-- accountant: financial_take_payment + process_refund, NO edit_bookings
-- groomer:    view_bookings, NO financial_view_amounts
insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001c0030', '00000000-0000-0000-0000-0000001c0020',
   '00000000-0000-0000-0000-0000001c0001', 'owner', true),
  ('00000000-0000-0000-0000-0000001c0031', '00000000-0000-0000-0000-0000001c0020',
   '00000000-0000-0000-0000-0000001c0002', 'retail', true),
  ('00000000-0000-0000-0000-0000001c0032', '00000000-0000-0000-0000-0000001c0020',
   '00000000-0000-0000-0000-0000001c0003', 'accountant', true),
  ('00000000-0000-0000-0000-0000001c0033', '00000000-0000-0000-0000-0000001c0020',
   '00000000-0000-0000-0000-0000001c0004', 'groomer', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000001c0040', '00000000-0000-0000-0000-0000001c0020',
   'Payer', 'pay-c1@example.invalid', '00000000-0000-0000-0000-0000001c0005');

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
end $$;

/** A $100 confirmed booking, written straight to the table as the owner. */
create or replace function pg_temp.new_booking(p_total numeric default 100)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at,
     base_price, discount, total_cost)
  values
    ('00000000-0000-0000-0000-0000001c0020', '00000000-0000-0000-0000-0000001c0040',
     'daycare', 'confirmed', now() + interval '1 day', now() + interval '1 day 8 hours',
     p_total, 0, p_total)
  returning id into v_id;
  return v_id;
end $$;

/** A payment row. Signed: negative is a refund. */
create or replace function pg_temp.pay(
  p_booking uuid, p_subtotal numeric, p_tip numeric default 0,
  p_credit numeric default 0, p_pass numeric default 0,
  p_method text default 'new-card')
returns void language plpgsql as $$
declare v_grand numeric := p_subtotal + p_tip;
begin
  insert into public.payments
    (facility_id, booking_id, client_id, method,
     subtotal, tax, tip, store_credit_applied, package_pass_applied,
     loyalty_discount_applied, amount_charged, grand_total,
     cash_received, receipt_channels, author_name)
  values
    ('00000000-0000-0000-0000-0000001c0020', p_booking,
     '00000000-0000-0000-0000-0000001c0040', p_method,
     p_subtotal, 0, p_tip, p_credit, p_pass, 0,
     v_grand - p_credit - p_pass, v_grand,
     case when p_method = 'cash' then v_grand - p_credit - p_pass else null end,
     '{}', 'Test');
end $$;

-- ── P1: a booking starts owing everything ──────────────────────────────────
do $$
declare v_b uuid; r public.bookings;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;
  v_b := pg_temp.new_booking(100);
  reset role;

  select * into r from public.bookings where id = v_b;
  perform pg_temp.t('P1  a new booking is pending, and nothing has been paid',
    r.payment_status = 'pending' and r.amount_paid = 0,
    format('status=%s paid=%s', r.payment_status, r.amount_paid));
exception when others then
  reset role; perform pg_temp.t('P1  a new booking', false, sqlerrm);
end $$;

-- ── P2: paying it settles it ───────────────────────────────────────────────
do $$
declare v_b uuid; r public.bookings;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;
  v_b := pg_temp.new_booking(100);
  perform pg_temp.pay(v_b, 100);
  reset role;

  select * into r from public.bookings where id = v_b;
  perform pg_temp.t('P2  a payment for the full amount settles the booking',
    r.payment_status = 'paid' and r.amount_paid = 100,
    format('status=%s paid=%s', r.payment_status, r.amount_paid));
exception when others then
  reset role; perform pg_temp.t('P2  a full payment', false, sqlerrm);
end $$;

-- ── P3: a part payment moves the figure and settles nothing ────────────────
do $$
declare v_b uuid; r public.bookings;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;
  v_b := pg_temp.new_booking(100);
  perform pg_temp.pay(v_b, 40);
  reset role;

  select * into r from public.bookings where id = v_b;
  -- 'pending' rather than a fourth status: see Decision 3 in 20260806680000.
  -- The FIGURE is what carries the detail, and it has to be right.
  perform pg_temp.t('P3  $40 of $100 moves the figure without settling the booking',
    r.payment_status = 'pending' and r.amount_paid = 40,
    format('status=%s paid=%s', r.payment_status, r.amount_paid));
exception when others then
  reset role; perform pg_temp.t('P3  a part payment', false, sqlerrm);
end $$;

-- ── P4: a tip is not payment toward the bill ───────────────────────────────
do $$
declare v_b uuid; r public.bookings;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;
  v_b := pg_temp.new_booking(100);
  -- $105 received: $80 against the bill and a $25 tip.
  perform pg_temp.pay(v_b, 80, 25);
  reset role;

  select * into r from public.bookings where id = v_b;
  perform pg_temp.t('P4  a $25 tip does not close a $20 shortfall',
    r.payment_status = 'pending' and r.amount_paid = 80,
    format('status=%s paid=%s (sum of grand_total would be 105)',
           r.payment_status, r.amount_paid));
exception when others then
  reset role; perform pg_temp.t('P4  a tip', false, sqlerrm);
end $$;

-- ── P5: store credit and passes settle the bill ────────────────────────────
do $$
declare v_b uuid; r public.bookings; v_charged numeric;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;
  v_b := pg_temp.new_booking(100);
  -- Entirely store credit: the card is charged nothing.
  perform pg_temp.pay(v_b, 100, 0, 100);
  reset role;

  select * into r from public.bookings where id = v_b;
  select amount_charged into v_charged from public.payments where booking_id = v_b;
  perform pg_temp.t('P5  a booking settled with store credit is settled, though the card took nothing',
    r.payment_status = 'paid' and r.amount_paid = 100 and v_charged = 0,
    format('status=%s paid=%s charged=%s', r.payment_status, r.amount_paid, v_charged));
exception when others then
  reset role; perform pg_temp.t('P5  store credit', false, sqlerrm);
end $$;

-- ── P6: nobody may declare a booking paid ──────────────────────────────────
--
-- The owner has `edit_bookings`, so the UPDATE is ALLOWED and matches its row.
-- It is not refused — it is overwritten, which is the distinction that matters:
-- a refusal would surface as an error, and this has to hold when nothing
-- surfaces at all.
do $$
declare v_b uuid; r public.bookings;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;
  v_b := pg_temp.new_booking(100);
  update public.bookings set payment_status = 'paid', amount_paid = 100
   where id = v_b;
  reset role;

  select * into r from public.bookings where id = v_b;
  perform pg_temp.t('P6  an owner with edit_bookings cannot declare a booking paid',
    r.payment_status = 'pending' and r.amount_paid = 0,
    format('status=%s paid=%s', r.payment_status, r.amount_paid));
exception when others then
  reset role; perform pg_temp.t('P6  declaring paid', false, sqlerrm);
end $$;

-- ── P7: refunded is not the same as never paid ─────────────────────────────
do $$
declare v_paid uuid; v_never uuid; r_paid public.bookings; r_never public.bookings;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;

  v_paid  := pg_temp.new_booking(100);
  v_never := pg_temp.new_booking(100);

  perform pg_temp.pay(v_paid, 100);
  reset role;

  -- The refund needs `process_refund`, which the owner has and retail does not.
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0003');
  set local role authenticated;
  perform pg_temp.pay(v_paid, -100);
  reset role;

  select * into r_paid  from public.bookings where id = v_paid;
  select * into r_never from public.bookings where id = v_never;

  -- Both sum to zero. Only the ledger's SHAPE tells them apart.
  perform pg_temp.t('P7  paid then refunded reads refunded, not pending',
    r_paid.payment_status = 'refunded' and r_paid.amount_paid = 0,
    format('status=%s paid=%s', r_paid.payment_status, r_paid.amount_paid));
  perform pg_temp.t('P7b a booking nobody paid still reads pending, on the same total',
    r_never.payment_status = 'pending' and r_never.amount_paid = 0,
    format('status=%s paid=%s', r_never.payment_status, r_never.amount_paid));
exception when others then
  reset role; perform pg_temp.t('P7  refund', false, sqlerrm);
end $$;

-- ── P7c: a part refund leaves a balance, so it is not closed ───────────────
do $$
declare v_b uuid; r public.bookings;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;
  v_b := pg_temp.new_booking(100);
  perform pg_temp.pay(v_b, 100);
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0003');
  set local role authenticated;
  perform pg_temp.pay(v_b, -30);
  reset role;

  select * into r from public.bookings where id = v_b;
  perform pg_temp.t('P7c $30 back on a $100 booking leaves it owing, not closed',
    r.payment_status = 'pending' and r.amount_paid = 70,
    format('status=%s paid=%s', r.payment_status, r.amount_paid));
exception when others then
  reset role; perform pg_temp.t('P7c part refund', false, sqlerrm);
end $$;

-- ── P8: a cashier without edit_bookings still moves the booking ────────────
--
-- The whole reason `payment_moves_the_booking` is DEFINER and
-- `enforce_booking_integrity` has a pass-through. `retail` is a shipped preset
-- with `financial_take_payment` and no `edit_bookings`.
do $$
declare v_b uuid; r public.bookings; v_can_edit boolean;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;
  v_b := pg_temp.new_booking(100);
  reset role;

  -- The booking is CHECKED IN: past the point where the customer path in
  -- enforce_booking_integrity raises "This booking can no longer be changed".
  update public.bookings set status = 'checked_in' where id = v_b;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0002');
  set local role authenticated;
  v_can_edit := private.has_permission(
    '00000000-0000-0000-0000-0000001c0020', 'edit_bookings');
  perform pg_temp.pay(v_b, 100, 0, 0, 0, 'cash');
  reset role;

  select * into r from public.bookings where id = v_b;
  perform pg_temp.t('P8  retail cannot edit bookings (the precondition)',
    v_can_edit = false, format('edit_bookings=%s', v_can_edit));
  perform pg_temp.t('P8b retail takes the payment and the CHECKED-IN booking moves anyway',
    r.payment_status = 'paid' and r.amount_paid = 100,
    format('status=%s paid=%s', r.payment_status, r.amount_paid));
exception when others then
  reset role; perform pg_temp.t('P8  cashier', false, sqlerrm);
end $$;

-- ── P9: the status survives a reader who cannot see the money ──────────────
--
-- A groomer has `view_bookings` and NOT `financial_view_amounts`. Under a
-- read-time `sum(payments)` they would see zero rows and read 'pending' on a
-- booking that is paid — no error, just a wrong number.
do $$
declare v_b uuid; v_status text; v_visible integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;
  v_b := pg_temp.new_booking(100);
  perform pg_temp.pay(v_b, 100);
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0004');
  set local role authenticated;
  select payment_status into v_status from public.bookings where id = v_b;
  select count(*) into v_visible from public.payments where booking_id = v_b;
  reset role;

  perform pg_temp.t('P9  a groomer cannot see the payment row (the precondition)',
    v_visible = 0, format('visible payments=%s', v_visible));
  perform pg_temp.t('P9b and still reads the booking as paid',
    v_status = 'paid', format('status=%s', v_status));
exception when others then
  reset role; perform pg_temp.t('P9  groomer read', false, sqlerrm);
end $$;

-- ── P10: the derivation helpers are not callable ───────────────────────────
do $$
declare v_amount boolean; v_refunded boolean;
begin
  v_amount := has_function_privilege(
    'authenticated', 'private.booking_amount_paid(uuid)', 'execute');
  v_refunded := has_function_privilege(
    'authenticated', 'private.booking_was_refunded(uuid)', 'execute');

  perform pg_temp.t('P10 booking_amount_paid is granted to nobody',
    v_amount = false, format('authenticated can execute=%s', v_amount));
  perform pg_temp.t('P10b booking_was_refunded is granted to nobody',
    v_refunded = false, format('authenticated can execute=%s', v_refunded));
exception when others then
  perform pg_temp.t('P10 grants', false, sqlerrm);
end $$;

-- ── P11: create_booking refuses the column outright ────────────────────────
--
-- Not silently discarded. A caller who thinks they are setting it gets a
-- sentence naming the column, which is the difference between a bug found in
-- five seconds and one found in production.
do $$
declare v_raised boolean := false; v_msg text := '';
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;
  begin
    perform public.create_booking(jsonb_build_object(
      'facility_id', '00000000-0000-0000-0000-0000001c0020',
      'client_id',   '00000000-0000-0000-0000-0000001c0040',
      'service',     'daycare',
      'status',      'confirmed',
      'payment_status', 'paid',
      'start_at',    '2026-09-01T09:00:00Z',
      'end_at',      '2026-09-01T17:00:00Z',
      'base_price',  100, 'discount', 0, 'total_cost', 100
    ));
  exception when others then
    v_raised := true; v_msg := sqlerrm;
  end;
  reset role;

  perform pg_temp.t('P11 create_booking names payment_status as a column it does not handle',
    v_raised and v_msg like '%payment_status%', format('raised=%s msg=%s', v_raised, v_msg));
exception when others then
  reset role; perform pg_temp.t('P11 rejected column', false, sqlerrm);
end $$;

-- ── R1: a refund can go back as store credit ───────────────────────────────
--
-- `CancelBookingModal` and `RefundModal` have always offered the choice, and
-- until 20260806760000 `record_payment` could only do the card half — the
-- store-credit option would have recorded a refund and granted nothing. Both
-- rows are written in one transaction, so a refund that says it gave credit
-- cannot exist without the credit.
do $$
declare v_b uuid; v_bal numeric; r public.bookings; v_entries integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;
  v_b := pg_temp.new_booking(100);
  perform pg_temp.pay(v_b, 100);
  reset role;

  -- Refunds need `process_refund`; the accountant has it, retail does not.
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0003');
  set local role authenticated;
  perform public.record_payment(
    '00000000-0000-0000-0000-0000001c0020', 'store-credit',
    -100, 0, 0, -100, -100,
    v_b, '00000000-0000-0000-0000-0000001c0040',
    0, 0, 0, null, null, null, '{}', 'goodwill');
  reset role;

  select coalesce(sum(amount), 0) into v_bal
    from public.store_credit_entries
   where client_id = '00000000-0000-0000-0000-0000001c0040';
  select count(*) into v_entries
    from public.store_credit_entries
   where client_id = '00000000-0000-0000-0000-0000001c0040' and reason = 'refund';
  select * into r from public.bookings where id = v_b;

  perform pg_temp.t('R1  a refund to store credit lands on the balance',
    v_bal = 100 and v_entries = 1,
    format('balance=%s refund entries=%s', v_bal, v_entries));
  perform pg_temp.t('R1b and the booking reads refunded, not merely unpaid',
    r.payment_status = 'refunded' and r.amount_paid = 0,
    format('status=%s paid=%s', r.payment_status, r.amount_paid));
exception when others then
  reset role; perform pg_temp.t('R1  refund to credit', false, sqlerrm);
end $$;

-- ── R2: giving money back is still an authority ────────────────────────────
--
-- The new branch must not have become a way around `process_refund`. `retail`
-- can take payments all day and cannot give a penny back, in either currency.
do $$
declare v_b uuid; v_err text := 'no error'; v_entries integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;
  v_b := pg_temp.new_booking(100);
  perform pg_temp.pay(v_b, 100);
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0002');
  set local role authenticated;
  begin
    perform public.record_payment(
      '00000000-0000-0000-0000-0000001c0020', 'store-credit',
      -100, 0, 0, -100, -100,
      v_b, '00000000-0000-0000-0000-0000001c0040',
      0, 0, 0, null, null, null, '{}', 'nope');
  exception when others then v_err := sqlerrm;
  end;
  reset role;

  select count(*) into v_entries
    from public.store_credit_entries
   where booking_id = v_b;

  perform pg_temp.t('R2  retail cannot refund to store credit, and grants nothing',
    v_err <> 'no error' and v_entries = 0,
    format('err=%s entries=%s', left(v_err, 50), v_entries));
end $$;

-- ── R3: the sign is what tells the two apart ───────────────────────────────
--
-- `method = 'store-credit'` on a POSITIVE payment means paid WITH credit, and
-- must still deduct. If the new branch had keyed on the method alone, this
-- would grant instead — the same fact read backwards.
do $$
declare v_b uuid; v_bal numeric;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;
  v_b := pg_temp.new_booking(100);
  perform public.record_payment(
    '00000000-0000-0000-0000-0000001c0020', 'store-credit',
    30, 0, 0, 0, 30,
    v_b, '00000000-0000-0000-0000-0000001c0040',
    30, 0, 0, null, null, null, '{}', 'spend');
  reset role;

  select coalesce(sum(amount), 0) into v_bal
    from public.store_credit_entries where booking_id = v_b;

  perform pg_temp.t('R3  paying WITH store credit still deducts it',
    v_bal = -30, format('ledger movement=%s', v_bal));
exception when others then
  reset role; perform pg_temp.t('R3  spending credit', false, sqlerrm);
end $$;

-- ── B1/B2: a batch is one transaction, and skips what owes nothing ─────────
--
-- `settle_bookings` (20260806800000) is what the client overview's "Collect
-- Payment" button calls. Three bookings, one of them already paid: two
-- payments recorded, the settled one absent from the result rather than
-- charged again.
do $$
declare a uuid; b uuid; c uuid; v_out jsonb; v_rows integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;
  a := pg_temp.new_booking(50);
  b := pg_temp.new_booking(30);
  c := pg_temp.new_booking(20);
  perform pg_temp.pay(c, 20);

  v_out := public.settle_bookings(
    '00000000-0000-0000-0000-0000001c0020', 'terminal', array[a, b, c]);
  reset role;

  select count(*) into v_rows from public.payments where booking_id in (a, b, c);

  perform pg_temp.t('B1  the batch returns what it took, and skips the settled one',
    jsonb_array_length(v_out) = 2,
    format('returned=%s', v_out));
  perform pg_temp.t('B2  three bookings, three payment rows, none charged twice',
    v_rows = 3, format('payment rows=%s', v_rows));
exception when others then
  reset role; perform pg_temp.t('B1  batch', false, sqlerrm);
end $$;

-- ── B3: a stale screen cannot overcharge ───────────────────────────────────
--
-- The reason the RPC takes booking ids and NOT amounts (Decision 1). The
-- dialog may have been open while somebody else took $70 of a $100 booking.
do $$
declare a uuid; v_out jsonb; v_taken numeric;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;
  a := pg_temp.new_booking(100);
  perform pg_temp.pay(a, 70);
  v_out := public.settle_bookings(
    '00000000-0000-0000-0000-0000001c0020', 'e-transfer', array[a]);
  reset role;

  v_taken := (v_out->0->>'amount')::numeric;
  perform pg_temp.t('B3  $30 is taken, not the $100 the screen was showing',
    v_taken = 30, format('taken=%s', v_taken));
exception when others then
  reset role; perform pg_temp.t('B3  stale screen', false, sqlerrm);
end $$;

-- ── B4: a booking from elsewhere takes the whole batch down ────────────────
do $$
declare a uuid; v_err text := 'no error'; v_rows integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;
  a := pg_temp.new_booking(40);
  begin
    -- A facility this booking does not belong to.
    perform public.settle_bookings(
      '00000000-0000-0000-0000-0000001c0021', 'cash', array[a]);
  exception when others then v_err := sqlerrm;
  end;
  reset role;

  select count(*) into v_rows from public.payments where booking_id = a;
  perform pg_temp.t('B4  a foreign facility id raises and takes nothing',
    v_err <> 'no error' and v_rows = 0,
    format('err=%s rows=%s', left(v_err, 50), v_rows));
end $$;

-- ── B5: retail can settle a batch, the receptionist''s daily job ───────────
do $$
declare a uuid; b uuid; v_out jsonb;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;
  a := pg_temp.new_booking(15);
  b := pg_temp.new_booking(25);
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0002');
  set local role authenticated;
  v_out := public.settle_bookings(
    '00000000-0000-0000-0000-0000001c0020', 'cash', array[a, b]);
  reset role;

  perform pg_temp.t('B5  retail settles a batch with financial_take_payment alone',
    jsonb_array_length(v_out) = 2, format('returned=%s', v_out));
exception when others then
  reset role; perform pg_temp.t('B5  retail batch', false, sqlerrm);
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
