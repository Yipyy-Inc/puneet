-- ============================================================================
-- Clover, phase 2a: turning an approved charge into a ledger row, in ONE
-- transaction with the intent that authorised it.
--
-- ── WHY THIS IS NOT TWO CALLS ─────────────────────────────────────────────
--
-- The obvious implementation is: insert the payment, then update the intent to
-- point at it. Between those two statements is the exact window phase 0 exists
-- to close — a crash there leaves an approved intent with no payment_id, which
-- unreconciled_payments correctly reports as "the customer paid and the books
-- do not show it". Correct, and avoidable: doing both in one function makes the
-- window not exist rather than making it visible.
--
-- ── CALLED TWICE IS THE NORMAL CASE, NOT THE EDGE ─────────────────────────
--
-- The charge route records the payment, and a webhook may report the same
-- charge moments later. Both paths land here. So the FIRST thing this does is
-- ask whether the intent already has a payment, and if it does it returns that
-- id and changes nothing. The unique index on (processor, processor_payment_id)
-- stands behind that as the constraint of last resort.
--
-- ── THE SPLIT IS CHECKED, NOT TRUSTED ─────────────────────────────────────
--
-- The caller passes subtotal, tax and tip separately because the ledger records
-- them separately — tips are owed to staff and must never be counted as
-- facility revenue (see the reporting header of 20260807620000). But the intent
-- already recorded ONE total, which is what was actually sent to Clover and
-- what the customer's card was actually charged.
--
-- If those two disagree, one of them is wrong about real money. This refuses
-- rather than picking a winner: a ledger row that does not sum to the amount
-- charged is worse than a failed call, because it looks settled.
--
-- ── CURRENCY IS THE MERCHANT'S ────────────────────────────────────────────
--
-- Read from the intent, which took it from payment_connections, which took it
-- from Clover. Never defaulted. A facility whose connection has no currency
-- cannot get this far — the charge path refuses earlier.
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
  v_intent  public.payment_intents%rowtype;
  v_payment uuid;
  v_total   integer;
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

  insert into public.payments (
    facility_id, booking_id, client_id, method,
    subtotal, tax, tip,
    store_credit_applied, package_pass_applied, loyalty_discount_applied,
    amount_charged, grand_total,
    processor, processor_payment_id, card_brand, card_last4, auth_code,
    entry_method, author_name, created_by)
  values (
    v_intent.facility_id, v_intent.booking_id, v_intent.client_id,
    case when p_entry_method = 'ecom' then 'new-card' else 'terminal' end,
    p_subtotal_cents / 100.0, coalesce(p_tax_cents, 0) / 100.0,
    coalesce(p_tip_cents, 0) / 100.0,
    0, 0, 0,
    v_intent.amount_cents / 100.0, v_intent.amount_cents / 100.0,
    v_intent.processor, p_processor_payment_id, p_card_brand, p_card_last4,
    p_auth_code, p_entry_method, coalesce(p_author_name, 'Online payment'),
    v_intent.created_by)
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
  'Writes the ledger row and links its intent in ONE transaction, so the reconciliation gap cannot open. Idempotent. service_role only.';

-- Opening an intent is equally a server-only act: the client must never choose
-- the amount, the currency or the idempotency key.
create or replace function public.open_payment_intent(
  p_facility_id     uuid,
  p_amount_cents    integer,
  p_currency        text,
  p_kind            text,
  p_idempotency_key text,
  p_booking_id      uuid default null,
  p_client_id       uuid default null,
  p_created_by      text default null,
  p_device_id       text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_env text;
  v_id  uuid;
begin
  select pc.environment into v_env
    from public.payment_connections pc
   where pc.facility_id = p_facility_id
     and pc.processor = 'clover'
     and pc.status = 'connected';

  if v_env is null then
    raise exception 'That facility has no connected payment account.'
      using errcode = '42501';
  end if;

  insert into public.payment_intents
    (facility_id, booking_id, client_id, environment, kind, amount_cents,
     currency, idempotency_key, created_by, device_id)
  values
    (p_facility_id, p_booking_id, p_client_id, v_env, p_kind, p_amount_cents,
     p_currency, p_idempotency_key, p_created_by, p_device_id)
  returning id into v_id;

  return v_id;
end;
$fn$;

/** Record how an attempt ended when it did NOT produce money. */
create or replace function public.close_payment_intent(
  p_intent_id       uuid,
  p_status          text,
  p_failure_code    text default null,
  p_failure_message text default null
)
returns void
language sql
security definer
set search_path = ''
as $fn$
  update public.payment_intents
     set status          = p_status,
         failure_code    = p_failure_code,
         failure_message = left(p_failure_message, 500),
         completed_at    = case when p_status in ('created', 'sent')
                                then completed_at else now() end
   where id = p_intent_id
     -- An intent that already produced money is finished. Nothing may move it
     -- to declined afterwards and orphan a real ledger row.
     and payment_id is null;
$fn$;

revoke all on function public.record_clover_payment(
  uuid, text, integer, integer, integer, text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.open_payment_intent(
  uuid, integer, text, text, text, uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.close_payment_intent(uuid, text, text, text)
  from public, anon, authenticated;

grant execute on function public.record_clover_payment(
  uuid, text, integer, integer, integer, text, text, text, text, text)
  to service_role;
grant execute on function public.open_payment_intent(
  uuid, integer, text, text, text, uuid, uuid, text, text)
  to service_role;
grant execute on function public.close_payment_intent(uuid, text, text, text)
  to service_role;
