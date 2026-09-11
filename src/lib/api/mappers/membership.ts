import type {
  Membership,
  MembershipActivityEvent,
  MembershipBillingCycle,
  MembershipPlan,
  MembershipStatus,
} from "@/data/services-pricing";

// ============================================================================
// Membership plans and subscriptions, row ⇄ the shapes the Memberships
// screens draw (20260911161036).
//
// A plan's columns are what the database reasons about; everything else the
// editor holds rides in `plan` and comes back as it went in. A subscription
// keeps its activity log, pause and credits in `detail`. Derived figures —
// a plan's subscriber count — are computed here from rows, never stored.
// ============================================================================

export const MEMBERSHIP_PLAN_SELECT = `
  id, name, is_active, billing_cycle, monthly_price, discount_percent, plan,
  sort_order, created_at
`;

export interface MembershipPlanRow {
  id: string;
  name: string;
  is_active: boolean;
  billing_cycle: string;
  monthly_price: number | string;
  discount_percent: number | string;
  plan: Record<string, unknown> | null;
  sort_order: number;
  created_at: string;
}

/** The fields that are columns, and so never ride in `plan`. */
const PLAN_COLUMNS = new Set([
  "id",
  "name",
  "isActive",
  "billingCycle",
  "monthlyPrice",
  "discountPercentage",
  "subscriberCount",
  "createdAt",
]);

export function rowToPlan(
  row: MembershipPlanRow,
  subscriberCount: number,
): MembershipPlan {
  const rest = (row.plan ?? {}) as Partial<MembershipPlan>;
  return {
    description: "",
    quarterlyPrice: 0,
    annualPrice: 0,
    credits: 0,
    perks: [],
    applicableServices: [],
    isPopular: false,
    taxAmount: 0,
    discountRules: [],
    includedItems: [],
    availableOnline: false,
    gracePeriodDays: 0,
    cancellationPolicy: "end_of_cycle",
    badgeColor: "#1668E3",
    ...rest,
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    billingCycle: row.billing_cycle as MembershipBillingCycle,
    monthlyPrice: Number(row.monthly_price),
    discountPercentage: Number(row.discount_percent),
    subscriberCount,
    createdAt: row.created_at,
  } as MembershipPlan;
}

/** The columns and the long tail a plan writes. */
export function planToColumns(plan: Partial<MembershipPlan>) {
  const tail: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(plan)) {
    if (!PLAN_COLUMNS.has(key) && value !== undefined) tail[key] = value;
  }
  return {
    ...(plan.name !== undefined ? { name: plan.name.trim() } : {}),
    ...(plan.isActive !== undefined ? { is_active: plan.isActive } : {}),
    ...(plan.billingCycle !== undefined
      ? { billing_cycle: plan.billingCycle }
      : {}),
    ...(plan.monthlyPrice !== undefined
      ? { monthly_price: plan.monthlyPrice }
      : {}),
    ...(plan.discountPercentage !== undefined
      ? { discount_percent: plan.discountPercentage }
      : {}),
    plan: tail,
  };
}

export const MEMBERSHIP_SELECT = `
  id, plan_id, plan_name, status, starts_on, ends_on, discount_percent,
  billing_cycle, price, next_billing_on, detail, created_at,
  clients(ref, name, email)
`;

export interface MembershipRow {
  id: string;
  plan_id: string | null;
  plan_name: string;
  status: string;
  starts_on: string | null;
  ends_on: string | null;
  discount_percent: number | string | null;
  billing_cycle: string | null;
  price: number | string | null;
  next_billing_on: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
  clients: { ref: number; name: string | null; email: string | null } | null;
}

export function rowToMembership(row: MembershipRow): Membership {
  const detail = (row.detail ?? {}) as Partial<Membership>;
  return {
    creditsRemaining: 0,
    creditsTotal: 0,
    autoRenew: true,
    invoices: [],
    ...detail,
    // Stored in the order it happened; drawn newest first.
    activityLog: [
      ...((detail.activityLog ?? []) as MembershipActivityEvent[]),
    ].sort((a, b) => b.date.localeCompare(a.date)),
    id: row.id,
    customerId: String(row.clients?.ref ?? ""),
    customerName: row.clients?.name ?? "",
    customerEmail: row.clients?.email ?? "",
    planId: row.plan_id ?? "",
    planName: row.plan_name,
    status: row.status as MembershipStatus,
    billingCycle: (row.billing_cycle ?? "monthly") as MembershipBillingCycle,
    monthlyPrice: Number(row.price ?? 0),
    startDate: row.starts_on ?? row.created_at.slice(0, 10),
    nextBillingDate: row.next_billing_on ?? "",
    ...(row.ends_on ? { endDate: row.ends_on } : {}),
    discountPercentage: Number(row.discount_percent ?? 0),
    createdAt: row.created_at,
  } as Membership;
}

/** What a subscription keeps in `detail` — everything that is not a column. */
export function membershipDetail(m: Partial<Membership>) {
  const {
    id: _id,
    customerId: _customerId,
    customerName: _customerName,
    customerEmail: _customerEmail,
    planId: _planId,
    planName: _planName,
    status: _status,
    billingCycle: _billingCycle,
    monthlyPrice: _monthlyPrice,
    startDate: _startDate,
    nextBillingDate: _nextBillingDate,
    endDate: _endDate,
    discountPercentage: _discountPercentage,
    createdAt: _createdAt,
    ...rest
  } = m;
  return rest;
}

/** What one cycle of a plan costs: the price for the plan's own cycle. */
export function cyclePrice(
  plan: { billing_cycle: string; monthly_price: number | string },
  tail: { quarterlyPrice?: number; annualPrice?: number },
): number {
  const monthly = Number(plan.monthly_price);
  if (plan.billing_cycle === "quarterly") {
    return tail.quarterlyPrice && tail.quarterlyPrice > 0
      ? tail.quarterlyPrice
      : monthly * 3;
  }
  if (plan.billing_cycle === "annually" || plan.billing_cycle === "yearly") {
    return tail.annualPrice && tail.annualPrice > 0
      ? tail.annualPrice
      : monthly * 12;
  }
  return monthly;
}

/** The next billing date: the start plus one cycle. */
export function nextBillingOn(start: string, cycle: string): string {
  const d = new Date(`${start}T12:00:00Z`);
  if (cycle === "daily") d.setUTCDate(d.getUTCDate() + 1);
  else if (cycle === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (cycle === "quarterly") d.setUTCMonth(d.getUTCMonth() + 3);
  else if (cycle === "annually" || cycle === "yearly")
    d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}
