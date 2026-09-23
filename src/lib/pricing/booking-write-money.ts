import type { PricingRuleAdjustment } from "@/lib/pricing-rules";

/**
 * What a booking is WRITTEN with, from what the customer was QUOTED.
 *
 * ── WHY THIS IS ITS OWN FILE ───────────────────────────────────────────────
 *
 * These three numbers used to be computed inline at the end of a ~450-line
 * `useMemo` in `BookingModal`, which is a 2,600-line client component. The
 * pricing engine underneath it had 18 unit tests; the screen above it had a
 * Playwright spec; the twelve lines that turn one into the other had nothing,
 * and could have nothing — there is no way to reach into a `useMemo`.
 *
 * That gap is where the money went missing. On 2026-09-24 a booking posted as
 * `basePrice 100, discount 20, totalCost 80` came back owing $60 against a
 * quote of $80, because `total_cost` was sent NET while `amount_due` is
 * GENERATED as `greatest(0, total_cost + extras_total - discount)`. Measured
 * against the live database, not inferred.
 *
 * ── THE INVARIANT ──────────────────────────────────────────────────────────
 *
 * The database computes what is owed. This computes what to store so that the
 * database's answer is the figure on screen:
 *
 *     amount_due = (total − fees + discount) + fees − discount = total
 *                   └────── serviceTotal ──────┘  └ extras ┘  └ discount ┘
 *
 * So the three outputs are not independent — they are one sentence, and
 * `tests/unit/booking-write-money.test.ts` asserts the whole sentence rather than
 * its words.
 *
 * ── TWO CONVENTIONS IT HAS TO HOLD AT ONCE ─────────────────────────────────
 *
 *   1. `total_cost` is the SERVICE's price, GROSS of the discount
 *      (20260924100000). A service charge is not part of it — it is a
 *      `booking_line_items` row and reaches the bill through `extras_total`
 *      (20260806820000, Decision 3).
 *   2. A discount that is ALREADY a line item is not also `discount`. A
 *      custom fee authored with `adjustmentKind: "discount"` is written by
 *      the server as a negative line, so counting it in `discount` as well
 *      takes it off the bill twice — a $10 loyalty credit did exactly that.
 *
 * Neither writer may state its own convention. `convert-estimate.ts` is the
 * other caller of the same contract.
 */
export interface BookingMoneyInput {
  /**
   * Every adjustment on the booking — including `travel_zone` and
   * `package_redemption`, which `BookingModal` pushes after the evaluator
   * returns. Order is irrelevant; only `source` and `amount` are read.
   */
  adjustments: readonly PricingRuleAdjustment[];
  /**
   * What the pricing engine reported as discount. It is ALREADY off `total`,
   * and it counts a `discount`-kind custom fee, which this removes again.
   */
  discountTotal: number;
  /**
   * The package pass's dollar value. Already off `total`, and NOT inside
   * `discountTotal` — the evaluator never sees it. Travels as `discount` and
   * nothing else at booking time, so it is added rather than filtered out.
   */
  packagePassDiscount?: number;
  /** What the customer is quoted: the figure on screen, tax included. */
  total: number;
}

export interface BookingMoney {
  /** `bookings.discount` — subtracted ONCE, by `amount_due`. */
  discount: number;
  /** The service charges, which become `booking_line_items` rows. */
  serviceChargeTotal: number;
  /** `bookings.total_cost` — the service alone, gross of the discount. */
  serviceTotal: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function splitBookingMoney({
  adjustments,
  discountTotal,
  packagePassDiscount = 0,
  total,
}: BookingMoneyInput): BookingMoney {
  // A custom fee can be authored as a discount, in which case it is already a
  // negative line item. `discountTotal` filters on SIGN, not source, so it
  // counts that fee too; take it back out before it is counted twice.
  const lineItemDiscountTotal = adjustments
    .filter((a) => a.source === "custom_fee" && a.amount < 0)
    .reduce((sum, a) => sum + Math.abs(a.amount), 0);

  // Clamped BEFORE the pass is added, exactly as the modal did: a corrupt
  // `discountTotal` smaller than its own line items must not turn a package
  // pass into a smaller discount than the pass is worth.
  const discount =
    Math.max(0, (discountTotal || 0) - lineItemDiscountTotal) +
    packagePassDiscount;

  const serviceChargeTotal = adjustments
    .filter((a) => a.source === "custom_fee")
    .reduce((sum, a) => sum + a.amount, 0);

  return {
    discount,
    serviceChargeTotal,
    // The fees come out (they are billed as lines) and the discount goes back
    // in (the database subtracts it itself). Both, or the bill is wrong twice.
    serviceTotal: round2(total - serviceChargeTotal + discount),
  };
}
