// ============================================================================
// When is this facility open on THIS date.
//
// ── IT WAS A CLOSURE INSIDE A CALENDAR ────────────────────────────────────
//
// `getFacilityHoursForDate` lived inside `date-selection-calendar.tsx`, where
// it already encoded the right precedence — a one-day `schedule_time_overrides`
// entry beats the weekly `business_hours` — and could be reached by nothing
// else. So the time-fee evaluator, whose `basedOn: "business_hours"` setting
// needs exactly this answer, read the booked check-out time instead and the
// setting decided nothing.
//
// One resolver, two callers, no second implementation to drift.
// ============================================================================

export interface DayHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

/** Keyed by lower-case English weekday, as `business_hours` stores it. */
export type WeeklyHours = Record<string, DayHours | undefined>;

export interface DayOverride {
  date: string;
  openTime: string;
  closeTime: string;
}

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/**
 * `YYYY-MM-DD` in the machine's own day, which is the facility's day.
 *
 * Deliberately not `toISOString().slice(0, 10)`: that is UTC, and west of
 * Greenwich it names yesterday for every evening booking.
 */
export function facilityDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * The facility's hours for one date, or null when nothing says.
 *
 * A one-day override wins outright and is always open — a facility does not
 * author an override to stay shut, it authors one to change the times.
 */
export function facilityHoursForDate(
  date: Date | string,
  weekly?: WeeklyHours | null,
  overrides?: readonly DayOverride[] | null,
): DayHours | null {
  const asDate = typeof date === "string" ? new Date(`${date}T12:00:00`) : date;
  if (Number.isNaN(asDate.getTime())) return null;

  const key =
    typeof date === "string" ? date.slice(0, 10) : facilityDateKey(asDate);
  const override = overrides?.find((o) => o.date === key);
  if (override) {
    return {
      isOpen: true,
      openTime: override.openTime,
      closeTime: override.closeTime,
    };
  }

  if (!weekly) return null;
  return weekly[WEEKDAYS[asDate.getDay()]] ?? null;
}
