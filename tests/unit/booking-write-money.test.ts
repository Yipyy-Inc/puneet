import { describe, expect, test } from "bun:test";

import {
  splitBookingMoney,
  type BookingMoney,
} from "@/lib/pricing/booking-write-money";
import type { PricingRuleAdjustment } from "@/lib/pricing-rules";

// ============================================================================
// WHAT THE BOOKING FORM WRITES, FROM WHAT IT QUOTED.
//
// The gap this closes: the pricing engine had 18 unit tests, the screen had a
// Playwright spec, and the twelve lines that turn a quote into three columns
// had nothing — they lived inside a `useMemo` in a 2,600-line component, where
// nothing could reach them. A discount was subtracted twice there (measured
// 2026-09-23: a booking quoted at $80 came back owing $60).
//
// THE INVARIANT every case re-checks, because the three outputs are one
// sentence and not three numbers:
//
//     amount_due = serviceTotal + extras_total − discount   (the database)
//                = (total − fees + discount) + fees − discount
//                = total                                    (the quote)
//
// `amountDue` below is that generated column, written out by hand —
// deliberately, so the test states the DATABASE's formula rather than
// re-running the code's.
// ============================================================================

function adj(
  source: PricingRuleAdjustment["source"],
  amount: number,
  id: string = source,
): PricingRuleAdjustment {
  return { id, label: id, amount, source };
}

/**
 * `bookings.amount_due`, transcribed from 20260819210000:
 * `greatest(0, total_cost + extras_total - coalesce(discount, 0))`.
 *
 * `extras_total` is the sum of the `booking_line_items` the server writes for
 * the custom fees — which is exactly `serviceChargeTotal`.
 */
function amountDue(money: BookingMoney): number {
  return Math.max(
    0,
    Math.round(
      (money.serviceTotal + money.serviceChargeTotal - money.discount) * 100,
    ) / 100,
  );
}

describe("what the booking is written with", () => {
  test("no discount, no fees: the booking's price IS the quote", () => {
    const money = splitBookingMoney({
      adjustments: [],
      discountTotal: 0,
      total: 120,
    });
    expect(money.serviceTotal).toBe(120);
    expect(money.discount).toBe(0);
    expect(amountDue(money)).toBe(120);
  });

  test("a discount is added BACK into total_cost, because the database takes it off", () => {
    // The F0 regression, in the smallest form that shows it. The quote is $80:
    // $100 of service with a $20 multi-pet discount already off it.
    const money = splitBookingMoney({
      adjustments: [adj("multi_pet", -20)],
      discountTotal: 20,
      total: 80,
    });
    expect(money.serviceTotal, "GROSS — the price before the discount").toBe(
      100,
    );
    expect(money.discount).toBe(20);
    // Before 2026-09-23 this stored 80 and 20, and the customer owed 60.
    expect(amountDue(money), "the customer owes the quote").toBe(80);
  });

  test("a service charge leaves total_cost and comes back as a line item", () => {
    // $200 of boarding plus a $15 cleaning fee. The fee is billed as a line,
    // so it must not ALSO be inside the booking's price.
    const money = splitBookingMoney({
      adjustments: [adj("custom_fee", 15)],
      discountTotal: 0,
      total: 215,
    });
    expect(money.serviceTotal, "the service alone").toBe(200);
    expect(money.serviceChargeTotal).toBe(15);
    expect(amountDue(money)).toBe(215);
  });

  test("a discount and a service charge on one booking: 200 + 15 − 30", () => {
    // The two features meeting — the same arithmetic `discount-rules.spec.ts`
    // proves against the real database, asserted here on the writer's side.
    const money = splitBookingMoney({
      adjustments: [adj("custom_fee", 15), adj("multi_pet", -30)],
      discountTotal: 30,
      total: 185,
    });
    expect(money.serviceTotal).toBe(200);
    expect(money.serviceChargeTotal).toBe(15);
    expect(money.discount).toBe(30);
    expect(amountDue(money)).toBe(185);
  });

  test("a fee authored AS a discount is a line item, and is not `discount` too", () => {
    // A $10 loyalty credit written as a `discount`-kind custom fee: the server
    // writes it as a negative line, so `amount_due` already has it off. The
    // engine's `discountTotal` filters on SIGN and counted it as well, and the
    // credit came off the bill twice.
    const money = splitBookingMoney({
      adjustments: [adj("custom_fee", -10, "loyalty-credit")],
      discountTotal: 10,
      total: 90,
    });
    expect(money.discount, "not counted again").toBe(0);
    expect(money.serviceChargeTotal, "a negative line item").toBe(-10);
    expect(money.serviceTotal, "the service, untouched").toBe(100);
    expect(amountDue(money), "$10 off, once").toBe(90);
  });

  test("a rule discount AND a fee-shaped discount are told apart", () => {
    // $100 of service, a $20 multi-pet rule and a $10 credit line. The rule is
    // `discount`; the credit is a line. `discountTotal` reports both.
    const money = splitBookingMoney({
      adjustments: [adj("multi_pet", -20), adj("custom_fee", -10, "credit")],
      discountTotal: 30,
      total: 70,
    });
    expect(money.discount).toBe(20);
    expect(money.serviceChargeTotal).toBe(-10);
    expect(money.serviceTotal).toBe(100);
    expect(amountDue(money)).toBe(70);
  });

  test("a package pass is a discount the evaluator never saw", () => {
    // `computePackagePassDiscount` runs after the evaluator returns, so it is
    // not in `discountTotal`. It still has to reach `bookings.discount`, or
    // the customer is charged for a pass they already own.
    const money = splitBookingMoney({
      adjustments: [adj("package_redemption", -45)],
      discountTotal: 0,
      packagePassDiscount: 45,
      total: 25,
    });
    expect(money.discount).toBe(45);
    expect(money.serviceTotal).toBe(70);
    expect(amountDue(money)).toBe(25);
  });

  test("a travel surcharge stays inside the booking's price", () => {
    // `travel_zone` is a surcharge on the SERVICE, not a billable extra. It
    // used to be pushed as `custom_fee`, which would now filter it out of
    // `total_cost` and lose the revenue.
    const money = splitBookingMoney({
      adjustments: [adj("travel_zone", 12)],
      discountTotal: 0,
      total: 92,
    });
    expect(money.serviceChargeTotal, "not an extra").toBe(0);
    expect(money.serviceTotal, "the surcharge rides along").toBe(92);
    expect(amountDue(money)).toBe(92);
  });

  test("a pass and a fee together: each reaches the bill by its own route", () => {
    const money = splitBookingMoney({
      adjustments: [adj("custom_fee", 15), adj("package_redemption", -45)],
      discountTotal: 0,
      packagePassDiscount: 45,
      total: 40,
    });
    expect(money.serviceTotal).toBe(70);
    expect(money.serviceChargeTotal).toBe(15);
    expect(money.discount).toBe(45);
    expect(amountDue(money)).toBe(40);
  });

  test("a discount that settles the bill leaves nothing owed, and nothing owed back", () => {
    const money = splitBookingMoney({
      adjustments: [adj("multi_night", -60)],
      discountTotal: 60,
      total: 0,
    });
    expect(money.serviceTotal).toBe(60);
    expect(money.discount).toBe(60);
    expect(amountDue(money)).toBe(0);
  });

  test("a corrupt discountTotal smaller than its own lines never goes negative", () => {
    // Defensive: a NEGATIVE `discount` would be read by `amount_due` as money
    // ADDED to the bill, and `bookings_discount_within_price` would not catch
    // it — that constraint caps the top end, not the bottom.
    const money = splitBookingMoney({
      adjustments: [adj("custom_fee", -50, "credit")],
      discountTotal: 5,
      total: 50,
    });
    expect(money.discount).toBe(0);
    expect(money.serviceTotal).toBe(100);
    expect(amountDue(money)).toBe(50);
  });

  test("a pass survives a corrupt discountTotal rather than being clamped with it", () => {
    // The clamp is applied BEFORE the pass is added, which is why the order in
    // `splitBookingMoney` is not an accident: clamping afterwards would keep
    // the 0 and give away a $45 pass for nothing.
    const money = splitBookingMoney({
      adjustments: [adj("custom_fee", -50, "credit")],
      discountTotal: 5,
      packagePassDiscount: 45,
      total: 5,
    });
    expect(money.discount).toBe(45);
    expect(amountDue(money)).toBe(5);
  });

  test("cents survive: a percentage discount does not drift by a penny", () => {
    // 15% off $75.00 — the real shape of ref 7, the booking whose ledger
    // settled which convention was right.
    const money = splitBookingMoney({
      adjustments: [adj("multi_pet", -11.25)],
      discountTotal: 11.25,
      total: 63.75,
    });
    expect(money.serviceTotal).toBe(75);
    expect(money.discount).toBe(11.25);
    expect(amountDue(money)).toBe(63.75);
  });

  test("three percentage fees do not leave a floating-point tail in total_cost", () => {
    const money = splitBookingMoney({
      adjustments: [
        adj("custom_fee", 3.33, "a"),
        adj("custom_fee", 3.33, "b"),
        adj("custom_fee", 3.34, "c"),
      ],
      discountTotal: 0,
      total: 110,
    });
    expect(money.serviceTotal, "no 99.99999999999999").toBe(100);
    expect(amountDue(money)).toBe(110);
  });
});
