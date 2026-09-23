import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

import type {
  DaycareService,
  DaycareServiceInput,
} from "@/lib/api/mappers/daycare-service";

// ============================================================================
// The daycare menu, for the screens that read and write it.
//
// NO MOCK FALLBACK. A facility with no daycare services has no daycare
// services, and an empty menu is meaningful on its own — the booking wizard
// refuses rather than pricing against something invented. The same decision
// `grooming-catalogue.ts` records.
// ============================================================================

const BASE = "/api/daycare/services";
const CATEGORIES = "/api/daycare/service-categories";

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

export interface DaycareServiceCategory {
  id: string;
  name: string;
  displayOrder: number;
}

/** What a save reports: the service always, the prices only if allowed. */
export interface DaycareServiceWriteResult {
  service: DaycareService | null;
  /** False = saved, but `manage_rates` was missing, so the prices are not. */
  pricesWritten: boolean;
}

export const daycareCatalogueKeys = {
  all: ["daycare-catalogue"] as const,
  services: (locationId?: string | null) =>
    [
      ...daycareCatalogueKeys.all,
      "services",
      locationId ?? "facility-wide",
    ] as const,
  categories: () => [...daycareCatalogueKeys.all, "categories"] as const,
};

export const daycareCatalogueQueries = {
  /**
   * `locationId` omitted (the default) returns the facility-wide price. Passed,
   * each service carries its EFFECTIVE price for that branch — the branch's own
   * where it set one, the facility's otherwise. `locationPricing` rides along
   * either way for the screen that compares branches.
   */
  services: (locationId?: string | null) => ({
    queryKey: daycareCatalogueKeys.services(locationId),
    queryFn: () =>
      json<DaycareService[]>(
        locationId
          ? `${BASE}?locationId=${encodeURIComponent(locationId)}`
          : BASE,
      ),
  }),
  categories: () => ({
    queryKey: daycareCatalogueKeys.categories(),
    queryFn: () => json<DaycareServiceCategory[]>(CATEGORIES),
  }),
};

export function useDaycareServices(
  locationId?: string | null,
  options?: Partial<UseQueryOptions<DaycareService[]>>,
) {
  return useQuery({
    ...daycareCatalogueQueries.services(locationId),
    ...options,
  });
}

export function useDaycareServiceCategories() {
  return useQuery(daycareCatalogueQueries.categories());
}

/**
 * Create or update one service, with its branch prices.
 *
 * Invalidates the WHOLE `daycare-catalogue` prefix, not one key: the menu is
 * cached per branch, and a save made facility-wide changes what every branch
 * that had not overridden it charges.
 */
export function useSaveDaycareService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      /** Absent = create. */
      id?: string;
      input: DaycareServiceInput & { branchPrices?: Record<string, number> };
    }) =>
      json<DaycareServiceWriteResult>(
        id ? `${BASE}/${encodeURIComponent(id)}` : BASE,
        { method: id ? "PATCH" : "POST", body: input },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: daycareCatalogueKeys.all,
      });
    },
  });
}

export function useDeleteDaycareService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      json<{ removed: number }>(`${BASE}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: daycareCatalogueKeys.all,
      });
    },
  });
}

export function useSaveDaycareServiceCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; displayOrder?: number }) =>
      json<DaycareServiceCategory>(CATEGORIES, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: daycareCatalogueKeys.all,
      });
    },
  });
}
