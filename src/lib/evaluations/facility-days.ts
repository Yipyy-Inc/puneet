import { minutesOf, type TimeWindow } from "@/lib/bookings/wizard/time-windows";
import { weekdayOf } from "@/lib/evaluations/availability";
import {
  facilityHoursForDate,
  type DayOverride,
  type WeeklyHours,
} from "@/lib/settings/facility-hours";

// ============================================================================
// Which days the FACILITY is shut for evaluations, and its hours — read the
// way every schedule screen reads them (business hours, one-day overrides,
// closures for this service, holidays), so the wizard, the server and the
// setup page's preview agree before the evaluation schedule has its say.
// ============================================================================

export interface FacilityCalendar {
  hours?: WeeklyHours | null;
  overrides?: ReadonlyArray<DayOverride & { services?: string[] }>;
  blocks?: ReadonlyArray<{ date: string; closed: boolean; services: string[] }>;
  holidays?: ReadonlyArray<{ month: number; day: number }>;
}

const SERVICE = "evaluation";

/**
 * The facility's hours on `date`: null when its hours say closed, undefined
 * when it has set none (nothing to narrow the evaluation schedule by).
 */
export function hoursWindow(
  date: string,
  calendar: FacilityCalendar,
): TimeWindow | null | undefined {
  const overrides = (calendar.overrides ?? []).filter(
    (o) => !o.services?.length || o.services.includes(SERVICE),
  );
  const day = facilityHoursForDate(date, calendar.hours, overrides);
  if (!day) return undefined;
  if (!day.isOpen) return null;
  const start = minutesOf(day.openTime);
  const end = minutesOf(day.closeTime);
  return start !== null && end !== null && end > start
    ? { start, end }
    : undefined;
}

/** Shut for evaluations: a closure for this service, or a holiday. */
export function closedForEvaluations(
  date: string,
  calendar: FacilityCalendar,
): boolean {
  if (
    (calendar.blocks ?? []).some(
      (b) => b.date === date && b.closed && b.services.includes(SERVICE),
    )
  ) {
    return true;
  }
  const [, month, day] = date.split("-").map(Number);
  return (calendar.holidays ?? []).some(
    (h) => h.month === month && h.day === day,
  );
}

/** A day's facility facts, ready for `evaluationDay`. */
export function facilityDay(date: string, calendar: FacilityCalendar) {
  return {
    date,
    weekday: weekdayOf(date),
    closed: closedForEvaluations(date, calendar),
    hours: hoursWindow(date, calendar),
  };
}
