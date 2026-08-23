-- ============================================================================
-- Issuing and spending a gift card, each in one transaction or not at all.
--
-- Split from 20260822900000 so the tables land before anything depends on them.
--
-- ── WHY FUNCTIONS AND NOT POLICIES ────────────────────────────────────────
--
-- `gift_cards` has no INSERT policy and `gift_card_transactions` has no write
-- policy at all, so neither can be reached from PostgREST directly. That is
-- deliberate: a card and its opening balance are one fact, and two round trips
-- can leave a card worth nothing or a ledger entry against no card.
--
-- ── THE ORACLE IS CLOSED BY CONSTRUCTION, NOT BY A REVOKE ─────────────────
--
-- `redeem_gift_card` finds the card and checks permission in the SAME query, so
-- "no such code" and "not your facility" produce one indistinguishable error.
--
-- Every function this repo has had to repair for this (20260805210403,
-- 20260822400000, 20260822600000) resolved the row first and checked second,
-- because the facility to check came out of the row. That is the natural way to
-- write it and it is why the bug keeps recurring. Here the row is only visible
-- if the permission already holds, so there is no window in which existence has
-- been established and authority has not.
--
-- It matters more here than in any of those. A gift card code is a BEARER
-- INSTRUMENT: whoever holds it can spend it, so an error that distinguishes
-- "real but not yours" from "not real" is a way to search for real ones.
--
-- ── AND THE GRANTS NAME BOTH ──────────────────────────────────────────────
--
-- `revoke ... from public, anon`. Both, always. Supabase's default privileges
-- grant EXECUTE to anon by name, and `revoke ... from public` does not remove
-- it — while a revoke naming only anon leaves the PUBLIC grant standing, which
-- is what 20260822600000 discovered by doing exactly that and changing nothing.
-- Neither half is optional and neither is redundant.
-- ============================================================================

-- ── ISSUING ───────────────────────────────────────────────────────────────

create or replace function public.issue_gift_card(
  p_facility_id            uuid,
  p_amount                 numeric,
  p_kind                   text default 'online',
  p_code                   text default null,
  p_recipient_name         text default null,
  p_recipient_email        text default null,
  p_message                text default null,
  p_expires_at             timestamptz default null,
  p_purchased_by_client_id uuid default null
)
returns public.gift_cards
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_card public.gift_cards%rowtype;
  v_code text;
  v_sub  text := (select auth.jwt() ->> 'sub');
begin
  -- FIRST. Nothing is read, created or reported before this: the caller names
  -- the facility, so there is no row to leak by checking afterwards.
  if not private.has_permission(p_facility_id, 'financial_manage_gift_cards') then
    raise exception 'You do not have permission to issue a gift card here.'
      using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'A gift card has to be worth something.'
      using errcode = '22023';
  end if;

  -- A code the business supplied (a printed batch) is kept; otherwise one is
  -- generated here rather than in the application, so two tabs cannot mint the
  -- same code and the uniqueness constraint is the arbiter either way.
  v_code := coalesce(
    nullif(btrim(p_code), ''),
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))
  );

  insert into public.gift_cards (
    facility_id, code, kind, initial_amount, status,
    purchased_by_client_id, recipient_name, recipient_email, message,
    expires_at, issued_by
  )
  values (
    p_facility_id, v_code, p_kind, p_amount, 'active',
    p_purchased_by_client_id, p_recipient_name, p_recipient_email, p_message,
    p_expires_at, v_sub
  )
  returning * into v_card;

  -- The opening balance IS a ledger entry. There is no other way to put money
  -- on a card, so `balance` and the sum of the ledger cannot drift apart.
  insert into public.gift_card_transactions (
    gift_card_id, facility_id, kind, amount, balance_after, note, created_by
  )
  values (v_card.id, p_facility_id, 'issued', p_amount, p_amount, p_message, v_sub);

  select * into v_card from public.gift_cards where id = v_card.id;
  return v_card;
end;
$$;

comment on function public.issue_gift_card(uuid, numeric, text, text, text, text, text, timestamptz, uuid) is
  'Create a gift card and its opening ledger entry in one transaction. Requires financial_manage_gift_cards on the named facility, checked BEFORE anything is read or written. Generates an unguessable code when none is supplied. anon holds no EXECUTE grant.';

-- ── SPENDING ──────────────────────────────────────────────────────────────

create or replace function public.redeem_gift_card(
  p_code       text,
  p_amount     numeric,
  p_booking_id uuid default null,
  p_note       text default null
)
returns public.gift_cards
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_card public.gift_cards%rowtype;
  v_sub  text := (select auth.jwt() ->> 'sub');
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'A redemption has to take something off the card.'
      using errcode = '22023';
  end if;

  -- ONE query: the permission is part of finding the row. A caller who may not
  -- redeem at that facility gets the same answer as a caller who invented the
  -- code, which is the point — see the header.
  select * into v_card
    from public.gift_cards
   where code = btrim(p_code)
     and private.has_permission(facility_id, 'financial_manage_gift_cards')
   for update;

  if not found then
    raise exception 'No gift card with that code that you can redeem.'
      using errcode = '42501';
  end if;

  -- Status before money. A cancelled card is a decision somebody made and must
  -- not be spendable just because it still has a balance on it.
  if v_card.status = 'cancelled' then
    raise exception 'That gift card was cancelled.' using errcode = '42501';
  end if;

  -- Checked against the DATABASE's clock, not the caller's. Nothing sweeps
  -- expired cards, so `status` still reads `active` on a card that is not - the
  -- same trap `effectiveStatus` exists for on loyalty vouchers.
  if v_card.expires_at is not null and v_card.expires_at <= now() then
    raise exception 'That gift card expired on %.',
      to_char(v_card.expires_at, 'YYYY-MM-DD')
      using errcode = '42501';
  end if;

  -- The negative entry. The trigger holds the row lock, recomputes the balance
  -- and refuses an overdraft with a sentence naming both numbers.
  insert into public.gift_card_transactions (
    gift_card_id, facility_id, kind, amount, balance_after,
    booking_id, note, created_by
  )
  values (
    v_card.id, v_card.facility_id, 'redeemed', -p_amount, 0,
    p_booking_id, p_note, v_sub
  );

  select * into v_card from public.gift_cards where id = v_card.id;
  return v_card;
end;
$$;

comment on function public.redeem_gift_card(text, numeric, uuid, text) is
  'Take an amount off a gift card, as one append-only ledger entry. Finds the card and checks permission in a single query, so a code that does not exist and one at another facility are indistinguishable - a gift card code is a bearer instrument. Refuses cancelled and expired cards against the database clock. anon holds no EXECUTE grant.';

-- ── GRANTS ────────────────────────────────────────────────────────────────
--
-- BOTH grantees named, on every function. See the header, and 20260822610000
-- for the day this repo learned that naming one of them changes nothing.

revoke execute on function public.issue_gift_card(uuid, numeric, text, text, text, text, text, timestamptz, uuid) from public, anon;
revoke execute on function public.redeem_gift_card(text, numeric, uuid, text) from public, anon;
