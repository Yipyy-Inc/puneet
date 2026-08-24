-- ============================================================================
-- The identifiers reach the payment row.
--
-- 20260824100000 added `processor_order_id`, `processor_merchant_id` and
-- `processor_device_serial` to `public.payments`. Nothing writes them, because
-- the only function that inserts a Clover payment is `record_clover_payment`
-- and it did not know they existed.
--
-- ── WHY THEY COME FROM THE INTENT AND NOT FROM PARAMETERS ─────────────────
--
-- `payments` is append-only. Whatever is not on the row at INSERT is not on the
-- row ever, so the order id has to be known before the ledger write — which
-- means before the charge completes, not after it.
--
-- The intent is the only thing that exists at that moment and survives to this
-- one. So the caller writes the order id onto the intent when it creates the
-- order, and this reads it back. Two new parameters would have worked equally
-- well today and drifted the first time a caller forgot one; reading from a row
-- that is already loaded cannot be forgotten.
--
-- The merchant is read from `payment_connections` HERE, in the same transaction
-- as the insert, for the same reason `record_payment_webhook` resolves its
-- facility inline: a caller that looked it up separately could record a payment
-- against a merchant the facility had disconnected in between.
--
-- ── AND EVERY ATTRIBUTE IS RESTATED ───────────────────────────────────────
--
-- `create or replace function` replaces the whole definition and silently
-- reverts anything not restated to its default. That cost this project a day
-- when 20260819210000 dropped `security definer` off two booking derivations
-- and every signed-in user lost the ability to edit a booking — reported as
-- "you are not allowed to edit booking", which named a permission and meant a
-- missing function attribute. `security definer` and `set search_path` are both
-- below, deliberately and visibly.
-- ============================================================================

create or replace function public.record_clover_payment(
  p_intent_id            uuid,
  p_processor_payment_id text,
  p_subtotal_cents       integer,
  p_tax_cents            integer default 0,
  p_tip_cents            integer default 0,
  p_card_brand           text default null,
  p_card_last4           text default null,
  p_auth_code            text default null,
  p_entry_method         text default 'ecom',
  p_author_name          text default 'Online payment'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_intent   public.payment_intents%rowtype;
  v_payment  uuid;
  v_total    integer;
  v_merchant text;
begin
  select * into v_intent from public.payment_intents where id = p_intent_id;
  if not found then
    raise exception 'No payment intent %', p_intent_id using errcode = '23503';
  end if;

  -- Already recorded. Return what exists; touch nothing.
  if v_intent.payment_id is not null then
    return v_intent.payment_id;
  end if;

  v_total := coalesce(p_subtotal_cents, 0) + coalesce(p_tax_cents, 0)
             + coalesce(p_tip_cents, 0);

  if v_total <> v_intent.amount_cents then
    raise exception
      'The ledger split (% cents) does not match what was charged (% cents).',
      v_total, v_intent.amount_cents
      using errcode = '22023';
  end if;

  -- The merchant AT THE TIME. Null if the connection has since been removed,
  -- which is a truthful answer and better than failing a ledger write over a
  -- descriptive column.
  select pc.merchant_id into v_merchant
    from public.payment_connections pc
   where pc.facility_id = v_intent.facility_id
     and pc.processor = v_intent.processor;

  insert into public.payments (
    facility_id, booking_id, client_id, method,
    subtotal, tax, tip,
    store_credit_applied, package_pass_applied, loyalty_discount_applied,
    amount_charged, grand_total,
    processor, processor_payment_id, card_brand, card_last4, auth_code,
    entry_method, author_name, created_by,
    processor_order_id, processor_merchant_id, processor_device_serial)
  values (
    v_intent.facility_id, v_intent.booking_id, v_intent.client_id,
    case when p_entry_method = 'ecom' then 'new-card' else 'terminal' end,
    p_subtotal_cents / 100.0, coalesce(p_tax_cents, 0) / 100.0,
    coalesce(p_tip_cents, 0) / 100.0,
    0, 0, 0,
    v_intent.amount_cents / 100.0, v_intent.amount_cents / 100.0,
    v_intent.processor, p_processor_payment_id, p_card_brand, p_card_last4,
    p_auth_code, p_entry_method, coalesce(p_author_name, 'Online payment'),
    v_intent.created_by,
    v_intent.processor_order_id, v_merchant, v_intent.device_id)
  returning id into v_payment;

  update public.payment_intents
     set status               = 'approved',
         processor_payment_id = p_processor_payment_id,
         payment_id           = v_payment,
         completed_at         = coalesce(completed_at, now())
   where id = p_intent_id;

  return v_payment;
end;
$fn$;

comment on function public.record_clover_payment is
  'Writes the ledger row and links its intent in ONE transaction, so the reconciliation gap cannot open. Carries the Clover order, merchant and device onto the row, because payments cannot be updated afterwards. Idempotent. service_role only.';

-- Naming the order on an intent that is still open. Called between creating the
-- order at Clover and taking the money, which is the only window in which the
-- id can still reach the ledger row.
create or replace function public.name_intent_order(
  p_intent_id uuid,
  p_order_id  text
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  update public.payment_intents
     set processor_order_id = p_order_id,
         updated_at = now()
   where id = p_intent_id
     -- Only while it is still open. An intent that has already produced a
     -- payment must not gain an order id the payment row cannot be given.
     and payment_id is null;
end;
$fn$;

comment on function public.name_intent_order(uuid, text) is
  'Records the Clover order an open intent belongs to, so record_clover_payment can put it on the ledger row. No-op once the intent has settled.';

revoke all on function public.name_intent_order(uuid, text)
  from public, anon, authenticated;
grant execute on function public.name_intent_order(uuid, text) to service_role;

-- The grants on the replaced function are NOT inherited either: `create or
-- replace` keeps the existing ACL, but restating it costs nothing and makes
-- this file readable on its own.
revoke all on function public.record_clover_payment(
  uuid, text, integer, integer, integer, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_clover_payment(
  uuid, text, integer, integer, integer, text, text, text, text, text)
  to service_role;
