"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { GroomingPackage } from "@/types/grooming";

// ============================================================================
// The grooming menu, from Postgres.
//
// A SEPARATE FILE FROM src/lib/api/grooming.ts, which is 900 lines of mock
// query factories plus real pricing logic (resolveEffectivePricing and
// friends). Those helpers are pure functions over already-loaded data and are
// still correct — they are not what this replaces. Mixing the new fetchers into
// that file would make it impossible to tell, at a glance, which
// `groomingQueries.*` entries hit the network and which return a fixture.
//
// NO MOCK FALLBACK. The rates screen sits behind the facility gate, so a 401 is
// a bug worth seeing rather than a state to paper over, and an empty menu is
// meaningful on its own ("this facility has not built one yet") — a fixture
// would hide exactly that.
// ============================================================================

const BASE = "/api/grooming/services";

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

export const groomingCatalogueKeys = {
  all: ["grooming-catalogue"] as const,
  services: () => [...groomingCatalogueKeys.all, "services"] as const,
};

export const groomingCatalogueQueries = {
  services: () => ({
    queryKey: groomingCatalogueKeys.services(),
    queryFn: () => json<GroomingPackage[]>(BASE),
  }),
};

export function useGroomingServices() {
  return useQuery(groomingCatalogueQueries.services());
}

/**
 * The write response carries `pricesWritten` alongside the service.
 *
 * Creating a service and pricing it are two PERMISSIONS (manage_services,
 * manage_rates), so "the service was created, the prices were refused" is a
 * real outcome rather than an error. The caller is told which happened so it
 * can say so — reporting a partial success as a failure would be a lie about a
 * row that exists, and reporting it as a plain success would hide a price list
 * that silently did not save.
 */
interface ServiceWriteResult {
  service: GroomingPackage;
  pricesWritten: boolean;
}

export function useSaveGroomingService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (service: Partial<GroomingPackage> & { id?: string }) =>
      service.id
        ? json<ServiceWriteResult>(
            `${BASE}/${encodeURIComponent(service.id)}`,
            {
              method: "PATCH",
              body: service,
            },
          )
        : json<ServiceWriteResult>(BASE, { method: "POST", body: service }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: groomingCatalogueKeys.services(),
      });
    },
  });
}

export function useDeleteGroomingService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      json<void>(`${BASE}/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: groomingCatalogueKeys.services(),
      });
    },
  });
}
