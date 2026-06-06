import type { RedemptionRecord } from "@/types/loyalty";

/**
 * Pure logic for auto-applying a loyalty discount voucher at checkout. Given a
 * customer's active discount RewardRedemptions and an invoice's eligible
 * subtotal, pick the single most favourable one and compute the discount. No
 * I/O, no mutation — the caller marks the chosen redemption used.
 */

export type DiscountStrategy = "highest_value" | "most_specific";

export interface DiscountCandidate {
  redemption: RedemptionRecord;
  /** Dollars this voucher takes off the eligible subtotal. */
  amount: number;
  /** Whether the voucher is scoped to specific service types (vs all). */
  serviceScoped: boolean;
}

function asNumber(value: number | string): number {
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function isDiscountRedemption(r: RedemptionRecord): boolean {
  return r.rewardType === "discount_pct" || r.rewardType === "discount_fixed";
}

/** Dollars a discount voucher takes off an eligible subtotal. */
export function computeRedemptionDiscount(
  r: RedemptionRecord,
  subtotal: number,
): number {
  if (subtotal <= 0) return 0;
  const v = asNumber(r.rewardValue);
  if (r.rewardType === "discount_pct") {
    return Math.round(subtotal * (v / 100) * 100) / 100;
  }
  if (r.rewardType === "discount_fixed") {
    return Math.min(v, subtotal);
  }
  return 0;
}

/** Whether a voucher applies to the invoice's service (null/empty scope = all). */
export function redemptionAppliesToService(
  r: RedemptionRecord,
  serviceType?: string,
): boolean {
  const scope = r.appliesToServiceTypes;
  if (!scope || scope.length === 0) return true;
  if (!serviceType) return false;
  return scope.includes(serviceType);
}

/**
 * Select the single best discount to apply, per the facility's strategy:
 * - "highest_value": the voucher that takes the most dollars off.
 * - "most_specific": prefer a voucher scoped to the matching service, then by value.
 * Returns null when no active discount voucher applies.
 */
export function selectBestDiscount(
  redemptions: RedemptionRecord[],
  subtotal: number,
  serviceType: string | undefined,
  strategy: DiscountStrategy,
): DiscountCandidate | null {
  const candidates = redemptions
    .filter((r) => r.status === "active" && isDiscountRedemption(r))
    .filter((r) => redemptionAppliesToService(r, serviceType))
    .map((r) => ({
      redemption: r,
      amount: computeRedemptionDiscount(r, subtotal),
      serviceScoped: !!(
        r.appliesToServiceTypes && r.appliesToServiceTypes.length > 0
      ),
    }))
    .filter((c) => c.amount > 0);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (strategy === "most_specific" && a.serviceScoped !== b.serviceScoped) {
      return Number(b.serviceScoped) - Number(a.serviceScoped);
    }
    return b.amount - a.amount;
  });

  return candidates[0];
}

/** Invoice line-item label for an applied discount voucher. */
export function discountLineLabel(r: RedemptionRecord): string {
  const v = asNumber(r.rewardValue);
  return r.rewardType === "discount_pct"
    ? `Loyalty reward: ${v}% discount`
    : `Loyalty reward: $${v} discount`;
}
