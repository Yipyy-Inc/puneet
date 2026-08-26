"use client";

import { useQuery } from "@tanstack/react-query";

import { groomingCatalogueKeys } from "@/lib/api/grooming-catalogue";
import type { HqGroomingService } from "@/types/hq-services";

// ============================================================================
// HQ Services (grooming only) — the SAME `/api/grooming/services` endpoint
// every other grooming screen reads, since `locationPricing` rides along on
// every response now (see the route's header). Writes reuse
// `useSaveGroomingService()` from grooming-catalogue.ts unchanged — passing
// `locationId` already scopes a price edit to one branch.
// ============================================================================

async function fetchHqGroomingServices(): Promise<HqGroomingService[]> {
  const response = await fetch("/api/grooming/services");
  const parsed = (await response.json().catch(() => null)) as
    | (HqGroomingService[] & { error?: string })
    | { error: string }
    | null;
  if (!response.ok) {
    const detail = Array.isArray(parsed) ? undefined : parsed?.error;
    throw new Error(detail ?? `Could not load services (${response.status})`);
  }
  return parsed as HqGroomingService[];
}

export function useHqGroomingServices() {
  return useQuery({
    // The facility-wide key -- same cache entry `useGroomingServices()`
    // (no locationId) already uses, so a price saved from either screen
    // invalidates and refetches the other correctly.
    queryKey: groomingCatalogueKeys.services(undefined),
    queryFn: fetchHqGroomingServices,
  });
}
