import { expect, test } from "@playwright/test";

import {
  allocate,
  reversalsToRecord,
  settledRefunds,
  type CloverRefundElement,
} from "@/lib/clover/reversal";

// ============================================================================
// What a Clover-side refund is worth, and what it is called.
//
// ── WHY THIS SPEC EXISTS, AND WHY IT DRIVES NO BROWSER ────────────────────
//
// A manager can refund inside Clover's own dashboard, and Yipyy learns about it
// from a webhook (real-time) or the 15-minute sweep (backup). Both end in the
// same arithmetic, and that arithmetic decides two things that are real money:
// how much a booking is shown as having been given back, and what the reversal
// is CALLED — because `payments_processor_identity` is unique on the Clover id
// and a repeated name means the row is refused and the money is never recorded.
//
// It cannot be reached through a browser: it needs a refund to exist at Clover,
// which needs a card. So the arithmetic was moved into `lib/clover/reversal.ts`
// with no imports of its own, and is asserted here directly. Playwright is used
// only as the runner this repo already has — there is no unit runner, and a
// spec in no suite is not coverage.
//
// Every case below is a bug that was in production on 2026-08-26, not a
// hypothetical.
// ============================================================================

/** The $100 + $8 tax + $20 tip payment used throughout, in cents. */
const PAYMENT = { subtotal: 10000, tax: 800, tip: 2000, grandTotal: 12800 };

const refund = (
  id: string,
  amount: number,
  extra: Partial<CloverRefundElement> = {},
): CloverRefundElement => ({ id, amount, status: "SUCCESS", ...extra });

test.describe("which refunds are money", () => {
  test("a listed refund is not proof money moved", () => {
    // The trap that `payment.result === "SUCCESS"` exists to stop, one level
    // down. Summing every element counts a refund that FAILED as money given
    // back: the ledger records a reversal that never happened, the booking says
    // the customer was repaid, and the facility is out of pocket.
    const elements = [
      refund("R1", 1000),
      refund("R2", 2000, { status: "FAILED" }),
      refund("R3", 3000, { voided: true }),
      refund("R4", 4000, { status: "INITIATED" }),
    ];

    expect(settledRefunds(elements).map((r) => r.id)).toEqual(["R1"]);
  });

  test("a refund with no status at all still counts", () => {
    // Deliberately the other way round from the case above. Every payload
    // measured carries `status`, but refusing a refund because an API version
    // omitted it would UNDER-report a real reversal — and that is the error
    // that leaves a customer out of pocket rather than the facility.
    expect(settledRefunds([{ id: "R1", amount: 500 }])).toHaveLength(1);
  });
});

test.describe("what a reversal is called", () => {
  test("two partial refunds get two different names", () => {
    // THE BUG. Both rows used to be named `elements[0].id`, so the second
    // collided with the first on `payments_processor_identity` and the insert
    // was refused — "duplicate key value violates unique constraint". Two such
    // failures sat in payment_webhook_events from 8 August.
    const first = reversalsToRecord({
      voided: false,
      paymentId: "PAY1",
      refunds: [refund("R1", 1000)],
      gap: 1000,
      alreadyRecorded: new Set(),
    });
    expect(first).toEqual([{ reference: "R1", amount: 1000 }]);

    // Now the manager refunds again. The ledger holds R1; Clover lists both.
    const second = reversalsToRecord({
      voided: false,
      paymentId: "PAY1",
      refunds: [refund("R1", 1000), refund("R2", 2000)],
      gap: 2000,
      alreadyRecorded: new Set(["R1"]),
    });
    expect(second).toEqual([{ reference: "R2", amount: 2000 }]);
  });

  test("a replayed delivery records nothing twice", () => {
    // The webhook and the sweep ask the same question on purpose, and a
    // duplicate delivery has no retry policy behind it. Running twice must be
    // the design, not a risk.
    expect(
      reversalsToRecord({
        voided: false,
        paymentId: "PAY1",
        refunds: [refund("R1", 1000)],
        gap: 0,
        alreadyRecorded: new Set(["R1"]),
      }),
    ).toEqual([]);
  });

  test("a legacy aggregate row is not double-counted", () => {
    // Payments reversed BEFORE per-refund rows carry one row naming no
    // individual refund, so every refund id looks unrecorded. Without the gap
    // as a ceiling this writes the money a second time — on an APPEND-ONLY
    // table, where it cannot then be removed.
    const out = reversalsToRecord({
      voided: false,
      paymentId: "PAY1",
      // Clover says 3000 reversed in total; the ledger already holds 1000
      // under an aggregate identity that matches neither id.
      refunds: [refund("R1", 1000), refund("R2", 2000)],
      gap: 2000,
      alreadyRecorded: new Set(["SOME-AGGREGATE-ID"]),
    });

    expect(out.reduce((sum, r) => sum + r.amount, 0)).toBe(2000);
  });

  test("a refund with no id is skipped rather than invented", () => {
    // A made-up identity is one a real delivery could later collide with. The
    // gap arithmetic brings it back on the next sweep.
    expect(
      reversalsToRecord({
        voided: false,
        paymentId: "PAY1",
        refunds: [{ amount: 1000, status: "SUCCESS" }],
        gap: 1000,
        alreadyRecorded: new Set(),
      }),
    ).toEqual([]);
  });

  test("a void is one row and keeps the void's own id", () => {
    expect(
      reversalsToRecord({
        voided: true,
        voidReference: "VOID1",
        paymentId: "PAY1",
        refunds: [],
        gap: 12800,
        alreadyRecorded: new Set(),
      }),
    ).toEqual([{ reference: "VOID1", amount: 12800 }]);
  });

  test("a void with no reference falls back to the payment, never to nothing", () => {
    expect(
      reversalsToRecord({
        voided: true,
        paymentId: "PAY1",
        refunds: [],
        gap: 12800,
        alreadyRecorded: new Set(),
      }),
    ).toEqual([{ reference: "PAY1", amount: 12800 }]);
  });
});

test.describe("what a reversal moves on the booking", () => {
  // `private.booking_amount_paid` is sum(grand_total - tip - tax), so the
  // SUBTOTAL is the part that changes what a customer is shown as owing. Each
  // case below asserts that quantity, not just the split.
  const movesBalanceBy = (of: ReturnType<typeof allocate>) =>
    of.total - of.tip - of.tax;

  test("a full reversal returns exactly what was charged", () => {
    const split = allocate(12800, PAYMENT);
    expect(split).toEqual({
      subtotal: 10000,
      tax: 800,
      tip: 2000,
      total: 12800,
    });
    expect(movesBalanceBy(split)).toBe(10000);
  });

  test("a partial reversal no longer lands entirely on the subtotal", () => {
    // THE BUG. A $20 partial used to be written as subtotal:-2000, tax:0,
    // tip:0 — so it moved the booking's balance by the WHOLE $20 regardless of
    // what the $20 actually was. Refunding a tip flipped a fully-paid booking
    // into owing $20 that nobody owed.
    const split = allocate(2000, PAYMENT);

    expect(split.total).toBe(2000);
    expect(split.tax).toBeGreaterThan(0);
    expect(split.tip).toBeGreaterThan(0);
    expect(split.subtotal).toBeLessThan(2000);
    expect(movesBalanceBy(split)).toBeLessThan(2000);
  });

  test("the components always sum to the amount, to the cent", () => {
    // The subtotal absorbs the rounding remainder on purpose: `grand_total` is
    // what the money is, and it must never disagree with its own parts.
    for (const amount of [1, 7, 99, 333, 1000, 4714, 12799]) {
      const split = allocate(amount, PAYMENT);
      expect(split.subtotal + split.tax + split.tip, `${amount} cents`).toBe(
        amount,
      );
    }
  });

  test("a payment with no tax or tip puts everything on the subtotal", () => {
    const split = allocate(500, {
      subtotal: 1000,
      tax: 0,
      tip: 0,
      grandTotal: 1000,
    });
    expect(split).toEqual({ subtotal: 500, tax: 0, tip: 0, total: 500 });
  });

  test("a zero-total payment cannot divide by itself", () => {
    const split = allocate(100, {
      subtotal: 0,
      tax: 0,
      tip: 0,
      grandTotal: 0,
    });
    expect(split).toEqual({ subtotal: 100, tax: 0, tip: 0, total: 100 });
  });
});
