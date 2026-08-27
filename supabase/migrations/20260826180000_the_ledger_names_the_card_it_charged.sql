-- ============================================================================
-- A charge against a stored card says so, and says WHICH card.
--
-- ── WHY THIS IS NEEDED THE DAY AFTER `saved_cards` ARRIVED ────────────────
--
-- 20260826170000 gave `payments.saved_card_id` a table to reference, after it
-- had spent its whole life pointing at nothing. That fixed the schema and left
-- the other half: no writer ever sets it. A foreign key nothing populates is
-- the same defect in a smarter disguise, and this repo just spent a migration
-- undoing exactly that.
--
-- ── AND `method` HAS TO BE HONEST ─────────────────────────────────────────
--
-- `record_clover_payment` derives method from the entry method:
--   'ecom' -> 'new-card', anything else -> 'terminal'.
-- A charge against a card the customer stored earlier IS ecom, so it would be
-- recorded as 'new-card' — a phrase that means the opposite of what happened.
-- `card-on-file` already exists in this ledger (26 rows, all of them typed by
-- hand), so the value is not new; what is new is that it can now be TRUE.
--
-- ── DROP AND RECREATE, NOT `create or replace` ────────────────────────────
--
-- Adding a defaulted parameter does not replace a function, it OVERLOADS it:
-- both signatures would exist and a call with the original ten arguments would
-- be ambiguous. So the old signature is dropped by name, and its grants are
-- restated below — a recreated function does not inherit them, and this one is
-- SECURITY DEFINER, so silently losing the revoke would leave a definer
-- function executable by `anon`. `supabase/tests/rpc-session-required.sql`
-- exists because that has happened before.
-- ============================================================================

drop function if exists public.record_clover_payment(
  uuid, text, integer, integer, integer, text, text, text, text, text);

create function public.record_clover_payment(
  p_intent_id            uuid,
  p_processor_payment_id text,
  p_subtotal_cents       integer,
  p_tax_cents            integer default 0,
  p_tip_cents            integer default 0,
  p_card_brand           text default null,
  p_card_last4           text default null,
  p_auth_code            text default null,
  p_entry_method         text default 'ecom',
  p_author_name          text default 'Online payment',
  -- The stored card this was charged against, when it was one.
  p_saved_card_id        uuid default null
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
    entry_method, author_name, created_by, saved_card_id)
  values (
    v_intent.facility_id, v_intent.booking_id, v_intent.client_id,
    -- A stored card is named as one. Checked BEFORE the entry-method rule,
    -- because a card-on-file charge is also 'ecom' and would otherwise be
    -- recorded as a new card the customer had just typed in.
    case
      when p_saved_card_id is not null then 'card-on-file'
      when p_entry_method = 'ecom' then 'new-card'
      else 'terminal'
    end,
    p_subtotal_cents / 100.0, coalesce(p_tax_cents, 0) / 100.0,
    coalesce(p_tip_cents, 0) / 100.0,
    0, 0, 0,
    v_intent.amount_cents / 100.0, v_intent.amount_cents / 100.0,
    v_intent.processor, p_processor_payment_id, p_card_brand, p_card_last4,
    p_auth_code, p_entry_method, coalesce(p_author_name, 'Online payment'),
    v_intent.created_by, p_saved_card_id)
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
  'Writes the ledger row and links its intent in ONE transaction, so the reconciliation gap cannot open. Idempotent. service_role only. p_saved_card_id names the stored card, and makes the row card-on-file.';

-- Restated, not inherited. A recreated SECURITY DEFINER function starts with
-- the default EXECUTE grant to public, which is precisely the hole
-- rpc-session-required.sql checks for.
revoke all on function public.record_clover_payment(
  uuid, text, integer, integer, integer, text, text, text, text, text, uuid)
  from public, anon, authenticated;

grant execute on function public.record_clover_payment(
  uuid, text, integer, integer, integer, text, text, text, text, text, uuid)
  to service_role;
