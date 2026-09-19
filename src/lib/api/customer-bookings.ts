import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { CancelTerms } from "@/app/api/customer/bookings/[ref]/cancel/route";
import { bookingListSearch } from "@/lib/api/booking-list-params";
import type { Booking } from "@/types/booking";

export type { CancelTerms };

const OPEN_STATUSES = [
  "pending",
  "request_submitted",
  "estimate_sent",
  "waitlisted",
  "confirmed",
  "checked_in",
  "in_progress",
  "ready",
] as const;
const CLOSED_STATUSES = ["cancelled", "declined", "no_show", "completed"];

async function readJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!res.ok) {
    throw new Error(
      (body as { error?: string } | null)?.error ??
        `Request failed (${res.status})`,
    );
  }
  return body as T;
}

/**
 * A customer's own bookings. Strict: a failure is an error the screen shows,
 * never the fixture list liveFetch falls back to when signed out — a pet
 * owner once saw Alice Johnson's bookings that way. RLS (bookings_read) admits
 * only their own rows, so no client id is sent.
 */
export const customerBookingQueries = {
  /**
   * What is still open, today or later. By status, not only by date: a
   * client with hundreds of cancelled future bookings would otherwise fill
   * the page with them and push today's off the end.
   */
  current: (today: string) => ({
    queryKey: ["bookings", "mine", "current", today] as const,
    queryFn: async () =>
      readJson<Booking[]>(
        await fetch(
          `/api/bookings${bookingListSearch({ from: today, statuses: OPEN_STATUSES, limit: 200 })}`,
        ),
      ),
  }),
  /**
   * The past: the fifty most recent that started before today, and the
   * twenty most recent closed ones still ahead — a booking cancelled for next
   * week belongs with the finished ones.
   */
  recent: (today: string) => ({
    queryKey: ["bookings", "mine", "recent", today] as const,
    queryFn: async () => {
      const [before, closedAhead] = await Promise.all([
        fetch(`/api/bookings${bookingListSearch({ to: today, limit: 50 })}`),
        fetch(
          `/api/bookings${bookingListSearch({ from: today, statuses: CLOSED_STATUSES, limit: 20 })}`,
        ),
      ]);
      return [
        ...(await readJson<Booking[]>(before)),
        ...(await readJson<Booking[]>(closedAhead)),
      ];
    },
  }),
  /** What cancelling this booking would mean (GET …/cancel). */
  cancelTerms: (ref: number) => ({
    queryKey: ["bookings", "cancel-terms", ref] as const,
    queryFn: async () =>
      readJson<CancelTerms>(
        await fetch(`/api/customer/bookings/${ref}/cancel`),
      ),
    staleTime: 0,
  }),
};

/**
 * A note on the customer's own booking, or a request to change its dates
 * (POST …/notes). Resolves once the note is saved, so the toast is true.
 */
export function useAddBookingNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      ref: number;
      kind: "note" | "change_dates";
      content: string;
    }) =>
      readJson<{ id: string }>(
        await fetch(`/api/customer/bookings/${input.ref}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: input.kind, content: input.content }),
        }),
      ),
    onSuccess: (_data, input) =>
      queryClient.invalidateQueries({
        queryKey: ["notes", "booking", input.ref],
      }),
  });
}

/**
 * Cancels, or withdraws, the customer's own booking. Resolves only once the
 * database has recorded it — never a "cancelled" toast for a booking that
 * was not.
 */
export function useCancelMyBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ref: number; reason?: string }) =>
      readJson<{ cancellation: unknown }>(
        await fetch(`/api/customer/bookings/${input.ref}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: input.reason ?? "" }),
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}
