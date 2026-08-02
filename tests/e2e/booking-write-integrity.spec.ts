import { test, expect, type Page } from "@playwright/test";

// ============================================================================
// A customer cannot book on their own terms.
//
// RLS decided WHOSE booking a row was; it never decided WHAT could be put in
// one. Prices, status and payment_status arrived from the request body and
// were written as sent, and facility_id was never checked against the client's
// facility. So a signed-in customer could book at zero, mark it paid and
// confirmed, and file it against a facility they had never been to.
//
// The rules live in the DATABASE (20260802120000), because PostgREST is
// reachable directly with the anon key and a session cookie — the Route
// Handler is a convenience, not a gate. supabase/tests/booking-write-integrity.sql
// proves them at that level, as the caller, which is the honest place to ask.
//
// THIS FILE ASKS A DIFFERENT QUESTION: does the app still work, and does it
// tell the truth about what happened? A trigger that silently rewrites a
// booking is only correct if the response the customer gets reflects it.
//
// TO CONFIRM THESE FAIL WITHOUT THE FIX: drop the bookings_enforce_integrity
// trigger and re-run. The first test goes red — though NOT by storing the
// customer's numbers, as you might expect. It fails with a 403: without the
// trigger deriving facility_id, the bookings_insert policy refuses the whole
// row. Worth knowing, because it means this route was never the hole. The
// hole was PostgREST, where the same customer sets the price directly, and
// only supabase/tests/booking-write-integrity.sql reaches that.
// ============================================================================

const PASSWORD = "YipyyDev!2026";

/** Alice Johnson — the seeded client behind customer@yipyy.dev. */
const CUSTOMER_CLIENT_REF = 15;
const OWN_PET_REF = 1; // Buddy
const STRANGER_PET_REF = 3; // Max, belonging to client 16

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect
    .poll(async () => (await page.request.get("/api/permissions")).status(), {
      timeout: 30_000,
    })
    .toBe(200);
}

/**
 * Every booking this file creates carries this marker, and afterAll cancels
 * anything wearing it.
 *
 * These tests write to the real database — there is no fixture layer, and the
 * point is to exercise the actual route. Without cleanup each run would leave
 * two live bookings on a seeded client's record, and someone would eventually
 * find "grooming, 09:00" appointments nobody made. Cancelled rather than
 * deleted because there is no delete policy on bookings, by design.
 */
const MARKER = "[e2e booking-write-integrity]";

/** The shape the booking modal actually posts — facility wall-clock dates. */
function bookingBody(overrides: Record<string, unknown> = {}) {
  const day = new Date(Date.now() + 6 * 86_400_000).toISOString().slice(0, 10);
  return {
    clientId: CUSTOMER_CLIENT_REF,
    petId: OWN_PET_REF,
    facilityId: 11,
    service: "grooming",
    startDate: day,
    endDate: day,
    checkInTime: "09:00",
    checkOutTime: "10:00",
    status: "pending",
    basePrice: 0,
    discount: 0,
    totalCost: 0,
    paymentStatus: "pending",
    specialRequests: MARKER,
    ...overrides,
  };
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    // As the owner: holds edit_bookings, so the cancellation is allowed for
    // every booking regardless of which account created it.
    await signIn(page, "owner@yipyy.dev");
    // `id`, not `ref` — rowToBooking maps the numeric ref onto `id` for the
    // app's Booking shape. Reading the wrong field sent PATCH /api/bookings/
    // undefined, which answers 400, which the loop above now surfaces.
    const bookings = (await (
      await page.request.get("/api/bookings")
    ).json()) as { id: number; specialRequests?: string; status: string }[];

    const mine = bookings.filter(
      (b) => b.specialRequests?.includes(MARKER) && b.status !== "cancelled",
    );

    // Count what the SERVER confirmed, not what was attempted. The first
    // version of this reported "cancelled 2" while both bookings were still
    // live — it counted the loop, not the outcome, which is the same mistake
    // as a test that asserts nothing.
    let cancelled = 0;
    for (const b of mine) {
      const res = await page.request.patch(`/api/bookings/${b.id}`, {
        data: { status: "cancelled" },
      });
      if (res.ok()) cancelled++;
      else console.log(`cleanup: id ${b.id} -> ${res.status()}`);
    }
    console.log(
      `cleanup: ${cancelled}/${mine.length} test booking(s) cancelled`,
    );
  } finally {
    await page.close();
  }
});

test.describe("booking write integrity", () => {
  test("a customer's price and status are the facility's to set", async ({
    page,
  }) => {
    await signIn(page, "customer@yipyy.dev");

    const res = await page.request.post("/api/bookings", {
      data: bookingBody({
        // Everything a customer should not get to decide, sent anyway.
        status: "confirmed",
        paymentStatus: "paid",
        basePrice: 240,
        discount: 40,
        totalCost: 200,
      }),
    });

    expect(res.status()).toBe(201);
    const booking = (await res.json()) as Record<string, unknown>;

    // The RESPONSE has to show what was stored, not what was asked for.
    // Re-reading after the trigger is what makes that true.
    expect(booking.status).toBe("request_submitted");
    expect(Number(booking.totalCost ?? 0)).toBe(0);
    expect(Number(booking.basePrice ?? 0)).toBe(0);
  });

  test("a stranger's pet is refused, and no booking is left behind", async ({
    page,
  }) => {
    await signIn(page, "customer@yipyy.dev");

    const before = (await (await page.request.get("/api/bookings")).json()) as
      | unknown[]
      | null;

    const res = await page.request.post("/api/bookings", {
      data: bookingBody({ petId: STRANGER_PET_REF }),
    });

    // 403/422 either way — what matters is that it is not a 201.
    expect(res.status()).not.toBe(201);

    // The pets are validated BEFORE the booking is written, because there is
    // no delete policy to undo one. A half-written booking would survive.
    const after = (await (await page.request.get("/api/bookings")).json()) as
      | unknown[]
      | null;
    expect((after ?? []).length).toBe((before ?? []).length);
  });

  test("staff keep their authority over price and status", async ({ page }) => {
    await signIn(page, "owner@yipyy.dev");

    const res = await page.request.post("/api/bookings", {
      data: bookingBody({
        status: "confirmed",
        basePrice: 90,
        discount: 10,
        totalCost: 80,
      }),
    });

    expect(res.status()).toBe(201);
    const booking = (await res.json()) as Record<string, unknown>;

    // The other half. Without this the first test would pass just as well if
    // the trigger zeroed everything for everybody.
    expect(booking.status).toBe("confirmed");
    expect(Number(booking.totalCost ?? 0)).toBe(80);
  });
});
