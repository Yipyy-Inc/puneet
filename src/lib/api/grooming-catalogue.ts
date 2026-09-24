"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GroomingAddOnOption } from "@/app/api/grooming/add-ons/route";

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
/**
 * The customer's own read, and it is a DIFFERENT ROUTE rather than the same
 * one with a flag.
 *
 * `/api/grooming/services` scopes with `activeFacilityIdForStaff()`, which is
 * null for somebody holding no membership — so for a customer it falls through
 * to RLS, and RLS admits active services at every facility they are a client
 * of. Two businesses, one merged menu, and the wizard prices whatever was
 * picked. It also attaches the cross-branch price breakdown built for HQ.
 *
 * This one calls `public.offered_grooming_services()` (20260924160000), which
 * answers for ONE facility and projects to an allowlist. See the route.
 */
const CUSTOMER_BASE = "/api/customer/grooming-services";

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
  services: (locationId?: string | null) =>
    [
      ...groomingCatalogueKeys.all,
      "services",
      locationId ?? "facility-wide",
    ] as const,
  /** Keyed apart from `services`, so a staff answer can never be served from
   *  the cache to a customer or the other way round. */
  offered: (locationId?: string | null) =>
    [
      ...groomingCatalogueKeys.all,
      "offered",
      locationId ?? "facility-wide",
    ] as const,
};

export const groomingCatalogueQueries = {
  /** `locationId` omitted (the default) returns facility-wide prices only --
   *  unchanged from before branch pricing existed. Passed, it returns each
   *  service's EFFECTIVE price for that branch (its own override where set,
   *  the facility-wide price otherwise) -- see `effectiveSizePricing`. */
  services: (locationId?: string | null) => ({
    queryKey: groomingCatalogueKeys.services(locationId),
    queryFn: () =>
      json<GroomingPackage[]>(
        locationId
          ? `${BASE}?locationId=${encodeURIComponent(locationId)}`
          : BASE,
      ),
  }),
  /** What this customer's own facility offers, at this branch. */
  offered: (locationId?: string | null) => ({
    queryKey: groomingCatalogueKeys.offered(locationId),
    queryFn: () =>
      json<GroomingPackage[]>(
        locationId
          ? `${CUSTOMER_BASE}?locationId=${encodeURIComponent(locationId)}`
          : CUSTOMER_BASE,
      ),
  }),
};

/**
 * The facility's grooming add-ons — what a groom can be booked WITH. The
 * booking RPC resolves these by id, so a screen offering any other list
 * offers extras the booking will refuse.
 */
export function useGroomingAddOns() {
  return useQuery({
    queryKey: [...groomingCatalogueKeys.all, "add-ons"] as const,
    queryFn: () => json<GroomingAddOnOption[]>("/api/grooming/add-ons"),
  });
}

/**
 * The grooming menu for whoever is driving the booking.
 *
 * ONE hook rather than two, because a component cannot call a different hook
 * in a customer's browser than in a groomer's — that is a conditional hook and
 * React would be right to refuse it. The mode picks the query config, and the
 * key carries the mode.
 */
export function useGroomingMenu(options: {
  /** True = the customer's own projection. False = the staff menu. */
  asCustomer: boolean;
  locationId?: string | null;
}) {
  const config = options.asCustomer
    ? groomingCatalogueQueries.offered(options.locationId)
    : groomingCatalogueQueries.services(options.locationId);
  // Spread rather than passed through: the two factories return keys of the
  // same length but different literal types, and `useQuery` would try to
  // unify them. The keys stay distinct at runtime, which is the part that
  // matters.
  return useQuery<GroomingPackage[]>({
    queryKey: [...config.queryKey],
    queryFn: config.queryFn,
  });
}

export function useGroomingServices(locationId?: string | null) {
  return useQuery(groomingCatalogueQueries.services(locationId));
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
    mutationFn: (
      service: Partial<GroomingPackage> & {
        id?: string;
        /** Which branch `sizePricing` is FOR. Absent/null = facility-wide. */
        locationId?: string | null;
      },
    ) =>
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
      // The whole prefix, not one location's key -- a price saved for one
      // branch has to be visible the next time anyone reads that branch's
      // view, and invalidating only the scope just written would leave every
      // OTHER branch's cached view (including "facility-wide") stale.
      void queryClient.invalidateQueries({
        queryKey: groomingCatalogueKeys.all,
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
        queryKey: groomingCatalogueKeys.all,
      });
    },
  });
}
