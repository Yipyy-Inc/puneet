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

// ============================================================================
// Phase 2: time off and shift swaps.
//
// ── THE EMBEDS ARE TO-ONE, SO THEY ARE OBJECTS ────────────────────────────
//
// `staff!staff_id(...)` and `profiles!reviewed_by(...)` come back as an OBJECT,
// not a one-element array. Reading one as `row.staff?.[0]` yields undefined for
// every row with no error anywhere — which is how the Daily Care board came
// back empty on 2026-08-20. Typed as objects here so the compiler holds it.
//
// ── LEAVE IS DATES. A SWAP IS SHIFTS, AND SHIFTS ARE INSTANTS ─────────────
//
// `starts_on`/`ends_on` are already the calendar days the screen draws, so they
// pass straight through. The shift times inside a swap do NOT: they are
// instants and need the facility's timezone, the same conversion `toShift`
// does, or a Saturday swap reads as a Friday one five timezones away.
// ============================================================================

export type TimeOffType =
  | "vacation"
  | "sick_leave"
  | "personal"
  | "bereavement"
  | "parental"
  | "unpaid"
  | "other";

/** `cancelled` is the requester withdrawing; `denied` is somebody refusing. */
export type RequestStatus = "pending" | "approved" | "denied" | "cancelled";

interface StaffName {
  first_name: string | null;
  last_name: string | null;
}

function fullName(who: StaffName | null | undefined): string {
  const name = [who?.first_name, who?.last_name].filter(Boolean).join(" ");
  return name || "Unknown";
}

export interface TimeOffRow {
  id: string;
  staff_id: string;
  type: TimeOffType;
  starts_on: string;
  ends_on: string;
  reason: string;
  status: RequestStatus;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  staff: StaffName | null;
  reviewer: { full_name: string | null } | null;
}

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: TimeOffType;
  /** `YYYY-MM-DD`, inclusive at both ends — the 14th to the 14th is one day. */
  startDate: string;
  endDate: string;
  reason: string;
  status: RequestStatus;
  requestedAt: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export function toTimeOffRequest(row: TimeOffRow): TimeOffRequest {
  return {
    id: row.id,
    employeeId: row.staff_id,
    employeeName: fullName(row.staff),
    type: row.type,
    startDate: row.starts_on,
    endDate: row.ends_on,
    reason: row.reason,
    status: row.status,
    requestedAt: row.requested_at,
    reviewedBy: row.reviewed_by ?? undefined,
    // The reviewer is a PROFILE, and a facility's members can read each
    // other's. Falling back to the raw `user_01…` id would put a WorkOS
    // identifier on screen where a name belongs, so it is left absent instead.
    reviewedByName: row.reviewer?.full_name ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewNotes: row.review_notes ?? undefined,
  };
}

interface ShiftWindow {
  starts_at: string;
  ends_at: string;
}

export interface SwapRow {
  id: string;
  requesting_shift_id: string;
  requesting_staff_id: string;
  target_staff_id: string;
  target_shift_id: string | null;
  reason: string;
  status: RequestStatus;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  requester: StaffName | null;
  target: StaffName | null;
  reviewer: { full_name: string | null } | null;
  requesting_shift: ShiftWindow | null;
  target_shift: ShiftWindow | null;
}

export interface SwapRequest {
  id: string;
  requestingEmployeeId: string;
  requestingEmployeeName: string;
  requestingShiftId: string;
  requestingShiftDate: string;
  requestingShiftTime: string;
  targetEmployeeId: string;
  targetEmployeeName: string;
  /** Absent on a HAND-OFF — the requester gives their shift up, gets none back. */
  targetShiftId?: string;
  targetShiftDate?: string;
  targetShiftTime?: string;
  reason: string;
  status: RequestStatus;
  requestedAt: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

function shiftLabel(
  window: ShiftWindow | null | undefined,
  timeZone: string,
): { date: string; time: string } | null {
  if (!window) return null;
  const start = wallClockParts(window.starts_at, timeZone);
  const end = wallClockParts(window.ends_at, timeZone);
  return { date: start.date, time: `${start.time} – ${end.time}` };
}

export function toSwapRequest(row: SwapRow, timeZone: string): SwapRequest {
  const requesting = shiftLabel(row.requesting_shift, timeZone);
  const target = shiftLabel(row.target_shift, timeZone);

  return {
    id: row.id,
    requestingEmployeeId: row.requesting_staff_id,
    requestingEmployeeName: fullName(row.requester),
    requestingShiftId: row.requesting_shift_id,
    requestingShiftDate: requesting?.date ?? "",
    requestingShiftTime: requesting?.time ?? "",
    targetEmployeeId: row.target_staff_id,
    targetEmployeeName: fullName(row.target),
    targetShiftId: row.target_shift_id ?? undefined,
    targetShiftDate: target?.date,
    targetShiftTime: target?.time,
    reason: row.reason,
    status: row.status,
    requestedAt: row.requested_at,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedByName: row.reviewer?.full_name ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewNotes: row.review_notes ?? undefined,
  };
}

// ============================================================================
// Availability: the weekly pattern, and a proposal to change it.
//
// ── DAY ZERO IS SUNDAY ────────────────────────────────────────────────────
//
// Matching `Date.getDay()`, which every screen reading this already uses. The
// column carries the same convention on purpose — an ISO-8601 week here would
// put a silent off-by-one between the table and the calendar.
//
// ── `time` COLUMNS ARRIVE AS `HH:MM:SS` ───────────────────────────────────
//
// The screens work in `HH:MM`. Trimmed here rather than at each of them, so a
// window cannot render as "07:00:00 – 18:00:00" on one screen and "07:00" on
// the next.
// ============================================================================

export interface AvailabilityDayRow {
  day_of_week: number;
  is_available: boolean;
  available_from: string | null;
  available_to: string | null;
  notes: string | null;
}

export interface AvailabilityDay {
  dayOfWeek: number;
  isAvailable: boolean;
  /** Absent while available means ALL DAY, not "no hours". */
  startTime?: string;
  endTime?: string;
  notes?: string;
}

/** `07:00:00` → `07:00`. */
function clockTime(value: string | null): string | undefined {
  return value ? value.slice(0, 5) : undefined;
}

export function toAvailabilityDay(row: AvailabilityDayRow): AvailabilityDay {
  return {
    dayOfWeek: row.day_of_week,
    isAvailable: row.is_available,
    startTime: clockTime(row.available_from),
    endTime: clockTime(row.available_to),
    notes: row.notes ?? undefined,
  };
}

/**
 * A whole week, with the days nobody has said anything about filled in.
 *
 * A person with no rows is not a person who never works — it is a person who
 * has not told anybody yet, and the conflict checker treats a missing day as
 * "no opinion" rather than "unavailable". Returning a partial week would make
 * that distinction depend on which screen was asking.
 */
export function toAvailabilityWeek(
  rows: AvailabilityDayRow[],
): AvailabilityDay[] {
  const byDay = new Map(rows.map((row) => [row.day_of_week, row]));
  return Array.from({ length: 7 }, (_, day) => {
    const row = byDay.get(day);
    return row
      ? toAvailabilityDay(row)
      : // No row means unstated. `isAvailable: true` with no window is the
        // neutral reading — it produces no conflict either way, where `false`
        // would flag every shift for everybody who has not filled this in.
        { dayOfWeek: day, isAvailable: true };
  });
}

export interface AvailabilityRequestRow {
  id: string;
  staff_id: string;
  previous: AvailabilityDay[];
  proposed: AvailabilityDay[];
  effective_from: string;
  reason: string;
  status: RequestStatus;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  staff: StaffName | null;
  reviewer: { full_name: string | null } | null;
}

export interface AvailabilityRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  /** The pattern as it stood when this was filed — not the live one. */
  currentAvailability: AvailabilityDay[];
  proposedAvailability: AvailabilityDay[];
  effectiveFrom: string;
  reason: string;
  status: RequestStatus;
  requestedAt: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export function toAvailabilityRequest(
  row: AvailabilityRequestRow,
): AvailabilityRequest {
  return {
    id: row.id,
    employeeId: row.staff_id,
    employeeName: fullName(row.staff),
    currentAvailability: row.previous ?? [],
    proposedAvailability: row.proposed ?? [],
    effectiveFrom: row.effective_from,
    reason: row.reason,
    status: row.status,
    requestedAt: row.requested_at,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedByName: row.reviewer?.full_name ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewNotes: row.review_notes ?? undefined,
  };
}

// ============================================================================
// The time clock.
//
// ── `clockedOutAt` ABSENT MEANS ON THE CLOCK ──────────────────────────────
//
// Not a boolean beside it — one fact, one place. `minutesWorked` is absent for
// the same reason and is NOT zero: an unfinished session has no duration yet,
// and a zero would render as "worked no time".
//
// ── AND IT IS AN INSTANT, NOT A WALL-CLOCK TIME ───────────────────────────
//
// Unlike a shift, which is planned in the facility's own clock and stored as a
// range, a clock-in is a moment that happened. It stays an ISO instant all the
// way to the screen, which formats it in whatever zone it is showing.
// ============================================================================

export interface ClockEntryRow {
  id: string;
  staff_id: string;
  shift_id: string | null;
  clocked_in_at: string;
  clocked_out_at: string | null;
  source: "self" | "manager";
  notes: string | null;
  minutes_worked: number | null;
  staff: StaffName | null;
}

export interface ClockEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  /** Absent when somebody is working without a rostered shift — they cover. */
  shiftId?: string;
  clockedInAt: string;
  /** Absent means ON THE CLOCK right now. */
  clockedOutAt?: string;
  /** Absent while open. Never zero — a zero is a claim about time worked. */
  minutesWorked?: number;
  /** Who stamped it. A correction and a worked session are different facts. */
  source: "self" | "manager";
  notes?: string;
}

export function toClockEntry(row: ClockEntryRow): ClockEntry {
  return {
    id: row.id,
    employeeId: row.staff_id,
    employeeName: fullName(row.staff),
    shiftId: row.shift_id ?? undefined,
    clockedInAt: row.clocked_in_at,
    clockedOutAt: row.clocked_out_at ?? undefined,
    minutesWorked: row.minutes_worked ?? undefined,
    source: row.source,
    notes: row.notes ?? undefined,
  };
}
