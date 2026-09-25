import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

import type {
  BoardingService,
  BoardingServiceInput,
} from "@/lib/api/mappers/boarding-service";

// ============================================================================
// The boarding menu, for the screens that read and write it.
//
// NO MOCK FALLBACK. A facility with no boarding services has no boarding
// services, and an empty menu is meaningful on its own — the booking wizard
// falls back to the kennel class's own rate, which is what every boarding
// booking made before Phase 6 was sold at. The same decision
// `daycare-catalogue.ts` and `grooming-catalogue.ts` record.
// ============================================================================

const BASE = "/api/boarding/services";
const CATEGORIES = "/api/boarding/service-categories";
/**
 * The customer's own read, and it is a DIFFERENT ROUTE rather than the same
 * one with a flag.
 *
 * `/api/boarding/services` scopes with `activeFacilityIdForStaff()`, which is
 * null for somebody holding no membership — so for a customer it falls through
 * to RLS, and RLS admits active services at every facility they are a client
 * of. Two businesses, one merged menu. It also returns the whole row: the
 * calendar colour, the pet tags, the staff evaluation flag.
 *
 * This one calls `public.offered_boarding_services()` (20260924220000), which
 * answers for ONE facility and projects to an allowlist. See the route.
 */
const CUSTOMER_BASE = "/api/customer/boarding-services";

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

export interface BoardingServiceCategory {
  id: string;
  name: string;
  displayOrder: number;
}

/** What a save reports: the service always, the prices only if allowed. */
export interface BoardingServiceWriteResult {
  service: BoardingService | null;
  /** False = saved, but `manage_rates` was missing, so the prices are not. */
  pricesWritten: boolean;
  /**
   * False = saved, but the default add-ons were not — refused, or a write
   * failed between the delete and the insert, leaving none. Absent from an
   * older server's answer, which is read as written.
   */
  defaultsWritten?: boolean;
}

export const boardingCatalogueKeys = {
  all: ["boarding-catalogue"] as const,
  services: (locationId?: string | null) =>
    [
      ...boardingCatalogueKeys.all,
      "services",
      locationId ?? "facility-wide",
    ] as const,
  /**
   * Keyed on the pets too, because the answer depends on them: the pet-tag
   * rules are applied server-side, so two different pets are two different
   * menus and must not share a cache entry.
   */
  offered: (locationId?: string | null, petRefs?: readonly number[]) =>
    [
      ...boardingCatalogueKeys.all,
      "offered",
      locationId ?? "facility-wide",
      [...(petRefs ?? [])].sort((a, b) => a - b).join(","),
    ] as const,
  categories: () => [...boardingCatalogueKeys.all, "categories"] as const,
};

export const boardingCatalogueQueries = {
  /**
   * `locationId` omitted (the default) returns the facility-wide price. Passed,
   * each service carries its EFFECTIVE price for that branch — the branch's own
   * where it set one, the facility's otherwise. `locationPricing` rides along
   * either way for the screen that compares branches.
   */
  services: (locationId?: string | null) => ({
    queryKey: boardingCatalogueKeys.services(locationId),
    queryFn: () =>
      json<BoardingService[]>(
        locationId
          ? `${BASE}?locationId=${encodeURIComponent(locationId)}`
          : BASE,
      ),
  }),
  /** What this customer's own facility offers, for these pets, at this branch. */
  offered: (locationId?: string | null, petRefs?: readonly number[]) => ({
    queryKey: boardingCatalogueKeys.offered(locationId, petRefs),
    queryFn: () => {
      const params = new URLSearchParams();
      if (locationId) params.set("locationId", locationId);
      if (petRefs && petRefs.length > 0) {
        params.set("petRefs", [...petRefs].sort((a, b) => a - b).join(","));
      }
      const query = params.toString();
      return json<BoardingService[]>(
        query ? `${CUSTOMER_BASE}?${query}` : CUSTOMER_BASE,
      );
    },
  }),
  categories: () => ({
    queryKey: boardingCatalogueKeys.categories(),
    queryFn: () => json<BoardingServiceCategory[]>(CATEGORIES),
  }),
};

export function useBoardingServices(
  locationId?: string | null,
  options?: Partial<UseQueryOptions<BoardingService[]>>,
) {
  return useQuery({
    ...boardingCatalogueQueries.services(locationId),
    ...options,
  });
}

/**
 * The boarding menu for whoever is driving the booking.
 *
 * ONE hook rather than two, because the picker cannot call a different hook in
 * a customer's browser than in a receptionist's — that is a conditional hook,
 * and React would be right to refuse it. The mode picks the query config; the
 * query key carries the mode, so a shared cache cannot serve a staff answer to
 * a customer.
 */
export function useBoardingMenu(options: {
  /** True = the customer's own projection. False = the staff menu. */
  asCustomer: boolean;
  locationId?: string | null;
  /** The pets chosen, by ref. Only read in customer mode. */
  petRefs?: readonly number[];
}) {
  const { asCustomer, locationId, petRefs } = options;
  const config = asCustomer
    ? boardingCatalogueQueries.offered(locationId, petRefs)
    : boardingCatalogueQueries.services(locationId);
  // Spread rather than passed straight through: the two factories return keys
  // of different LENGTHS, and `useQuery` would otherwise try to unify the two
  // tuple literals into one and fail. The keys stay distinct at runtime, which
  // is the part that matters — a staff answer must never be served from the
  // cache to a customer.
  return useQuery<BoardingService[]>({
    queryKey: [...config.queryKey],
    queryFn: config.queryFn,
  });
}

export function useBoardingServiceCategories() {
  return useQuery(boardingCatalogueQueries.categories());
}

/**
 * Create or update one service, with its branch prices.
 *
 * Invalidates the WHOLE `boarding-catalogue` prefix, not one key: the menu is
 * cached per branch, and a save made facility-wide changes what every branch
 * that had not overridden it charges.
 */
export function useSaveBoardingService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      /** Absent = create. */
      id?: string;
      input: BoardingServiceInput & { branchPrices?: Record<string, number> };
    }) =>
      json<BoardingServiceWriteResult>(
        id ? `${BASE}/${encodeURIComponent(id)}` : BASE,
        { method: id ? "PATCH" : "POST", body: input },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: boardingCatalogueKeys.all,
      });
    },
  });
}

export function useDeleteBoardingService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      json<{ removed: number }>(`${BASE}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: boardingCatalogueKeys.all,
      });
    },
  });
}

export function useSaveBoardingServiceCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; displayOrder?: number }) =>
      json<BoardingServiceCategory>(CATEGORIES, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: boardingCatalogueKeys.all,
      });
    },
  });
}

export function useRenameBoardingServiceCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      json<BoardingServiceCategory>(`${CATEGORIES}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: { name },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: boardingCatalogueKeys.all,
      });
    },
  });
}

export function useDeleteBoardingServiceCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      json<{ removed: number }>(`${CATEGORIES}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    // A removed category takes nothing with it — the services it grouped are
    // `on delete set null` and reappear under the ungrouped heading — but the
    // SERVICES query still holds their old `categoryId`, so the whole
    // catalogue is invalidated rather than just the category list.
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: boardingCatalogueKeys.all,
      });
    },
  });
}
