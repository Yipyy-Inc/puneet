import type { Membership, MembershipPlan } from "@/data/services-pricing";

// ============================================================================
// The Memberships screen's figures, from the subscriptions themselves.
//
// The hero and the Insights tab summed `monthlyPrice` straight off the fixture
// and drew a "12-month trend" that was the current total multiplied by
// 0.55, 0.59, 0.63… — a line that always rose, with "+12.4% vs last mo"
// typed beside it. Every figure here is counted from rows.
//
// A subscription's price is per CYCLE (the route stores the price of the
// plan's own cycle), so revenue is normalised to a month before it is added:
// a $270 quarterly plan is $90 a month, not $270.
// ============================================================================

const WEEKS_PER_MONTH = 52 / 12;

/** One cycle's price, as a monthly amount. */
export function monthlyEquivalent(
  m: Pick<Membership, "monthlyPrice" | "billingCycle">,
): number {
  switch (m.billingCycle) {
    case "daily":
      return (m.monthlyPrice * 365) / 12;
    case "weekly":
      return m.monthlyPrice * WEEKS_PER_MONTH;
    case "quarterly":
      return m.monthlyPrice / 3;
    case "annually":
    case "yearly":
      return m.monthlyPrice / 12;
    default:
      return m.monthlyPrice;
  }
}

/** Monthly recurring revenue: active subscriptions only. */
export function monthlyRevenue(rows: readonly Membership[]): number {
  return rows
    .filter((m) => m.status === "active")
    .reduce((sum, m) => sum + monthlyEquivalent(m), 0);
}

/** When a subscription stopped, if it did: its cancellation, else its end. */
function endedOn(m: Membership): string | null {
  if (m.status !== "cancelled" && m.status !== "expired") return null;
  const cancelled = m.activityLog.find((e) => e.type === "cancelled");
  if (cancelled) return cancelled.date.slice(0, 10);
  return m.endDate ?? m.startDate;
}

export interface MonthPoint {
  /** `YYYY-MM` — the caller formats it in the viewer's language. */
  month: string;
  mrr: number;
  subscribers: number;
  churn: number;
}

/**
 * The last `count` calendar months, ending with the one `today` is in.
 *
 * A subscription counts in a month when it started on or before the month's
 * last day and had not stopped by then. Churn is the subscriptions that
 * stopped during the month. A pause is not a stop, and a paused plan earns
 * nothing: it counts as a subscriber and adds nothing to revenue — which is
 * what "paused" means to the facility's bank account.
 */
export function monthlyTrend(
  rows: readonly Membership[],
  today: string,
  count = 12,
): MonthPoint[] {
  const [y, mo] = today.slice(0, 7).split("-").map(Number);
  const points: MonthPoint[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(y, mo - 1 - i, 1));
    const month = d.toISOString().slice(0, 7);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
      .toISOString()
      .slice(0, 10);
    let mrr = 0;
    let subscribers = 0;
    let churn = 0;
    for (const m of rows) {
      const stopped = endedOn(m);
      if (stopped && stopped.slice(0, 7) === month) churn += 1;
      if (m.startDate > last) continue;
      if (stopped && stopped <= last) continue;
      subscribers += 1;
      // Only the current month knows a pause is in effect; an earlier month
      // was earning while the plan ran.
      if (!(m.status === "paused" && i === 0)) mrr += monthlyEquivalent(m);
    }
    points.push({ month, mrr: Math.round(mrr), subscribers, churn });
  }
  return points;
}

export interface MemberDiscount {
  membershipId: string;
  planName: string;
  percent: number;
  /** Dollars off, to the cent. */
  amount: number;
}

/**
 * The membership discount a bill for `service` earns, if any.
 *
 * Only an ACTIVE membership — a paused one has its perks frozen, which is
 * what the pause dialog tells the facility. The percentage is the one the
 * subscription was sold at (it is snapshotted on the row), and the plan's
 * `applicableServices` decides which services it covers: empty means all of
 * them, and so does a plan that has since been deleted, whose subscribers
 * were still sold the discount.
 */
export function memberDiscount(
  rows: readonly Membership[],
  plans: readonly Pick<MembershipPlan, "id" | "applicableServices">[],
  service: string,
  subtotal: number,
): MemberDiscount | null {
  const wanted = service.trim().toLowerCase();
  for (const m of rows) {
    if (m.status !== "active" || m.discountPercentage <= 0) continue;
    const plan = plans.find((p) => p.id === m.planId);
    const covers =
      !plan ||
      plan.applicableServices.length === 0 ||
      plan.applicableServices.some((s) => s.toLowerCase() === wanted);
    if (!covers) continue;
    const amount =
      Math.round(Math.max(0, subtotal) * m.discountPercentage) / 100;
    if (amount <= 0) return null;
    return {
      membershipId: m.id,
      planName: m.planName,
      percent: m.discountPercentage,
      amount,
    };
  }
  return null;
}

/** Cancelled over everyone who has ever subscribed, as a percentage. */
export function churnRate(rows: readonly Membership[]): number {
  if (rows.length === 0) return 0;
  const gone = rows.filter((m) => m.status === "cancelled").length;
  return (gone / rows.length) * 100;
}
