import type { Badge, CustomerBadge } from "@/types/loyalty";
import { badgeConditionText, badgeRewardText } from "./badge-summary";

/**
 * Pure badge-achievement-rate metrics for the Loyalty Reports "are our badge
 * conditions set right?" report. For each badge: how many members earned it, the
 * average days from a customer's first booking to earning it, and the revenue
 * uplift after earning (average monthly spend before vs after the earn date).
 *
 * A customer's first-booking date is the earliest spend event we hold for them.
 * `now` is injected for determinism.
 */

const DAY_MS = 86_400_000;
const MONTH_MS = 30.44 * DAY_MS;

export interface SpendEventInput {
  customerId: number;
  date: string;
  amount: number;
}

export interface BadgeAchievementRow {
  badgeId: string;
  badgeName: string;
  icon: string;
  conditionText: string;
  rewardText: string | null;
  earnedByCount: number;
  /** Avg days from first booking to earning the badge (null = no spend data). */
  avgDaysToEarn: number | null;
  /** Avg monthly spend across earners in the window before they earned it. */
  monthlySpendBefore: number;
  /** Avg monthly spend across earners from the earn date onward. */
  monthlySpendAfter: number;
  /** monthlySpendAfter − monthlySpendBefore (per member, per month). */
  revenueUpliftAbs: number;
  /** Percentage uplift; null when there is no before-spend to compare against. */
  revenueUpliftPct: number | null;
}

/** Months spanned between two instants, floored at 1 so a sub-month window
 *  still divides by a whole month rather than inflating the monthly rate. */
function monthsBetween(startMs: number, endMs: number): number {
  return Math.max(1, Math.round((endMs - startMs) / MONTH_MS));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeBadgeAchievement(input: {
  badges: Badge[];
  customerBadges: CustomerBadge[];
  spendEvents: SpendEventInput[];
  now: string;
  tierName?: (tierId: string) => string | undefined;
}): BadgeAchievementRow[] {
  const nowMs = new Date(input.now).getTime();

  // Index spend events by customer, ascending by date.
  const eventsByCustomer = new Map<number, { ms: number; amount: number }[]>();
  for (const e of input.spendEvents) {
    const ms = new Date(e.date).getTime();
    if (!Number.isFinite(ms)) continue;
    const list = eventsByCustomer.get(e.customerId) ?? [];
    list.push({ ms, amount: e.amount });
    eventsByCustomer.set(e.customerId, list);
  }
  for (const list of eventsByCustomer.values()) {
    list.sort((a, b) => a.ms - b.ms);
  }

  const rows = input.badges.map((badge): BadgeAchievementRow => {
    const earners = input.customerBadges.filter((c) => c.badgeId === badge.id);

    const daysToEarn: number[] = [];
    const beforeRates: number[] = [];
    const afterRates: number[] = [];

    for (const earn of earners) {
      const events = eventsByCustomer.get(earn.customerId);
      const earnedMs = new Date(earn.earnedAt).getTime();
      if (!events || events.length === 0 || !Number.isFinite(earnedMs)) continue;

      const firstMs = events[0].ms;
      if (earnedMs >= firstMs) {
        daysToEarn.push((earnedMs - firstMs) / DAY_MS);
      }

      // Spend strictly before the earn date → "before" monthly rate.
      const before = events.filter((e) => e.ms < earnedMs);
      if (before.length > 0) {
        const total = before.reduce((s, e) => s + e.amount, 0);
        beforeRates.push(total / monthsBetween(firstMs, earnedMs));
      }

      // Spend from the earn date through now → "after" monthly rate.
      const after = events.filter((e) => e.ms >= earnedMs && e.ms <= nowMs);
      if (after.length > 0) {
        const total = after.reduce((s, e) => s + e.amount, 0);
        afterRates.push(total / monthsBetween(earnedMs, nowMs));
      }
    }

    const avg = (xs: number[]) =>
      xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;

    const monthlySpendBefore = round2(avg(beforeRates));
    const monthlySpendAfter = round2(avg(afterRates));
    const revenueUpliftAbs = round2(monthlySpendAfter - monthlySpendBefore);
    const revenueUpliftPct =
      monthlySpendBefore > 0
        ? Math.round((revenueUpliftAbs / monthlySpendBefore) * 100)
        : null;

    return {
      badgeId: badge.id,
      badgeName: badge.name,
      icon: badge.icon,
      conditionText: badgeConditionText(
        badge,
        badge.criteria.tierId
          ? input.tierName?.(badge.criteria.tierId)
          : undefined,
      ),
      rewardText: badge.reward ? badgeRewardText(badge.reward) : null,
      earnedByCount: earners.length,
      avgDaysToEarn: daysToEarn.length ? Math.round(avg(daysToEarn)) : null,
      monthlySpendBefore,
      monthlySpendAfter,
      revenueUpliftAbs,
      revenueUpliftPct,
    };
  });

  // Sort by "Earned by" descending (spec), then name for stable ties.
  return rows.sort(
    (a, b) =>
      b.earnedByCount - a.earnedByCount ||
      a.badgeName.localeCompare(b.badgeName),
  );
}
