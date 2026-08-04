-- ============================================================================
-- 'refunded' is a fact about the ledger's shape, not about its total.
--
-- Found while writing supabase/tests/booking-payment-derivation.sql, which is
-- the reason that file exists. 20260806680000 derived the status from the sum
-- alone:
--
--   amount_paid < 0  → 'refunded'
--
-- A booking paid $65 and then refunded $65 sums to exactly ZERO, so it read
-- 'pending' — indistinguishable from a booking nobody ever paid. To a manager
-- that is not a rounding detail: one of those needs chasing for money and the
-- other has already been settled and reversed.
--
-- Only `amount_paid < 0` — an OVER-refund — reached 'refunded', which is the
-- rarest case of the three and the one nobody would have checked.
--
-- ── THE SUM CANNOT ANSWER THIS, SO IT IS ASKED SEPARATELY ──────────────────
--
-- No amount distinguishes the two histories, because they have the same total.
-- What distinguishes them is whether money ever went back, which is a question
-- about whether a negative row EXISTS. That is a second function rather than a
-- cleverer aggregate: one returns how much, one returns whether, and neither
-- has to be read twice to understand it.
--
--   refunded  a refund exists AND nothing is left standing (amount_paid <= 0)
--   paid      amount_paid > 0 and covers total_cost
--   pending   everything else, including a PART refund that leaves a balance
--
-- A part refund reads 'pending' on purpose: $100 taken, $30 given back, $70
-- against a $100 bill is a booking that is not settled. 'refunded' would say
-- the transaction is closed when the customer still owes.
-- ============================================================================

create or replace function private.booking_was_refunded(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.payments p
     where p.booking_id = p_booking_id
       and p.grand_total < 0
  );
$$;

revoke execute on function private.booking_was_refunded(uuid) from public;
revoke execute on function private.booking_was_refunded(uuid) from anon;
revoke execute on function private.booking_was_refunded(uuid) from authenticated;

comment on function private.booking_was_refunded is
  'Whether any money has gone back on this booking. DEFINER for the same reason as private.booking_amount_paid, and granted to nobody for the same reason.';

create or replace function private.derive_booking_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.amount_paid := private.booking_amount_paid(new.id);

  new.payment_status := case
    -- Money went back and nothing is left standing. Checked FIRST: an
    -- over-refund is also `amount_paid < 0`, and both are the same event.
    when private.booking_was_refunded(new.id) and new.amount_paid <= 0
      then 'refunded'
    -- `> 0` as well as `>=` so a zero-cost booking is not 'paid' by default.
    when new.amount_paid > 0 and new.amount_paid >= new.total_cost
      then 'paid'
    else 'pending'
  end;

  return new;
end;
$$;

comment on function private.derive_booking_payment is
  'Overwrites bookings.amount_paid and payment_status from the payments ledger. Runs for EVERY writer including service_role — there is no path that sets them by hand.';

-- Nothing to backfill: no refund has ever been recorded (the ledger is the
-- thirteen seeded payments and nothing else), so no existing row changes.
-- Asserted rather than assumed, because "nothing to do" is the easiest kind of
-- migration to be wrong about.
do $$
declare v_negative integer;
begin
  select count(*) into v_negative from public.payments where grand_total < 0;
  if v_negative <> 0 then
    raise exception 'Expected no refunds to exist; found %. Recompute before trusting the statuses.',
      v_negative;
  end if;
end;
$$;
