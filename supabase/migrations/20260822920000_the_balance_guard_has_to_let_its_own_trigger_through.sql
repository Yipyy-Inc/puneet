-- ============================================================================
-- The balance guard has to let the ledger trigger through.
--
-- 20260822900000 shipped a guard that refused EVERY update to
-- `gift_cards.balance`, including the one `private.gift_card_apply_transaction`
-- performs. So the two triggers deadlocked the feature against itself:
--
--   insert gift_card_transactions
--     -> BEFORE INSERT: gift_card_apply_transaction updates gift_cards.balance
--        -> BEFORE UPDATE: gift_card_balance_comes_from_the_ledger raises
--
-- and `issue_gift_card` — which posts the opening entry — could never succeed.
-- Nothing could be issued at all. Caught by running it, not by reading it: the
-- migration applied cleanly, both triggers are individually correct, and the
-- contradiction only exists at the moment one fires the other.
--
-- ── THE FIX IS THE ONE THE LOYALTY LEDGER ALREADY USES ────────────────────
--
-- `private.loyalty_balances_come_from_the_ledger` (20260821260000) checks a
-- transaction-local GUC that its own applying trigger sets. Same shape here,
-- under a different key. Copying that pattern rather than inventing one keeps
-- both ledgers legible to whoever reads the second one first.
--
-- `set_config(..., true)` is TRANSACTION-LOCAL, and the flag is turned off again
-- immediately after the update rather than left on. Leaving it set would let a
-- direct `update gift_cards set balance = ...` later in the SAME transaction
-- through, which is exactly what the guard exists to stop.
-- ============================================================================

create or replace function private.gift_card_apply_transaction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_card public.gift_cards%rowtype;
  v_new  numeric(10, 2);
begin
  select * into v_card from public.gift_cards
   where id = new.gift_card_id
   for update;

  if not found then
    raise exception 'That gift card does not exist.' using errcode = 'P0002';
  end if;

  v_new := v_card.balance + new.amount;

  if v_new < 0 then
    raise exception
      'That gift card holds %, which is less than the % being taken off it.',
      to_char(v_card.balance, 'FM999999990.00'),
      to_char(abs(new.amount), 'FM999999990.00')
      using errcode = '23514';
  end if;

  new.balance_after := v_new;

  -- Opened for exactly one statement, then shut. See the header.
  perform set_config('app.gift_card_ledger_write', 'on', true);

  update public.gift_cards
     set balance = v_new,
         status = case
                    when status in ('cancelled', 'expired') then status
                    when v_new = 0 then 'redeemed'
                    else 'active'
                  end,
         last_used_at = case when new.amount < 0 then now() else last_used_at end,
         updated_at = now()
   where id = v_card.id;

  perform set_config('app.gift_card_ledger_write', 'off', true);

  return new;
end;
$$;

create or replace function private.gift_card_balance_comes_from_the_ledger()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- The ledger trigger, and only for the statement it opened.
  if coalesce(current_setting('app.gift_card_ledger_write', true), 'off') = 'on' then
    return new;
  end if;

  if new.balance is distinct from old.balance then
    raise exception
      'A gift card balance follows the ledger. Post a gift_card_transactions row instead.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;
