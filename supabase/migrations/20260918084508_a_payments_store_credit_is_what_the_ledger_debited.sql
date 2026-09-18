-- ============================================================================
-- A payment's store credit is what the ledger debited for it.
--
-- `payments.store_credit_applied` was a column any payer could write, and
-- `authenticated` may insert into `payments`. A payment could claim "$10 of
-- this was store credit" with no matching debit in `store_credit_entries` — the
-- client kept the credit, and the facility counted the $10 as paid. Demonstrated
-- against the live database before this migration existed
-- (supabase/tests/till-trust-guards.sql, section C, run first as a negative
-- control): a claim with no debit, a $10 claim with a $5 debit, a claim backed
-- by ANOTHER client's credit, and a debit attached afterwards to a payment that
-- never claimed it — all four were accepted.
--
-- ── WHICH RECORD IS THE TRUTH ─────────────────────────────────────────────
--
-- The LEDGER. A client's balance is the sum of their entries, and that sum is
-- what 20260918083126 guards (never below zero). Deriving the debit FROM the
-- payment instead would hand the balance's input to a column any payer can
-- write. So a payment's claim must equal the DEBITS linked to it by
-- payment_id — negative entries only, because a refund TO store credit links a
-- positive entry to a payment that claims $0 — and every such debit must be the
-- same client's, at the same facility.
--
-- ── WHY AT COMMIT, AND FROM BOTH SIDES ────────────────────────────────────
--
-- record_payment inserts the payment first and its debit second, so the pair
-- only agrees at the end of the transaction: deferred constraint triggers. And
-- a debit can be inserted later pointing at an existing payment, so the same
-- check runs when a linked debit arrives. Payments and entries are both
-- immutable (their block_update / block_delete triggers), so INSERT is the only
-- way either side can change.
--
-- Nothing legitimate is refused. The only writers of a store-credit claim are
-- record_payment, which writes the linked debit itself, and nothing else:
-- record_clover_payment always writes store_credit_applied = 0 (a bill split
-- between credit and a card is two payments), and attach_unattached_payment
-- never sets it. Measured before applying: no payment in production claims store
-- credit at all, so no existing row is out of step.
--
-- No service-role exemption: whether a claim matches the ledger does not depend
-- on who wrote it.
-- ============================================================================

create or replace function private.payment_credit_matches_ledger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment  uuid;
  v_claimed  numeric;
  v_facility uuid;
  v_client   uuid;
  v_debited  numeric;
  v_foreign  integer;
begin
  if tg_table_name = 'payments' then
    -- A payment claiming nothing needs no lookup: a debit attached to it later
    -- is caught by the trigger on store_credit_entries.
    if coalesce(new.store_credit_applied, 0) = 0 then
      return null;
    end if;
    v_payment := new.id;
  else
    -- Only a DEBIT linked to a payment concerns this rule.
    if new.payment_id is null or new.amount >= 0 then
      return null;
    end if;
    v_payment := new.payment_id;
  end if;

  select coalesce(store_credit_applied, 0), facility_id, client_id
    into v_claimed, v_facility, v_client
    from public.payments
   where id = v_payment;
  if not found then
    return null;  -- a dangling reference is store_credit_refs_valid's to refuse
  end if;

  select coalesce(-sum(amount), 0),
         count(*) filter (where client_id is distinct from v_client
                             or facility_id <> v_facility)
    into v_debited, v_foreign
    from public.store_credit_entries
   where payment_id = v_payment
     and amount < 0;

  if v_debited <> v_claimed or v_foreign > 0 then
    raise exception
      'A payment''s store credit (%) must be what the ledger debited for it from the same client (%).',
      v_claimed, v_debited
      using errcode = '23514', hint = 'store_credit_unbacked';
  end if;

  return null;
end;
$$;

revoke all on function private.payment_credit_matches_ledger() from public;
revoke all on function private.payment_credit_matches_ledger() from anon;
revoke all on function private.payment_credit_matches_ledger() from authenticated;

create constraint trigger payments_credit_matches_ledger
  after insert on public.payments
  deferrable initially deferred
  for each row execute function private.payment_credit_matches_ledger();

create constraint trigger store_credit_debit_matches_payment
  after insert on public.store_credit_entries
  deferrable initially deferred
  for each row execute function private.payment_credit_matches_ledger();

-- A revoke is not verified by having been written.
do $check$
begin
  if has_function_privilege('anon', 'private.payment_credit_matches_ledger()', 'execute')
     or has_function_privilege('authenticated', 'private.payment_credit_matches_ledger()', 'execute') then
    raise exception 'payment_credit_matches_ledger is still executable by anon or authenticated';
  end if;
end
$check$;
