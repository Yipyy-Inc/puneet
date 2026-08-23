-- ============================================================================
-- Handing in a gift card puts its value on the customer's account.
--
-- ── WHAT WAS BLOCKING THIS ────────────────────────────────────────────────
--
-- `/facility/dashboard/gift-cards` has a "Redeem to Wallet" button. It was
-- turned OFF on 2026-08-23 when the cards became real rows, because wiring it
-- would have taken a real balance off a real card and credited React state.
--
-- The wallet was never missing. It is `store_credit_entries` (20260806220000):
-- append-only, signed, balance derived by the `client_store_credit` view,
-- already spent down by `record_payment` at checkout. The screen was reaching
-- for a fixture that duplicated it — the same mistake `/facility/services/
-- memberships` made with `prepaidCredits`, which issued credit to typed-in
-- names that matched no client.
--
-- ── WHY THIS NEEDS ITS OWN REASON AND ITS OWN AUTHORITY ───────────────────
--
-- The ledger's insert policy asks for `process_refund` on ANY positive entry,
-- because creating credit is giving money away. Correct in general — and wrong
-- for this. Measured: `reception` and `retail` hold
-- `financial_manage_gift_cards` and NOT `process_refund`, and they are exactly
-- who stands at the counter when somebody hands over a card.
--
-- This is not a grant, it is a TRANSFER. The business owed the money on the
-- card; afterwards it owes the same money on the account. Total liability does
-- not move, and it cannot be abused to mint credit, because the debit is in the
-- same transaction and the gift-card trigger refuses an overdraft — credit can
-- only appear where a card really held it.
--
-- So `gift_card` becomes a reason of its own, positive-only, gated on
-- `financial_manage_gift_cards`. Reusing `added` would have worked and would
-- have told an auditor that the business gave this customer money, which is not
-- what happened.
--
-- ── AND A SECURITY DEFINER FUNCTION BYPASSES THAT POLICY ENTIRELY ─────────
--
-- Every other writer of `store_credit_entries` is SECURITY INVOKER, and
-- 20260806760000 says why in as many words: "SECURITY INVOKER, so both inserts
-- face their own policies". That is not a stylistic preference. Measured on
-- 2026-08-23, as `reception`, who holds no `process_refund`:
--
--   a SECURITY DEFINER function inserting a positive `added` row -> ALLOWED
--
-- `force row level security` does not stop it. FORCE removes the OWNER's
-- exemption, but the owner here is a superuser and superusers bypass RLS
-- outright. So the permission split simply is not there inside a definer.
--
-- This function has to be a definer — `gift_card_transactions` has no write
-- policy at all, deliberately, so that a card and its ledger cannot be
-- separated. Which means the check below is not belt-and-braces beside the
-- policy: inside here it is the ONLY thing standing there. The policy is
-- updated as well so that any future INVOKER path gets the same answer.
-- ============================================================================

-- ── THE REASON ────────────────────────────────────────────────────────────

alter table public.store_credit_entries
  drop constraint if exists store_credit_entries_reason_check;

alter table public.store_credit_entries
  add constraint store_credit_entries_reason_check
  check (reason in ('added', 'redeemed', 'expired', 'refund', 'adjustment', 'gift_card'));

alter table public.store_credit_entries
  drop constraint if exists store_credit_sign_matches_reason;

alter table public.store_credit_entries
  add constraint store_credit_sign_matches_reason check (
    case reason
      when 'added'      then amount > 0
      when 'refund'     then amount > 0
      when 'gift_card'  then amount > 0
      when 'redeemed'   then amount < 0
      when 'expired'    then amount < 0
      when 'adjustment' then true   -- the deliberate escape hatch, both ways
    end
  );

comment on constraint store_credit_sign_matches_reason on public.store_credit_entries is
  'The sign and the reason have to agree. `gift_card` is positive: it is value moved off a gift card onto the account, not credit granted.';

-- ── THE POLICY ────────────────────────────────────────────────────────────
--
-- Same three-way split, with the transfer carved out. Note again that a
-- SECURITY DEFINER caller never reaches this — see the header.

drop policy if exists store_credit_insert on public.store_credit_entries;
create policy store_credit_insert on public.store_credit_entries
  for insert to authenticated
  with check (
    case
      when amount > 0 and reason = 'gift_card'
        -- A transfer off a card, not a grant. The card is debited in the same
        -- transaction and cannot be overdrawn, so this cannot mint credit.
        then private.has_permission(facility_id, 'financial_manage_gift_cards')
      when amount > 0
        then private.has_permission(facility_id, 'process_refund')
      else private.has_permission(facility_id, 'financial_take_payment')
    end
  );

-- ── THE MOVE ──────────────────────────────────────────────────────────────
--
-- `p_client_ref` is BIGINT because `clients.ref` is. Declaring it `integer`
-- compiled fine and then could not be called at all — Postgres will not
-- implicitly narrow a bigint argument, so `redeem_gift_card_to_credit(text,
-- numeric, bigint, text) does not exist` came back from the first probe. The
-- same mismatch through PostgREST would have surfaced as a 404 on the RPC with
-- nothing pointing at the type.

create or replace function public.redeem_gift_card_to_credit(
  p_code       text,
  p_amount     numeric,
  p_client_ref bigint,
  p_note       text default null
)
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_card    public.gift_cards%rowtype;
  v_client  public.clients%rowtype;
  v_sub     text := (select auth.jwt() ->> 'sub');
  v_author  text;
  v_balance numeric(10, 2);
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'A redemption has to take something off the card.'
      using errcode = '22023';
  end if;

  -- ONE query: the permission is part of finding the row, so a caller who may
  -- not redeem here gets the same answer as one who invented the code. A gift
  -- card code is a bearer instrument — an error separating "real, but not
  -- yours" from "not real" is a way to search for real ones.
  select * into v_card
    from public.gift_cards
   where code = btrim(p_code)
     and private.has_permission(facility_id, 'financial_manage_gift_cards')
   for update;

  if not found then
    raise exception 'No gift card with that code that you can redeem.'
      using errcode = '42501';
  end if;

  if v_card.status = 'cancelled' then
    raise exception 'That gift card was cancelled.' using errcode = '42501';
  end if;

  -- The DATABASE's clock, not the caller's. Nothing sweeps expired cards, so
  -- `status` still reads `active` on one that is not.
  if v_card.expires_at is not null and v_card.expires_at <= now() then
    raise exception 'That gift card expired on %.',
      to_char(v_card.expires_at, 'YYYY-MM-DD')
      using errcode = '42501';
  end if;

  -- The customer must belong to the CARD's facility. Resolved here rather than
  -- taken on trust: `p_client_ref` is the small integer screens use, and refs
  -- are per-facility, so the same number names a different person elsewhere.
  select * into v_client
    from public.clients
   where facility_id = v_card.facility_id
     and ref = p_client_ref;

  if not found then
    raise exception 'No client with that number at this facility.'
      using errcode = '42501';
  end if;

  select full_name into v_author from public.profiles where id = v_sub;

  -- DEBIT FIRST. Both entries are in one transaction so the order cannot leave
  -- them apart, but this way an overdraft is refused with the trigger's own
  -- sentence naming both numbers, rather than by a constraint further down.
  insert into public.gift_card_transactions (
    gift_card_id, facility_id, kind, amount, balance_after, note, created_by
  )
  values (
    v_card.id, v_card.facility_id, 'redeemed', -p_amount, 0,
    coalesce(nullif(btrim(p_note), ''),
             'Moved to ' || v_client.name || '''s account credit'),
    v_sub
  );

  -- CREDIT SECOND. Same amount, same transaction: the business owes exactly
  -- what it owed a moment ago, in a different place.
  insert into public.store_credit_entries (
    facility_id, client_id, amount, reason, note, author_name, created_by
  )
  values (
    v_card.facility_id, v_client.id, p_amount, 'gift_card',
    coalesce(nullif(btrim(p_note), ''), 'Gift card ' || v_card.code),
    coalesce(v_author, 'Staff'), v_sub
  );

  -- The account balance afterwards, from the view that owns the sum. Returned
  -- rather than computed by the caller, so the number on the receipt is the
  -- one the till will honour.
  select coalesce(balance, 0) into v_balance
    from public.client_store_credit
   where client_id = v_client.id and facility_id = v_card.facility_id;

  return coalesce(v_balance, 0);
end;
$$;

comment on function public.redeem_gift_card_to_credit(text, numeric, bigint, text) is
  'Move value off a gift card onto a customer''s store credit, as two ledger entries in one transaction. Requires financial_manage_gift_cards, checked in the same query that finds the card - and checked EXPLICITLY because a SECURITY DEFINER function bypasses the store-credit insert policy. Returns the account balance afterwards. anon holds no EXECUTE grant.';

-- BOTH grantees named. `revoke ... from public` does not remove the grant
-- Supabase gives `anon` by name, and a revoke naming only anon leaves PUBLIC
-- standing — see 20260822610000.
revoke execute on function public.redeem_gift_card_to_credit(text, numeric, bigint, text) from public, anon;
