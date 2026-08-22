/**
 * ============================================================================
 * Take the suite's bookings back out of a real facility's database.
 *
 *   bun run e2e:purge
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 *
 * There is one Postgres. Every spec cleans up by CANCELLING what it created,
 * which is what keeps the boards honest — a cancelled booking is excluded
 * everywhere. It is not what keeps the TABLE honest.
 *
 * Measured 2026-08-20, before this ran for the first time: `bookings` held 477
 * rows, 434 of them e2e leftovers. The facility had 43 of its own. Each full
 * run of the operations cluster leaves about 35 more, and that cluster now runs
 * on every pull request.
 *
 * ── IT DELETES ALMOST NOTHING, DELIBERATELY ───────────────────────────────
 *
 * `public.purge_e2e_bookings()` takes no argument. It can only ever match
 * `%[e2e %`, only rows already CANCELLED, and only rows with no payment, store
 * credit or package pass against them — `payments` is an append-only ledger and
 * a booking that took money keeps its row so the payment still points at
 * something. 158 of those 434 were in that state and stayed.
 *
 * The safety is in the function, not in this file: there is no pattern here to
 * get wrong, and nothing in `src/` can call it.
 *
 * ── WHERE IT RUNS ─────────────────────────────────────────────────────────
 *
 * As a CI step after the e2e job, with `if: always()` so a failed run does not
 * skip its own cleanup. Locally, whenever a suite run has left a mess.
 * ============================================================================
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceRoleKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set (see .env.local).",
  );
  process.exit(1);
}

const db = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await db.rpc("purge_e2e_bookings");

if (error) {
  console.error(`Could not purge: ${error.message}`);
  process.exit(1);
}

const deleted = typeof data === "number" ? data : 0;

// A count, not a claim. Zero is the ordinary result on a repeat run and is not
// a failure — everything left is either live or holds money.
console.log(
  deleted === 0
    ? "Nothing to purge: no cancelled, money-free e2e bookings left."
    : `Purged ${deleted} e2e booking(s).`,
);

// ── Report cards ────────────────────────────────────────────────────────────
//
// Here rather than in a second script because this is the command CI already
// runs after the e2e job with `if: always()`, and a cleanup nobody runs is not
// one. Same shape: the function takes no argument and carries its own safety.
//
// The report-card spec removes its own DRAFTS. What it cannot remove is the one
// card it SENDS per run — a sent card has no DELETE policy, deliberately,
// because the owner received it and their reply and rating live on that row.
// Left alone that is one permanent card per CI run on a demo client.
const { data: cardData, error: cardError } = await db.rpc(
  "purge_e2e_report_cards",
);

if (cardError) {
  console.error(`Could not purge report cards: ${cardError.message}`);
  process.exit(1);
}

const cardsDeleted = typeof cardData === "number" ? cardData : 0;

console.log(
  cardsDeleted === 0
    ? "Nothing to purge: no e2e report cards left."
    : `Purged ${cardsDeleted} e2e report card(s).`,
);
