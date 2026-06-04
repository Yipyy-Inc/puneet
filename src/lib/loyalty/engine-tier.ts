import type { CustomerLoyaltyAccount, Tier } from "@/types/loyalty";

/**
 * Pure tier resolution for the loyalty automation engine — the "upgrading tiers"
 * and "applying discounts" inputs. Tiers are resolved off the newer, fully
 * customisable `Tier` model (tierDefinitions). Threshold dimensions
 * (points / spend / visits) are all monotonically increasing, so recomputing a
 * tier can only move a customer up, never demote them on redemption.
 */

function dimensionValue(tier: Tier, account: CustomerLoyaltyAccount): number {
  switch (tier.thresholdType) {
    case "points":
      return account.lifetimePointsEarned;
    case "spend":
      return account.totalSpend;
    case "visits":
      return account.totalVisits;
  }
}

function asNumber(value: number | string): number {
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Highest tier the account currently qualifies for, or null when it is below the
 * first tier. Each tier is evaluated against its own threshold dimension; the
 * qualifying tier with the greatest sortOrder wins.
 */
export function resolveTier(
  tiers: Tier[],
  account: CustomerLoyaltyAccount,
): Tier | null {
  const sorted = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);
  let current: Tier | null = null;
  for (const tier of sorted) {
    if (dimensionValue(tier, account) >= tier.thresholdValue) {
      current = tier;
    }
  }
  return current;
}

/** The points-earning multiplier granted by a tier (1 when it has none). */
export function tierEarnMultiplier(tier: Tier | null): number {
  if (!tier) return 1;
  const benefit = tier.benefits.find(
    (b) => b.type === "bonus_points_multiplier",
  );
  if (!benefit) return 1;
  const m = asNumber(benefit.value);
  return m > 0 ? m : 1;
}

export interface TierDiscount {
  type: "discount_pct" | "discount_fixed";
  value: number;
}

/**
 * The discount a tier automatically applies to a transaction of the given
 * service type, or null if none applies. A benefit scoped to specific service
 * types only applies when the service matches.
 */
export function tierDiscount(
  tier: Tier | null,
  serviceType?: string,
): TierDiscount | null {
  if (!tier) return null;
  for (const benefit of tier.benefits) {
    if (benefit.type !== "discount_pct" && benefit.type !== "discount_fixed") {
      continue;
    }
    const scope = benefit.appliesToServiceTypes;
    if (scope && scope.length > 0) {
      if (!serviceType || !scope.includes(serviceType)) continue;
    }
    return { type: benefit.type, value: asNumber(benefit.value) };
  }
  return null;
}

/** Apply a tier discount to a gross amount, returning the dollars saved. */
export function discountAmount(discount: TierDiscount, gross: number): number {
  if (gross <= 0) return 0;
  if (discount.type === "discount_pct") {
    return Math.round(gross * (discount.value / 100) * 100) / 100;
  }
  return Math.min(discount.value, gross);
}
