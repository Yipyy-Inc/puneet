-- ============================================================================
-- A gift card pays for a booking, in one transaction.
--
-- ── WHAT WAS MISSING ──────────────────────────────────────────────────────
--
-- `redeem_gift_card` takes money off a card and records the redemption
-- against a booking id, but it writes nothing to `payments` — so a booking
-- paid by gift card still owed its whole balance, and the checkout offered no
-- gift card at all (`useRedeemGiftCard` had no caller). Two separate calls
-- from the till would have a window where the card is spent and the booking
-- is not paid, or the reverse.
--
-- ── ONE FUNCTION, BOTH LEDGERS ────────────────────────────────────────────
--
-- `pay_booking_with_gift_card` resolves the booking by its ref through RLS,
-- refuses more than it still owes, redeems the card (the card's own function
-- checks the code, the permission, the status, the expiry and the balance
-- under a row lock), refuses a card from another facility, and records the
-- payment through `record_payment` — all or nothing. SECURITY INVOKER, so
-- `payments`' own policy decides whether this caller may take a payment.
--
-- `payments.method` gains 'gift-card'. Widening a check refuses nothing that
-- was accepted before.
-- ============================================================================

alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check
  check (method = any (array[
    'card-on-file', 'new-card', 'cash', 'package-pass', 'store-credit',
    'terminal', 'e-transfer', 'ach', 'gift-card'
  ]));

create or replace function public.pay_booking_with_gift_card(
  p_code text,
  p_booking_ref bigint,
  p_amount numeric,
  p_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_booking record;
  v_owed numeric;
  v_card public.gift_cards;
  v_payment jsonb;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'A gift card payment has to take something off the card.'
      using errcode = '22023';
  end if;

  select b.id, b.facility_id, b.client_id,
         coalesce(b.amount_due, b.total_cost) as amount_due,
         coalesce(b.amount_paid, 0) as amount_paid
    into v_booking
    from public.bookings b
   where b.ref = p_booking_ref;
  if not found then
    raise exception 'No such booking.' using errcode = '42501';
  end if;

  v_owed := v_booking.amount_due - v_booking.amount_paid;
  if p_amount > v_owed then
    raise exception 'Only % is still owed on this booking.',
      to_char(greatest(v_owed, 0), 'FM999999990.00')
      using errcode = '22023';
  end if;

  v_card := public.redeem_gift_card(
    p_code, p_amount, v_booking.id,
    coalesce(nullif(btrim(p_note), ''), 'Booking payment')
  );

  -- A card from another facility pays nothing here. The redemption above is
  -- rolled back with this exception.
  if v_card.facility_id <> v_booking.facility_id then
    raise exception 'That gift card belongs to another business.'
      using errcode = '42501';
  end if;

  v_payment := public.record_payment(
    p_facility_id => v_booking.facility_id,
    p_method => 'gift-card',
    p_subtotal => p_amount,
    p_tax => 0,
    p_tip => 0,
    p_amount_charged => p_amount,
    p_grand_total => p_amount,
    p_booking_id => v_booking.id,
    p_client_id => v_booking.client_id,
    p_note => 'Gift card ending ' || right(btrim(p_code), 4)
  );

  return jsonb_build_object(
    'payment_id', v_payment->>'payment_id',
    'card_balance', v_card.balance
  );
end;
$fn$;

comment on function public.pay_booking_with_gift_card(text, bigint, numeric, text) is
  'Redeem a gift card against a booking and record the payment, atomically. Refuses more than the booking owes and a card from another facility.';

revoke all on function public.pay_booking_with_gift_card(text, bigint, numeric, text)
  from public, anon;
grant execute on function public.pay_booking_with_gift_card(text, bigint, numeric, text)
  to authenticated;

do $verify$
begin
  if has_function_privilege('anon',
       'public.pay_booking_with_gift_card(text, bigint, numeric, text)', 'execute') then
    raise exception 'anon can pay with a gift card';
  end if;
  if not has_function_privilege('authenticated',
       'public.pay_booking_with_gift_card(text, bigint, numeric, text)', 'execute') then
    raise exception 'authenticated cannot pay with a gift card';
  end if;
end $verify$;
