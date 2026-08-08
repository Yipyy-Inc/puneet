import { expect, test, type Page } from "@playwright/test";

import { signIn } from "./_auth";

// ============================================================================
// Refunding a card payment, through Clover's real sandbox.
//
// ── IT CONSUMES ITS FIXTURE, WHICH IS WHY IT SKIPS ────────────────────────
//
// Unlike clover-pay.spec.ts — which uses the decline card and can run all day —
// this one gives real money back and leaves the booking fully refunded. It
// cannot run twice against the same charge, so it is gated on environment and
// is off unless somebody has just made a payment to refund.
//
// A spec that needs a hand-made fixture and fails without one teaches people to
// ignore red. Skipping says what it needs instead.
//
// ── ORDER IS PART OF THE TEST ─────────────────────────────────────────────
//
// The over-refund check runs BEFORE the balance is drained. It ran after, the
// first time, and passed for the wrong reason — 409 "already refunded" rather
// than 409 "only $X is still refundable" — proving nothing about the branch it
// was written for. Serial, and the sequence is deliberate.
// ============================================================================

const BOOKING_REF = Number(process.env.CLOVER_E2E_REFUND_BOOKING_REF ?? "");
const CUSTOMER = process.env.CLOVER_E2E_CUSTOMER_EMAIL?.trim() ?? "";
const STAFF = process.env.CLOVER_E2E_STAFF_EMAIL?.trim() ?? "";

const refund = (page: Page, body: unknown) =>
  page.request.post("/api/payments/clover/refund", { data: body });

test.describe.configure({ mode: "serial" });

test.describe("refunding a card payment", () => {
  test.skip(
    !Number.isInteger(BOOKING_REF) || BOOKING_REF <= 0 || !CUSTOMER || !STAFF,
    "Set CLOVER_E2E_REFUND_BOOKING_REF, CLOVER_E2E_CUSTOMER_EMAIL and " +
      "CLOVER_E2E_STAFF_EMAIL. The booking needs an UNREFUNDED Clover payment: " +
      "this spec spends it. See .env.example.",
  );

  test("a customer cannot refund their own booking", async ({ page }) => {
    await signIn(page, CUSTOMER);
    const response = await refund(page, {
      bookingRef: BOOKING_REF,
      amountCents: 1000,
    });
    expect(response.status()).toBe(403);
    expect((await response.json()).error).toMatch(/not allowed/i);
  });

  test("asking for more than was taken is refused with the real figure", async ({
    page,
  }) => {
    await signIn(page, STAFF);
    const response = await refund(page, {
      bookingRef: BOOKING_REF,
      amountCents: 999_999,
    });
    const body = (await response.json()) as {
      error?: string;
      refundableCents?: number;
    };
    expect(response.status()).toBe(409);
    // The figure, not just a refusal — an operator needs to know what IS left.
    expect(body.refundableCents).toBeGreaterThan(0);
    expect(body.error).toMatch(/still refundable/i);
  });

  test("staff can refund part of it", async ({ page }) => {
    await signIn(page, STAFF);
    const response = await refund(page, {
      bookingRef: BOOKING_REF,
      amountCents: 1000,
      reason: "partial refund test",
    });
    const body = (await response.json()) as {
      refundedCents?: number;
      shortfallCents?: number;
    };
    expect(response.status()).toBe(200);
    expect(body.refundedCents).toBe(1000);
    expect(body.shortfallCents).toBe(0);
  });

  test("and then the remainder, without naming an amount", async ({ page }) => {
    await signIn(page, STAFF);
    const response = await refund(page, { bookingRef: BOOKING_REF });
    const body = (await response.json()) as { refundedCents?: number };
    expect(response.status()).toBe(200);
    // Whatever was left — NOT the original charge. Omitting the amount used to
    // ask Clover to reverse the whole thing, which it refuses once any part has
    // already been given back.
    expect(body.refundedCents).toBeGreaterThan(0);
  });

  test("a second refund is refused, not silently duplicated", async ({
    page,
  }) => {
    await signIn(page, STAFF);
    const response = await refund(page, { bookingRef: BOOKING_REF });
    expect(response.status()).toBe(409);
    expect((await response.json()).error).toMatch(/already been refunded/i);
  });
});
