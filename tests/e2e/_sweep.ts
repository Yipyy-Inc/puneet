import type { Browser } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

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

// ============================================================================
// Find a marker's bookings WITHOUT reading the facility's list.
//
// ── WHY A SECOND WAY IN ───────────────────────────────────────────────────
//
// Everything above reads `/api/bookings` as staff, through row-level security,
// which is a permission check per row — and under the full suite's load that
// read answers 500 `canceling statement due to statement timeout`. On
// 2026-09-25 two cleanups that read the facility's WHOLE list that way lost
// everything after it: `dashboard-live-board` and `daily-care-board` walked
// the `{error}` body with `for...of`, threw, and never reached the line that
// put the pricing rules back. An "Early Drop-off Fee" of $14 stayed on in the
// demo facility and every later checkout cost more than its spec asserted —
// most of that night's seventeen failures came from one read.
//
// Finding the rows is not the part that needs RLS. This asks the database for
// the marker with the service role, the way the purge step does; the caller
// still undoes each row through the API, as staff would.
//
// ── IT NEVER THROWS, EITHER ───────────────────────────────────────────────
//
// For the reason `cancelBookingsMarked` gives above. A lookup that fails says
// so and answers nothing.
// ============================================================================

export interface MarkedBooking {
  /** The booking's number — what `/api/bookings/:ref` takes. */
  ref: number;
  status: string;
  service: string;
  amountPaid: number;
}

/**
 * Every booking whose `specialRequests` contains `marker` and that still
 * needs undoing: not cancelled yet, or cancelled with money still standing.
 *
 * `holdingAStay` asks a different question — every marked booking that still
 * has a `boarding_stays` row, WHATEVER its status. Cancelling only releases a
 * stay; the row survives, and a room with any stay against it refuses to be
 * deleted. So a sweep that removes rooms needs the cancelled ones too, and
 * only those: `rooms-admin` owns 187 cancelled bookings and one stay.
 */
export async function bookingsMarked(
  marker: string,
  { holdingAStay = false }: { holdingAStay?: boolean } = {},
): Promise<MarkedBooking[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.log(`sweep: no service-role key, so nothing found for ${marker}`);
    return [];
  }
  try {
    const bookings = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }).from("bookings");
    const { data, error } = await (holdingAStay
      ? bookings
          .select(
            "ref, status, service, amount_paid, boarding_stays!inner(booking_id)",
          )
          .like("special_requests", `%${marker}%`)
      : bookings
          .select("ref, status, service, amount_paid")
          .like("special_requests", `%${marker}%`)
          .or("status.neq.cancelled,amount_paid.gt.0"));
    if (error) {
      console.log(`sweep: could not look up ${marker}: ${error.message}`);
      return [];
    }
    return (
      (data ?? []) as {
        ref: number | string;
        status: string;
        service: string;
        amount_paid: number | string | null;
      }[]
    ).map((row) => ({
      ref: Number(row.ref),
      status: row.status,
      service: row.service,
      amountPaid: Number(row.amount_paid ?? 0),
    }));
  } catch (error) {
    console.log(
      `sweep: could not look up ${marker}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}
