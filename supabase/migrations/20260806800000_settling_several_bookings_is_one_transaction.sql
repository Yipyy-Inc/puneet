-- ============================================================================
-- Settling several bookings at once is one transaction, and the amounts are
-- the database's to decide.
--
-- `BulkPaymentModal` — the "Collect Payment" button on the client overview's
-- overdue banner — had `onConfirm={() => {}}`. Not a toast, not a request:
-- an empty function. It then printed a receipt reading "PAYMENT COMPLETE ·
-- All N invoices marked as paid" and toasted success, unconditionally, so a
-- customer could leave holding a receipt for money nobody recorded.
--
-- ── DECISION 1: THE CALLER NAMES THE BOOKINGS, NOT THE AMOUNTS ─────────────
--
-- The obvious signature takes {booking, amount} pairs from the screen. It is
-- the wrong one. The balance is already known here — `total_cost -
-- amount_paid`, both maintained by 20260806680000 — and a screen that has been
-- open while somebody else took a payment would send a stale figure and
-- overcharge.
--
-- So this takes booking ids and computes each amount itself, and RETURNS what
-- it took. The receipt prints from the return value rather than from what the
-- screen hoped, which is the only way the paper and the ledger cannot disagree.
--
-- ── DECISION 2: ALREADY-SETTLED BOOKINGS ARE SKIPPED, NOT FATAL ────────────
--
-- The failure this is a transaction for is a network error MID-LOOP: three
-- payments recorded, two not, and nobody knowing which. A booking somebody
-- else settled thirty seconds ago is not that — it is a no-op, and failing the
-- other four over it would be worse than useless at a counter with a queue.
--
-- Skipped bookings are absent from the result, so the caller can compare what
-- it asked for against what happened and say so.
--
-- ── DECISION 3: IT CALLS record_payment RATHER THAN INSERTING ──────────────
--
-- One insert path. `record_payment` already writes the store-credit entry a
-- payment implies (20260806760000) and is SECURITY INVOKER, so each row in the
-- loop still faces `payments_insert` — `financial_take_payment` per booking,
-- not once for the batch. A second insert here would be a second place for the
-- arithmetic and the policies to drift.
--
-- SECURITY INVOKER for the same reason, and EXECUTE revoked from `anon` BY
-- NAME: `revoke ... from public` leaves Supabase's default grants standing.
-- ============================================================================

-- ── Tenders the tills actually offer ────────────────────────────────────────
--
-- The bulk dialog offers Card, Cash, Terminal and E-Transfer; the column knew
-- about card-on-file, new-card, cash, package-pass and store-credit. Mapping a
-- terminal tap or an Interac transfer onto 'new-card' would record how the
-- money arrived incorrectly, and reconciliation is exactly the job that cares.
--
-- Widening a CHECK cannot invalidate an existing row, so this is additive.

alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check
  check (method in ('card-on-file', 'new-card', 'cash',
                    'package-pass', 'store-credit',
                    'terminal', 'e-transfer'));

comment on constraint payments_method_check on public.payments is
  'How the money arrived. terminal and e-transfer were added in 20260806800000 because the bulk-payment dialog offers them and recording them as a card would be false.';

-- ── Settling a batch ────────────────────────────────────────────────────────

create or replace function public.settle_bookings(
  p_facility_id      uuid,
  p_method           text,
  p_booking_ids      uuid[],
  p_receipt_channels text[] default '{}'
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_booking    record;
  v_balance    numeric(10,2);
  v_settled    jsonb := '[]'::jsonb;
begin
  if p_booking_ids is null or array_length(p_booking_ids, 1) is null then
    raise exception 'No bookings were named.' using errcode = '22023';
  end if;

  -- Ordered by ref so a receipt reads the way the screen listed them, and so
  -- two tills settling overlapping batches take row locks in the same order.
  for v_booking in
    select b.id, b.ref, b.client_id, b.facility_id,
           (b.total_cost - b.amount_paid)::numeric(10,2) as balance
      from public.bookings b
     where b.id = any(p_booking_ids)
     order by b.ref
  loop
    if v_booking.facility_id is distinct from p_facility_id then
      raise exception 'Booking % belongs to a different facility.', v_booking.ref
        using errcode = '42501';
    end if;

    v_balance := v_booking.balance;

    -- Decision 2. Nothing owing, nothing recorded, nothing reported.
    if v_balance is null or v_balance <= 0 then
      continue;
    end if;

    perform public.record_payment(
      p_facility_id      => p_facility_id,
      p_method           => p_method,
      p_subtotal         => v_balance,
      p_tax              => 0,
      p_tip              => 0,
      p_amount_charged   => v_balance,
      p_grand_total      => v_balance,
      p_booking_id       => v_booking.id,
      p_client_id        => v_booking.client_id,
      -- Only cash carries a tender, and payments_cash_shape refuses it on
      -- anything else.
      p_cash_received    => case when p_method = 'cash' then v_balance end,
      p_receipt_channels => p_receipt_channels
    );

    v_settled := v_settled || jsonb_build_object(
      'bookingRef', v_booking.ref,
      'amount',     v_balance
    );
  end loop;

  return v_settled;
end;
$$;

comment on function public.settle_bookings is
  'Settles the outstanding balance on several bookings in ONE transaction. Takes booking ids, computes each amount from the ledger, and returns what it actually took — see Decisions 1 and 2 in 20260806800000.';

revoke execute on function public.settle_bookings(uuid, text, uuid[], text[]) from public;
revoke execute on function public.settle_bookings(uuid, text, uuid[], text[]) from anon;
grant  execute on function public.settle_bookings(uuid, text, uuid[], text[]) to authenticated;
