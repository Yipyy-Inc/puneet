import type {
  CustomerLoyaltyPayload,
  CustomerTier,
} from "@/app/api/customer/loyalty/route";

// ============================================================================
// WHERE ONE CUSTOMER STANDS ON THEIR FACILITY'S LADDER.
//
// Extracted from `/customer/rewards` on 2026-09-21, unchanged, because a
// SECOND screen needed it and the second copy is where the two start to
// disagree. The dashboard had its own answer until then and it was a fixture:
// `customerLoyaltyData.find(l => l.clientId === customerId)` with `clientId:
// 15` — Alice Johnson's REAL ref — against a global `loyaltySettings.tiers`.
// So a real customer's dashboard showed invented points on a ladder no
// facility had configured, while `/api/customer/loyalty` sat unused one import
// away.
//
// ── A THRESHOLD IS MEASURED ON ITS OWN DIMENSION ──────────────────────────
//
// Points, spend or visits. The fixture ladder only had points, so the old
// arithmetic assumed points everywhere — which tells somebody they are "200
// points away" from a tier that actually wants twenty visits. `reached()` is
// the whole reason this is worth a module rather than an inline expression.
//
// ── AND `currentTier` IS THE STORED ONE, DELIBERATELY ─────────────────────
//
// `account.currentTierId` is what the route already computed as the tier they
// QUALIFY for (it does not pass through the stored column — see the route's
// own note). So this takes it at its word rather than re-deriving a second
// opinion here, which is exactly the divergence the extraction is for.
// ============================================================================

export interface CustomerStanding {
  /** Their spendable balance, not their lifetime total. */
  points: number;
  creditBalance: number;
  currentTier: CustomerTier | null;
  /** The first tier they do not yet meet, or null at the top. */
  nextTier: CustomerTier | null;
  /** How much more, counted on the NEXT tier's own dimension. */
  toNextTier: number;
  /** What they already have on that dimension, for an "x / y" line. */
  towardNextTier: number;
  /** 0–100, clamped. */
  progressPercentage: number;
}

/**
 * Null when the facility runs no programme — the caller shows nothing rather
 * than a zeroed card, because "no programme" and "no points" are different
 * things to be told.
 */
export function customerStanding(
  wallet: CustomerLoyaltyPayload | null | undefined,
): CustomerStanding | null {
  if (!wallet?.enabled) return null;

  const account = wallet.account;
  const tiers = wallet.tiers;

  const reached = (tier: CustomerTier): number => {
    switch (tier.thresholdType) {
      case "spend":
        return account?.totalSpend ?? 0;
      case "visits":
        return account?.totalVisits ?? 0;
      default:
        return account?.lifetimePointsEarned ?? 0;
    }
  };

  const currentTier =
    tiers.find((tier) => tier.id === account?.currentTierId) ?? null;
  // Tiers arrive lowest-first, so the first one they fall short of is next.
  const nextTier = tiers.find((tier) => reached(tier) < tier.thresholdValue);

  const have = nextTier ? reached(nextTier) : 0;
  const need = nextTier?.thresholdValue ?? 0;
  // Only a floor when both tiers count the same thing. A points tier under a
  // visits tier shares no axis, so the bar starts at zero rather than
  // subtracting a number that means something else.
  const floor =
    currentTier &&
    nextTier &&
    currentTier.thresholdType === nextTier.thresholdType
      ? currentTier.thresholdValue
      : 0;
  const span = need - floor;
  const progressPercentage = span > 0 ? ((have - floor) / span) * 100 : 0;

  return {
    points: account?.pointsBalance ?? 0,
    creditBalance: account?.creditBalance ?? 0,
    currentTier,
    nextTier: nextTier ?? null,
    toNextTier: nextTier ? Math.max(0, need - have) : 0,
    towardNextTier: have,
    progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
  };
}
