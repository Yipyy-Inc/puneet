"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { schedulingQueries } from "@/lib/api/scheduling";
import { usePermission } from "@/hooks/use-facility-rbac";
import { useFacilityViewer } from "@/hooks/use-facility-rbac";
import type { Schedule, ScheduleStatus } from "@/types/staff";

// ============================================================================
// Section 5E — an employee's own shifts.
//
// ── WHAT THIS REPLACES, AND WHY IT MATTERED MORE THAN THE OTHERS ──────────
//
// Until 2026-08-21 this filtered `scheduleShifts` — the fixture — by the
// VIEWER's id. `/employee/schedule` is the landing path for every staff member
// in the product (see `landingPathForClaims`), so the first screen a groomer
// saw after signing in was invented data, while the clock they punched and the
// payroll built from it were real rows in Postgres. They clocked in against a
// shift that did not exist.
//
// The identity filter was wrong twice over: `s.employeeId` held fixture `fs-*`
// ids and `viewer.id` is an identity id, so the comparison was between two
// namespaces that never had a value in common.
//
// ── WHICH IS WHY THE FILTER IS NOW THE SERVER'S JOB ───────────────────────
//
// `?mine=1` resolves the caller's staff row from their membership and filters
// there. Re-deriving "who am I" in the browser is what produced the bug; doing
// it once, server-side, means "mine" cannot mean two things.
//
// ── THE WINDOW, AND WHOSE "TODAY" DECIDES ─────────────────────────────────
//
// The endpoint requires a bounded window on purpose. This asks for a day of
// slack behind and ninety ahead: the slack absorbs the gap between the
// browser's date and the facility's, and the precise cut to "upcoming" is then
// made in the FACILITY's timezone using the one the payload carries.
//
// Grading a shift against the reader's clock is exactly the bug that put night
// shifts on the wrong day in the attendance view. A staff member travelling, or
// simply a facility an hour ahead, must not lose today's shift off the top of
// their own screen.
// ============================================================================

/** How far ahead "my upcoming shifts" reaches. */
const HORIZON_DAYS = 90;

/**
 * A shift as the employee screen renders it.
 *
 * `Schedule.id` is a NUMBER the legacy view uses as a display key, so the real
 * `staff_shifts.id` travels beside it. Anything that acts on a shift — offering
 * it for swap, above all — needs the uuid; the numeric one addresses nothing.
 */
export interface MyShift extends Schedule {
  shiftId: string;
}

function statusFor(shiftStatus: string): ScheduleStatus {
  return shiftStatus === "published" ? "confirmed" : "scheduled";
}

/** `YYYY-MM-DD`, `offset` days from now, in the browser's own reckoning. */
function browserDay(offset: number): string {
  const d = new Date(Date.now() + offset * 86_400_000);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/** `YYYY-MM-DD` for right now, as the FACILITY reckons the date. */
function facilityToday(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * The signed-in employee's own upcoming shifts, soonest first.
 *
 * Returns `isPending` because the screen must not render "no upcoming shifts"
 * while the request is still in flight — an empty state shown during a load is
 * a claim about the roster that nobody checked.
 */
export function useMyShifts(): {
  shifts: MyShift[];
  isPending: boolean;
  error: Error | null;
} {
  const { viewer } = useFacilityViewer();

  const from = browserDay(-1);
  const to = browserDay(HORIZON_DAYS);

  const { data, isPending, error } = useQuery(
    schedulingQueries.myShifts(from, to),
  );

  // The org chart, for the position NAME. A shift carries a `positionId`; the
  // label lives on the position. Its own query, cached for five minutes, so
  // this costs nothing on a screen that already has the roster loaded.
  const { data: structure } = useQuery(schedulingQueries.structure());

  const positionName = useMemo(
    () => new Map((structure?.positions ?? []).map((p) => [p.id, p.name])),
    [structure],
  );

  const shifts = useMemo(() => {
    if (!data) return [];
    const today = facilityToday(data.timeZone);

    return data.shifts
      .filter((s) => s.status !== "cancelled" && s.date >= today)
      .map((s, index) => ({
        shiftId: s.id,
        id: index + 1,
        staffId: s.employeeId ?? "",
        staffName: `${viewer.firstName} ${viewer.lastName}`,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        role: positionName.get(s.positionId) ?? "Staff",
        // Never rendered on this screen, and there is no facility name on the
        // viewer to put here. It used to say "Yipyy" — the PLATFORM's name, not
        // the facility's — which would have been a lie the moment anything drew
        // it. Empty is the honest placeholder until a real source exists.
        facility: "",
        status: statusFor(s.status),
        notes: s.notes ?? undefined,
      }))
      .sort((a, b) =>
        a.date === b.date
          ? a.startTime.localeCompare(b.startTime)
          : a.date.localeCompare(b.date),
      );
  }, [data, positionName, viewer.firstName, viewer.lastName]);

  return { shifts, isPending, error: error as Error | null };
}

/**
 * Whether the schedule screen may show anything beyond the viewer's own
 * shifts (the roster, other people's coverage). Kept here so the view reads it
 * from one place.
 */
export function useCanViewAllSchedules(): boolean {
  return usePermission("scheduling_view_all");
}
