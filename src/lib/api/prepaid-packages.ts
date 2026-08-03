"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { GroomingPrepaidPackage } from "@/data/grooming-prepaid-packages";

// ============================================================================
// The prepaid-package catalogue.
//
// A separate file from src/lib/api/grooming.ts for the same reason as
// grooming-catalogue.ts: that module has no "use client" directive and putting
// hooks in it would make 900 lines of shared helpers client-only for every
// importer.
//
// THE MUTATIONS SEND WHAT THE EDITOR EDITS AND NOTHING ELSE. `regularPrice`,
// `savings`, `savingsPercentage` and `purchaseCount` are computed by the
// database (20260806320000, Decision 1) — the editor still calculates them for
// its live preview, and that preview is deliberately not what gets saved.
// ============================================================================

const BASE = "/api/grooming/prepaid-packages";

export const prepaidPackageKeys = {
  all: ["prepaid-packages"] as const,
};

/** The subset the API accepts. Built from the package the editor produced, so
 *  the call sites keep passing the shape they already have. */
function toPayload(pkg: GroomingPrepaidPackage) {
  return {
    name: pkg.name,
    description: pkg.description,
    packagePrice: pkg.packagePrice,
    validityDays: pkg.validityDays,
    status: pkg.status,
    isPopular: pkg.isPopular ?? false,
    services: pkg.services.map((s) => ({
      serviceId: s.serviceId,
      serviceName: s.serviceName,
      quantity: s.quantity,
      pricePerSession: s.pricePerSession,
    })),
    policy: pkg.policy,
  };
}

async function json<T>(
  url: string,
  init?: { method: string; body?: unknown },
): Promise<T> {
  const response = await fetch(url, {
    method: init?.method ?? "GET",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (response.status === 204) return undefined as T;
  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return parsed as T;
}

export function usePrepaidPackages() {
  return useQuery({
    queryKey: prepaidPackageKeys.all,
    queryFn: () => json<GroomingPrepaidPackage[]>(BASE),
  });
}

/**
 * Create or update, chosen by whether the package already exists.
 *
 * One hook rather than two because the editor is one dialog with one Save
 * button — splitting them would push the create-vs-edit decision into every
 * call site to express something the caller already knows.
 */
export function useSavePrepaidPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      pkg: GroomingPrepaidPackage;
      isNew: boolean;
    }) => {
      if (input.isNew) {
        return json<{ id: string }>(BASE, {
          method: "POST",
          body: toPayload(input.pkg),
        });
      }
      await json<void>(`${BASE}/${encodeURIComponent(input.pkg.id)}`, {
        method: "PATCH",
        body: toPayload(input.pkg),
      });
      return { id: input.pkg.id };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: prepaidPackageKeys.all });
    },
  });
}

/**
 * Retire a package. A real delete, and safe: purchases snapshot the name and
 * price they were sold under, and their FK is `on delete set null` — taking a
 * package off the menu does not touch a sale or a pass somebody paid for.
 */
export function useDeletePrepaidPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      json<void>(`${BASE}/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: prepaidPackageKeys.all });
    },
  });
}
