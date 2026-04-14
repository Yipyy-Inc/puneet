import { computeShiftHours } from "@/lib/scheduling-utils";
import type {
  ScheduleShift,
  ScheduleEmployee,
  EmployeeAvailability,
  EnhancedTimeOffRequest,
  SchedulingSettings,
} from "@/types/scheduling";

// ============================================================================
// Conflict-detection engine
// ============================================================================
//
// Each check produces zero or more `Conflict` entries. Callers can filter by
// severity to decide whether to block (error) or warn. Functions are pure —
// they never read from the network or globals; all inputs are passed in.

export type ConflictSeverity = "error" | "warning" | "info";

export type ConflictKind =
  | "double_booking"
  | "outside_availability"
  | "time_off_conflict"
  | "over_max_weekly_hours"
  | "under_min_weekly_hours"
  | "overtime_risk"
  | "insufficient_rest"
  | "consecutive_days"
  | "position_mismatch"
  | "department_mismatch"
  | "missing_skill"
  | "inactive_employee";

export interface Conflict {
  kind: ConflictKind;
  severity: ConflictSeverity;
  message: string;
  /** Optional linked shift id — for double-book / rest-rule conflicts */
  otherShiftId?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Combine a date (YYYY-MM-DD) and time (HH:mm) into a Date. */
function toDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

function weekKey(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return d.toISOString().split("T")[0];
}

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// ─── Individual checks ──────────────────────────────────────────────────────

/** Employee is active / not terminated. */
function checkEmployeeActive(employee: ScheduleEmployee): Conflict | null {
  if (employee.status === "active" || employee.status === "onboarding")
    return null;
  return {
    kind: "inactive_employee",
    severity: "error",
    message: `${employee.name} is ${employee.status.replace("_", " ")} — cannot be scheduled.`,
  };
}

/** Shift's position belongs to a department this employee is part of. */
function checkDepartmentMatch(
  shift: Pick<ScheduleShift, "departmentId" | "positionId">,
  employee: ScheduleEmployee,
): Conflict | null {
  if (employee.departmentIds.includes(shift.departmentId)) return null;
  return {
    kind: "department_mismatch",
    severity: "warning",
    message: `${employee.name} is not a member of this department.`,
  };
}

function checkPositionMatch(
  shift: Pick<ScheduleShift, "positionId">,
  employee: ScheduleEmployee,
): Conflict | null {
  if (employee.positionIds.includes(shift.positionId)) return null;
  return {
    kind: "position_mismatch",
    severity: "warning",
    message: `${employee.name} is not qualified for this position.`,
  };
}

/** Employee holds every skill the shift requires. */
function checkSkillMatch(
  shift: Pick<ScheduleShift, "requiredSkills">,
  employee: ScheduleEmployee,
): Conflict | null {
  const required = shift.requiredSkills ?? [];
  if (required.length === 0) return null;
  const held = new Set(employee.skills ?? []);
  const missing = required.filter((s) => !held.has(s));
  if (missing.length === 0) return null;
  return {
    kind: "missing_skill",
    severity: "error",
    message: `Missing required ${missing.length === 1 ? "skill" : "skills"}: ${missing.join(", ")}.`,
  };
}

/** Shift falls inside employee's weekly availability window. */
function checkAvailability(
  shift: Pick<ScheduleShift, "date" | "startTime" | "endTime">,
  availability: EmployeeAvailability | undefined,
  employee: ScheduleEmployee,
): Conflict | null {
  if (!availability) return null;
  const day = new Date(`${shift.date}T12:00:00`).getDay();
  const slot = availability.weeklyAvailability.find((d) => d.dayOfWeek === day);
  if (!slot) return null;
  if (!slot.isAvailable) {
    return {
      kind: "outside_availability",
      severity: "error",
      message: `${employee.name} is unavailable on this day.`,
    };
  }
  if (slot.startTime && slot.endTime) {
    const avStart = toMinutes(slot.startTime);
    const avEnd = toMinutes(slot.endTime);
    const shStart = toMinutes(shift.startTime);
    const shEnd = toMinutes(shift.endTime);
    if (shStart < avStart || shEnd > avEnd) {
      return {
        kind: "outside_availability",
        severity: "warning",
        message: `Shift (${shift.startTime}–${shift.endTime}) is outside ${employee.name}'s availability (${slot.startTime}–${slot.endTime}).`,
      };
    }
  }
  return null;
}

/** Employee has an approved time-off request overlapping the shift date. */
function checkTimeOff(
  shift: Pick<ScheduleShift, "date">,
  employeeId: string,
  timeOffRequests: EnhancedTimeOffRequest[],
): Conflict | null {
  const hit = timeOffRequests.find(
    (r) =>
      r.employeeId === employeeId &&
      (r.status === "approved" || r.status === "pending") &&
      r.startDate <= shift.date &&
      r.endDate >= shift.date,
  );
  if (!hit) return null;
  return {
    kind: "time_off_conflict",
    severity: hit.status === "approved" ? "error" : "warning",
    message:
      hit.status === "approved"
        ? `Overlaps approved ${hit.type.replace("_", " ")} (${hit.startDate}${hit.startDate === hit.endDate ? "" : ` – ${hit.endDate}`}).`
        : `Overlaps pending ${hit.type.replace("_", " ")} request.`,
  };
}

/** Employee is already scheduled at an overlapping time on the same date. */
function checkDoubleBooking(
  shift: ScheduleShift | (Omit<ScheduleShift, "id"> & { id?: string }),
  employeeId: string,
  allShifts: ScheduleShift[],
): Conflict | null {
  const shStart = toMinutes(shift.startTime);
  const shEnd = toMinutes(shift.endTime);
  const conflict = allShifts.find((s) => {
    if (s.id === (shift as ScheduleShift).id) return false;
    if (s.employeeId !== employeeId) return false;
    if (s.date !== shift.date) return false;
    if (s.status === "cancelled") return false;
    return rangesOverlap(
      shStart,
      shEnd,
      toMinutes(s.startTime),
      toMinutes(s.endTime),
    );
  });
  if (!conflict) return null;
  return {
    kind: "double_booking",
    severity: "error",
    message: `Already scheduled ${conflict.startTime}–${conflict.endTime} this day.`,
    otherShiftId: conflict.id,
  };
}

/** Rest-rule: fewer than settings.minTimeBetweenShifts hours between shifts. */
function checkRestRules(
  shift: Omit<ScheduleShift, "id"> & { id?: string },
  employeeId: string,
  allShifts: ScheduleShift[],
  settings: Pick<SchedulingSettings, "minTimeBetweenShifts">,
): Conflict | null {
  const minHours = settings.minTimeBetweenShifts;
  if (!minHours || minHours <= 0) return null;
  const shStart = toDateTime(shift.date, shift.startTime);
  const shEnd = toDateTime(shift.date, shift.endTime);
  for (const s of allShifts) {
    if (s.id === (shift as ScheduleShift).id) continue;
    if (s.employeeId !== employeeId) continue;
    if (s.status === "cancelled") continue;
    const sStart = toDateTime(s.date, s.startTime);
    const sEnd = toDateTime(s.date, s.endTime);
    // ends-before-shift gap
    if (sEnd <= shStart) {
      const gapHrs = (shStart.getTime() - sEnd.getTime()) / 3_600_000;
      if (gapHrs < minHours) {
        return {
          kind: "insufficient_rest",
          severity: "warning",
          message: `Only ${gapHrs.toFixed(1)}h rest after prior shift (min ${minHours}h).`,
          otherShiftId: s.id,
        };
      }
    }
    // starts-after-shift gap
    if (sStart >= shEnd) {
      const gapHrs = (sStart.getTime() - shEnd.getTime()) / 3_600_000;
      if (gapHrs < minHours) {
        return {
          kind: "insufficient_rest",
          severity: "warning",
          message: `Only ${gapHrs.toFixed(1)}h rest before next shift (min ${minHours}h).`,
          otherShiftId: s.id,
        };
      }
    }
  }
  return null;
}

/** Weekly hours with this new shift added. */
function checkWeeklyHours(
  shift: Omit<ScheduleShift, "id"> & { id?: string },
  employee: ScheduleEmployee,
  allShifts: ScheduleShift[],
  settings: Pick<SchedulingSettings, "overtimeThresholdWeekly">,
): Conflict[] {
  const week = weekKey(shift.date);
  const weekShifts = allShifts.filter(
    (s) =>
      s.employeeId === employee.id &&
      s.status !== "cancelled" &&
      s.id !== (shift as ScheduleShift).id &&
      weekKey(s.date) === week,
  );
  const existingHours = weekShifts.reduce(
    (sum, s) => sum + computeShiftHours(s.startTime, s.endTime, s.breakMinutes),
    0,
  );
  const newHours = computeShiftHours(
    shift.startTime,
    shift.endTime,
    shift.breakMinutes,
  );
  const total = existingHours + newHours;

  const conflicts: Conflict[] = [];
  if (employee.maxHoursPerWeek && total > employee.maxHoursPerWeek) {
    conflicts.push({
      kind: "over_max_weekly_hours",
      severity: "error",
      message: `Would push ${employee.name} to ${total.toFixed(1)}h this week (max ${employee.maxHoursPerWeek}h).`,
    });
  }
  if (
    settings.overtimeThresholdWeekly &&
    total > settings.overtimeThresholdWeekly
  ) {
    const over = total - settings.overtimeThresholdWeekly;
    conflicts.push({
      kind: "overtime_risk",
      severity: "warning",
      message: `${over.toFixed(1)}h into overtime this week.`,
    });
  }
  return conflicts;
}

/** Flags when consecutive scheduled days exceed the limit. */
function checkConsecutiveDays(
  shift: Omit<ScheduleShift, "id"> & { id?: string },
  employeeId: string,
  allShifts: ScheduleShift[],
  settings: Pick<SchedulingSettings, "maxConsecutiveDays">,
): Conflict | null {
  const max = settings.maxConsecutiveDays;
  if (!max || max <= 0) return null;

  const dates = new Set(
    allShifts
      .filter(
        (s) =>
          s.employeeId === employeeId &&
          s.status !== "cancelled" &&
          s.id !== (shift as ScheduleShift).id,
      )
      .map((s) => s.date),
  );
  dates.add(shift.date);
  const sorted = Array.from(dates).sort();

  let streak = 1;
  let maxStreak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1]}T12:00:00`).getTime();
    const curr = new Date(`${sorted[i]}T12:00:00`).getTime();
    const dayDiff = Math.round((curr - prev) / 86_400_000);
    streak = dayDiff === 1 ? streak + 1 : 1;
    if (streak > maxStreak) maxStreak = streak;
  }
  if (maxStreak <= max) return null;
  return {
    kind: "consecutive_days",
    severity: "warning",
    message: `Would exceed ${max}-day consecutive limit (${maxStreak} days).`,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface ConflictCheckInput {
  shift: Omit<ScheduleShift, "id"> & { id?: string };
  employee: ScheduleEmployee;
  allShifts: ScheduleShift[];
  availability?: EmployeeAvailability;
  timeOffRequests: EnhancedTimeOffRequest[];
  settings: Pick<
    SchedulingSettings,
    "overtimeThresholdWeekly" | "minTimeBetweenShifts" | "maxConsecutiveDays"
  >;
}

/**
 * Run all conflict checks for a proposed shift assignment.
 * Returns conflicts sorted by severity (errors first).
 */
export function detectShiftConflicts(input: ConflictCheckInput): Conflict[] {
  const {
    shift,
    employee,
    allShifts,
    availability,
    timeOffRequests,
    settings,
  } = input;

  const checks: (Conflict | null)[] = [
    checkEmployeeActive(employee),
    checkDepartmentMatch(shift, employee),
    checkPositionMatch(shift, employee),
    checkSkillMatch(shift, employee),
    checkAvailability(shift, availability, employee),
    checkTimeOff(shift, employee.id, timeOffRequests),
    checkDoubleBooking(shift, employee.id, allShifts),
    checkRestRules(shift, employee.id, allShifts, settings),
    checkConsecutiveDays(shift, employee.id, allShifts, settings),
  ];

  const conflicts: Conflict[] = checks.filter((c): c is Conflict => c !== null);
  conflicts.push(...checkWeeklyHours(shift, employee, allShifts, settings));

  const order: Record<ConflictSeverity, number> = {
    error: 0,
    warning: 1,
    info: 2,
  };
  return conflicts.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function hasBlockingConflict(conflicts: Conflict[]): boolean {
  return conflicts.some((c) => c.severity === "error");
}

// ─── Eligibility helper for open-shift / assignment pickers ────────────────

export interface EligibilityResult {
  employee: ScheduleEmployee;
  conflicts: Conflict[];
  score: number;
}

/**
 * Rank a pool of employees for a shift. Lower score = better match.
 * Used by assignment pickers and open-shift eligibility lists.
 */
export function rankEmployeesForShift(
  pool: ScheduleEmployee[],
  baseInput: Omit<ConflictCheckInput, "employee" | "availability"> & {
    availabilities: EmployeeAvailability[];
  },
): EligibilityResult[] {
  const { availabilities, ...rest } = baseInput;
  return pool
    .map((employee) => {
      const availability = availabilities.find(
        (a) => a.employeeId === employee.id,
      );
      const conflicts = detectShiftConflicts({
        ...rest,
        employee,
        availability,
      });
      const score =
        conflicts.reduce((sum, c) => {
          if (c.severity === "error") return sum + 100;
          if (c.severity === "warning") return sum + 10;
          return sum + 1;
        }, 0) + (employee.status === "active" ? 0 : 50);
      return { employee, conflicts, score };
    })
    .sort((a, b) => a.score - b.score);
}
