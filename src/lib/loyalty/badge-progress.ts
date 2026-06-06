import type { Badge, Tier } from "@/types/loyalty";
import { type BadgeStats, badgeCriteriaMet } from "./engine-badges";

/**
 * Progress of a customer toward a badge, for the portal's "In progress" badge
 * section: how far along they are and a plain-English label, e.g.
 * "6 of 10 bookings completed". Pure — derived from the account's BadgeStats.
 */
export interface BadgeProgress {
  current: number;
  threshold: number;
  /** Clamped 0..1 for a progress bar. */
  ratio: number;
  met: boolean;
  /** False when the criterion can't be measured yet (e.g. consecutive months). */
  measurable: boolean;
  label: string;
}

export function badgeProgress(
  badge: Badge,
  stats: BadgeStats,
  tiers: Tier[],
): BadgeProgress {
  const threshold = badge.criteria.threshold;
  const met = badgeCriteriaMet(badge, stats, tiers);

  const build = (
    current: number,
    thr: number,
    label: string,
    measurable = true,
  ): BadgeProgress => ({
    current,
    threshold: thr,
    ratio: thr > 0 ? Math.min(1, Math.max(0, current / thr)) : met ? 1 : 0,
    met,
    measurable,
    label,
  });

  switch (badge.criteria.type) {
    case "bookings_count":
      return build(
        stats.bookingsCount,
        threshold,
        `${stats.bookingsCount} of ${threshold} bookings completed`,
      );
    case "total_spent":
      return build(
        stats.totalSpent,
        threshold,
        `$${stats.totalSpent.toLocaleString()} of $${threshold.toLocaleString()} spent`,
      );
    case "referrals":
      return build(
        stats.referrals,
        threshold,
        `${stats.referrals} of ${threshold} referrals`,
      );
    case "reviews":
      return build(
        stats.reviews,
        threshold,
        `${stats.reviews} of ${threshold} reviews`,
      );
    case "first_booking":
      return build(
        Math.min(stats.bookingsCount, 1),
        1,
        stats.bookingsCount >= 1
          ? "First booking complete"
          : "Complete your first booking",
      );
    case "reached_tier": {
      const target = badge.criteria.tierId
        ? tiers.find((t) => t.id === badge.criteria.tierId)
        : undefined;
      const currentRank = (stats.currentTier?.sortOrder ?? -1) + 1;
      const targetRank = (target?.sortOrder ?? 0) + 1;
      return build(
        Math.min(currentRank, targetRank),
        targetRank,
        `Reach ${target?.name ?? "the next tier"}`,
      );
    }
    case "consecutive_months":
      return build(
        0,
        threshold,
        `Book ${threshold} consecutive months`,
        false,
      );
  }
}
