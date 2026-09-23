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

// ── Forms ───────────────────────────────────────────────────────────────────
//
// Same reasoning as the report cards above: this is the command CI already runs
// with `if: always()`, so a third script would be a third thing nobody runs.
//
// Nothing removed the suite's FORMS until 2026-09-20. Measured that day:
// `forms` held 1,117 rows, 1,076 of them e2e leftovers going back to
// 2026-08-23, and 880 of the 905 rows in `form_submissions` hung off them.
//
// It was not only untidy. `GET /api/forms` sets no limit, so PostgREST caps the
// answer at 1,000 rows, and `forms.spec.ts` "the screen shows the forms the
// database holds" started failing because the row it had just created sorted
// past the cap. Junk data made a real screen wrong, not just a test.
//
// `purge_e2e_forms()` deletes the submissions first — `form_submissions` points
// at `form_versions` ON DELETE RESTRICT, so the answers block the form — then
// the forms, which cascade to their versions and requirement overrides.
const { data: formData, error: formError } = await db.rpc("purge_e2e_forms");

if (formError) {
  console.error(`Could not purge forms: ${formError.message}`);
  process.exit(1);
}

const formsDeleted = typeof formData === "number" ? formData : 0;

console.log(
  formsDeleted === 0
    ? "Nothing to purge: no e2e forms left."
    : `Purged ${formsDeleted} e2e form(s) and their submissions.`,
);

// ── The chores ─────────────────────────────────────────────────────────────
//
// `facility-task-groups.spec.ts` cleans up by RETIRING what it made, because
// that is all the API offers. Measured 2026-09-23: `facility_task_groups` held
// 896 rows and `facility_task_definitions` 1,117, and NOT ONE of them belonged
// to a facility — every chore and every group in the database was debris from
// this spec, going back to 2026-08-23. `facility_tasks` held 1,369, of which 7
// were real.
//
// `GET /api/task-groups` read all 896 with two nested embeds, took 7.5-9s, sat
// on the statement timeout and failed about half the time — and the screen
// rendered that as "Groups 0" rather than as an error. Bounding the route was
// the fix (b6e04b99); this removes what the fix was needed for.
//
// The order is the whole function: groups before chores, because
// `facility_task_group_items.definition_id` is ON DELETE RESTRICT so a chore a
// group still names cannot go. A chore some SURVIVING group names is left
// rather than raised on, which is why three counts come back instead of one.
const { data: choreData, error: choreError } = await db.rpc(
  "purge_e2e_task_groups",
);

if (choreError) {
  console.error(`Could not purge task groups: ${choreError.message}`);
  process.exit(1);
}

const chores = Array.isArray(choreData) ? choreData[0] : choreData;
const tasksDeleted = Number(chores?.tasks ?? 0);
const groupsDeleted = Number(chores?.groups ?? 0);
const definitionsDeleted = Number(chores?.definitions ?? 0);

console.log(
  tasksDeleted + groupsDeleted + definitionsDeleted === 0
    ? "Nothing to purge: no e2e task groups left."
    : `Purged ${groupsDeleted} e2e task group(s), ${definitionsDeleted} chore(s) and ${tasksDeleted} task(s).`,
);
