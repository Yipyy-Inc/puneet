-- ============================================================================
-- Correcting a gift card is another entry, not an edit.
--
-- ── WHY THIS EXISTS ───────────────────────────────────────────────────────
--
-- `gift_card_transactions` has always accepted `kind = 'adjusted'` and the
-- table's own comment says "correct a mistake by posting the opposite entry" —
-- but nothing could post one. `issue_gift_card` only opens a card and
-- `redeem_gift_card` only takes money off, so a till that charged $50 against a
-- card instead of $5 had no way to put the $45 back.
--
-- The screen had an "Adjust Balance" button for exactly this, and it wrote to a
-- React state map called `overrides` and showed an alert. With the cards now
-- real that button is worse than dead: it reports a correction that the ledger
-- never received.
--
-- ── SIGNED, AND IT REQUIRES A REASON ──────────────────────────────────────
--
-- One function for both directions, because they are the same act: an
-- adjustment is a correction with a sign on it. Splitting it into add/remove
-- would put the direction in the function name rather than in the ledger, where
-- somebody reconciling the till has to read it.
--
-- The reason is NOT optional. An adjustment is the one entry with no document
-- behind it — no sale, no redemption, just somebody deciding — so the sentence
-- explaining it is the only audit there will ever be. A blank one is refused
-- rather than stored as an empty string.
--
-- ── NO ORACLE, THE SAME WAY AS redeem_gift_card ───────────────────────────
--
-- The card is found and the permission checked in ONE query, so "no such card"
-- and "a card at another facility" are one answer. Less critical here than for
-- redemption — this names a uuid rather than a bearer code — but the pattern is
-- what keeps the next person from writing the other kind, and this repo has now
-- had to repair four functions that resolved the row first.
--
-- ── AND THE OVERDRAFT GUARD IS THE TRIGGER'S, NOT THIS FUNCTION'S ─────────
--
-- Nothing here checks whether the card can afford a negative adjustment.
-- `private.gift_card_apply_transaction` holds the row lock, recomputes the
-- balance and refuses below zero with a sentence naming both numbers. A second
-- check here would be an opinion formed before the lock was taken, and the two
-- could disagree.
-- ============================================================================

create or replace function public.adjust_gift_card(
  p_gift_card_id uuid,
  p_amount       numeric,
  p_reason       text
)
returns public.gift_cards
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_card   public.gift_cards%rowtype;
  v_reason text := nullif(btrim(p_reason), '');
  v_sub    text := (select auth.jwt() ->> 'sub');
begin
  if p_amount is null or p_amount = 0 then
    raise exception 'An adjustment has to move the balance.'
      using errcode = '22023';
  end if;

  if v_reason is null then
    raise exception 'An adjustment needs a reason. It is the only record of why the balance changed.'
      using errcode = '22023';
  end if;

  -- ONE query. See the header.
  select * into v_card
    from public.gift_cards
   where id = p_gift_card_id
     and private.has_permission(facility_id, 'financial_manage_gift_cards')
   for update;

  if not found then
    raise exception 'No gift card you can adjust.' using errcode = '42501';
  end if;

  -- A cancelled card is a decision somebody made. Money is not moved on or off
  -- it: reinstate it first, deliberately, or issue a new one.
  if v_card.status = 'cancelled' then
    raise exception 'That gift card was cancelled. Reinstate it before adjusting the balance.'
      using errcode = '42501';
  end if;

  insert into public.gift_card_transactions (
    gift_card_id, facility_id, kind, amount, balance_after, note, created_by
  )
  values (
    v_card.id, v_card.facility_id, 'adjusted', p_amount, 0, v_reason, v_sub
  );

  select * into v_card from public.gift_cards where id = v_card.id;
  return v_card;
end;
$$;

comment on function public.adjust_gift_card(uuid, numeric, text) is
  'Correct a gift card balance by appending a signed `adjusted` ledger entry. Requires financial_manage_gift_cards, checked in the same query that finds the card. A reason is mandatory - it is the only record of why. The overdraft is refused by the applying trigger, not here.';

-- BOTH grantees named. `revoke ... from public` does not remove the grant
-- Supabase's default privileges give `anon` by name, and a revoke naming only
-- anon leaves the PUBLIC grant standing — see 20260822610000, which exists
-- because the first attempt named one of them.
revoke execute on function public.adjust_gift_card(uuid, numeric, text) from public, anon;
