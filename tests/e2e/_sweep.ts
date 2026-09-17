import type { Browser } from "@playwright/test";

import { bookingListSearch } from "@/lib/api/booking-list-params";
import { BOOKING_STATUS_IDS } from "@/lib/settings/booking-statuses";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Cancel every booking a spec's marker owns.
//
// ── WHY THIS IS SHARED, AND WHY IT RUNS TWICE ─────────────────────────────
//
// `bookings` has no DELETE policy, by design — a booking is cancelled, not
// erased. So a spec that creates one can only cancel it, and the cancelled row
// stays. That is fine: it is inert, and it is what the product would do.
//
// What is NOT fine is a booking left CONFIRMED. It shows on the facility's
// bookings screen as real work, and it holds its kennel. Reported from the
// running app on 2026-08-19: somebody opened a booking detail page, found it
// nearly empty, and asked whether the product had lost their data — it was a
// leftover `[e2e boarding-occupancy]` row, one of four.
//
// All four came from the same cause: the run died before `afterAll` could
// execute. `role-editor-writes.spec.ts` records the same lesson from the other
// direction — a leftover grant sent five unrelated specs red — and concludes
// that cleaning up at the start is not ENOUGH. It is not. But it is the only
// thing that heals a run that never reached its end, so the answer is both:
//
//   beforeAll  heal whatever the last run left behind
//   afterAll   put back what this run took
//
// Neither alone is sufficient, and together they are self-correcting: a crashed
// run is repaired by the next one rather than accumulating until somebody
// notices from a screenshot.
//
// ── IT ASKS FOR WHAT IT FILTERS FOR ───────────────────────────────────────
//
// The read below used to be an unbounded `GET /api/bookings`, and then this
// helper threw away every cancelled row in the browser. Measured 2026-09-17:
// the table holds 1,700 bookings of which 1,497 are cancelled — 88.1% — so the
// sweep was fetching 1,700 rows to act on at most 203, in TWO sequential
// PostgREST round trips, because the route pages at 1000.
//
// Naming the statuses is not a smaller answer, it is the same answer fetched:
// 203 rows, one round trip. The status list is DERIVED from the database enum
// minus `cancelled`, which is exactly the predicate `mine` applies below, so
// the request and the filter cannot drift — add a status to the enum and it
// appears in both. Spelling the list out by hand is how a sweep silently stops
// seeing a new status and leaves rows behind.
//
// Why this and not `clientRef`: the marker is the identity here, and different
// specs book different clients. `?clientRef=15` is also the read that returns
// 500 "canceling statement due to statement timeout" — that client carries
// 1,073 bookings, 1,060 of them cancelled e2e debris.
//
// ── IT NEVER THROWS ───────────────────────────────────────────────────────
//
// A sweep that fails must not fail the suite: in `beforeAll` it would mask the
// real tests, and in `afterAll` it would turn a green run red over tidying. It
// logs what it could not do and returns.
// ============================================================================

/**
 * Every status except `cancelled` — the rows this sweep can still act on.
 *
 * Derived, not typed out: see the note above. A booking already cancelled is
 * what the sweep is trying to produce, so asking for it is pure cost.
 */
export const SWEEPABLE_STATUSES = BOOKING_STATUS_IDS.filter(
  (id) => id !== "cancelled",
);

interface SweepableBooking {
  id: number;
  specialRequests?: string;
  status: string;
}

/**
 * Cancel every non-cancelled booking whose `specialRequests` contains `marker`.
 *
 * @param marker the spec's own tag, e.g. `[e2e boarding-occupancy]`
 * @returns how many were cancelled, for the log line
 */
export async function cancelBookingsMarked(
  browser: Browser,
  marker: string,
  phase: "before" | "after" = "after",
): Promise<number> {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);

    const response = await page.request.get(
      `/api/bookings${bookingListSearch({ statuses: SWEEPABLE_STATUSES })}`,
    );
    if (!response.ok()) {
      console.log(`sweep(${phase}): could not read bookings, skipping`);
      return 0;
    }

    const bookings = (await response.json()) as SweepableBooking[];
    const mine = bookings.filter(
      (b) => b.specialRequests?.includes(marker) && b.status !== "cancelled",
    );

    let cancelled = 0;
    for (const b of mine) {
      const res = await page.request.patch(`/api/bookings/${b.id}`, {
        data: { status: "cancelled" },
      });
      if (res.ok()) cancelled++;
      else console.log(`sweep(${phase}): id ${b.id} -> ${res.status()}`);
    }

    if (mine.length > 0) {
      console.log(
        `sweep(${phase}): ${cancelled}/${mine.length} booking(s) cancelled for ${marker}`,
      );
    }
    return cancelled;
  } catch (error) {
    console.log(
      `sweep(${phase}): ${error instanceof Error ? error.message : String(error)}`,
    );
    return 0;
  } finally {
    await page.close();
  }
}
