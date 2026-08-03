"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  AlertNote,
  AppointmentHistoryEntry,
  GroomingStatus,
  TicketComment,
} from "@/types/grooming";

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

/**
 * Add a safety alert or a handoff comment to an appointment.
 *
 * RETURNS THE STORED ROW, and the caller renders that rather than what it sent.
 * The author and the timestamp are the server's — stamped by trigger from the
 * session (20260806140000, Decision 2) — so an optimistic local entry would
 * show the wrong name until the next refetch. The mock's placeholder for that
 * name was the literal string "You", on every note, for everybody.
 */
export function useAddAppointmentNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      appointmentId: string;
      kind: "alert" | "comment";
      text: string;
      appliesToFuture?: boolean;
    }): Promise<AlertNote | TicketComment> => {
      const response = await fetch("/api/grooming/appointments/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const parsed = (await response.json().catch(() => null)) as
        | (AlertNote & TicketComment & { error?: string })
        | null;
      if (!response.ok) {
        throw new Error(parsed?.error ?? "Could not save that note.");
      }
      return parsed as AlertNote | TicketComment;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["grooming", "appointments"],
      });
    },
  });
}

/**
 * Remove a safety alert. Alerts only — the comment thread is append-only and
 * has no delete policy at all (Decision 3), so there is deliberately no hook
 * that could ask for one.
 */
export function useRemoveAppointmentAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `/api/grooming/appointments/notes?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const parsed = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(parsed?.error ?? "Could not remove that alert.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["grooming", "appointments"],
      });
    },
  });
}

/**
 * Replace the in-progress step checklist. Sent whole because that is how the
 * panel edits it — every toggle rewrites the array.
 */
export function useSetSessionProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      sessionProgress: { step: string; done: boolean; at?: string }[];
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
        throw new Error(parsed?.error ?? "Could not save the checklist.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["grooming", "appointments"],
      });
    },
  });
}

/**
 * Append an entry to an appointment's history trail.
 *
 * APPEND ONLY, by construction. There is no edit or delete counterpart because
 * the table refuses both for every role including the owner (20260806160000) —
 * a hook offering one would be a hook that always throws.
 *
 * Fire-and-forget at the call sites: `recordHistory` is invoked from inside
 * status transitions, note writes and email sends, none of which should fail
 * because the audit line did. A failed append surfaces as a toast and the
 * action it describes still stands.
 */
export function useRecordAppointmentHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      appointmentId: string;
      description?: string;
      fieldChange?: {
        field: string;
        before: string | null;
        after: string | null;
      };
    }): Promise<AppointmentHistoryEntry> => {
      const response = await fetch("/api/grooming/appointments/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const parsed = (await response.json().catch(() => null)) as
        | (AppointmentHistoryEntry & { error?: string })
        | null;
      if (!response.ok) {
        throw new Error(parsed?.error ?? "Could not record that change.");
      }
      return parsed as AppointmentHistoryEntry;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["grooming", "appointments"],
      });
    },
  });
}
