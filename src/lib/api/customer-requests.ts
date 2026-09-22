"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// What customers have asked the facility for, and answering it.
//
// The requests themselves are booking notes carrying `customer_request`; see
// api/facility/requests. Pending is DERIVED — no decision yet, and the booking
// still open — so a cancellation carried out by any route settles the request
// that asked for it without anything having to remember.
// ============================================================================

export type CustomerRequestKind = "change_dates" | "cancel_request";

export interface CustomerRequest {
  noteId: string;
  kind: CustomerRequestKind;
  content: string;
  askedAt: string;
  askedBy: string | null;
  bookingRef: number;
  service: string;
  startAt: string;
  endAt: string;
  status: string;
}

export const customerRequestKeys = {
  pending: ["facility", "customer-requests"] as const,
};

/**
 * An empty list means "nobody is waiting", and a FAILED read must not look
 * like one — `[]` on a 500 is the shape that made three teardowns silently
 * clean up nothing. So the error is thrown and the caller can say so.
 */
export function usePendingCustomerRequests() {
  return useQuery({
    queryKey: customerRequestKeys.pending,
    queryFn: async (): Promise<CustomerRequest[]> => {
      const res = await fetch("/api/facility/requests");
      if (!res.ok) throw new Error(await res.text());
      const body: unknown = await res.json();
      if (!Array.isArray(body)) {
        throw new Error("The requests list did not answer with a list.");
      }
      return body as CustomerRequest[];
    },
  });
}

export function useDecideCustomerRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      bookingRef: number;
      noteId: string;
      decision: "approved" | "declined";
      reply: string;
    }) => {
      const res = await fetch(
        `/api/bookings/${input.bookingRef}/requests/${input.noteId}/decision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision: input.decision,
            reply: input.reply,
          }),
        },
      );
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        cancelStillNeeded?: boolean;
      } | null;
      if (!res.ok) throw new Error(body?.error ?? "That could not be saved.");
      return body ?? {};
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: customerRequestKeys.pending,
      });
      // The reply is a note on the booking, so anything showing that booking's
      // notes is now stale too.
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}
