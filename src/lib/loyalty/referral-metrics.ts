import type { ReferralRelationship } from "@/types/loyalty";

/**
 * Pure referral time-series for the Loyalty Reports "Referrals over time" chart:
 * referrals sent (createdAt) vs completed, bucketed by ISO week. Gaps between the
 * first and last active week are filled with zeros so the line is continuous.
 */

const WEEK_MS = 7 * 86_400_000;

export interface ReferralWeekPoint {
  /** Short week-start label, e.g. "May 5". */
  week: string;
  /** Monday (UTC midnight) of the week, in ms — for sorting. */
  weekStart: number;
  sent: number;
  completed: number;
}

/** Monday (UTC midnight) of the ISO week containing `dateMs`. */
function isoWeekStartMs(dateMs: number): number {
  const d = new Date(dateMs);
  const day = d.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const shiftToMonday = day === 0 ? -6 : 1 - day;
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + shiftToMonday,
  );
}

function weekLabel(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** When a referral counts as completed (reward issued, or status completed). */
function referralCompletedAt(r: ReferralRelationship): string | undefined {
  if (r.referrerRewardStatus === "issued") {
    return r.referrerRewardIssuedAt ?? r.firstBookingDate;
  }
  if (r.status === "completed") {
    return r.firstBookingDate ?? r.referrerRewardIssuedAt;
  }
  return undefined;
}

function bump(map: Map<number, number>, iso: string | undefined) {
  if (!iso) return;
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return;
  const week = isoWeekStartMs(ms);
  map.set(week, (map.get(week) ?? 0) + 1);
}

export function referralsOverTime(
  referrals: ReferralRelationship[],
): ReferralWeekPoint[] {
  const sentByWeek = new Map<number, number>();
  const completedByWeek = new Map<number, number>();

  for (const r of referrals) {
    bump(sentByWeek, r.createdAt);
    bump(completedByWeek, referralCompletedAt(r));
  }

  const weeks = [
    ...new Set([...sentByWeek.keys(), ...completedByWeek.keys()]),
  ].sort((a, b) => a - b);
  if (weeks.length === 0) return [];

  const points: ReferralWeekPoint[] = [];
  const last = weeks[weeks.length - 1];
  for (let w = weeks[0]; w <= last; w += WEEK_MS) {
    points.push({
      week: weekLabel(w),
      weekStart: w,
      sent: sentByWeek.get(w) ?? 0,
      completed: completedByWeek.get(w) ?? 0,
    });
  }
  return points;
}
