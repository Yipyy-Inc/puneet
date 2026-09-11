-- ============================================================================
-- A gift card pays the tax on what it pays for.
--
-- `pay_booking_with_gift_card` (20260911003221) recorded every gift-card
-- payment with `tax => 0`. A booking's balance is PRE-tax (`amount_due` is the
-- supply; tax lives on the payment — 20260819210000), so at a facility that
-- charges GST and QST the checkout asked for supply + tax, the function
-- refused anything above the supply ("Only $X is still owed"), and a gift card
-- could not settle a taxed bill at all.
--
-- `p_tax` is the tax on `p_amount`, worked out by the caller from the
-- facility's own tax settings — the same way the card and terminal routes do.
-- The card is debited for both; the payment records them separately, so
-- `amount_paid` (grand_total - tip - tax) still measures the supply.
--
-- Replaced rather than overloaded: a second signature that also accepts four
-- arguments would make every existing call ambiguous. `p_tax` defaults to 0,
-- so a caller that sends the old four arguments — `main` does — behaves
-- exactly as before.
-- ============================================================================

drop function if exists public.pay_booking_with_gift_card(text, bigint, numeric, text);

create function public.pay_booking_with_gift_card(
  p_code text,
  p_booking_ref bigint,
  p_amount numeric,
  p_note text default null,
  p_tax numeric default 0
)
returns jsonb
language plpgsql
set search_path to ''
as $fn$
declare
  v_booking record;
  v_owed numeric;
  v_tax numeric := round(coalesce(p_tax, 0), 2);
  v_card public.gift_cards;
  v_payment jsonb;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'A gift card payment has to take something off the card.'
      using errcode = '22023';
  end if;
  if v_tax < 0 then
    raise exception 'Tax on a gift card payment cannot be negative.'
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

  -- The owed figure is the SUPPLY; the tax rides on top of it.
  v_owed := v_booking.amount_due - v_booking.amount_paid;
  if p_amount > v_owed then
    raise exception 'Only % is still owed on this booking.',
      to_char(greatest(v_owed, 0), 'FM999999990.00')
      using errcode = '22023';
  end if;

  v_card := public.redeem_gift_card(
    p_code, p_amount + v_tax, v_booking.id,
    coalesce(nullif(btrim(p_note), ''), 'Booking payment')
  );

  if v_card.facility_id <> v_booking.facility_id then
    raise exception 'That gift card belongs to another business.'
      using errcode = '42501';
  end if;

  v_payment := public.record_payment(
    p_facility_id => v_booking.facility_id,
    p_method => 'gift-card',
    p_subtotal => p_amount,
    p_tax => v_tax,
    p_tip => 0,
    p_amount_charged => p_amount + v_tax,
    p_grand_total => p_amount + v_tax,
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

comment on function public.pay_booking_with_gift_card(text, bigint, numeric, text, numeric) is
  'Redeem a gift card against a booking and record the payment, atomically: p_amount of supply plus p_tax, recorded separately. Refuses more supply than the booking owes and a card from another facility.';

revoke all on function public.pay_booking_with_gift_card(text, bigint, numeric, text, numeric)
  from public, anon;
grant execute on function public.pay_booking_with_gift_card(text, bigint, numeric, text, numeric)
  to authenticated;

do $verify$
begin
  if has_function_privilege('anon',
       'public.pay_booking_with_gift_card(text, bigint, numeric, text, numeric)', 'execute') then
    raise exception 'anon can pay with a gift card';
  end if;
  if has_function_privilege('public',
       'public.pay_booking_with_gift_card(text, bigint, numeric, text, numeric)', 'execute') then
    raise exception 'public can pay with a gift card';
  end if;
  if not has_function_privilege('authenticated',
       'public.pay_booking_with_gift_card(text, bigint, numeric, text, numeric)', 'execute') then
    raise exception 'authenticated cannot pay with a gift card';
  end if;
end $verify$;
