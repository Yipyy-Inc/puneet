"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SchedulingStructure } from "@/app/api/scheduling/structure/route";
import type { ShiftsPayload } from "@/app/api/scheduling/shifts/route";
import type { ScheduleShift } from "@/types/scheduling";

// ============================================================================
// The roster, from Postgres.
//
// Replaces the four fixtures RosterView imported directly — `departments`,
// `positions`, `scheduleEmployees` and `scheduleShifts` from
// src/data/scheduling.ts. The employees come from `/api/staff`, because
// employees were always real; only the roster around them was not.
// ============================================================================

export const schedulingKeys = {
  structure: ["scheduling", "structure"] as const,
  shifts: (from: string, to: string) =>
    ["scheduling", "shifts", from, to] as const,
};

async function read<T>(url: string, fallback: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error ?? fallback);
  }
  return (await response.json()) as T;
}

export const schedulingQueries = {
  /** Departments and positions. Pay is included only if the caller may see it. */
  structure: () => ({
    queryKey: schedulingKeys.structure,
    queryFn: () =>
      read<SchedulingStructure>(
        "/api/scheduling/structure",
        "Could not read the departments.",
      ),
    // An org chart changes about once a quarter.
    staleTime: 5 * 60_000,
  }),

  /**
   * The shifts in a window.
   *
   * The window is part of the key, so stepping the roster forward a week is a
   * new query rather than a refetch that discards the week you are looking at.
   */
  shifts: (from: string, to: string) => ({
    queryKey: schedulingKeys.shifts(from, to),
    queryFn: () =>
      read<ShiftsPayload>(
        `/api/scheduling/shifts?from=${from}&to=${to}`,
        "Could not read the roster.",
      ),
    staleTime: 30_000,
  }),
};

export interface NewShift {
  employeeId?: string | null;
  departmentId: string;
  positionId: string;
  /** `YYYY-MM-DD`, on the facility's clock. */
  date: string;
  /** `HH:MM`. An end at or before the start is an overnight shift. */
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  notes?: string | null;
  status?: ScheduleShift["status"];
  requiredSkills?: string[];
  urgent?: boolean;
  slots?: number;
}

export function useCreateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shift: NewShift): Promise<ScheduleShift> => {
      const response = await fetch("/api/scheduling/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shift),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(body.error ?? "That shift was not saved.");
      }
      return body as unknown as ScheduleShift;
    },
    // Every window, because a new shift lands in whichever one is on screen and
    // the caller does not know which windows are cached.
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["scheduling", "shifts"],
      }),
  });
}

/** True when the caller may see what a position pays. */
export function useCanSeePay(): boolean {
  const { data } = useQuery(schedulingQueries.structure());
  return data?.canSeePay ?? false;
}
