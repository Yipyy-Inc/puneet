import type {
  CustomerLoyaltyAccount,
  RedemptionRecord,
} from "@/types/loyalty";

/**
 * Pure member-lifecycle funnel for the churn report. Stages are cumulative —
 * each is the subset of the previous stage that also meets the new criterion —
 * so the funnel descends monotonically and drop-off between stages is meaningful.
 *
 *   Enrolled → Redeemed ≥1× → Reached Silver+ → Booked 3+ → Active (≤60 days)
 *
 * `now` and the tier sort-order map are injected so it stays deterministic.
 */

const ACTIVE_WINDOW_DAYS = 60;
/** Tier sort order at/above which a member counts as "Silver or above". */
const SILVER_SORT_ORDER = 1;

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  /** Customer ids at this stage (for the click-to-list drill-down). */
  members: number[];
  /** Share of total enrolled (0–1). */
  pctOfEnrolled: number;
  /** Share lost vs the previous stage (0–1); 0 for the first stage. */
  dropFromPrev: number;
}

export function computeLifecycleFunnel(input: {
  accounts: CustomerLoyaltyAccount[];
  redemptions: RedemptionRecord[];
  tierSortById: Map<string, number>;
  now: string;
}): FunnelStage[] {
  const nowMs = new Date(input.now).getTime();
  const redeemedIds = new Set(input.redemptions.map((r) => r.customerId));

  const hasRedeemed = (a: CustomerLoyaltyAccount) =>
    a.lifetimePointsRedeemed > 0 || redeemedIds.has(a.customerId);
  const isSilverPlus = (a: CustomerLoyaltyAccount) =>
    a.currentTierId != null &&
    (input.tierSortById.get(a.currentTierId) ?? -1) >= SILVER_SORT_ORDER;
  const booked3 = (a: CustomerLoyaltyAccount) => a.totalVisits >= 3;
  const active = (a: CustomerLoyaltyAccount) => {
    const last = new Date(a.lastActivityAt ?? a.updatedAt).getTime();
    return (nowMs - last) / 86_400_000 <= ACTIVE_WINDOW_DAYS;
  };

  // Cumulative subsets.
  const enrolled = input.accounts;
  const redeemed = enrolled.filter(hasRedeemed);
  const silver = redeemed.filter(isSilverPlus);
  const booked = silver.filter(booked3);
  const activeNow = booked.filter(active);

  const raw: { key: string; label: string; set: CustomerLoyaltyAccount[] }[] = [
    { key: "enrolled", label: "Enrolled", set: enrolled },
    { key: "redeemed", label: "Redeemed at least once", set: redeemed },
    { key: "silver", label: "Reached Silver or above", set: silver },
    { key: "booked3", label: "Booked 3+ times since joining", set: booked },
    { key: "active", label: "Active in last 60 days", set: activeNow },
  ];

  const enrolledCount = enrolled.length || 1;
  return raw.map((stage, i) => {
    const count = stage.set.length;
    const prevCount = i > 0 ? raw[i - 1].set.length : count;
    return {
      key: stage.key,
      label: stage.label,
      count,
      members: stage.set.map((a) => a.customerId),
      pctOfEnrolled: count / enrolledCount,
      dropFromPrev:
        i === 0 ? 0 : prevCount > 0 ? (prevCount - count) / prevCount : 0,
    };
  });
}
