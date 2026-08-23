import type { Tables } from "@/types/database";

// ============================================================================
// A schedule template -> what the templates screen reads.
//
// ── TIMES ARE LOCAL, AND STAY LOCAL ───────────────────────────────────────
//
// `start_time` and `end_time` are `time` columns with no date and no zone, and
// they are carried through as plain "HH:MM" strings. That is deliberate: a
// template line means "08:00 where the kennels are", and the only place it
// becomes an instant is `apply_schedule_template`, which converts it in the
// facility's own timezone.
//
// Turning them into `Date` objects here would attach the BROWSER's offset, and
// a manager in another timezone would see somebody else's morning shift start
// at seven. That is the same family as the UTC window that dropped every night
// shift out of its own day, which is in the debt map.
//
// ── `endsNextDay` IS DERIVED, NOT STORED ──────────────────────────────────
//
// An end at or before the start means the shift crosses midnight. The database
// reads it that way and so does this, rather than a column that could disagree
// with the times beside it.
// ============================================================================

export interface TemplateShiftRow {
  id: string;
  /** 0=Sunday … 6=Saturday, matching Postgres `extract(dow …)`. */
  dayOfWeek: number;
  /** Null is an OPEN shift — a slot the roster still has to fill. */
  staffId: string | null;
  staffName: string | null;
  departmentId: string;
  departmentName: string | null;
  positionId: string;
  positionName: string | null;
  /** "HH:MM" in the facility's own clock. Never converted here. */
  startTime: string;
  endTime: string;
  /** True when `endTime` is at or before `startTime`: a night shift. */
  endsNextDay: boolean;
  breakMinutes: number;
  slots: number;
  requiredSkills: string[];
  sortOrder: number;
}

export interface ScheduleTemplateRow {
  id: string;
  name: string;
  description: string | null;
  departmentId: string | null;
  departmentName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  shifts: TemplateShiftRow[];
  /** Weeks this template has already been applied to, newest first. */
  appliedWeeks: string[];
  /** Total hours the week asks for, ignoring breaks. Derived. */
  weeklyHours: number;
}

const NAMED = "id, name";

export const TEMPLATE_SELECT =
  "id, name, description, department_id, is_active, created_at, updated_at, " +
  "facility_departments:department_id(name), " +
  "schedule_template_shifts(id, day_of_week, staff_id, department_id, position_id, start_time, end_time, break_minutes, slots, required_skills, sort_order, " +
  `staff:staff_id(first_name, last_name), facility_departments:department_id(${NAMED}), facility_positions:position_id(${NAMED})), ` +
  "schedule_template_applications(week_start)";

interface NameEmbed {
  name: string;
}
interface StaffEmbed {
  first_name: string;
  last_name: string;
}

interface ShiftEmbed {
  id: string;
  day_of_week: number;
  staff_id: string | null;
  department_id: string;
  position_id: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  slots: number;
  required_skills: string[] | null;
  sort_order: number;
  staff?: StaffEmbed | StaffEmbed[] | null;
  facility_departments?: NameEmbed | NameEmbed[] | null;
  facility_positions?: NameEmbed | NameEmbed[] | null;
}

export type ScheduleTemplateRecord = Tables<"schedule_templates"> & {
  // A to-ONE relation: an object or null.
  facility_departments?: NameEmbed | NameEmbed[] | null;
  // to-MANY: genuinely arrays. Reading either as the other is how a board
  // empties or a list loses everything but its first row.
  schedule_template_shifts?: ShiftEmbed[] | null;
  schedule_template_applications?: { week_start: string }[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** "08:00:00" -> "08:00". Postgres returns seconds; nobody rosters by them. */
function hhmm(value: string): string {
  return value.slice(0, 5);
}

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function toTemplateShiftRow(row: ShiftEmbed): TemplateShiftRow {
  const start = hhmm(row.start_time);
  const end = hhmm(row.end_time);
  const staff = one(row.staff);

  return {
    id: row.id,
    dayOfWeek: row.day_of_week,
    staffId: row.staff_id,
    staffName: staff ? `${staff.first_name} ${staff.last_name}`.trim() : null,
    departmentId: row.department_id,
    departmentName: one(row.facility_departments)?.name ?? null,
    positionId: row.position_id,
    positionName: one(row.facility_positions)?.name ?? null,
    startTime: start,
    endTime: end,
    endsNextDay: minutesOf(end) <= minutesOf(start),
    breakMinutes: row.break_minutes,
    slots: row.slots,
    requiredSkills: row.required_skills ?? [],
    sortOrder: row.sort_order,
  };
}

export function toScheduleTemplateRow(
  row: ScheduleTemplateRecord,
): ScheduleTemplateRow {
  const shifts = (row.schedule_template_shifts ?? [])
    .map(toTemplateShiftRow)
    .sort(
      (a, b) =>
        a.dayOfWeek - b.dayOfWeek ||
        a.startTime.localeCompare(b.startTime) ||
        a.sortOrder - b.sortOrder,
    );

  // Hours the week asks for. A night shift is counted across midnight rather
  // than as a negative number, which is what a naive end-minus-start gives.
  const weeklyMinutes = shifts.reduce((total, shift) => {
    const span =
      minutesOf(shift.endTime) -
      minutesOf(shift.startTime) +
      (shift.endsNextDay ? 24 * 60 : 0);
    return total + span * shift.slots;
  }, 0);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    departmentId: row.department_id,
    departmentName: one(row.facility_departments)?.name ?? null,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    shifts,
    appliedWeeks: (row.schedule_template_applications ?? [])
      .map((a) => a.week_start)
      .sort()
      .reverse(),
    weeklyHours: Math.round((weeklyMinutes / 60) * 10) / 10,
  };
}
