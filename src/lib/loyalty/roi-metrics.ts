import type {
  CustomerLoyaltyAccount,
  RedemptionRecord,
} from "@/types/loyalty";
import {
  redemptionDollarValue,
  type BookingLite,
} from "./program-metrics";

/**
 * Pure Loyalty ROI model for the headline owner report. Incremental revenue is
 * estimated from booking frequency: loyalty members who book more often than
 * non-members are assumed to generate that "extra" volume because of the
 * program. ROI compares that incremental revenue against the cost of rewards
 * issued (discounts applied + credits redeemed). `now` is injected for
 * determinism.
 *
 * Note: the spec's formula had a duplicated `rewardsIssuedValue` term (typo);
 * this uses the standard ROI = (incremental − cost) / cost × 100.
 */

/** Assumed average booking value used to dollar-estimate incremental volume. */
const AVG_BOOKING_VALUE = 75;
const DEFAULT_MONTHS = 6;

export interface RoiPoint {
  month: string;
  rewardsCost: number;
  incrementalRevenue: number;
  /** ROI percent for the month (0 when no rewards were issued). */
  roi: number;
}

export interface LoyaltyRoi {
  /** Current-month incremental revenue — the headline number. */
  headlineIncrementalRevenue: number;
  thisMonthRoi: number;
  thisMonthRewardsCost: number;
  trend: RoiPoint[];
}

function sameMonth(iso: string, year: number, month: number): boolean {
  const d = new Date(iso);
  return d.getUTCFullYear() === year && d.getUTCMonth() === month;
}

const MONTH_MS = 30.44 * 86_400_000;

export function computeLoyaltyRoi(input: {
  accounts: CustomerLoyaltyAccount[];
  redemptions: RedemptionRecord[];
  bookings: BookingLite[];
  now: string;
  months?: number;
}): LoyaltyRoi {
  const months = input.months ?? DEFAULT_MONTHS;
  const now = new Date(input.now);

  const memberIds = new Set(input.accounts.map((a) => a.customerId));
  const memberCount = memberIds.size;

  // --- Incremental revenue (monthly run-rate) ------------------------------
  // Members who book more often than non-members are assumed to generate that
  // extra volume because of the program. Member booking frequency comes from the
  // accounts' real visit history (visits ÷ account age); the non-member baseline
  // comes from the bookings of customers without an account. Both are expressed
  // as visits-per-month so they're comparable, and the per-member advantage is a
  // stable monthly run-rate (robust to a sparse single calendar month).
  const nowMs = now.getTime();
  let memberVpmSum = 0;
  for (const a of input.accounts) {
    const ageMs = Math.max(MONTH_MS, nowMs - new Date(a.createdAt).getTime());
    memberVpmSum += a.totalVisits / (ageMs / MONTH_MS);
  }
  const memberVpm = memberCount > 0 ? memberVpmSum / memberCount : 0;

  const nonMemberIds = new Set<number>();
  let nonMemberBookingsTotal = 0;
  const nonMemberBookingMs: number[] = [];
  for (const b of input.bookings) {
    if (memberIds.has(b.clientId)) continue;
    nonMemberIds.add(b.clientId);
    nonMemberBookingsTotal++;
    const iso = b.startDate ?? b.date;
    if (iso) {
      const ms = new Date(iso).getTime();
      if (Number.isFinite(ms)) nonMemberBookingMs.push(ms);
    }
  }
  const nonMemberCount = nonMemberIds.size;
  const nonMemberSpanMonths =
    nonMemberBookingMs.length > 1
      ? Math.max(
          1,
          (Math.max(...nonMemberBookingMs) - Math.min(...nonMemberBookingMs)) /
            MONTH_MS,
        )
      : 1;
  const nonMemberVpm =
    nonMemberCount > 0
      ? nonMemberBookingsTotal / nonMemberCount / nonMemberSpanMonths
      : 0;

  const advantageVpm = Math.max(0, memberVpm - nonMemberVpm);
  const monthlyIncrementalRevenue =
    Math.round(advantageVpm * memberCount * AVG_BOOKING_VALUE * 100) / 100;

  // --- Monthly trend: incremental run-rate vs that month's rewards cost -----
  const trend: RoiPoint[] = [];
  let thisMonthRoi = 0;
  let thisMonthRewardsCost = 0;

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );
    const year = monthStart.getUTCFullYear();
    const month = monthStart.getUTCMonth();

    const rewardsCost =
      Math.round(
        input.redemptions
          .filter((r) => r.redeemedAt && sameMonth(r.redeemedAt, year, month))
          .reduce((s, r) => s + redemptionDollarValue(r), 0) * 100,
      ) / 100;

    const roi =
      rewardsCost > 0
        ? Math.round(
            ((monthlyIncrementalRevenue - rewardsCost) / rewardsCost) * 100,
          )
        : 0;

    trend.push({
      month: monthStart.toLocaleDateString("en-US", { month: "short" }),
      rewardsCost,
      incrementalRevenue: monthlyIncrementalRevenue,
      roi,
    });

    if (i === 0) {
      thisMonthRoi = roi;
      thisMonthRewardsCost = rewardsCost;
    }
  }

  return {
    headlineIncrementalRevenue: monthlyIncrementalRevenue,
    thisMonthRoi,
    thisMonthRewardsCost,
    trend,
  };
}
