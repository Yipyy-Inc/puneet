"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { bookingMutations } from "@/lib/api/booking";
import { useLocationContext } from "@/hooks/use-location-context";
import { NO_ITEMS } from "@/lib/no-items";
import type { Estimate, NewBooking } from "@/types/booking";
import type { EstimateBody, EstimatePatch } from "@/lib/api/mappers/estimate";

// ============================================================================
// Estimates, from `public.estimates` (20260911113556).
//
// No fixture fallback: the seven rows in src/data/estimates.ts were nobody's,
// and a real client whose ref matched one of them wore its quote.
//
// Every scope shares the "estimates" key root, so any write refreshes the
// facility list, a client's tab, the customer's list and an open detail.
// ============================================================================

async function get<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

async function send<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: unknown,
  fallback: string,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const parsed = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(parsed?.error ?? fallback);
  }
  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
}

export const estimateQueries = {
  facility: () => ({
    queryKey: ["estimates", "facility"] as const,
    queryFn: () => get<Estimate[]>("/api/estimates"),
  }),
  forClient: (clientRef: number) => ({
    queryKey: ["estimates", "client", clientRef] as const,
    queryFn: () => get<Estimate[]>(`/api/estimates?clientRef=${clientRef}`),
  }),
  mine: () => ({
    queryKey: ["estimates", "mine"] as const,
    queryFn: () => get<Estimate[]>("/api/estimates?mine=1"),
  }),
  /** By id, or by the customer's link token. */
  detail: (key: string) => ({
    queryKey: ["estimates", "detail", key] as const,
    queryFn: () => get<Estimate>(`/api/estimates/${encodeURIComponent(key)}`),
  }),
};

export function useFacilityEstimates() {
  const { data, isPending, isError } = useQuery(estimateQueries.facility());
  return {
    estimates: (data ?? NO_ITEMS) as Estimate[],
    pending: isPending,
    failed: isError,
  };
}

export function useClientEstimates(clientRef: number) {
  const { data, isPending } = useQuery({
    ...estimateQueries.forClient(clientRef),
    enabled: clientRef > 0,
  });
  return {
    estimates: (data ?? NO_ITEMS) as Estimate[],
    pending: clientRef > 0 && isPending,
  };
}

export function useMyEstimates() {
  const { data, isPending } = useQuery(estimateQueries.mine());
  return { estimates: (data ?? NO_ITEMS) as Estimate[], pending: isPending };
}

export function useEstimate(key: string | undefined) {
  const { data, isPending, isError } = useQuery({
    ...estimateQueries.detail(key ?? ""),
    enabled: Boolean(key),
  });
  return {
    estimate: data,
    pending: Boolean(key) && isPending,
    failed: isError,
  };
}

export type EstimateCreate = EstimateBody & {
  send?: boolean;
  duplicatedFrom?: string;
};

export function useEstimateMutations() {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["estimates"] });

  const create = useMutation({
    mutationFn: (input: EstimateCreate) =>
      send<Estimate>(
        "/api/estimates",
        "POST",
        input,
        "The estimate was not saved.",
      ),
    onSuccess: refresh,
  });

  const act = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EstimatePatch }) =>
      send<Estimate>(
        `/api/estimates/${id}`,
        "PATCH",
        patch,
        "The estimate was not changed.",
      ),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      send<void>(
        `/api/estimates/${id}`,
        "DELETE",
        undefined,
        "The estimate was not deleted.",
      ),
    onSuccess: refresh,
  });

  const respond = useMutation({
    mutationFn: ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: "view" | "accept" | "decline";
      reason?: string;
    }) =>
      send<{ status: string }>(
        `/api/estimates/${id}/respond`,
        "POST",
        { action, reason },
        "Your answer was not saved.",
      ),
    onSuccess: refresh,
  });

  return { create, act, remove, respond };
}

/** The estimate's body, in the shape the create route takes. */
export function estimateToBody(estimate: Estimate): EstimateCreate {
  return {
    clientRef: estimate.clientId > 0 ? estimate.clientId : undefined,
    guest:
      estimate.clientId > 0
        ? undefined
        : {
            name: estimate.guestName || estimate.clientName || "Guest",
            email: estimate.guestEmail || estimate.clientEmail || undefined,
            phone: estimate.guestPhone || estimate.clientPhone || undefined,
            pet: estimate.guestPetInfo,
          },
    petRefs: estimate.clientId > 0 ? estimate.petIds : [],
    service: estimate.service,
    serviceType: estimate.serviceType,
    startDate: estimate.startDate || undefined,
    endDate: estimate.endDate || undefined,
    checkInTime: estimate.checkInTime,
    checkOutTime: estimate.checkOutTime,
    roomType: estimate.roomType,
    lineItems: estimate.lineItems.map((l) => ({
      label: l.label,
      description: l.description,
      amount: l.amount,
      quantity: l.quantity,
    })),
    discount: estimate.discount,
    discountReason: estimate.discountReason,
    taxRate: estimate.taxRate,
    depositRequired: estimate.depositRequired,
    publicNote: estimate.publicNote,
    internalNote: estimate.internalNote,
  };
}

/**
 * Convert an estimate into a booking: the booking goes through /api/bookings
 * — the one pipeline that owns every booking rule — and only then is the
 * estimate pointed at it. If that second step fails the booking still exists,
 * and the error says so rather than pretending neither happened.
 */
export function useConvertEstimate() {
  const queryClient = useQueryClient();
  const { currentLocationId } = useLocationContext();
  return useMutation({
    mutationFn: async ({
      estimate,
      booking,
    }: {
      estimate: Estimate;
      booking: NewBooking;
    }) => {
      const created = await bookingMutations.create(booking, currentLocationId);
      try {
        await send<Estimate>(
          `/api/estimates/${estimate.id}`,
          "PATCH",
          { action: "convert", bookingRef: created.id } satisfies EstimatePatch,
          "The estimate was not marked converted.",
        );
      } catch (error) {
        throw new Error(
          `Booking #${created.id} was created, but ${estimate.estimateId} could not be marked converted: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        );
      }
      return created.id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["estimates"] });
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}
