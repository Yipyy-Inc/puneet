import { facilitySubscriptions } from "@/data/facility-subscriptions";
import { subscriptionTiers } from "@/data/subscription-tiers";
import { buildPlatformInvoices } from "@/data/platform-invoices";
import type { FacilitySubscription } from "@/types/facility";

// Commercial-subscriptions view model. The platform stores raw FacilitySubscription
// records (status: active/trial/suspended/cancelled/expired). The commercial console
// presents them with billing-centric statuses derived from real signals:
//   - past_due  ← an ACTIVE subscription whose facility has an Overdue platform invoice
//   - paused    ← a SUSPENDED subscription (service on hold)
//   - cancelled ← cancelled or expired
// so no numbers are fabricated — every count traces back to the data layer.

export type SubscriptionBillingStatus =
  | "active"
  | "trial"
  | "past_due"
  | "paused"
  | "cancelled";

export interface SubscriptionRow {
  id: string;
  facilityId: number;
  facilityName: string;
  planName: string;
  billingCycle: "monthly" | "quarterly" | "yearly";
  /** Normalized monthly recurring revenue. */
  mrr: number;
  /** Billed amount per cycle. */
  amount: number;
  currency: string;
  status: SubscriptionBillingStatus;
  nextRenewalDate: string;
  autoRenew: boolean;
}

function cycleMonths(cycle: string): number {
  return cycle === "yearly" ? 12 : cycle === "quarterly" ? 3 : 1;
}
function monthlyEquivalent(amount: number, cycle: string): number {
  return Math.round(amount / cycleMonths(cycle));
}

function billingStatusOf(
  sub: FacilitySubscription,
  overdueFacilityIds: Set<number>,
): SubscriptionBillingStatus {
  switch (sub.status) {
    case "trial":
      return "trial";
    case "suspended":
      return "paused";
    case "cancelled":
    case "expired":
      return "cancelled";
    case "active":
    default:
      return overdueFacilityIds.has(sub.facilityId) ? "past_due" : "active";
  }
}

function buildSubscriptionRows(now: Date): SubscriptionRow[] {
  const overdueFacilityIds = new Set(
    buildPlatformInvoices(now)
      .filter((inv) => inv.status === "Overdue")
      .map((inv) => inv.facilityId),
  );

  return facilitySubscriptions.map((sub) => {
    const tier = subscriptionTiers.find((t) => t.id === sub.tierId);
    return {
      id: sub.id,
      facilityId: sub.facilityId,
      facilityName: sub.facilityName,
      planName: tier?.name ?? sub.tierName,
      billingCycle: sub.billingCycle,
      mrr: monthlyEquivalent(sub.billing.totalCost, sub.billingCycle),
      amount: sub.billing.totalCost,
      currency: sub.billing.currency,
      status: billingStatusOf(sub, overdueFacilityIds),
      nextRenewalDate: sub.billing.nextBillingDate,
      autoRenew: sub.autoRenew,
    };
  });
}

export const subscriptionQueries = {
  all: () => ({
    queryKey: ["commercial", "subscriptions"] as const,
    queryFn: async (): Promise<SubscriptionRow[]> =>
      buildSubscriptionRows(new Date()),
  }),
};
