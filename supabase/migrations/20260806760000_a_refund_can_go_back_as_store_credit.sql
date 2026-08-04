-- ============================================================================
-- Giving money back as store credit is two writes, so it joins the transaction.
--
-- `CancelBookingModal` and `RefundBookingModal` have always offered a choice —
-- card or store credit — and `record_payment` could only do the first. Its
-- store-credit branch fires on `p_store_credit_applied > 0`, which is credit
-- being SPENT: it writes a NEGATIVE ledger entry. There was no path that gave
-- credit, so the store-credit option would have recorded a refund and granted
-- nothing.
--
-- That is the same half-succeeded shape the RPC exists to prevent, arriving
-- from the other direction: money leaves the books and never reaches the
-- customer's balance, and the balance is derived from the ledger
-- (20260806220000, Decision 4) so nothing downstream would notice.
--
-- ── NO NEW PARAMETER: THE PAYLOAD ALREADY SAYS IT ──────────────────────────
--
-- The obvious fix is a `p_refund_to_credit` flag. It is the wrong one — the
-- payload already carries the fact, in two fields that cannot disagree:
--
--   grand_total < 0             money is going back
--   method = 'store-credit'     it is going back as credit
--
-- A flag would be a third way to say it, and the one that drifts. It would also
-- have meant a 23rd argument, and `create or replace` with a different argument
-- count creates an OVERLOAD rather than a replacement — the trap that cost a
-- debugging session in 20260806620000. Same 22 arguments, genuine replacement.
--
-- On a POSITIVE payment `method = 'store-credit'` means the opposite — paid
-- WITH credit — and that is already handled by `store_credit_applied`. The sign
-- is what makes the two unambiguous, and it is why amounts are signed
-- (20260806220000, Decision 2).
--
-- ── THE PERMISSION IS ALREADY RIGHT ────────────────────────────────────────
--
-- SECURITY INVOKER, so both inserts face their own policies: the negative
-- payment needs `process_refund`, and a POSITIVE `store_credit_entries` row
-- needs `process_refund` too (its insert policy branches on sign, exactly as
-- payments' does). A receptionist can take money and cannot give it back, in
-- either currency, without a line of code here saying so.
-- ============================================================================

create or replace function public.record_payment(
  p_facility_id uuid,
  p_method text,
  p_subtotal numeric,
  p_tax numeric,
  p_tip numeric,
  p_amount_charged numeric,
  p_grand_total numeric,
  p_booking_id uuid default null,
  p_client_id uuid default null,
  p_store_credit_applied numeric default 0,
  p_package_pass_applied numeric default 0,
  p_loyalty_discount_applied numeric default 0,
  p_cash_received numeric default null,
  p_saved_card_id text default null,
  p_package_pass_id text default null,
  p_receipt_channels text[] default '{}',
  p_credit_note text default '',
  p_customer_package_id uuid default null,
  p_package_service_id text default null,
  p_pet_id uuid default null,
  p_pet_name text default null,
  p_service_label text default ''
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payment_id uuid;
  v_passes_remaining integer;
begin
  insert into public.payments
    (facility_id, booking_id, client_id, method,
     subtotal, tax, tip,
     store_credit_applied, package_pass_applied, loyalty_discount_applied,
     amount_charged, grand_total,
     cash_received, saved_card_id, package_pass_id, receipt_channels)
  values
    (p_facility_id, p_booking_id, p_client_id, p_method,
     p_subtotal, p_tax, p_tip,
     p_store_credit_applied, p_package_pass_applied, p_loyalty_discount_applied,
     p_amount_charged, p_grand_total,
     p_cash_received, p_saved_card_id, p_package_pass_id, p_receipt_channels)
  returning id into v_payment_id;

  -- Credit being SPENT. A negative ledger entry, same transaction as the
  -- payment claiming to have spent it.
  if p_store_credit_applied > 0 then
    if p_client_id is null then
      raise exception 'Store credit cannot be applied without a client.'
        using errcode = '23502';
    end if;
    insert into public.store_credit_entries
      (facility_id, client_id, amount, reason, note, booking_id, payment_id)
    values
      (p_facility_id, p_client_id, -p_store_credit_applied, 'redeemed',
       p_credit_note, p_booking_id, v_payment_id);
  end if;

  -- Credit being GIVEN. A refund whose method is store credit, so the money
  -- lands on the customer's balance rather than back on a card.
  if p_grand_total < 0 and p_method = 'store-credit' then
    if p_client_id is null then
      raise exception 'A refund to store credit needs a client to credit.'
        using errcode = '23502';
    end if;
    insert into public.store_credit_entries
      (facility_id, client_id, amount, reason, note, booking_id, payment_id)
    values
      (p_facility_id, p_client_id, -p_grand_total, 'refund',
       p_credit_note, p_booking_id, v_payment_id);
  end if;

  if p_customer_package_id is not null then
    if p_package_service_id is null then
      raise exception 'A pass redemption must name which service it is for.'
        using errcode = '23502';
    end if;
    v_passes_remaining := public.redeem_package_pass(
      p_customer_package_id, p_package_service_id, p_service_label,
      p_booking_id, p_pet_id, p_pet_name
    );
  end if;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'passes_remaining', v_passes_remaining
  );
end;
$$;

comment on function public.record_payment is
  'Records a payment and, in the SAME transaction, the store-credit entry it implies — negative when credit is spent, positive when a refund is issued as credit. SECURITY INVOKER: both inserts still face the tables own RLS.';
