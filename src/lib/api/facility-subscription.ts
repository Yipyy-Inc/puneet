"use client";

import { useQuery } from "@tanstack/react-query";

// ============================================================================
// The facility's own subscription, from `facility_subscriptions` through
// `/api/facility/subscription`.
//
// Settings → Subscription read one invented plan from `src/data/settings`, so
// every facility saw the same name, the same price and the same renewal date —
// none of them their own. A facility that nobody has put on a plan yet answers
// `null`, which the card says plainly rather than dressing up as a plan.
//
// The account-side billing screens still read the `facility-billing` fixtures;
// those belong with the platform-billing work. Debt map.
// ============================================================================

export interface FacilitySubscription {
  tierId: string;
  tierName: string;
  status: string;
  billingCycle: string;
  amountCents: number;
  currency: string;
  seats: number | null;
  trialEndsAt: string | null;
  periodStart: string;
  periodEnd: string | null;
  cancelledAt: string | null;
}

export const facilitySubscriptionQueries = {
  mine: () => ({
    queryKey: ["facility-subscription"] as const,
    queryFn: async (): Promise<FacilitySubscription | null> => {
      const response = await fetch("/api/facility/subscription");
      if (response.status === 401 || response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`Could not load the subscription (${response.status})`);
      }
      const body = (await response.json()) as {
        subscription: FacilitySubscription | null;
      };
      return body.subscription;
    },
  }),
};

export function useFacilitySubscription() {
  const { data, isPending, isError } = useQuery(
    facilitySubscriptionQueries.mine(),
  );
  return {
    subscription: data ?? null,
    pending: isPending,
    failed: isError,
  };
}
