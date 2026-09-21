import { test, expect } from "@playwright/test";

import { bookingListSearch } from "@/lib/api/booking-list-params";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A booking is paid when the ledger says so.
//
// ── WHAT THIS PROVES THAT THE OLD MODEL COULD FAKE ────────────────────────
//
// `bookings.payment_status` was a text column any staff member — or the seed —
// could set. Thirteen bookings claimed $790.75 with `public.payments` empty,
// and nothing anywhere would have noticed. Since 20260806680000 the column is
// derived from the ledger and no writer can set it, which is proved in SQL by
// supabase/tests/booking-payment-derivation.sql.
//
// What SQL cannot prove is that the shape survives the HTTP boundary: that the
// route stops sending the field, that `create_booking` refuses it rather than
// eating it, and that the mapper serves the derived figure back. That is this
// file.
//
// ── IT WRITES TO AN IMMUTABLE TABLE, SO IT REVERSES RATHER THAN DELETES ───
//
// `payments` has no delete policy and a trigger that blocks one — a payment
// that happened, happened (20260806220000, Decision 1). So cleanup cannot
// remove the row. It records a REFUND, which is what a business does, and
// leaves the booking reading 'refunded' with the money netted to zero.
// ============================================================================

const MARKER = "[e2e payment-ledger]";
const CLIENT_REF = 15;
const PET_REF = 1;

interface BookingPayload {
  id: number;
  status?: string;
  paymentStatus?: string;
  amountPaid?: number;
  totalCost?: number;
  specialRequests?: string;
}

const AMOUNT = 42;

function bookingBody(overrides: Record<string, unknown> = {}) {
  const day = new Date(Date.now() + 250 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return {
    clientId: CLIENT_REF,
    petId: PET_REF,
    facilityId: 11,
    service: "daycare",
    startDate: day,
    endDate: day,
    checkInTime: "09:00",
    checkOutTime: "17:00",
    status: "confirmed",
    basePrice: AMOUNT,
    discount: 0,
    totalCost: AMOUNT,
    specialRequests: MARKER,
    ...overrides,
  };
}

/** A payment body the checkout dialog would produce. Signed: negative refunds. */
function paymentBody(bookingRef: number, subtotal: number, tip = 0) {
  return {
    bookingRef: String(bookingRef),
    method: "cash",
    subtotal,
    tax: 0,
    tip,
    storeCreditApplied: 0,
    packagePassApplied: 0,
    loyaltyDiscountApplied: 0,
    amountCharged: subtotal + tip,
    grandTotal: subtotal + tip,
    cashReceived: subtotal + tip,
    receiptChannels: [],
    creditNote: "",
  };
}

/**
 * Re-read one booking.
 *
 * Through the LIST, because `/api/bookings/[ref]` only handles PATCH. Adding a
 * GET so a test could read more conveniently would be new API surface built for
 * the test rather than for the app.
 */
async function readBooking(
  page: import("@playwright/test").Page,
  id: number,
): Promise<BookingPayload> {
  // ONE booking, asked for by ref. This read used to be the whole list --
  // 1,499 rows and 16-20 s against the e2e facility, two sequential PostgREST
  // round trips because the route pages at 1000 -- in order to keep a single
  // row. Measured 2026-09-17: the same read as `?ref=` is 1,194-1,367 ms.
  //
  // The `.find` stays as a belt: the route filters server-side now, so this
  // runs over one row, but if the param were ever dropped the helper would
  // still answer with the right booking rather than the newest one.
  const res = await page.request.get(
    `/api/bookings${bookingListSearch({ ref: id })}`,
  );
  expect(res.ok(), await res.text()).toBe(true);
  const all = (await res.json()) as BookingPayload[];
  const found = all.find((b) => b.id === id);
  expect(found, `booking #${id} is in the list`).toBeTruthy();
  return found!;
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    // ── `?? []` GUARDED THE WRONG SHAPE ──────────────────────────────────
    //
    // It guarded null. What actually arrived on 2026-09-21, part-way through
    // a full local suite, was an OBJECT — so `for...of` threw, inside
    // `afterAll`, and the cleanup that had been carefully written did nothing
    // at all. The rows stayed on the shared database and the only sign was a
    // TypeError in a teardown nobody reads.
    //
    // A cleanup that cannot see the list says so, rather than reporting the
    // zero it did.
    const listed = await page.request.get("/api/bookings");
    const body = listed.ok() ? await listed.json().catch(() => null) : null;
    const bookings: BookingPayload[] = Array.isArray(body) ? body : [];
    if (!Array.isArray(body)) {
      console.log(
        `cleanup: /api/bookings answered ${listed.status()} with no list — NOTHING was cleaned up`,
      );
    }

    let reversed = 0;
    let cancelled = 0;
    for (const b of bookings) {
      if (!b.specialRequests?.includes(MARKER)) continue;
      // Already dealt with on a previous run. Skipped so the counts below
      // describe THIS run rather than growing by four every time.
      if (b.status === "cancelled" && (b.amountPaid ?? 0) === 0) continue;

      // Reverse whatever is standing. The payment row cannot be removed, so
      // the only honest cleanup is the one a business would do.
      if ((b.amountPaid ?? 0) > 0) {
        const res = await page.request.post("/api/payments", {
          data: paymentBody(b.id, -(b.amountPaid ?? 0)),
        });
        if (res.ok()) reversed++;
        else console.log(`cleanup: refund on #${b.id} -> ${res.status()}`);
      }
      const cancel = await page.request.patch(`/api/bookings/${b.id}`, {
        data: { status: "cancelled" },
      });
      if (cancel.ok()) cancelled++;
    }
    console.log(`cleanup: ${reversed} refund(s), ${cancelled} cancellation(s)`);
  } finally {
    await page.close();
  }
});

test.describe("a booking is paid when the ledger says so", () => {
  test("a new booking owes everything, however the body asks", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // As the OWNER — the account that holds every permission there is. Under
    // the old model this body produced a booking marked paid with no money
    // recorded against it, which is exactly how the seeded thirteen happened.
    const res = await page.request.post("/api/bookings", {
      data: bookingBody({ paymentStatus: "paid" }),
    });
    expect(res.status(), await res.text()).toBe(201);

    const created = (await res.json()) as BookingPayload;
    expect(
      created.paymentStatus,
      "the answer is the ledger's, not the body's",
    ).toBe("pending");
    expect(Number(created.amountPaid ?? -1)).toBe(0);
  });

  test("recording a payment settles it, and the figure comes back", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // Its OWN booking, not one found by marker. Searching the list for "a
    // marked booking with nothing paid" would happily pick up a cancelled
    // leftover from a previous run — and pass, having asserted nothing about
    // this one.
    const created = (await (
      await page.request.post("/api/bookings", { data: bookingBody() })
    ).json()) as BookingPayload;

    // The payments endpoint takes a BOOKING, not a grooming appointment — this
    // is a daycare booking, and the field used to be called `appointmentId`.
    const paid = await page.request.post("/api/payments", {
      data: paymentBody(created.id, AMOUNT),
    });
    expect(paid.status(), await paid.text()).toBe(201);

    const after = await readBooking(page, created.id);
    expect(after.paymentStatus).toBe("paid");
    expect(Number(after.amountPaid)).toBe(AMOUNT);
  });

  test("a tip does not settle a shortfall", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.post("/api/bookings", {
      data: bookingBody(),
    });
    expect(res.status(), await res.text()).toBe(201);
    const created = (await res.json()) as BookingPayload;

    // $22 against a $42 bill, plus a $30 tip: $52 received, $20 still owed.
    const paid = await page.request.post("/api/payments", {
      data: paymentBody(created.id, 22, 30),
    });
    expect(paid.status(), await paid.text()).toBe(201);

    const after = await readBooking(page, created.id);
    expect(after.paymentStatus, "a tip is not payment toward the bill").toBe(
      "pending",
    );
    expect(Number(after.amountPaid)).toBe(22);
  });

  test("a booking cannot be talked into being paid over HTTP", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // Part-paid on purpose: `before` has to be a number the PATCH could
    // plausibly move. Asserting that zero stayed zero would also pass if the
    // route silently reset the figure.
    const created = (await (
      await page.request.post("/api/bookings", { data: bookingBody() })
    ).json()) as BookingPayload;
    await page.request.post("/api/payments", {
      data: paymentBody(created.id, 10),
    });
    const before = Number((await readBooking(page, created.id)).amountPaid);
    expect(before, "the booking is part-paid before the attempt").toBe(10);

    // The PATCH route merges the whole booking and sends it all, so this is
    // the realistic attempt: not a crafted request, just an edit that happens
    // to carry the field.
    const res = await page.request.patch(`/api/bookings/${created.id}`, {
      data: { paymentStatus: "paid", amountPaid: 999 },
    });
    // Not refused — accepted, and overwritten. The distinction matters: a
    // refusal would surface as an error, and this has to hold when nothing
    // surfaces at all.
    expect(res.ok(), await res.text()).toBe(true);

    const after = await readBooking(page, created.id);
    expect(after.paymentStatus).toBe("pending");
    expect(Number(after.amountPaid)).toBe(before);
  });
});
