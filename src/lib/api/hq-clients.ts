import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import type {
  HqClientNetworkValue,
  HqLoyaltyTierSummary,
} from "@/types/hq-clients";

// ============================================================================
// Cross-location client value, from `/api/hq/clients` — see its header for why
// this has no time window.
// ============================================================================

const KEY = ["hq-clients"] as const;

export interface HqClientsResponse {
  clients: HqClientNetworkValue[];
  tiers: HqLoyaltyTierSummary[];
}

async function fetchHqClients(): Promise<HqClientsResponse> {
  const response = await fetch("/api/hq/clients");
  if (!response.ok) {
    const detail = await response
      .json()
      .then((body: { error?: string }) => body.error)
      .catch(() => null);
    throw new Error(detail ?? `Could not load HQ clients (${response.status})`);
  }
  return (await response.json()) as HqClientsResponse;
}

export const hqClientsQueries = {
  all: () => ({ queryKey: KEY, queryFn: fetchHqClients }),
};

export function useHqClientNetworkValue(): UseQueryResult<HqClientsResponse> {
  return useQuery(hqClientsQueries.all());
}
