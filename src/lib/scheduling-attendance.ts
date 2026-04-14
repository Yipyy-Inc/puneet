import { computeShiftHours } from "@/lib/scheduling-utils";
import type { ScheduleShift, TimeClockEntry } from "@/types/scheduling";

export type AttendanceStatus =
  | "on_time"
  | "late"
  | "early_departure"
  | "left_late"
  | "early_arrival"
  | "no_show"
  | "missing_clock_out"
  | "scheduled";

export interface AttendanceRecord {
  shift: ScheduleShift;
  entry: TimeClockEntry | null;
  status: AttendanceStatus;
  /** Minutes late (positive) or early (negative) at clock-in. null if no entry. */
  clockInDeltaMin: number | null;
  /** Minutes after scheduled end (positive = stayed late). */
  clockOutDeltaMin: number | null;
  scheduledHours: number;
  actualHours: number | null;
  /** Hours over scheduled — flagged for overtime cost review. */
  overtimeHours: number;
}

const LATE_THRESHOLD_MIN = 5;
const EARLY_DEPARTURE_THRESHOLD_MIN = 5;
const STAYED_LATE_THRESHOLD_MIN = 15;
const NO_SHOW_GRACE_MIN = 30;

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function diffMin(
  actualIso: string,
  scheduledDate: string,
  scheduledTime: string,
): number {
  const scheduled = new Date(`${scheduledDate}T${scheduledTime}:00`);
  const actual = new Date(actualIso);
  return Math.round((actual.getTime() - scheduled.getTime()) / 60_000);
}

/**
 * Reconcile a single shift against its time-clock entry.
 * `now` is used to decide whether unstarted shifts are no-shows yet.
 */
export function reconcileShift(
  shift: ScheduleShift,
  entry: TimeClockEntry | null,
  now: Date = new Date(),
): AttendanceRecord {
  const scheduledHours = computeShiftHours(
    shift.startTime,
    shift.endTime,
    shift.breakMinutes,
  );

  if (!entry) {
    // Decide if it's a no-show (scheduled start passed by grace) or just upcoming.
    const scheduledStart = new Date(`${shift.date}T${shift.startTime}:00`);
    const minutesPastStart =
      (now.getTime() - scheduledStart.getTime()) / 60_000;
    return {
      shift,
      entry: null,
      status: minutesPastStart > NO_SHOW_GRACE_MIN ? "no_show" : "scheduled",
      clockInDeltaMin: null,
      clockOutDeltaMin: null,
      scheduledHours,
      actualHours: null,
      overtimeHours: 0,
    };
  }

  const clockInDelta = entry.clockedInAt
    ? diffMin(entry.clockedInAt, shift.date, shift.startTime)
    : null;
  const clockOutDelta = entry.clockedOutAt
    ? diffMin(entry.clockedOutAt, shift.date, shift.endTime)
    : null;

  const actualHours = entry.actualMinutes ? entry.actualMinutes / 60 : null;
  const overtimeHours =
    actualHours !== null && actualHours > scheduledHours
      ? actualHours - scheduledHours
      : 0;

  let status: AttendanceStatus = "on_time";
  if (entry.clockedInAt && !entry.clockedOutAt) {
    // Still clocked in — only flag late arrival (departure check awaits clock-out)
    if (clockInDelta !== null && clockInDelta > LATE_THRESHOLD_MIN) {
      status = "late";
    }
    if (
      entry.clockedInAt &&
      !entry.clockedOutAt &&
      now.getTime() >
        new Date(`${shift.date}T${shift.endTime}:00`).getTime() + 15 * 60_000
    ) {
      status = "missing_clock_out";
    }
  } else if (clockInDelta !== null && clockInDelta > LATE_THRESHOLD_MIN) {
    status = "late";
  } else if (
    clockOutDelta !== null &&
    clockOutDelta < -EARLY_DEPARTURE_THRESHOLD_MIN
  ) {
    status = "early_departure";
  } else if (
    clockOutDelta !== null &&
    clockOutDelta > STAYED_LATE_THRESHOLD_MIN
  ) {
    status = "left_late";
  } else if (clockInDelta !== null && clockInDelta < -LATE_THRESHOLD_MIN) {
    status = "early_arrival";
  }

  return {
    shift,
    entry,
    status,
    clockInDeltaMin: clockInDelta,
    clockOutDeltaMin: clockOutDelta,
    scheduledHours,
    actualHours,
    overtimeHours,
  };
}

export interface ReconciliationSummary {
  total: number;
  onTime: number;
  late: number;
  noShow: number;
  earlyDeparture: number;
  leftLate: number;
  missingClockOut: number;
  totalScheduledHours: number;
  totalActualHours: number;
  totalOvertimeHours: number;
}

/**
 * Reconcile a batch of shifts against their entries and roll up summary metrics.
 */
export function reconcileBatch(
  shifts: ScheduleShift[],
  entries: TimeClockEntry[],
  now: Date = new Date(),
): { records: AttendanceRecord[]; summary: ReconciliationSummary } {
  const records = shifts
    .filter((s) => s.employeeId && s.status !== "cancelled")
    .map((s) => {
      const entry = entries.find((e) => e.shiftId === s.id) ?? null;
      return reconcileShift(s, entry, now);
    });

  const summary: ReconciliationSummary = {
    total: records.length,
    onTime: records.filter((r) => r.status === "on_time").length,
    late: records.filter((r) => r.status === "late").length,
    noShow: records.filter((r) => r.status === "no_show").length,
    earlyDeparture: records.filter((r) => r.status === "early_departure")
      .length,
    leftLate: records.filter((r) => r.status === "left_late").length,
    missingClockOut: records.filter((r) => r.status === "missing_clock_out")
      .length,
    totalScheduledHours: records.reduce((s, r) => s + r.scheduledHours, 0),
    totalActualHours: records.reduce((s, r) => s + (r.actualHours ?? 0), 0),
    totalOvertimeHours: records.reduce((s, r) => s + r.overtimeHours, 0),
  };

  return { records, summary };
}

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  on_time: "On time",
  late: "Late",
  early_departure: "Left early",
  left_late: "Stayed late",
  early_arrival: "Arrived early",
  no_show: "No-show",
  missing_clock_out: "Missing clock-out",
  scheduled: "Scheduled",
};
