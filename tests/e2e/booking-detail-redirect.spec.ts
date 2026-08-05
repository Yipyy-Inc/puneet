import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// /facility/dashboard/bookings/[id] takes you to the booking.
//
// ── THE DEFECT ────────────────────────────────────────────────────────────
//
// The route was 1,197 lines of booking-detail UI behind a mount-time
// `router.replace`, and the replace resolved its destination out of
// `initialBookings` — the mock array:
//
//     const booking = initialBookings.find((b) => b.id === bookingId);
//
// A booking created since the migration is not in that array, so the effect
// never fired and the page fell through to its own "Booking not found."
// Every link to this route was broken for real data, and there are eight of
// them — Billing, the check-in screen, the client page, the kennel view.
//
// The first test below is that exact case: create a booking through the API,
// then follow the link. It could not have passed before.
// ============================================================================

const MARKER = "[e2e detail-redirect]";
const CLIENT_REF = 15;
const PET_REF = 1;

interface BookingPayload {
  id: number;
  status?: string;
  specialRequests?: string;
}

function bookingBody() {
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

test.describe("the booking detail link", () => {
  test.slow();

  test("a booking created through the API is reachable by its link", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const created = await page.request.post("/api/bookings", {
      data: bookingBody(),
    });
    expect(created.status(), await created.text()).toBe(201);
    const ref = ((await created.json()) as BookingPayload).id;

    await page.goto(`/facility/dashboard/bookings/${ref}`);

    // The destination is the client-nested page, resolved from the DATABASE.
    // The old redirect looked the booking up in a module array and, not finding
    // it, rendered "Booking not found."
    await expect(page).toHaveURL(
      new RegExp(`/facility/dashboard/clients/${CLIENT_REF}/bookings/${ref}$`),
      { timeout: 60_000 },
    );
    await expect(
      page.getByText(/booking not found/i),
      "the dead end is gone",
    ).toHaveCount(0);
  });

  test("a booking that does not exist is a 404, not a blank page", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // RLS makes "not yours" and "not there" the same answer, which is the
    // right one for both.
    //
    // Asserted on the RENDERED 404 rather than the HTTP status: the dev server
    // serves the not-found page with a 200, so `response.status()` would be
    // testing Next's dev behaviour rather than this route's.
    await page.goto("/facility/dashboard/bookings/99999999");
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveURL(/\/facility\/dashboard\/bookings\/99999999$/);
  });

  test("a reference that is not a number is a 404 too", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    await page.goto("/facility/dashboard/bookings/not-a-ref");
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible({
      timeout: 30_000,
    });
  });
});
