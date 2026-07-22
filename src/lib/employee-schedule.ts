"use client";

import { useMemo } from "react";
import { positions, scheduleShifts } from "@/data/scheduling";
import { useFacilityViewer } from "@/hooks/use-facility-rbac";
import { usePermission } from "@/hooks/use-facility-rbac";
import type { Schedule, ScheduleStatus } from "@/types/staff";

// ============================================================================
// Section 5E — an employee's own shifts.
//
// Facility staff are schedulable employees under their own `fs-*` ids (see the
// derivation in src/data/scheduling.ts), so "my shifts" is an identity filter
// on the real shift data rather than a mapping between id namespaces.
//
// The scheduling module's ScheduleShift is adapted to the `Schedule` shape the
// employee schedule view renders. The synthesized numeric `id` is stable for a
// given shift because scheduleShifts is generated once at module load.
// ============================================================================

const POSITION_NAME = new Map(positions.map((p) => [p.id, p.name]));

function statusFor(shiftStatus: string): ScheduleStatus {
  return shiftStatus === "published" ? "confirmed" : "scheduled";
}

/**
 * The signed-in employee's shifts, newest-first by date/start.
 *
 * A viewer with `scheduling_view_all` still gets only their own shifts here —
 * this powers the personal "My Schedule" screen. The full roster lives in the
 * scheduling module's own view.
 */
export function useMyShifts(): Schedule[] {
  const { viewer } = useFacilityViewer();
  const viewerId = viewer.id;

  return useMemo(() => {
    return scheduleShifts
      .filter((s) => s.employeeId === viewerId && s.status !== "cancelled")
      .map((s, index) => ({
        id: index + 1,
        staffId: 0,
        staffName: `${viewer.firstName} ${viewer.lastName}`,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        role: POSITION_NAME.get(s.positionId) ?? "Staff",
        facility: "Yipyy",
        status: statusFor(s.status),
      }))
      .sort((a, b) =>
        a.date === b.date
          ? a.startTime.localeCompare(b.startTime)
          : a.date.localeCompare(b.date),
      );
  }, [viewerId, viewer.firstName, viewer.lastName]);
}

/**
 * Whether the schedule screen may show anything beyond the viewer's own
 * shifts (the roster, other people's coverage). Kept here so the view reads it
 * from one place.
 */
export function useCanViewAllSchedules(): boolean {
  return usePermission("scheduling_view_all");
}
