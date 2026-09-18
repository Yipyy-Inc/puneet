-- ============================================================================
-- The database stops trusting the till with two money facts.
--
-- Found 2026-09-18 while the POS's fake buttons were wired to real ones, and
-- demonstrated against the live database before this migration existed
-- (supabase/tests/till-trust-guards.sql, run first as a negative control):
--
--   * a store-credit spend one cent over a client's balance was accepted, and
--     record_payment then spent $10 more — the balance ended at -$40.01;
--   * a cashier whose role had retail_apply_discount REMOVED could still
--     record a manually discounted sale, alone or beside a promo code.
--
-- Both guards are on the TABLES, not in the functions. `authenticated` can
-- INSERT into store_credit_entries and retail_sales directly, and both
-- record_payment and record_retail_sale are SECURITY INVOKER — so a check
-- inside the function would be a fence with a gate beside it. This follows the
-- ledger's own rule (20260806220000): "the trigger is the binding layer".
--
-- Neither changes existing rows. Measured before applying: 3 clients hold
-- store credit, none is negative (the lowest balance is $25.00), and no retail
-- sale has ever carried a discount.
-- ============================================================================

-- ── 1. A store-credit balance never goes below zero ───────────────────────
--
-- There is no balance column: the balance is the sum of the entries, and
-- nothing refused a negative sum. `payments_credits_are_not_negative` only
-- checks the AMOUNT applied, and the insert policy only checks WHO may spend
-- (financial_take_payment), never how much.
--
-- SECURITY DEFINER so the sum sees every entry whatever the caller may read —
-- a balance computed from the rows one happens to be allowed to see is not a
-- balance. The advisory lock serialises spends per client, so two tills
-- spending the same $20 at once cannot both see $20.
--
-- No service-role exemption, deliberately: unlike a permission, a balance does
-- not depend on who is asking.

create or replace function private.store_credit_never_overdrawn()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance numeric;
begin
  if new.amount >= 0 then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('store_credit:' || new.facility_id::text || ':' || coalesce(new.client_id::text, ''), 0));

  select coalesce(sum(amount), 0) into v_balance
    from public.store_credit_entries
   where facility_id = new.facility_id
     and client_id = new.client_id;

  if v_balance + new.amount < 0 then
    raise exception 'That client has % of store credit, not %.', v_balance, -new.amount
      using errcode = '23514', hint = 'store_credit_insufficient';
  end if;

  return new;
end;
$$;

revoke all on function private.store_credit_never_overdrawn() from public;
revoke all on function private.store_credit_never_overdrawn() from anon;
revoke all on function private.store_credit_never_overdrawn() from authenticated;

create trigger store_credit_never_overdrawn
  before insert on public.store_credit_entries
  for each row execute function private.store_credit_never_overdrawn();

-- ── 2. A manual retail discount needs retail_apply_discount ───────────────
--
-- The permission was enforced only by hiding a button. record_retail_sale
-- took `p_discount` as sent and checked retail_process_sale alone.
--
-- A promo code's discount is not manual: record_retail_sale re-quotes the code
-- itself and writes the quoted amount to promo_code_redemptions — AFTER the
-- sale row, in the same transaction. So the check cannot run at insert time.
-- It runs at COMMIT, as a deferred constraint trigger, when the redemption row
-- exists: manual = discount_total - what the redemptions account for.
--
-- The service role is exempt: it is the trusted server key and carries no
-- staff identity to check a permission against (the same idiom as
-- private.unfinished_booking_guard).

create or replace function private.retail_sale_discount_is_permitted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_promo numeric;
begin
  if new.discount_total <= 0 then
    return null;
  end if;
  if current_setting('role', true) = 'service_role' then
    return null;
  end if;

  select coalesce(sum(amount), 0) into v_promo
    from public.promo_code_redemptions
   where retail_sale_id = new.id;

  if new.discount_total - v_promo > 0.005
     and not private.has_permission(new.facility_id, 'retail_apply_discount') then
    raise exception 'Not allowed to discount a sale at this facility.'
      using errcode = '42501', hint = 'discount_not_permitted';
  end if;

  return null;
end;
$$;

revoke all on function private.retail_sale_discount_is_permitted() from public;
revoke all on function private.retail_sale_discount_is_permitted() from anon;
revoke all on function private.retail_sale_discount_is_permitted() from authenticated;

create constraint trigger retail_sales_discount_is_permitted
  after insert on public.retail_sales
  deferrable initially deferred
  for each row execute function private.retail_sale_discount_is_permitted();

-- A revoke is not verified by having been written.
do $check$
begin
  if has_function_privilege('anon', 'private.store_credit_never_overdrawn()', 'execute')
     or has_function_privilege('authenticated', 'private.store_credit_never_overdrawn()', 'execute')
     or has_function_privilege('anon', 'private.retail_sale_discount_is_permitted()', 'execute')
     or has_function_privilege('authenticated', 'private.retail_sale_discount_is_permitted()', 'execute') then
    raise exception 'a till guard is still executable by anon or authenticated';
  end if;
end
$check$;
