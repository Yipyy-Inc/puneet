/**
 * Revenue rollup for a single training series.
 *
 * Managers want an at-a-glance money picture on the series detail page without
 * opening Finance: how many paying students, how much has actually been
 * collected, how much is still outstanding from deposit-only enrollments, and
 * the total balance still owed across everyone.
 *
 * Pure function — the component does the `useQuery` and passes the enrollments
 * + the series' enrollment rules in.
 */
import type { EnrollmentRules } from "@/lib/training-series";
import type { TrainingEnrollment } from "@/lib/training-enrollment";

/** Enrollment statuses that occupy a paid seat and therefore count toward
 *  revenue. Waitlisted clients haven't paid for a seat; withdrawn (dropped)
 *  students are handled via the refund decision in the billing module. */
const REVENUE_STATUSES: ReadonlySet<TrainingEnrollment["status"]> = new Set([
  "enrolled",
  "completed",
  "paused",
]);

export interface SeriesRevenueSummary {
  /** Revenue-relevant headcount — enrolled + completed + paused. */
  totalEnrolled: number;
  /** Per-student full price + deposit, echoed from the series rules so the UI
   *  can show the per-head figures alongside the rollups. */
  fullPrice: number;
  depositAmount: number;
  /** Sum actually collected so far (paid → full, deposit → deposit). */
  totalCollected: number;
  /** What would be collected if every paying seat paid in full (excludes
   *  comped seats). Drives the "collected of expected" framing. */
  expectedTotal: number;
  /** Students who have paid a deposit but not the balance. */
  depositOnlyCount: number;
  /** Outstanding balance owed by the deposit-only students (full − deposit). */
  depositOutstanding: number;
  /** Students who have paid nothing yet. */
  unpaidCount: number;
  /** Comped (free) seats — surfaced so the headcount vs revenue gap is clear. */
  compedCount: number;
  /** Total still owed across everyone = deposit shortfalls + unpaid fulls. */
  remainingBalance: number;
}

export function summarizeSeriesRevenue(
  enrollments: TrainingEnrollment[],
  rules: Pick<EnrollmentRules, "fullPaymentAmount" | "depositRequired">,
): SeriesRevenueSummary {
  const fullPrice = rules.fullPaymentAmount;
  const depositAmount = rules.depositRequired;

  let totalEnrolled = 0;
  let totalCollected = 0;
  let expectedTotal = 0;
  let depositOnlyCount = 0;
  let depositOutstanding = 0;
  let unpaidCount = 0;
  let compedCount = 0;
  let remainingBalance = 0;

  const depositShortfall = Math.max(0, fullPrice - depositAmount);

  for (const e of enrollments) {
    if (!REVENUE_STATUSES.has(e.status)) continue;
    totalEnrolled += 1;

    switch (e.paymentStatus) {
      case "paid":
        totalCollected += fullPrice;
        expectedTotal += fullPrice;
        break;
      case "deposit":
        totalCollected += depositAmount;
        expectedTotal += fullPrice;
        depositOnlyCount += 1;
        depositOutstanding += depositShortfall;
        remainingBalance += depositShortfall;
        break;
      case "unpaid":
        expectedTotal += fullPrice;
        unpaidCount += 1;
        remainingBalance += fullPrice;
        break;
      case "comped":
        // Free seat — no revenue expected or owed.
        compedCount += 1;
        break;
      case "refunded":
        // Money returned — net-zero collected, nothing outstanding.
        break;
    }
  }

  return {
    totalEnrolled,
    fullPrice,
    depositAmount,
    totalCollected,
    expectedTotal,
    depositOnlyCount,
    depositOutstanding,
    unpaidCount,
    compedCount,
    remainingBalance,
  };
}
