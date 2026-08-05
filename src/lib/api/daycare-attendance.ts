"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { DaycareCheckIn } from "@/types/daycare";
import type { PetSize } from "@/types/base";

// ============================================================================
// The daycare floor, from Postgres.
//
// A SEPARATE FILE from src/lib/api/daycare.ts, which still serves rates,
// packages and report cards from the fixture. Mixing them would make it
// impossible to tell at a glance which `daycareQueries.*` entries hit the
// network — the same confusion `groomingQueries.packages` caused before it was
// deleted, and the reason `boarding-rooms.ts` is its own file too.
//
// NO MOCK FALLBACK. An empty day means nobody is booked in, which is worth
// seeing on a Tuesday in January.
// ============================================================================

export interface DaycareDayPayload {
  date: string;
  visits: DaycareCheckIn[];
  capacity: { total: number; bySize: Partial<Record<PetSize, number>> };
}

const daycareKeys = {
  all: ["daycare-attendance"] as const,
  day: (date?: string) => [...daycareKeys.all, date ?? "today"] as const,
};

async function fetchDay(date?: string): Promise<DaycareDayPayload> {
  const response = await fetch(
    `/api/daycare/attendance${date ? `?date=${date}` : ""}`,
  );
  if (!response.ok) {
    const parsed = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as DaycareDayPayload;
}

/** Today's floor: who is booked, who arrived, who has gone home. */
export function useDaycareDay(date?: string) {
  return useQuery({
    queryKey: daycareKeys.day(date),
    queryFn: () => fetchDay(date),
  });
}

/**
 * How full the floor is.
 *
 * NOTHING STORES THIS. `daycareCapacity` in the fixture kept a `total` of 50
 * beside per-size numbers that happened to sum to it — the same three-numbers-
 * for-one-idea shape `boardingCapacity` had. The ceilings are configuration and
 * come from `daycare_config`; the counts are this sum, over the visits that
 * are actually on the floor right now.
 *
 * `scheduled` is not counted: a dog booked for this afternoon is not taking up
 * a space at eleven in the morning, and counting them would turn a normal day
 * into a capacity warning.
 */
export function summariseFloor(payload: DaycareDayPayload | undefined) {
  const visits = payload?.visits ?? [];
  const present = visits.filter((v) => v.status === "checked-in");

  const bySize: Partial<Record<PetSize, number>> = {};
  for (const visit of present) {
    bySize[visit.petSize] = (bySize[visit.petSize] ?? 0) + 1;
  }

  const total = payload?.capacity.total ?? 0;
  return {
    present: present.length,
    scheduled: visits.filter((v) => v.status === "scheduled").length,
    goneHome: visits.filter((v) => v.status === "checked-out").length,
    capacity: total,
    percentage: total > 0 ? Math.round((present.length / total) * 100) : 0,
    bySize,
    capacityBySize: payload?.capacity.bySize ?? {},
  };
}

function useFloorInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: daycareKeys.all });
    // A visit is the daycare half of a BOOKING, so anything showing bookings
    // is now out of date too.
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
  };
}

/** A dog arrives. Pressing it twice does not move the arrival time. */
export function useDaycareCheckIn() {
  const invalidate = useFloorInvalidation();
  return useMutation({
    mutationFn: async (input: {
      bookingRef: number;
      rateType?: string;
      playGroup?: string;
      notes?: string;
    }) => {
      const response = await fetch("/api/daycare/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const parsed = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(parsed?.error ?? "Could not check that dog in.");
      }
      return input.bookingRef;
    },
    onSuccess: invalidate,
  });
}

/**
 * A dog goes home — or the note about its day changes.
 *
 * `checkOut` stamps a time; the status follows from it, because the column is
 * generated and refuses to be written. `reopen` clears it, for the pickup that
 * turned out to be the wrong dog.
 */
export function useDaycareVisitUpdate() {
  const invalidate = useFloorInvalidation();
  return useMutation({
    mutationFn: async (input: {
      bookingRef: number;
      checkOut?: boolean;
      reopen?: boolean;
      playGroup?: string | null;
      notes?: string;
      rateType?: string;
    }) => {
      const { bookingRef, ...patch } = input;
      const response = await fetch(`/api/daycare/attendance/${bookingRef}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        const parsed = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(parsed?.error ?? "Could not update that visit.");
      }
      return bookingRef;
    },
    onSuccess: invalidate,
  });
}
