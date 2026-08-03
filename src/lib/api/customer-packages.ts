"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ServicePackage } from "@/data/services-pricing";

// ============================================================================
// Buying a package and spending a pass.
//
// A separate file from src/lib/api/grooming.ts because that module has no
// "use client" directive and holds ~900 lines of pricing helpers that server
// components import. The read factories stay there; the mutations live here.
//
// ── BOTH INVALIDATE, NEITHER PATCHES ──────────────────────────────────────
//
// No optimistic update and no manual cache edit. The counts these mutations
// change are derived server-side from a ledger, so the only way to know the new
// numbers is to ask — and writing "passesUsed + 1" into the cache here would
// recreate, in the client, exactly the hand-maintained counter the schema was
// built to delete.
// ============================================================================

const BASE = "/api/packages/owned";

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return parsed as T;
}

/** Everything that reads what a customer owns. */
function invalidateOwned(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({
    queryKey: ["grooming", "customer-packages"],
  });
  // Both catalogue projections carry a derived `purchaseCount` off these rows.
  void queryClient.invalidateQueries({ queryKey: ["prepaid-packages"] });
  void queryClient.invalidateQueries({ queryKey: ["packages", "catalogue"] });
}

/**
 * The whole catalogue, every module — what the portal shop offers.
 *
 * Separate from `usePrepaidPackages`, which is the grooming manager's
 * grooming-only view of the same rows. Two questions, two routes; the derived
 * prices come from one view either way, so the two screens cannot quote
 * different savings for the same package.
 */
export function useServicePackages() {
  return useQuery({
    queryKey: ["packages", "catalogue"] as const,
    queryFn: async (): Promise<ServicePackage[]> => {
      const response = await fetch("/api/packages");
      if (!response.ok) {
        const parsed = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(parsed?.error ?? `Request failed (${response.status})`);
      }
      return (await response.json()) as ServicePackage[];
    },
  });
}

export function usePurchasePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      clientId: number;
      packageId: string;
      priceOverride?: number;
    }) => post<{ id: string }>(BASE, input),
    onSuccess: () => invalidateOwned(queryClient),
  });
}

/**
 * Spend one pass from a NAMED pool.
 *
 * `serviceId` is required. The mock this replaces spent `passes[0]` — fine
 * while every fixture package held one service, and wrong the moment a real
 * bundle holds two, because a customer booking a bath would have had a Full
 * Groom pass taken instead.
 */
export function useRedeemPackagePass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      customerPackageId: string;
      serviceId: string;
      serviceLabel?: string;
      bookingId?: number;
      petId?: number;
      petName?: string;
    }) => post<{ passesLeft: number }>(`${BASE}/redeem`, input),
    onSuccess: () => invalidateOwned(queryClient),
  });
}
