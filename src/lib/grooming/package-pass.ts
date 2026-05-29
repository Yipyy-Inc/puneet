/**
 * Single source of truth for the dollar discount applied when a customer
 * redeems one pass from a prepaid grooming package.
 *
 * Background: there are two surfaces that apply this discount:
 *
 *   - BookingModal Confirm step (display B) — customer pre-applies a pass
 *     while booking. The discount is subtracted from the booking subtotal.
 *
 *   - PaymentDialog at pickup (display C) — staff apply the pass at the
 *     counter. The discount zeroes the base service line.
 *
 * The audit found the two used different field references (B subtracted
 * "service + add-ons", C subtracted "base service only") so they only
 * agreed when the booking had no add-ons. Routing both through this helper
 * makes the intent explicit AND centralizes any future policy change (e.g.
 * "passes cover add-ons too" or "passes cover service minus tax").
 *
 * Current policy: a package pass covers ONE FULL UNIT of the booked
 * grooming service. Add-ons remain billable — they're extras, not part of
 * the prepaid pack.
 */
export function computePackagePassDiscount(args: {
  /** The base service price the pass should zero out. */
  baseService: number;
}): number {
  return Math.max(0, args.baseService);
}
