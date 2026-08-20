import { instantFromWallClock, wallClockParts } from "@/lib/time/facility-time";
import type {
  Department,
  Position,
  ScheduleShift,
  ShiftStatus,
} from "@/types/scheduling";

// ============================================================================
// Between the roster's vocabulary and the tables'.
//
// ── A SHIFT IS STORED AS AN INSTANT AND DRAWN AS A CLOCK TIME ─────────────
//
// `staff_shifts` keeps `starts_at`/`ends_at timestamptz`, the same shape
// `bookings` uses: an overnight shift is not a special case, and "is this
// person already working then" is a range comparison the database can hold.
//
// The roster draws a day and two clock times. This is the only place that
// converts, using the facility's own timezone — the same pair of helpers the
// booking mapper uses, so a shift and a booking on the same screen cannot
// disagree about what "Tuesday, 09:00" means.
//
// ── THE PAY IS NOT PART OF A POSITION HERE ────────────────────────────────
//
// `Position` in the app type carries `hourlyRate`, `salary` and `payType`, and
// the row does not — pay is a separate table with its own policy, because RLS
// cannot hide a column. So `toPosition` takes the pay as a SECOND ARGUMENT,
// which is `null` for a caller without `scheduling_view_labor_cost`.
//
// That shape is deliberate: a caller who is not allowed to see pay gets a
// Position with `payType: "hourly"` and no figures, rather than a zero. A zero
// is a wage.
// ============================================================================

export interface DepartmentRow {
  id: string;
  facility_id: string;
  name: string;
  color: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PositionRow {
  id: string;
  facility_id: string;
  department_id: string;
  name: string;
  color: string;
  description: string | null;
  is_active: boolean;
}

export interface PositionPayRow {
  position_id: string;
  pay_type: "hourly" | "salary";
  hourly_rate: string | number | null;
  salary: string | number | null;
}

export interface ShiftRow {
  id: string;
  staff_id: string | null;
  department_id: string;
  position_id: string;
  starts_at: string;
  ends_at: string;
  break_minutes: number;
  notes: string | null;
  status: ShiftStatus;
  recurrence_id: string | null;
  required_skills: string[] | null;
  urgent: boolean;
  slots: number;
}

/**
 * `Department.employeeIds` comes from the join table, not the department row.
 *
 * Passed in rather than looked up so one query fills every department, instead
 * of one query per department — a facility with a dozen of them would otherwise
 * make a dozen round trips to draw one screen.
 */
export function toDepartment(
  row: DepartmentRow,
  employeeIds: string[],
  legacyFacilityRef: number,
): Department {
  return {
    id: row.id,
    name: row.name,
    // The app type says `number`, and the row's facility is a uuid. This is a
    // LABEL — nothing filters on it, exactly as `Booking.facilityId` is — and it
    // goes when the scheduling types take the uuid.
    facilityId: legacyFacilityRef,
    color: row.color,
    description: row.description ?? undefined,
    employeeIds,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export function toPosition(
  row: PositionRow,
  pay: PositionPayRow | null,
): Position {
  return {
    id: row.id,
    name: row.name,
    departmentId: row.department_id,
    color: row.color,
    description: row.description ?? undefined,
    isActive: row.is_active,
    // Without the labour-cost permission there is no pay row, and the figures
    // are ABSENT rather than zero. `hourly` is the neutral default for a shape
    // that has to name one.
    payType: pay?.pay_type ?? "hourly",
    hourlyRate: pay?.hourly_rate != null ? Number(pay.hourly_rate) : undefined,
    salary: pay?.salary != null ? Number(pay.salary) : undefined,
  };
}

export function toShift(row: ShiftRow, timeZone: string): ScheduleShift {
  const start = wallClockParts(row.starts_at, timeZone);
  const end = wallClockParts(row.ends_at, timeZone);

  return {
    id: row.id,
    // undefined, not null: the app type spells an open shift that way, and
    // `employeeId: null` would render as a person called null.
    employeeId: row.staff_id ?? undefined,
    departmentId: row.department_id,
    positionId: row.position_id,
    // The day a shift BELONGS to is the day it starts on. An overnight shift
    // finishing at 02:00 is Tuesday's shift, not Wednesday's, and the roster
    // groups by this.
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    breakMinutes: row.break_minutes,
    notes: row.notes ?? undefined,
    status: row.status,
    recurrenceId: row.recurrence_id ?? undefined,
    requiredSkills: row.required_skills ?? undefined,
    urgent: row.urgent,
    slots: row.slots,
  };
}

/**
 * A shift's clock times, back into instants.
 *
 * `endTime <= startTime` means it runs past midnight, so the end takes the next
 * day. Getting this wrong is not a rendering bug: it makes a night shift a
 * negative duration, which the `ends_at > starts_at` constraint then refuses —
 * loudly, which is the good version.
 */
export function shiftInstants(
  date: string,
  startTime: string,
  endTime: string,
  timeZone: string,
): { starts_at: string; ends_at: string } {
  const startsAt = instantFromWallClock(date, startTime, timeZone);

  const endDate = new Date(`${date}T00:00:00Z`);
  if (endTime <= startTime) endDate.setUTCDate(endDate.getUTCDate() + 1);

  return {
    starts_at: startsAt,
    ends_at: instantFromWallClock(
      endDate.toISOString().slice(0, 10),
      endTime,
      timeZone,
    ),
  };
}
