-- ============================================================================
-- Taking a payment is ONE transaction, so it is one function.
--
-- A payment that applies store credit is two writes: the payment row, and the
-- ledger entry that spends the credit. Sent as two PostgREST calls they can
-- half-fail — and the half that survives is the payment, recorded as having
-- consumed credit that was never deducted. That is money invented by a network
-- error, and the balance is derived from the ledger (20260806220000,
-- Decision 4), so nothing would ever notice.
--
-- ── SECURITY INVOKER, DELIBERATELY ─────────────────────────────────────────
--
-- This is NOT a SECURITY DEFINER RPC. Definer functions are how the offboarding
-- and invite RPCs became callable by `anon` with owner rights
-- (20260804200000) — a front door that bypasses the policies protecting the
-- tables behind it.
--
-- Running as INVOKER means both inserts are subject to exactly the RLS already
-- written: the payment still needs `financial_take_payment` (or
-- `process_refund` when negative), the ledger entry still needs the matching
-- key for its own sign. The function buys atomicity and nothing else, which is
-- the only thing it is for.
--
-- EXECUTE is revoked from `anon` BY NAME. `revoke ... from public` would not do
-- it: Supabase's default privileges grant to anon and authenticated by name,
-- and revoking the PUBLIC pseudo-role leaves those grants standing. That exact
-- mistake was a live hole in this project once.
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
  p_credit_note text default ''
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payment_id uuid;
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

  -- The ledger entry that actually spends the credit. Same transaction, so a
  -- payment claiming to have used credit cannot exist without it.
  --
  -- Requires a client: credit belongs to somebody. A payment that applies
  -- credit with no client named is a contradiction, not a default.
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

  return v_payment_id;
end;
$$;

comment on function public.record_payment is
  'Records a payment and, when store credit is applied, the ledger entry that spends it — in ONE transaction. SECURITY INVOKER: both inserts are still subject to the tables own RLS.';

revoke execute on function public.record_payment(
  uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, uuid,
  numeric, numeric, numeric, numeric, text, text, text[], text
) from public;
revoke execute on function public.record_payment(
  uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, uuid,
  numeric, numeric, numeric, numeric, text, text, text[], text
) from anon;

grant execute on function public.record_payment(
  uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, uuid,
  numeric, numeric, numeric, numeric, text, text, text[], text
) to authenticated;
