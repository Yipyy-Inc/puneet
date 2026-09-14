"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { UnfinishedBookingWrite } from "@/lib/api/mappers/unfinished-booking";
import type {
  UnfinishedBooking,
  UnfinishedBookingStatus,
} from "@/types/unfinished-booking";

// ============================================================================
// Unfinished bookings, from Postgres (20260914133049).
//
// They were `src/data/unfinished-bookings`: invented abandonments at facility
// 11, a "Recovery email sent" toast that sent nothing, and notes kept in React
// state. Staff read the facility's; a customer reads and saves their own.
// ============================================================================

async function request<T>(
  url: string,
  init: RequestInit = {},
  fallback = "That did not work.",
): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? fallback);
  }
  return (await response.json()) as T;
}

export const unfinishedBookingKeys = {
  facility: ["unfinished-bookings", "facility"] as const,
  mine: ["unfinished-bookings", "mine"] as const,
  one: (id: string) => ["unfinished-bookings", "one", id] as const,
};

export const unfinishedBookingQueries = {
  /** The facility's — staff with view_bookings. */
  facility: () => ({
    queryKey: unfinishedBookingKeys.facility,
    queryFn: () =>
      request<UnfinishedBooking[]>(
        "/api/unfinished-bookings",
        {},
        "Could not load unfinished bookings.",
      ),
  }),
  /** A customer's own, not yet recovered. */
  mine: () => ({
    queryKey: unfinishedBookingKeys.mine,
    queryFn: () =>
      request<UnfinishedBooking[]>(
        "/api/customer/unfinished-bookings",
        {},
        "Could not load your unfinished bookings.",
      ),
  }),
  /** One of a customer's own, to resume. */
  one: (id: string | null) => ({
    queryKey: unfinishedBookingKeys.one(id ?? ""),
    enabled: Boolean(id),
    queryFn: () =>
      request<UnfinishedBooking>(
        `/api/customer/unfinished-bookings/${encodeURIComponent(id ?? "")}`,
        {},
        "That booking could not be found.",
      ),
  }),
};

function useInvalidate() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ["unfinished-bookings"] });
}

/** Staff: mark contacted or recovered, and/or add a note. */
export function useFollowUpUnfinishedBooking() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: string;
      status?: UnfinishedBookingStatus;
      note?: string;
    }) =>
      request<UnfinishedBooking>(
        `/api/unfinished-bookings/${encodeURIComponent(id)}`,
        { method: "PATCH", body: JSON.stringify({ status, note }) },
        "That was not saved.",
      ),
    onSuccess: invalidate,
  });
}

/** Customer: keep what was entered when the form is left partway. */
export function useSaveUnfinishedBooking() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (write: UnfinishedBookingWrite) =>
      request<UnfinishedBooking>(
        "/api/customer/unfinished-bookings",
        { method: "POST", body: JSON.stringify(write) },
        "Your booking could not be saved for later.",
      ),
    onSuccess: invalidate,
  });
}

/**
 * Customer: keep the draft as the page is hidden or closed.
 *
 * `keepalive` lets the request outlive the tab, which a mutation cannot. Fire
 * and forget: there is nobody left to tell if it fails, and the next save
 * (another step, another visit) writes the same open draft again.
 */
export function saveUnfinishedBookingOnLeave(write: UnfinishedBookingWrite) {
  try {
    void fetch("/api/customer/unfinished-bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(write),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // A browser refusing a keepalive body over its size cap: nothing to do.
  }
}

/** Customer: they came back and booked. */
export function useMarkUnfinishedBookingRecovered() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) =>
      request<{ id: string }>(
        `/api/customer/unfinished-bookings/${encodeURIComponent(id)}`,
        { method: "PATCH" },
      ),
    onSuccess: invalidate,
  });
}
