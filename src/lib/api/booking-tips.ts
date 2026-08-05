"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// The tip, and who is owed it.
//
// A separate file from booking-money.ts, which is about what the CLIENT pays.
// This is about what the facility owes its own people out of that payment —
// the other direction, and the one that feeds payroll rather than the ledger.
// ============================================================================

export interface TipAllocation {
  id: string;
  staffId: string;
  amount: number;
  authorName: string | null;
  createdAt: string;
}

export interface BookingTips {
  /** Signed sum of `payments.tip`: a refund takes its tip back with it. */
  tipCollected: number;
  method: string | null;
  allocations: TipAllocation[];
}

const tipKeys = {
  all: ["booking-tips"] as const,
  forBooking: (ref: number) => ["booking-tips", ref] as const,
};

export function useBookingTips(bookingRef: number | null) {
  return useQuery({
    queryKey: tipKeys.forBooking(bookingRef ?? 0),
    enabled: bookingRef !== null && Number.isFinite(bookingRef),
    queryFn: async (): Promise<BookingTips> => {
      const response = await fetch(`/api/bookings/${bookingRef}/tips`);
      if (!response.ok) {
        const parsed = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(parsed?.error ?? `Request failed (${response.status})`);
      }
      return (await response.json()) as BookingTips;
    },
  });
}

/**
 * Save the whole split.
 *
 * A PUT, and a replacement — a split is one thing, not a list of things. The
 * database refuses a total above the tips actually collected, so a modal that
 * balances to the cent and a database that agrees are two independent checks
 * rather than the same one written twice.
 */
export function useSetTipSplit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      bookingRef: number;
      method: string;
      allocations: { staffId: string; amount: number }[];
    }) => {
      const response = await fetch(`/api/bookings/${input.bookingRef}/tips`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: input.method,
          allocations: input.allocations,
        }),
      });
      const parsed = (await response.json().catch(() => null)) as {
        allocated?: number;
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(parsed?.error ?? "Could not save that tip split.");
      }
      return parsed?.allocated ?? 0;
    },
    onSuccess: (_result, input) => {
      void queryClient.invalidateQueries({
        queryKey: tipKeys.forBooking(input.bookingRef),
      });
    },
  });
}
