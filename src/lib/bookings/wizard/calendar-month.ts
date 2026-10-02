import { dayClearsMinimum } from "@/lib/bookings/advance-notice";
import {
  facilityDateKey,
  facilityHoursForDate,
  type DayOverride,
  type WeeklyHours,
} from "@/lib/settings/facility-hours";

// ============================================================================
// The booking wizard's month calendar, as rules (the client's mock,
// 2026-10-01): which days a month shows, and why one cannot be picked —
// past, too soon or too far by the facility's booking rules, closed (the
// business, a holiday, a closure for this service) or fully booked.
//
// The same rules the old DateSelectionCalendar applied inside itself, moved
// where a test can reach them; that component keeps its other six callers.
// ============================================================================

export const isoDay = facilityDateKey;

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** The month's days in weeks, Sunday first, padded with nulls. */
export function monthGrid(month: Date): Array<Array<Date | null>> {
  const year = month.getFullYear();
  const index = month.getMonth();
  const days = new Date(year, index + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < new Date(year, index, 1).getDay(); i += 1)
    cells.push(null);
  for (let d = 1; d <= days; d += 1) cells.push(new Date(year, index, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: Array<Array<Date | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export type DayStatus =
  | "open"
  | "past"
  | "too-soon"
  | "too-far"
  | "blocked"
  | "holiday"
  | "closed"
  | "full";

export interface DayRules {
  today: Date;
  hours?: WeeklyHours | null;
  overrides?: readonly DayOverride[];
  /** The earliest instant a booking may start (the minimum advance). */
  minimum?: Date;
  /** The last day one may start (the maximum advance). */
  maximum?: Date;
  /** Days this service is closed or will not take this end of a stay. */
  blocked?: ReadonlySet<string>;
  holidays?: ReadonlyArray<{ month: number; day: number; name: string }>;
  /** Days with no room left (lodging). */
  full?: ReadonlySet<string>;
}

/** Why a day cannot be picked, or "open". In the order a person would care. */
export function dayStatus(date: Date, rules: DayRules): DayStatus {
  const today = new Date(
    rules.today.getFullYear(),
    rules.today.getMonth(),
    rules.today.getDate(),
  );
  if (date < today) return "past";
  if (rules.minimum && !dayClearsMinimum(date, rules.minimum))
    return "too-soon";
  if (rules.maximum && date > rules.maximum) return "too-far";
  const key = isoDay(date);
  if (rules.blocked?.has(key)) return "blocked";
  if (
    rules.holidays?.some(
      (h) => h.month === date.getMonth() + 1 && h.day === date.getDate(),
    )
  ) {
    return "holiday";
  }
  if (
    rules.hours &&
    !facilityHoursForDate(date, rules.hours, rules.overrides)?.isOpen
  ) {
    return "closed";
  }
  if (rules.full?.has(key)) return "full";
  return "open";
}

/** The facility's booking window, from its minimum and maximum advance. */
export function advanceBounds(
  now: Date,
  minimumHours?: number,
  maximumDays?: number,
): { minimum?: Date; maximum?: Date } {
  return {
    minimum:
      minimumHours && minimumHours > 0
        ? new Date(now.getTime() + minimumHours * 3_600_000)
        : undefined,
    maximum:
      maximumDays && maximumDays > 0
        ? new Date(now.getTime() + maximumDays * 86_400_000)
        : undefined,
  };
}

/** The nights of a stay, check-in day up to the night before check-out. */
export function stayNights(start: Date, end: Date): Date[] {
  const nights: Date[] = [];
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (day < end && !sameDay(day, end)) {
    nights.push(new Date(day));
    day.setDate(day.getDate() + 1);
  }
  return nights;
}

/**
 * A boarding range, picked the way the mock picks one: the first click is
 * check-in; a later day completes the stay; a click on or before check-in, or
 * after a complete stay, starts again. A stay that would cross a night with
 * no room starts again on the day clicked.
 */
export function pickRange(
  current: { start: Date | null; end: Date | null },
  day: Date,
  nightBlocked: (night: Date) => boolean,
): { start: Date; end: Date | null } {
  const { start, end } = current;
  if (!start || end || day <= start) return { start: day, end: null };
  if (stayNights(start, day).some(nightBlocked))
    return { start: day, end: null };
  return { start, end: day };
}

/** Days toggled in and out of a daycare booking, kept in date order. */
export function toggleDay(days: readonly Date[], day: Date): Date[] {
  const has = days.some((d) => sameDay(d, day));
  const next = has ? days.filter((d) => !sameDay(d, day)) : [...days, day];
  return next.sort((a, b) => a.getTime() - b.getTime());
}
