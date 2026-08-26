import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import type { HqNetworkSubscription } from "@/types/hq-billing";

const KEY = ["hq", "settings", "billing"] as const;

async function fetchHqSubscription(): Promise<HqNetworkSubscription | null> {
  const response = await fetch("/api/hq/settings/billing");
  if (!response.ok) {
    const detail = await response
      .json()
      .then((body: { error?: string }) => body.error)
      .catch(() => null);
    throw new Error(
      detail ?? `Could not load the subscription (${response.status})`,
    );
  }
  const body = (await response.json()) as {
    subscription: HqNetworkSubscription | null;
  };
  return body.subscription;
}

export const hqBillingQueries = {
  subscription: () => ({ queryKey: KEY, queryFn: fetchHqSubscription }),
};

export function useHqNetworkSubscription(): UseQueryResult<HqNetworkSubscription | null> {
  return useQuery(hqBillingQueries.subscription());
}
