-- ============================================================================
-- public.booking_commission_allocations — see
-- 20260923220000_a_commission_is_owed_to_somebody.sql
--
--   bun run test:sql booking-commission
--
-- One transaction, rolled back. It builds its own staff member and booking on
-- the demo facility, so it never depends on what any suite has left behind.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- T0  NEGATIVE CONTROL, first. An unpaid booking earns NOTHING. Commission is
--     owed on money that arrived, and if this ever starts returning a row the
--     whole "paid, not owed" decision has quietly been reversed.
-- T1  THE ONE THIS MIGRATION IS FOR. A service charge is not commissionable.
--     $200 service + $50 fee at 10% earns $20, not $25. The exclusion is
--     structural — `total_cost` is the service, fees are `extras_total` — so
--     this test is what proves the structure, not a filter somebody wrote.
-- T2  Net of the service's OWN SHARE of the discount. A discount comes off
--     the whole bill, so on a booking with a fee the service loses only
--     its fraction of it. Read 160.00 until 20260924110000.
-- T2b NEGATIVE CONTROL for T2. With no fee there is nothing to share with,
--     so the whole discount comes off the service, exactly as before.
-- T3  Half paid is half earned, and the basis is remembered.
-- T4  A REFUND TAKES IT BACK. The half that rots otherwise: `amount_paid`
--     falls and the allocation must follow it down, to nothing at zero.
-- T5  A per-service override beats the general rate.
-- T6  A manual row is never rewritten by the trigger. Quietly overwriting
--     somebody's decision about money is worse than leaving it.
-- T7  Cancelling the booking removes the automatic allocation.
-- T8  The grants and the policy: no direct write, and `view_payroll` or your
--     own row to read. `revoke from public` and `from anon` are different
--     grants, so both are asserted rather than trusted.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

do $$
declare
  v_facility uuid := 'a0000000-0000-4000-8000-0000000000f1';
  v_client   uuid;
  v_staff    uuid;
  v_booking  uuid;
  v_amount   numeric;
  v_basis    numeric;
  v_rate     numeric;
  v_share    numeric;
  v_rows     integer;
  v_stamp    text := to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');
begin
  select id into v_client from public.clients
   where facility_id = v_facility order by ref limit 1;

  -- A groomer on 10%, with 25% on grooming specifically (T5).
  insert into public.staff
    (facility_id, first_name, last_name, email, primary_role, access_level, details)
  values (v_facility, 'Commission', 'Probe ' || v_stamp,
    'commission.probe.' || v_stamp || '@example.invalid', 'groomer', 'staff',
    jsonb_build_object('payroll', jsonb_build_object(
      'generalServiceCommission', 10,
      'hourlyRate', 0, 'tipsRate', 0,
      'overrides', jsonb_build_array(
        jsonb_build_object('serviceModule', 'grooming', 'commission', 25)))))
  returning id into v_staff;

  -- $200 of boarding, with a $50 service charge on top. Unpaid.
  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at,
     base_price, discount, total_cost, assigned_staff_id)
  values
    (v_facility, v_client, 'boarding', 'confirmed',
     now() + interval '300 days', now() + interval '301 days',
     200, 0, 200, v_staff)
  returning id into v_booking;

  insert into public.booking_line_items
    (booking_id, facility_id, kind, name, unit_price, quantity, fee_id)
  values
    (v_booking, v_facility, 'fee', 'Cleaning ' || v_stamp, 50, 1,
     'sqltest-fee-' || v_stamp);


  -- ── PAYMENTS ARE REAL, BECAUSE amount_paid IS DERIVED ───────────────────
  --
  -- "bookings.amount_paid" is recomputed from the payments ledger by the
  -- trigger bookings_set_derived_payment on every write, so a test that sets
  -- it directly is overwritten and proves nothing — the first draft of this
  -- file did exactly that and five assertions came back with no row at all.
  --
  -- Every figure below therefore arrives as a payments row, through
  -- payments_move_the_booking, which is the production path.

  -- ── T0 nothing is owed on a booking nobody has paid for ─────────────────
  select count(*) into v_rows from public.booking_commission_allocations
   where booking_id = v_booking;
  perform pg_temp.t(
    'T0 an unpaid booking earns no commission at all',
    v_rows = 0,
    format('%s allocation(s) for an unpaid booking', v_rows));

  -- ── T1 the service charge is not commissionable ─────────────────────────
  -- amount_due is 250 (200 service + 50 fee). Paying it in full must earn
  -- 10% of the SERVICE — $20 — and not 10% of $250.
  insert into public.payments
    (facility_id, booking_id, method, subtotal, amount_charged, grand_total)
  values (v_facility, v_booking, 'e-transfer', 250, 250, 250);

  select amount, basis, rate, paid_share
    into v_amount, v_basis, v_rate, v_share
    from public.booking_commission_allocations where booking_id = v_booking;

  perform pg_temp.t(
    'T1 a service charge is excluded from the commissionable base',
    v_amount = 20.00 and v_basis = 200.00 and v_rate = 10 and v_share = 1,
    format('amount=%s basis=%s rate=%s share=%s (25.00 would mean the fee was counted)',
      v_amount, v_basis, v_rate, v_share));

  -- ── T2 a discount is SHARED with the extras ─────────────────────────────
  --
  -- A $40 discount makes amount_due 210. The 250 already paid now overpays
  -- it, so the share clamps to 1 and only the basis moves.
  --
  -- The $40 came off a $250 bill of which the service is $200 — four
  -- fifths. Four fifths of the discount is the service's: 200 - 32 = 168.
  --
  -- THIS READ 160.00 / 16.00 UNTIL 20260924110000, which took the WHOLE
  -- discount off the service while `amount_due` took it off service + fee.
  -- The groomer was short 80c here and the same fraction on every
  -- discounted booking carrying an extra. The expectation moved because the
  -- arithmetic was wrong, not to make a change pass: proportional is what
  -- the taxable base already does with this same column, and one discount
  -- cannot mean two things on one row.
  update public.bookings set discount = 40 where id = v_booking;
  select amount, basis into v_amount, v_basis
    from public.booking_commission_allocations where booking_id = v_booking;
  perform pg_temp.t(
    'T2 the service loses only its own share of the discount',
    v_amount = 16.80 and v_basis = 168.00,
    format('amount=%s basis=%s (160.00/16.00 is the whole discount taken off the service alone)',
      v_amount, v_basis));

  -- ── T3 half paid is half earned ─────────────────────────────────────────
  --
  -- A REFUND IS A NEGATIVE PAYMENT, not a deleted one: `payments` is an
  -- append-only ledger and carries a `payments_block_delete` trigger to keep
  -- it that way. 20260827140000 says the same of tips — "a refund inserts a
  -- negative tip". So these give money back the way production does.
  --
  -- 250 paid, less 145, is 105 of a 210 bill: exactly half. Half of T2's
  -- 16.80 is 8.40 — it was 8.00 while the basis was 160.00.
  insert into public.payments
    (facility_id, booking_id, method, subtotal, amount_charged, grand_total)
  values (v_facility, v_booking, 'e-transfer', -145, -145, -145);
  select amount, paid_share into v_amount, v_share
    from public.booking_commission_allocations where booking_id = v_booking;
  perform pg_temp.t(
    'T3 half the bill paid is half the commission earned',
    v_amount = 8.40 and v_share = 0.5,
    format('amount=%s share=%s', v_amount, v_share));

  -- ── T4 a refund takes it back ───────────────────────────────────────────
  -- The remaining 105 goes back, leaving nothing paid.
  insert into public.payments
    (facility_id, booking_id, method, subtotal, amount_charged, grand_total)
  values (v_facility, v_booking, 'e-transfer', -105, -105, -105);
  select count(*) into v_rows from public.booking_commission_allocations
   where booking_id = v_booking;
  perform pg_temp.t(
    'T4 refunding everything removes the allocation, not just lowers it',
    v_rows = 0,
    format('%s allocation(s) after a full refund', v_rows));

  -- ── T5 a per-service override wins ──────────────────────────────────────
  update public.bookings set service = 'grooming', discount = 0
   where id = v_booking;
  insert into public.payments
    (facility_id, booking_id, method, subtotal, amount_charged, grand_total)
  values (v_facility, v_booking, 'e-transfer', 250, 250, 250);
  select amount, rate into v_amount, v_rate
    from public.booking_commission_allocations where booking_id = v_booking;
  perform pg_temp.t(
    'T5 the grooming override beats the general rate',
    v_rate = 25 and v_amount = 50.00,
    format('rate=%s amount=%s (10 / 20.00 would mean the override was ignored)',
      v_rate, v_amount));

  -- ── T6 a manual decision is never rewritten ─────────────────────────────
  update public.booking_commission_allocations
     set source = 'manual', amount = 99.00 where booking_id = v_booking;
  -- Half the 250 goes back. The automatic figure would fall to 25.00; this
  -- row must not move at all.
  insert into public.payments
    (facility_id, booking_id, method, subtotal, amount_charged, grand_total)
  values (v_facility, v_booking, 'e-transfer', -125, -125, -125);
  select amount into v_amount
    from public.booking_commission_allocations where booking_id = v_booking;
  perform pg_temp.t(
    'T6 the trigger leaves a manual allocation exactly as a person set it',
    v_amount = 99.00,
    format('amount=%s (a recomputed figure would be 25.00)', v_amount));

  -- ── T7 cancelling clears the automatic row ──────────────────────────────
  update public.booking_commission_allocations
     set source = 'auto' where booking_id = v_booking;
  update public.bookings set status = 'cancelled' where id = v_booking;
  select count(*) into v_rows from public.booking_commission_allocations
   where booking_id = v_booking;
  perform pg_temp.t(
    'T7 a cancelled booking owes no commission',
    v_rows = 0,
    format('%s allocation(s) on a cancelled booking', v_rows));
exception when others then
  perform pg_temp.t('T0-T7 commission', false, sqlerrm);
end $$;

-- ── T2b NEGATIVE CONTROL: with nothing to share with, nothing moves ───────
--
-- The whole risk in 20260924110000 is that it rewrote the basis for EVERY
-- booking, not only the ones carrying an extra. With `extras_total` at 0 the
-- weight `total_cost / (total_cost + extras_total)` is exactly 1, so the
-- formula collapses to the old `total_cost - discount` — and this is what
-- says so out loud, on its own booking, rather than leaving it to algebra.
do $$
declare
  v_facility uuid := 'a0000000-0000-4000-8000-0000000000f1';
  v_client   uuid;
  v_staff    uuid;
  v_booking  uuid;
  v_amount   numeric;
  v_basis    numeric;
  v_stamp    text := to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');
begin
  select id into v_client from public.clients
   where facility_id = v_facility order by ref limit 1;

  insert into public.staff
    (facility_id, first_name, last_name, email, primary_role, access_level, details)
  values (v_facility, 'Commission', 'Plain ' || v_stamp,
    'commission.plain.' || v_stamp || '@example.invalid', 'groomer', 'staff',
    jsonb_build_object('payroll', jsonb_build_object(
      'generalServiceCommission', 10, 'hourlyRate', 0, 'tipsRate', 0)))
  returning id into v_staff;

  -- $200 of boarding, $40 off, and NO service charge. amount_due is 160.
  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at,
     base_price, discount, total_cost, assigned_staff_id)
  values
    (v_facility, v_client, 'boarding', 'confirmed',
     now() + interval '302 days', now() + interval '303 days',
     200, 40, 200, v_staff)
  returning id into v_booking;

  insert into public.payments
    (facility_id, booking_id, method, subtotal, amount_charged, grand_total)
  values (v_facility, v_booking, 'e-transfer', 160, 160, 160);

  select amount, basis into v_amount, v_basis
    from public.booking_commission_allocations where booking_id = v_booking;

  perform pg_temp.t(
    'T2b with no extras the whole discount still comes off the service',
    v_amount = 16.00 and v_basis = 160.00,
    format('amount=%s basis=%s (anything else means the proportional basis moved a booking it should not touch)',
      v_amount, v_basis));
exception when others then
  perform pg_temp.t('T2b no extras', false, sqlerrm);
end $$;

-- ── T8 the grants and the policy ───────────────────────────────────────────
do $$
declare
  v_write_policies integer;
begin
  select count(*) into v_write_policies
    from pg_policy
   where polrelid = 'public.booking_commission_allocations'::regclass
     and polcmd <> 'r';

  perform pg_temp.t(
    'T8 nothing may write it directly, and anon may not read it',
    v_write_policies = 0
      and not has_table_privilege('anon',
            'public.booking_commission_allocations', 'select')
      and has_table_privilege('authenticated',
            'public.booking_commission_allocations', 'select')
      and not has_table_privilege('authenticated',
            'public.booking_commission_allocations', 'insert')
      and (select relrowsecurity from pg_class
            where oid = 'public.booking_commission_allocations'::regclass),
    format('write policies=%s anon_select=%s authed_select=%s authed_insert=%s',
      v_write_policies,
      has_table_privilege('anon', 'public.booking_commission_allocations', 'select'),
      has_table_privilege('authenticated', 'public.booking_commission_allocations', 'select'),
      has_table_privilege('authenticated', 'public.booking_commission_allocations', 'insert')));
exception when others then
  perform pg_temp.t('T8 grants', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
