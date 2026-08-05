import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

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
  const all = (await (
    await page.request.get("/api/bookings")
  ).json()) as BookingPayload[];
  return all.find((b) => b.id === ref);
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const all = (await (
      await page.request.get("/api/bookings")
    ).json()) as BookingPayload[];
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

  test("checking in moves presence and leaves the lifecycle alone", async ({
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

    // THE POINT. The booking's status is untouched — presence is a different
    // axis, and forcing it into `status` would have meant punching a hole
    // through `enforce_booking_integrity` for the roles that check pets in.
    expect(booking?.status, "the lifecycle did not move").toBe("confirmed");
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
    expect(booking?.status).toBe("confirmed");
  });

  test("a service with no attendance table reads unknown", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const today = new Date().toISOString().slice(0, 10);
    const created = await page.request.post("/api/bookings", {
      data: {
        ...daycareBody(),
        service: "training",
        startDate: today,
        endDate: today,
      },
    });
    expect(created.status(), await created.text()).toBe(201);
    const trainingRef = ((await created.json()) as BookingPayload).id;

    // Not "expected" — that would claim the pet is booked in somewhere that
    // tracks arrivals. Training has no table at all, and `unknown` says so.
    const booking = await readBooking(page, trainingRef);
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
    await expect(
      page.locator("[data-presence]").first(),
      "at least one row states where the pet is",
    ).toBeVisible({ timeout: 30_000 });
  });
});
