import { expect, test, type APIResponse, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The counter can give money back — to the right people, off the right sales.
//
// ── WHY THIS SPEC GIVES NOTHING BACK ──────────────────────────────────────
//
// `/api/payments/retail/refund` reverses a real payment at a real merchant.
// Every case below is REFUSED before Clover is contacted — signed out, no
// permission, a sale that is not a counter sale, a malformed id — so the suite
// runs on every push without moving money or needing a terminal.
//
// The one thing it cannot assert is a completed reversal: that needs a real
// sale taken on real hardware. The path it would exercise is `refundPayments`
// in `lib/clover/refund.ts`, which is the same code the booking refund route
// has been running against live Clover since before this route existed.
//
// ── AND WHY IT IS WORTH RUNNING ANYWAY ────────────────────────────────────
//
// Retail could take money for a day before it could give any back, and the
// gap that made returns impossible was never the processor — it was that the
// screen could not see its own sales. Now that it can, the thing most likely
// to go wrong is not the refund. It is WHO may ask for one, and WHICH rows
// they may name. That is all this asserts.
// ============================================================================

const refund = (page: Page, body: unknown): Promise<APIResponse> =>
  page.request.post("/api/payments/retail/refund", { data: body });

const sales = (page: Page): Promise<APIResponse> =>
  page.request.get("/api/payments/retail/sales");

/** A syntactically perfect request naming a sale that does not exist. */
const wellFormed = {
  paymentId: "00000000-0000-4000-8000-000000000000",
  amountCents: 100,
  reason: "Bag of food returned unopened",
};

test.describe("the retail refund route", () => {
  test("refuses anyone who is not signed in", async ({ page }) => {
    await page.context().clearCookies();
    expect((await refund(page, wellFormed)).status()).toBe(401);
    expect((await sales(page)).status()).toBe(401);
  });

  test("refuses a groomer, who may not process refunds", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);
    const response = await refund(page, wellFormed);
    // 403, and before the row is looked up: a groomer must not be able to
    // probe which payment ids exist by reading 404 against 403.
    expect(response.status()).toBe(403);
    expect((await response.json()).error).toMatch(/not allowed/i);
  });

  test("shows a groomer no takings at all", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);
    const response = await sales(page);
    // `payments_read` needs financial_view_amounts. Somebody without it gets
    // an empty till rather than a refusal — the same answer a facility that has
    // sold nothing gets, which is the point: the list must not confirm that
    // takings exist.
    expect(response.status()).toBe(200);
    expect((await response.json()).sales).toEqual([]);
  });

  test("refuses a sale that does not exist", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const response = await refund(page, wellFormed);
    expect(response.status()).toBe(404);
    expect((await response.json()).error).toMatch(/no counter sale/i);
  });

  test("refuses an id that is not an id, and an amount that is not one", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    expect(
      (await refund(page, { ...wellFormed, paymentId: "sale-42" })).status(),
    ).toBe(400);

    // Zero is not a refund, and neither is a negative one — that would be a
    // charge wearing a refund's name.
    expect(
      (await refund(page, { ...wellFormed, amountCents: 0 })).status(),
    ).toBe(400);
    expect(
      (await refund(page, { ...wellFormed, amountCents: -500 })).status(),
    ).toBe(400);
  });

  test("never lets the caller choose the facility", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    // A body naming another business would let a member of one facility reverse
    // a sale through another's merchant. The field is not read at all, so the
    // answer is unchanged — that sameness IS the assertion.
    const response = await refund(page, {
      ...wellFormed,
      facilityId: "00000000-0000-0000-0000-000000000000",
    });
    expect(response.status()).toBe(404);
  });

  test("will not reverse a booking's payment through the counter", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // Find a real card payment that belongs to a booking. Refunding one of
    // these HERE would move the money correctly and leave the booking's
    // amount_paid and payment_status derived from a ledger its own screen never
    // learns changed — so the route matches on `booking_id is null` and this is
    // the case that proves it.
    // Discovered rather than hard-coded. The first draft named the refs of a
    // booking that HAD Clover payments, and every one of them belonged to a
    // different facility — so RLS correctly showed this account nothing and the
    // test failed for a reason that had nothing to do with what it asserts.
    // The processor does not matter here: what is being proven is that a
    // payment with a booking is not reachable through the counter route.
    let bookingPaymentId: string | null = null;
    for (let ref = 1; ref <= 30 && !bookingPaymentId; ref++) {
      const response = await page.request.get(
        `/api/payments?bookingRef=${ref}`,
      );
      if (!response.ok()) continue;
      // A bare array, not an envelope — `/api/payments` answers with the rows
      // themselves.
      const rows = (await response.json()) as {
        id: string;
        isRefund?: boolean;
      }[];
      const paid = (Array.isArray(rows) ? rows : []).find((p) => !p.isRefund);
      if (paid) bookingPaymentId = paid.id;
    }

    // Not a silent skip. A run where this account can see no booking payment at
    // all is a run against the wrong database, and that is worth being told
    // about rather than quietly passing.
    expect(
      bookingPaymentId,
      "no booking-attached payment found — this assertion needs a seeded database",
    ).not.toBeNull();

    const response = await refund(page, {
      paymentId: bookingPaymentId,
      amountCents: 100,
      reason: "Should never be allowed",
    });
    expect(response.status()).toBe(404);
    expect((await response.json()).error).toMatch(/no counter sale/i);
  });

  test("lists only sales, and only ones it could refund", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const response = await sales(page);
    expect(response.status()).toBe(200);

    const body = (await response.json()) as {
      sales: {
        paymentId: string;
        amountCents: number;
        refundableCents: number;
      }[];
    };

    for (const sale of body.sales) {
      // A reversal is not something you can return, so the list must carry no
      // negative rows...
      expect(sale.amountCents).toBeGreaterThan(0);
      // ...and nothing may offer back more than was ever taken. This is the
      // arithmetic that stops a sale being refunded twice.
      expect(sale.refundableCents).toBeGreaterThanOrEqual(0);
      expect(sale.refundableCents).toBeLessThanOrEqual(sale.amountCents);
    }
  });
});
