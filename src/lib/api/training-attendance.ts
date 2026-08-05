"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { TrainingAttendee } from "@/lib/api/mappers/training-attendance";

// ============================================================================
// Today's training sessions, from Postgres.
//
// A SEPARATE FILE from src/lib/api/training.ts, which still serves courses,
// series and progress from the fixture — the same split daycare-attendance.ts
// and boarding-attendance.ts keep, and for the same reason: so it is obvious at
// a glance which reads hit the network.
// ============================================================================

export interface TrainingDayPayload {
  date: string;
  attendees: TrainingAttendee[];
}

const trainingKeys = {
  all: ["training-attendance"] as const,
  day: (date?: string) => [...trainingKeys.all, date ?? "today"] as const,
};

async function readError(response: Response, fallback: string) {
  const parsed = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return new Error(parsed?.error ?? fallback);
}

export function useTrainingDay(date?: string) {
  return useQuery({
    queryKey: trainingKeys.day(date),
    queryFn: async (): Promise<TrainingDayPayload> => {
      const response = await fetch(
        `/api/training/attendance${date ? `?date=${date}` : ""}`,
      );
      if (!response.ok) {
        throw await readError(response, `Request failed (${response.status})`);
      }
      return (await response.json()) as TrainingDayPayload;
    },
  });
}

function useTrainingInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: trainingKeys.all });
    // Attendance is the training half of a BOOKING, and `booking_presence`
    // reads it, so every booking list is now out of date too.
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
  };
}

/** A dog arrives. Pressing it twice does not move the arrival time. */
export function useTrainingCheckIn() {
  const invalidate = useTrainingInvalidation();
  return useMutation({
    mutationFn: async (input: { bookingRef: number; notes?: string }) => {
      const response = await fetch("/api/training/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw await readError(response, "Could not check that dog in.");
      }
      return input.bookingRef;
    },
    onSuccess: invalidate,
  });
}

/** The session ends (`checkOut`), or the wrong dog was collected (`reopen`). */
export function useTrainingVisitUpdate() {
  const invalidate = useTrainingInvalidation();
  return useMutation({
    mutationFn: async (input: {
      bookingRef: number;
      checkOut?: boolean;
      reopen?: boolean;
      notes?: string;
    }) => {
      const { bookingRef, ...patch } = input;
      const response = await fetch(`/api/training/attendance/${bookingRef}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        throw await readError(response, "Could not update that session.");
      }
      return bookingRef;
    },
    onSuccess: invalidate,
  });
}

/**
 * Back to scheduled — the check-in was a mistake.
 *
 * Deletes the row, as daycare does. Boarding's revert is an UPDATE because its
 * row is also the kennel assignment; this one means only "the dog arrived".
 */
export function useTrainingRevert() {
  const invalidate = useTrainingInvalidation();
  return useMutation({
    mutationFn: async (bookingRef: number) => {
      const response = await fetch(`/api/training/attendance/${bookingRef}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw await readError(response, "Could not revert that check-in.");
      }
      return bookingRef;
    },
    onSuccess: invalidate,
  });
}
