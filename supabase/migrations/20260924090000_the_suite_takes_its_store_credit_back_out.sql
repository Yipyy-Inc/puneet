-- ============================================================================
-- public.purge_e2e_store_credit() — the store-credit half of
-- `bun run e2e:purge`.
--
-- ── IT CORRECTS, IT DOES NOT DELETE, AND THAT IS THE WHOLE DESIGN ─────────
--
-- Its three siblings delete their rows. This one cannot, and should not want
-- to. `store_credit_entries` carries `store_credit_block_delete`, a BEFORE
-- DELETE trigger running `public.prevent_money_mutation()`, which raises
-- unconditionally — no role check, no exemption for a SECURITY DEFINER
-- caller — and whose hint says exactly what to do instead:
--
--   "Money records are immutable; append a correcting entry (a refund, or an
--    adjustment) instead."
--
-- A purge function could still get its way, by disabling the trigger or by
-- setting `session_replication_role`. It would then be a shipped, permanent
-- capability to delete rows from a money ledger, created to tidy a demo
-- customer's history. That is the wrong trade, and the guard is not an
-- obstacle to route around — it is the table telling you which mechanism to
-- use.
--
-- So this appends ONE adjustment per client, bringing the balance the suite
-- invented back to nothing. `store-credit.spec.ts` has cleaned up this way
-- since it was written; this is the same move, for the rows nothing was
-- cleaning up.
--
-- ── WHY IT WAS NEEDED ─────────────────────────────────────────────────────
--
-- Measured 2026-09-24: `store_credit_entries` held 622 rows and 615 of them
-- were e2e leftovers — 575 from `gift-cards.spec.ts` redeeming cards to
-- credit since 2026-08-23, worth $25,875 of invented balance on ONE demo
-- customer, and 40 from `store-credit.spec.ts`. Seven rows were real.
--
-- It had already caused one defect. `GET /api/store-credit` computes
-- `balance`, `totalIssued` and `totalSpent` as SUMS over the rows it reads,
-- and had no `.limit()` — so past PostgREST's silent 1,000-row cap the screen
-- would not have shown a short list, it would have shown the WRONG BALANCE,
-- while `record_payment` kept deducting from the real ledger. That read was
-- paged on 2026-09-23 and is no longer the problem; the debris is what the
-- fix was needed for, and it was growing about four rows per push.
--
-- ── ONLY WHAT NOTHING POINTS AT ───────────────────────────────────────────
--
-- `payment_id is null and booking_id is null` on every row counted. A debit
-- written when somebody SPENT credit carries a `payment_id`, and
-- `store_credit_debit_matches_payment` exists to keep those two in step;
-- correcting around one would leave a payment deducting from a balance that
-- no longer explains it. Measured today: zero of the 615 carry either.
--
-- ── IDEMPOTENT, BECAUSE THE CORRECTION IS MARKED TOO ──────────────────────
--
-- The adjustment it writes carries the same `[e2e]` marker it matched on, so
-- the next run sums the originals AND the correction, finds zero, and writes
-- nothing. Running it twice is not a second correction.
-- ============================================================================

create or replace function public.purge_e2e_store_credit()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_row     record;
  v_written integer := 0;
begin
  for v_row in
    select e.facility_id,
           e.client_id,
           sum(e.amount) as outstanding
      from public.store_credit_entries e
     where (e.note like 'Gift card E2E-GC-%'
            or e.note like '%[e2e store-credit]%')
       -- Never a row that some payment or booking depends on.
       and e.payment_id is null
       and e.booking_id is null
     group by e.facility_id, e.client_id
    having abs(sum(e.amount)) > 0.005
  loop
    insert into public.store_credit_entries
      (facility_id, client_id, amount, reason, note, author_name)
    values
      (v_row.facility_id, v_row.client_id, -v_row.outstanding, 'adjustment',
       '[e2e store-credit] purge correction', 'e2e:purge');
    v_written := v_written + 1;
  end loop;

  return v_written;
end;
$function$;

-- `revoke from public` and `revoke from anon` are different grants; a
-- function is reachable through either, so both are named. Asserted against
-- has_function_privilege() in supabase/tests/purge-e2e-store-credit.sql
-- rather than trusted for having been written — see 20260822610000, which
-- exists only because a first attempt named one of them.
revoke execute on function public.purge_e2e_store_credit() from public;
revoke execute on function public.purge_e2e_store_credit() from anon;
revoke execute on function public.purge_e2e_store_credit() from authenticated;
grant execute on function public.purge_e2e_store_credit() to service_role;

comment on function public.purge_e2e_store_credit() is
  'Appends one balancing adjustment per client for store credit the suite invented. Never deletes: the ledger is append-only by design. Service role only; called by bun run e2e:purge.';
