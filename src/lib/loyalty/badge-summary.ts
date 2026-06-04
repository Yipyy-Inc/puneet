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
