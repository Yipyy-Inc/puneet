"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { dailyCareKeys } from "@/lib/api/daily-care";

// ============================================================================
// A stay-long care note, saved on the booking.
//
// It was a module-level Map in `src/data/pet-care-notes.ts`: set in one tab,
// gone on reload, never seen by the next shift. A note that lasts the whole
// stay belongs to the stay, so it is `details.careNote` on the booking — the
// booking PATCH merges it into the stored details, and the Daily Care read
// carries it onto the guest.
// ============================================================================

export function useSaveCareNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bookingRef: string; careNote: string }) => {
      const response = await fetch(
        `/api/bookings/${encodeURIComponent(input.bookingRef)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ careNote: input.careNote.trim() }),
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dailyCareKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["bookings"] }),
      ]);
    },
  });
}
