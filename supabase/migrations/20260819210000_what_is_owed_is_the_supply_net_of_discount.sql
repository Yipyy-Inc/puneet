-- ============================================================================
-- What is owed is the SUPPLY, net of the discount. Tax and tip are neither.
--
-- ── TWO BUGS, ONE CAUSE ───────────────────────────────────────────────────
--
-- `amount_due` was generated as `total_cost + extras_total`, and both faults
-- follow from what that expression leaves out.
--
-- THE DISCOUNT WAS NEVER GIVEN. A facility could set `discount = 10.00`, the
-- screen showed the line, and the customer was charged the full amount anyway
-- because nothing that decides what to collect ever read the column.
--
-- THE TAX MADE EVERY BOOKING LOOK OVERPAID. Since 20260819 the terminal charges
-- subtotal + tax, and `booking_amount_paid()` counted `grand_total - tip` --
-- which includes the tax -- against an `amount_due` that excludes it. Booking
-- 1013: due 120.00, paid 137.97, balance -17.97, exactly its GST and QST. The
-- booking still read "paid", so nothing failed loudly; the books simply showed
-- a credit that does not exist, and a refund computed from that balance would
-- have been wrong.
--
-- ── THE RULE THIS SETTLES ─────────────────────────────────────────────────
--
-- `amount_due` and `amount_paid` are both the SUPPLY: the service, plus what
-- was added at the counter, less the discount. Tax and tip are recorded on the
-- payment row and stay out of the booking's balance.
--
-- Tax cannot live in `amount_due` even if it were wanted there: the rate is per
-- facility, in `facility_settings`, and a generated column cannot read another
-- table. That constraint is what makes this the right split rather than merely
-- a convenient one -- and tax belongs on the payment anyway, because that is
-- what gets remitted.
-- ============================================================================

-- ── 1. The discount is subtracted, and cannot make the total negative ──────
--
-- No index, view, policy or constraint referenced this column, so it can be
-- replaced rather than worked around. `greatest(0, ...)` because a discount
-- larger than the price is a data-entry error, not a debt owed to the customer.
alter table public.bookings drop column amount_due;

alter table public.bookings
  add column amount_due numeric(10, 2)
  generated always as (
    greatest(0::numeric, total_cost + extras_total - coalesce(discount, 0))
  ) stored;

comment on column public.bookings.amount_due is
  'What the booking COSTS, net of discount and before tax: total_cost + extras_total - discount. Not the outstanding balance -- subtract amount_paid for that. Tax is never here; it is per-facility and lives on the payment. See 20260819210000.';

-- ── 2. What was paid TOWARD the supply, which is not what was charged ──────
--
-- Was `grand_total - tip`. The tip was already excluded for this exact reason;
-- the tax simply had not existed yet when this was written.
create or replace function private.booking_amount_paid(p_booking_id uuid)
returns numeric
language sql
stable
set search_path to ''
as $$
  select coalesce(sum(p.grand_total - p.tip - p.tax), 0)::numeric(10,2)
    from public.payments p
   where p.booking_id = p_booking_id;
$$;

comment on function private.booking_amount_paid(uuid) is
  'What has been paid toward the SUPPLY: grand_total less tip and tax, so it is comparable with bookings.amount_due. See 20260819210000.';

-- ── 3. "Paid" means the supply is covered ──────────────────────────────────
--
-- The status compared against `total_cost + extras_total`, which is the old
-- amount_due expression written out a second time. Left alone, a discounted
-- booking would be charged correctly and then never reach 'paid'.
create or replace function private.derive_booking_payment()
returns trigger
language plpgsql
set search_path to ''
as $$
declare
  v_due numeric(10,2) := greatest(
    0::numeric,
    new.total_cost + new.extras_total - coalesce(new.discount, 0)
  );
begin
  new.amount_paid := private.booking_amount_paid(new.id);

  new.payment_status := case
    when private.booking_was_refunded(new.id) and new.amount_paid <= 0
      then 'refunded'
    when new.amount_paid > 0 and new.amount_paid >= v_due
      then 'paid'
    else 'pending'
  end;

  return new;
end;
$$;
