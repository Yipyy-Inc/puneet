"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { GroomingStatus } from "@/types/grooming";

// ============================================================================
// Grooming appointment WRITES.
//
// A separate file from src/lib/api/grooming.ts on purpose: that module is 900
// lines of shared helpers with no "use client" directive, and putting a hook in
// it would make the whole thing client-only for every importer. Same split as
// grooming-catalogue.ts.
//
// The READ still lives there, as `groomingQueries.appointments()`, because the
// stylist remap it performs belongs next to `stylistIdForStaff`.
// ============================================================================

/**
 * Move an appointment through the day, and/or park it on a station.
 *
 * SENDS THE TRANSITION, NOT ITS CONSEQUENCES. The route writes
 * `bookings.status` and nothing else; the arrival time, the ready-ETA and the
 * check-out stamp are the database's (20260805140000). So this invalidates on
 * success rather than patching the cache — the screen re-reads to learn what
 * the server decided, and a local guess at an ETA would be wrong the moment
 * there is an add-on on the ticket.
 *
 * STATION OCCUPANCY IS INVALIDATED TOO. Parking a pet on a tub changes what the
 * stations query reports, because that endpoint derives occupancy from exactly
 * this row. Two queries describing one fact have to be refreshed together or
 * the board and the station list disagree about where a dog is.
 */
export function useSetGroomingAppointmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status?: GroomingStatus;
      stationId?: string | null;
    }) => {
      const response = await fetch("/api/grooming/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const parsed = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(parsed?.error ?? "Could not update that appointment.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["grooming", "appointments"],
      });
      void queryClient.invalidateQueries({ queryKey: ["grooming-stations"] });
    },
  });
}
