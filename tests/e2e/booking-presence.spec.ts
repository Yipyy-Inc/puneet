import { test, expect } from "@playwright/test";

import { bookingListSearch } from "@/lib/api/booking-list-params";

import { ACCOUNTS, signIn } from "./_auth";
import { bookingsMarked } from "./_sweep";

// ============================================================================
// One answer to "is this pet here", for every service.
//
// ── THE SPLIT THIS CLOSES ─────────────────────────────────────────────────
//
// Grooming records arrival by moving `bookings.status` ('checked_in',
// 'in_progress', 'ready'). Daycare and boarding leave the status alone and
// stamp a timestamp on their own table. So the bookings list could tell you a
// groom was in the building, and could not tell you the same about a boarding
// guest — it showed "Confirmed" for a dog that had been in kennel 4 since
// Tuesday.
//
// `booking_presence` derives one answer from whichever table owns it, and the
// list has an "On site" column that means the same thing for every service.
//
// ── WHAT IS DELIBERATELY NOT ASSERTED ─────────────────────────────────────
//
// That `bookings.status` moves for daycare. It does not, and it should not:
// the status is a LIFECYCLE and presence is a different axis. The test below
// asserts exactly that — a checked-in daycare booking is still `confirmed`.
// ============================================================================

const MARKER = "[e2e presence]";
const CLIENT_REF = 15;
const PET_REF = 1;

interface BookingPayload {
  id: number;
  status?: string;
  specialRequests?: string;
  presence?: string;
  arrivedAt?: string | null;
  departedAt?: string | null;
}

function daycareBody() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    clientId: CLIENT_REF,
    petId: PET_REF,
    facilityId: 11,
    service: "daycare",
    startDate: today,
    endDate: today,
    checkInTime: "08:00",
    checkOutTime: "17:00",
    status: "confirmed",
    basePrice: 45,
    discount: 0,
    totalCost: 45,
    specialRequests: MARKER,
  };
}

async function readBooking(
  page: import("@playwright/test").Page,
  ref: number,
): Promise<BookingPayload | undefined> {
  // ONE booking, asked for by ref. This read used to be the whole list --
  // 1,499 rows and 16-20 s against the e2e facility, two sequential PostgREST
  // round trips because the route pages at 1000 -- in order to keep a single
  // row. Measured 2026-09-17: the same read as `?ref=` is 1,194-1,367 ms.
  //
  // The `.find` stays as a belt: the route filters server-side now, so this
  // runs over one row, but if the param were ever dropped the helper would
  // still answer with the right booking rather than the newest one.
  // Loudly, not silently. The same cast here produced `TypeError: all is not
  // iterable` when the server was failing, which names neither the status nor
  // what came back — thirty minutes of a run were spent working out that the
  // server had died rather than that a test was wrong. A helper is not a
  // teardown: it SHOULD stop the test, but with the answer in the message.
  const res = await page.request.get(
    `/api/bookings${bookingListSearch({ ref })}`,
  );
  const body = (await res.json().catch(() => null)) as unknown;
  if (!Array.isArray(body)) {
    throw new Error(
      `GET /api/bookings answered ${res.status()} with no list: ${JSON.stringify(body)?.slice(0, 200)}`,
    );
  }
  const all = body as BookingPayload[];
  return all.find((b) => b.id === ref);
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    // A CAST IS A CLAIM, and this one was false on 2026-09-22: the server was
    // failing, `/api/bookings` answered something that was not a list, and
    // `for...of` threw "all is not iterable" INSIDE afterAll — so this cleanup
    // cancelled nothing and left its rows on the shared database while the run
    // still looked like it had tidied up. Same shape as the neighbour in
    // daycare-attendance.spec.ts, and what `check:teardown-shape` is for.
    // Asked of the DATABASE by marker (`bookingsMarked`, the service role's
    // way in), not read out of a booking list: guarded, the list read still
    // timed out under load and cleaned nothing (debt map, 2026-09-25).
    const all = (await bookingsMarked(MARKER)).map((b) => ({
      id: b.ref,
      status: b.status,
      specialRequests: MARKER,
      amountPaid: b.amountPaid,
    }));
    let cancelled = 0;
    for (const b of all) {
      if (!b.specialRequests?.includes(MARKER)) continue;
      if (b.status === "cancelled") continue;
      // The check-in first: cancelling alone leaves the attendance row
      // standing and the pet reads "on-site" for ever. That is how nine of
      // these accumulated before the view made them visible.
      await page.request.delete(`/api/daycare/attendance/${b.id}`);
      const res = await page.request.patch(`/api/bookings/${b.id}`, {
        data: { status: "cancelled" },
      });
      if (res.ok()) cancelled++;
    }
    console.log(`cleanup: ${cancelled} booking(s) cancelled`);
  } finally {
    await page.close();
  }
});

test.describe("booking presence", () => {
  test.slow();

  let ref = 0;

  test("a booking with no arrival is expected, not unknown", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const created = await page.request.post("/api/bookings", {
      data: daycareBody(),
    });
    expect(created.status(), await created.text()).toBe(201);
    ref = ((await created.json()) as BookingPayload).id;

    const booking = await readBooking(page, ref);
    expect(booking?.presence, "a daycare booking has an attendance row").toBe(
      "expected",
    );
    expect(booking?.arrivedAt).toBeNull();
  });

  test("checking in moves presence, and the booking follows", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.post("/api/daycare/attendance", {
      data: { bookingRef: ref },
    });
    expect(res.status(), await res.text()).toBe(201);

    const booking = await readBooking(page, ref);
    expect(booking?.presence).toBe("on-site");
    expect(booking?.arrivedAt, "with a time on it").not.toBeNull();

    // THE POINT, REVERSED 2026-09-18 (20260918151018). This asserted the
    // status stayed "confirmed" — presence was a separate axis — and that
    // left two records disagreeing: the board said on site, the list, the
    // calendar and the customer said confirmed. The owner chose one truth:
    // the attendance write is still the record of arrival, and the database
    // mirrors it into the status, through a pass in enforce_booking_integrity
    // that admits exactly that and nothing else.
    expect(booking?.status, "the lifecycle follows the pet").toBe("checked_in");
  });

  test("checking out moves it again", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.patch(`/api/daycare/attendance/${ref}`, {
      data: { checkOut: true },
    });
    expect(res.status(), await res.text()).toBe(204);

    const booking = await readBooking(page, ref);
    expect(booking?.presence).toBe("departed");
    expect(booking?.departedAt).not.toBeNull();
    expect(booking?.status, "collected is completed").toBe("completed");
  });

  test("a service with no attendance table reads unknown", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    // A CUSTOM-SERVICE MODULE. This test used `training` until training got a
    // table of its own (20260806980000) and moved from `unknown` to `expected`
    // — which is the change working, and the test being right about the wrong
    // example. Custom modules still have none.
    const today = new Date().toISOString().slice(0, 10);
    const created = await page.request.post("/api/bookings", {
      data: {
        ...daycareBody(),
        service: "paws-express",
        startDate: today,
        endDate: today,
      },
    });
    expect(created.status(), await created.text()).toBe(201);
    const customRef = ((await created.json()) as BookingPayload).id;

    // Not "expected" — that would claim the pet is booked in somewhere that
    // tracks arrivals. Nothing records arrivals for a custom module, and
    // `unknown` says exactly that.
    const booking = await readBooking(page, customRef);
    expect(booking?.presence).toBe("unknown");
  });

  test("the bookings list shows one On site column for every service", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    await page.goto("/facility/dashboard/bookings");
    await expect(
      page.getByRole("columnheader", { name: /on site/i }).first(),
    ).toBeVisible({ timeout: 60_000 });

    // The daycare booking above went home; before this change the list would
    // have shown "Confirmed" and nothing else, for it and for every boarding
    // guest in the building.
    //
    // Found by its number rather than read off the first page. This asserted
    // that SOME row on page one stated a presence, which held only because
    // every cancelled row said "Expected" — a promise about a pet that was
    // never coming. Since the list stopped saying that (222c1e6a), a first
    // page of cancelled test bookings has nothing to state, correctly.
    test.skip(ref === 0, "needs the daycare booking from the tests above");
    await page.getByPlaceholder(/search by booking number/i).fill(String(ref));
    await expect(
      page.locator('[data-presence="departed"]').first(),
      "the booking that went home says so",
    ).toBeVisible({ timeout: 30_000 });
  });
});
