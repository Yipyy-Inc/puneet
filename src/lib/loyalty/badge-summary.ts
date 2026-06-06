import type { Badge } from "@/types/loyalty";

/**
 * Plain-English description of a badge's unlock condition, e.g.
 * "Completed 10 bookings" or "Reached Gold". Used to keep Badge.description in
 * sync and to label badge cards.
 */
export function badgeConditionText(badge: Badge, tierName?: string): string {
  const n = badge.criteria.threshold;
  switch (badge.criteria.type) {
    case "bookings_count":
      return `Completed ${n} bookings`;
    case "total_spent":
      return `Spent $${n.toLocaleString()} total`;
    case "consecutive_months":
      return `Booked ${n} consecutive months`;
    case "referrals":
      return `Referred ${n} friends`;
    case "reviews":
      return `Left ${n} reviews`;
    case "first_booking":
      return "Completed their first booking";
    case "reached_tier":
      return `Reached ${tierName ?? "a tier"}`;
  }
}

/**
 * Plain-English description of a badge's reward (type + value), e.g.
 * "10% off next visit", "$10 account credit", or "100 points". Covers every
 * reward type so the value/type is never dropped on a badge card.
 */
export function badgeRewardText(reward: NonNullable<Badge["reward"]>): string {
  const v = reward.value;
  switch (reward.type) {
    case "points":
      return `${v} points`;
    case "credit":
      return `$${v} account credit`;
    case "gift_card":
      return `$${v} gift card`;
    case "discount_pct":
    case "discount":
      return `${v}% off next visit`;
    case "discount_fixed":
      return `$${v} off next visit`;
    case "free_service":
      return typeof v === "string" && v ? `Free ${v}` : "Free service";
    case "freebie":
      return typeof v === "string" && v ? v : "Free item";
  }
}

/**
 * Full one-line badge summary: "<condition> → Reward: <reward>", e.g.
 * "Completed 10 bookings → Reward: 10% off next visit". Falls back to just the
 * condition when the badge has no reward.
 */
export function badgeSummaryText(badge: Badge, tierName?: string): string {
  const condition = badgeConditionText(badge, tierName);
  return badge.reward
    ? `${condition} → Reward: ${badgeRewardText(badge.reward)}`
    : condition;
}
