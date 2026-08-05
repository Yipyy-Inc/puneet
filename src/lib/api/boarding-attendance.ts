"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { BoardingArrival } from "@/lib/api/mappers/boarding-arrival";

// ============================================================================
// The boarding arrivals board, from Postgres.
//
// SEPARATE from boarding-rooms.ts, which answers "which kennel is free" — the
// same split daycare-attendance.ts keeps from daycare.ts. One is the floor
// plan, this is the day.
//
// NO MOCK FALLBACK. An empty board means nobody is booked across today, which
// is a thing a small boarding business should be able to see.
// ============================================================================

export interface BoardingDayPayload {
  date: string;
  guests: BoardingArrival[];
}

const boardingDayKeys = {
  all: ["boarding-attendance"] as const,
  day: (date?: string) => [...boardingDayKeys.all, date ?? "today"] as const,
};

async function readError(response: Response, fallback: string) {
  const parsed = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return new Error(parsed?.error ?? fallback);
}

export function useBoardingDay(date?: string) {
  return useQuery({
    queryKey: boardingDayKeys.day(date),
    queryFn: async (): Promise<BoardingDayPayload> => {
      const response = await fetch(
        `/api/boarding/attendance${date ? `?date=${date}` : ""}`,
      );
      if (!response.ok) {
        throw await readError(response, `Request failed (${response.status})`);
      }
      return (await response.json()) as BoardingDayPayload;
    },
  });
}

/** How the day splits. Nothing stores any of these — they are this sum. */
export function summariseBoardingDay(payload: BoardingDayPayload | undefined) {
  const guests = payload?.guests ?? [];
  return {
    expected: guests.filter((g) => g.status === "scheduled").length,
    onSite: guests.filter((g) => g.status === "checked-in").length,
    departingToday: guests.filter(
      (g) => g.status === "checked-in" && g.isDepartingToday,
    ).length,
    goneHome: guests.filter((g) => g.status === "checked-out").length,
    overdue: guests.filter((g) => g.isOverdue).length,
    unassigned: guests.filter(
      (g) => g.roomId === null && g.status === "scheduled",
    ).length,
  };
}

function useBoardingInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: boardingDayKeys.all });
    // An arrival changes the stay, which is what the kennel board draws.
    void queryClient.invalidateQueries({ queryKey: ["boarding-rooms"] });
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
  };
}

/** A guest arrives. Refused with a 409 when no kennel has been assigned. */
export function useBoardingCheckIn() {
  const invalidate = useBoardingInvalidation();
  return useMutation({
    mutationFn: async (bookingRef: number) => {
      const response = await fetch("/api/boarding/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingRef }),
      });
      if (!response.ok) {
        throw await readError(response, "Could not check that guest in.");
      }
      return bookingRef;
    },
    onSuccess: invalidate,
  });
}

/** A guest goes home (`checkOut`), or the wrong one was collected (`reopen`). */
export function useBoardingStayUpdate() {
  const invalidate = useBoardingInvalidation();
  return useMutation({
    mutationFn: async (input: {
      bookingRef: number;
      checkOut?: boolean;
      reopen?: boolean;
    }) => {
      const { bookingRef, ...patch } = input;
      const response = await fetch(`/api/boarding/attendance/${bookingRef}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        throw await readError(response, "Could not update that stay.");
      }
      return bookingRef;
    },
    onSuccess: invalidate,
  });
}

/**
 * The arrival was a mistake.
 *
 * Clears the timestamps and keeps the kennel — unlike the daycare revert, which
 * deletes its row, because this row is the room assignment.
 */
export function useBoardingRevert() {
  const invalidate = useBoardingInvalidation();
  return useMutation({
    mutationFn: async (bookingRef: number) => {
      const response = await fetch(`/api/boarding/attendance/${bookingRef}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw await readError(response, "Could not revert that arrival.");
      }
      return bookingRef;
    },
    onSuccess: invalidate,
  });
}
