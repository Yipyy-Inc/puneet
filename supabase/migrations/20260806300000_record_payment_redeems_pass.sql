-- ============================================================================
-- The pass redemption joins the payment's transaction.
--
-- 20260806260000 put the payment and its store-credit entry in one function,
-- because a payment recorded as having spent credit that was never deducted is
-- money invented by a network error. A redeemed PASS is the identical problem
-- one table over: `payments.package_pass_id` says which pass paid for this
-- groom, and until now nothing spent it.
--
-- Doing it as a second client call would leave the same gap — the payment
-- lands, the redemption fails, and the customer keeps a pass they used. So
-- `record_payment` takes the package and calls `redeem_package_pass` itself.
--
-- ── THE RETURN TYPE CHANGES, SO THE FUNCTION IS REPLACED ───────────────────
--
-- It returned the payment's uuid. It now returns both that and the passes
-- remaining, because the caller shows "2 passes left" on the receipt toast and
-- the alternative is a second round trip to learn what the same transaction
-- already computed. jsonb rather than a composite type: one shape to read on
-- the TypeScript side, and no new type to keep in step with it.
--
-- Postgres will not change a function's return type in place, so this drops and
-- recreates. The signature is otherwise identical plus the new trailing
-- arguments, which all have defaults — an existing caller that has not been
-- updated keeps working and simply redeems nothing.
--
-- SECURITY INVOKER still. `redeem_package_pass` is invoker too, so the ledger
-- policy applies to the nested insert exactly as if the caller had done it —
-- taking payment does not become permission to spend somebody's passes.
-- ============================================================================

drop function if exists public.record_payment(
  uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, uuid,
  numeric, numeric, numeric, numeric, text, text, text[], text
);

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
  -- New, all defaulted: the pass to spend and what it was spent on.
  p_customer_package_id uuid default null,
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

  -- Same transaction: if the pass cannot be spent — exhausted, expired, not
  -- this facility's — the whole payment is refused rather than recorded against
  -- a pass that is still sitting unused on the customer's account.
  if p_customer_package_id is not null then
    v_passes_remaining := public.redeem_package_pass(
      p_customer_package_id, p_service_label, p_booking_id, p_pet_id, p_pet_name
    );
  end if;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'passes_remaining', v_passes_remaining
  );
end;
$$;

comment on function public.record_payment is
  'Records a payment and, in the SAME transaction, the store-credit entry that spends any credit applied and the ledger entry that spends any pass redeemed. SECURITY INVOKER: every nested insert is still subject to its own table policy.';

revoke execute on function public.record_payment(
  uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, uuid,
  numeric, numeric, numeric, numeric, text, text, text[], text,
  uuid, uuid, text, text
) from public;
revoke execute on function public.record_payment(
  uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, uuid,
  numeric, numeric, numeric, numeric, text, text, text[], text,
  uuid, uuid, text, text
) from anon;
grant execute on function public.record_payment(
  uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, uuid,
  numeric, numeric, numeric, numeric, text, text, text[], text,
  uuid, uuid, text, text
) to authenticated;
