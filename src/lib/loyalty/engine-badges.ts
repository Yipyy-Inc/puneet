import type { Badge, Tier } from "@/types/loyalty";

/**
 * Pure achievement-badge evaluation for the loyalty automation engine — the
 * "firing badge rewards" input. Badges are permanent: once earned they stay
 * earned, and the engine fires each badge's reward exactly once (the orchestrator
 * tracks earned ids on the account, so re-processing never double-awards).
 */

export interface BadgeStats {
  /** Completed bookings (account.totalVisits). */
  bookingsCount: number;
  totalSpent: number;
  referrals: number;
  reviews: number;
  /** The customer's current tier, for "reached_tier" badges. */
  currentTier: Tier | null;
}

function tierSortOrder(tiers: Tier[], tierId: string): number | null {
  const t = tiers.find((x) => x.id === tierId);
  return t ? t.sortOrder : null;
}

/** Whether the account currently satisfies a badge's unlock condition. */
export function badgeCriteriaMet(
  badge: Badge,
  stats: BadgeStats,
  tiers: Tier[],
): boolean {
  const { type, threshold, tierId } = badge.criteria;
  switch (type) {
    case "bookings_count":
      return stats.bookingsCount >= threshold;
    case "total_spent":
      return stats.totalSpent >= threshold;
    case "referrals":
      return stats.referrals >= threshold;
    case "reviews":
      return stats.reviews >= threshold;
    case "first_booking":
      return stats.bookingsCount >= 1;
    case "reached_tier": {
      if (!tierId || !stats.currentTier) return false;
      const target = tierSortOrder(tiers, tierId);
      if (target == null) return false;
      // Reaching any tier at or above the target unlocks the badge.
      return stats.currentTier.sortOrder >= target;
    }
    case "consecutive_months":
      // Consecutive-month streaks are not tracked on the account model yet, so
      // this criterion cannot be auto-evaluated and never auto-unlocks.
      return false;
  }
}

export interface BadgeEvaluation {
  /** Badges unlocked by this event that were not earned before. */
  newlyUnlocked: Badge[];
  /** Full set of earned badge ids after this evaluation (prior + new). */
  earnedBadgeIds: string[];
}

/**
 * Evaluate all enabled badges against the account's current stats. Disabled
 * badges are ignored. Returns the badges newly crossed this event plus the
 * updated earned-id set to persist on the account.
 */
export function evaluateBadges(
  badges: Badge[],
  stats: BadgeStats,
  tiers: Tier[],
  alreadyEarnedIds: string[],
): BadgeEvaluation {
  const earned = new Set(alreadyEarnedIds);
  const newlyUnlocked: Badge[] = [];

  for (const badge of badges) {
    if (badge.enabled === false) continue;
    if (earned.has(badge.id)) continue;
    if (badgeCriteriaMet(badge, stats, tiers)) {
      newlyUnlocked.push(badge);
      earned.add(badge.id);
    }
  }

  return { newlyUnlocked, earnedBadgeIds: [...earned] };
}
