// ============================================================================
// Which reward comes off this bill, and by how much.
//
// Pure arithmetic: no I/O, no mutation. The caller spends the chosen voucher.
//
// ── IT USED TO TAKE A FIXTURE ROW ─────────────────────────────────────────
//
// The parameter was `RedemptionRecord` from `src/data/loyalty-redemptions` —
// a hand-authored file keyed by `facilityId: 1`, whose `consumeRedemption()`
// spliced an in-memory array. It now takes the shape a real voucher has.
//
// ── AND IT ASKS FOR THE LEAST IT NEEDS ────────────────────────────────────
//
// `DiscountableVoucher` names four fields rather than importing the row type.
// That keeps this file testable with an object literal and keeps it from
// depending on a route's response shape — but the real reason is that these
// four ARE the discount. Anything else on a voucher is bookkeeping, and a
// function that accepted the whole row would invite reading it.
// ============================================================================

export type DiscountStrategy = "highest_value" | "most_specific";

/** The parts of a voucher that decide what comes off a bill. */
export interface DiscountableVoucher {
  id: string;
  rewardType: string;
  /** A percentage for `discount_pct` (10 = 10%), dollars for `discount_fixed`. */
  rewardValue: number;
  /** Null or empty means every service. */
  appliesToServices?: string[] | null;
}

export interface DiscountCandidate<T extends DiscountableVoucher> {
  voucher: T;
  /** Dollars this voucher takes off the eligible subtotal. */
  amount: number;
  /** Whether it is scoped to specific services rather than all of them. */
  serviceScoped: boolean;
}

export function isDiscountVoucher(v: DiscountableVoucher): boolean {
  return v.rewardType === "discount_pct" || v.rewardType === "discount_fixed";
}

/**
 * Dollars a voucher takes off an eligible subtotal.
 *
 * A fixed discount is capped at the subtotal: a $50 reward against a $30 bill
 * takes $30, not $50. `amount_due` is floored at zero in Postgres too, so a
 * larger figure could not become a negative bill — but it could become a
 * receipt line claiming more was taken off than was ever charged.
 */
export function computeVoucherDiscount(
  v: DiscountableVoucher,
  subtotal: number,
): number {
  if (subtotal <= 0) return 0;
  const value = Number(v.rewardValue);
  if (!Number.isFinite(value) || value <= 0) return 0;

  if (v.rewardType === "discount_pct") {
    return Math.round(subtotal * (value / 100) * 100) / 100;
  }
  if (v.rewardType === "discount_fixed") {
    return Math.min(value, subtotal);
  }
  return 0;
}

/** Whether a voucher applies to this bill's service. */
export function voucherAppliesToService(
  v: DiscountableVoucher,
  serviceType?: string,
): boolean {
  const scope = v.appliesToServices;
  if (!scope || scope.length === 0) return true;
  // A scoped voucher against a bill with no service named does NOT apply.
  // Guessing the other way would take money off for a service nobody matched.
  if (!serviceType) return false;
  return scope.includes(serviceType);
}

/**
 * The single best voucher to apply, per the facility's strategy.
 *
 * - `highest_value`: whichever takes the most off.
 * - `most_specific`: prefer one scoped to the matching service, then by value.
 *
 * One, never several: stacking is its own configuration
 * (`discountStacking`) and applying two rewards because both matched would
 * decide that question by accident.
 */
export function selectBestDiscount<T extends DiscountableVoucher>(
  vouchers: T[],
  subtotal: number,
  serviceType: string | undefined,
  strategy: DiscountStrategy,
): DiscountCandidate<T> | null {
  const candidates = vouchers
    .filter(isDiscountVoucher)
    .filter((v) => voucherAppliesToService(v, serviceType))
    .map((voucher) => ({
      voucher,
      amount: computeVoucherDiscount(voucher, subtotal),
      serviceScoped: Boolean(
        voucher.appliesToServices && voucher.appliesToServices.length > 0,
      ),
    }))
    .filter((c) => c.amount > 0);

  if (candidates.length === 0) return null;

  // Sorted on a copy — `vouchers` belongs to the caller, and in a React render
  // it is very likely query data that must not be mutated.
  const sorted = [...candidates].sort((a, b) => {
    if (strategy === "most_specific" && a.serviceScoped !== b.serviceScoped) {
      return Number(b.serviceScoped) - Number(a.serviceScoped);
    }
    if (b.amount !== a.amount) return b.amount - a.amount;
    // A deterministic tiebreak, so two equal vouchers do not swap places
    // between renders and change which one the counter is about to spend.
    return a.voucher.id.localeCompare(b.voucher.id);
  });

  return sorted[0];
}

/** What the discount is called on the bill and on the receipt. */
export function discountLineLabel(v: DiscountableVoucher): string {
  const value = Number(v.rewardValue);
  return v.rewardType === "discount_pct"
    ? `Loyalty reward: ${value}% discount`
    : `Loyalty reward: $${value} discount`;
}
