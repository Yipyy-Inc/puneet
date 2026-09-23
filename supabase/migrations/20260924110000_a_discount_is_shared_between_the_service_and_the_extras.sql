-- ============================================================================
-- A discount comes off the WHOLE bill, so commission may only lose the
-- SERVICE's share of it.
--
-- ── WHAT WAS WRONG ────────────────────────────────────────────────────────
--
-- `derive_booking_commission` (20260923220000) computed
--
--     basis = greatest(0, total_cost - discount)
--
-- while `amount_due` is `greatest(0, total_cost + extras_total - discount)`.
-- The customer's discount is taken off a bill that includes the extras; the
-- groomer's basis had the same discount taken off the service ALONE. On any
-- booking carrying a service charge, the commissionable base fell by more
-- than the discount's share of it, and the staff member was underpaid.
--
-- $200 of grooming, a $50 cleaning fee, $40 off. The customer owes $210.
--   before: basis 200 - 40        = 160.00, at 10% = $16.00
--   after:  basis 200 - 40 * 0.8  = 168.00, at 10% = $16.80
--
-- Eighty cents on one booking. It is a rate, not an incident: every
-- discounted booking with an extra on it was short by the same fraction.
--
-- ── WHY PROPORTIONAL, AND NOT A CHOICE ────────────────────────────────────
--
-- Nothing on the booking records WHICH part of the bill a discount discounted
-- — `bookings.discount` is one number against the whole thing. The codebase
-- has already answered this exact question twice, and both times the same
-- way:
--
--   * `src/lib/tax/service-tax.ts`: "a part payment does not say which part
--     it settled. Neither does a discount" — so it allocates in proportion.
--   * The taxable base lowers PROPORTIONALLY for the same `bookings.discount`.
--
-- So this is not a new policy. It is commission being made to agree with tax
-- about what one discount did, which is the only defensible answer while the
-- same $40 is being divided by two different readers of the same row.
--
-- ── A NOTE ON THE VERSION NUMBER ──────────────────────────────────────────
--
-- This is 20260924110000 and it was written on 2026-09-23. The three
-- migrations of that day (…0924090000, …0924100000, this one) ran a day ahead
-- of the calendar and were applied under those names, so the versions stand:
-- they are ordering identifiers, they are unique, and one of them is already
-- pushed. Every DATE in the prose here is the real one.
--
-- ── THE OTHER HALF OF THE 2026-09-23 DISCOUNT AUDIT ───────────────────────
--
-- 20260924100000 made `total_cost` GROSS because the booking form was writing
-- it NET while `amount_due` subtracted the discount again. Commission read
-- the same column, so it was losing the discount twice as well — a $75 groom
-- with $11.25 off gave a basis of 63.75 - 11.25 = 52.50 instead of 63.75.
-- That half is already fixed by the convention. This is the half the
-- convention does not reach.
--
-- ── WHAT DOES NOT CHANGE ──────────────────────────────────────────────────
--
-- Extras are still not commissionable: `extras_total` enters the arithmetic
-- only to WEIGH the discount, never as revenue. T1 of
-- `supabase/tests/booking-commission.sql` still asserts exactly that, and is
-- untouched. `paid_share`, the manual-row guard, the reassignment sweep and
-- the "no row rather than a row of zero" rule are all unchanged.
--
-- Rows already PAID are history: the `where ... paid_at is null` guard on the
-- upsert means this corrects only what has not been paid out yet.
-- ============================================================================

create or replace function private.derive_booking_commission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gross  numeric(12,4);
  v_basis  numeric(10,2);
  v_rate   numeric;
  v_share  numeric;
  v_amount numeric(10,2);
begin
  -- A person decided this one. Quietly rewriting somebody's decision about
  -- money is worse than leaving it — 20260827140000 reached the same answer
  -- for tips and reports a discrepancy instead.
  if exists (
    select 1 from public.booking_commission_allocations a
     where a.booking_id = new.id and a.source = 'manual'
  ) then
    return new;
  end if;

  -- Nobody to pay, or a booking that no longer earns anything.
  if new.assigned_staff_id is null or new.status = 'cancelled' then
    delete from public.booking_commission_allocations a
     where a.booking_id = new.id and a.source = 'auto';
    return new;
  end if;

  -- ── THE SERVICE, LESS ITS OWN SHARE OF THE DISCOUNT ────────────────────
  --
  -- `v_gross` is the bill BEFORE the discount: the service plus the extras.
  -- The service's share of it is what the discount is weighed by. Extras are
  -- weight here and nothing else — they never enter the basis as revenue.
  --
  -- With no extras, `total_cost / v_gross` is 1 and this is the old formula
  -- exactly, which is why no booking without a service charge moves.
  v_gross := coalesce(new.total_cost, 0) + coalesce(new.extras_total, 0);
  v_basis := case
    when v_gross <= 0 then 0
    else greatest(
      0,
      round(
        coalesce(new.total_cost, 0)
          - coalesce(new.discount, 0) * (coalesce(new.total_cost, 0) / v_gross),
        2)
    )
  end;

  -- How much of the bill has actually been paid. `amount_paid` is derived
  -- from the payments ledger, so a refund lowers it and this follows.
  v_share := case
    when coalesce(new.amount_due, 0) <= 0 then 0
    else least(1, greatest(0, coalesce(new.amount_paid, 0) / new.amount_due))
  end;

  v_rate := private.staff_commission_rate(new.assigned_staff_id, new.service);
  v_amount := round(v_basis * (v_rate / 100) * v_share, 2);

  -- A rate of zero, an unpaid booking, or a fully discounted one all land
  -- here. NO ROW rather than a row of 0: "owed nothing" and "not worked out
  -- yet" must not look the same in a payout report.
  if v_amount <= 0 then
    delete from public.booking_commission_allocations a
     where a.booking_id = new.id and a.source = 'auto';
    return new;
  end if;

  insert into public.booking_commission_allocations
    (booking_id, facility_id, staff_id, basis, rate, paid_share, amount, source)
  values
    (new.id, new.facility_id, new.assigned_staff_id,
     v_basis, v_rate, round(v_share, 4), v_amount, 'auto')
  on conflict (booking_id, staff_id) do update
    set basis      = excluded.basis,
        rate       = excluded.rate,
        paid_share = excluded.paid_share,
        amount     = excluded.amount,
        updated_at = now()
  -- A row somebody has already been PAID is history, not a working figure.
  where public.booking_commission_allocations.source = 'auto'
    and public.booking_commission_allocations.paid_at is null;

  -- Reassigned to somebody else: the previous person's automatic row goes.
  delete from public.booking_commission_allocations a
   where a.booking_id = new.id
     and a.staff_id <> new.assigned_staff_id
     and a.source = 'auto'
     and a.paid_at is null;

  return new;
end;
$$;

comment on column public.booking_commission_allocations.basis is
  'The SERVICE this commission was worked out on: total_cost less the service''s OWN share of the discount, weighed by total_cost / (total_cost + extras_total). Service charges are never commissionable revenue — they appear in that weight and nowhere else. Proportional since 20260924110000, to agree with how the same discount lowers the taxable base.';
