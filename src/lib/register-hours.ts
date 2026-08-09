import type { RegisterSession } from "@/data/cash-drawer";
import type { RegisterCloseReminderMode } from "@/data/staff-onboarding";
import type { BusinessHours } from "@/types/facility";

// ============================================================================
// Facility-hours helpers for the cash-register close reminder.
//
// The closing time comes from the facility's business hours, so there is no
// separate field to keep in sync.
//
// ── HOURS ARE PASSED IN, NOT IMPORTED ─────────────────────────────────────
//
// This module used to `import { businessHours } from "@/data/settings"` — the
// fixture, identical for every facility. So a business open until 21:45 had its
// cash drawer demanding to be counted at 19:00, every night, and no setting
// anywhere would change it.
//
// Hours live in `facility_settings` now (20260809140000). Taking them as an
// argument keeps this module pure and testable, and makes it impossible for it
// to disagree with the screen that displays them: React callers pass
// `useSettings().hours`.
// ============================================================================

const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/** Today's facility closing time ("HH:MM"), or null if closed today. */
export function todayCloseTime(
  hours: BusinessHours,
  now: Date = new Date(),
): string | null {
  const day = hours[WEEKDAY_KEYS[now.getDay()]];
  return day?.isOpen ? day.closeTime : null;
}

/** Whether the facility's closing time for today has been reached. */
export function isPastCloseTime(
  hours: BusinessHours,
  now: Date = new Date(),
): boolean {
  const closeTime = todayCloseTime(hours, now);
  if (!closeTime) return false;
  const [closeHour, closeMinute] = closeTime
    .split(":")
    .map((n) => parseInt(n, 10));
  const close = new Date(now);
  close.setHours(closeHour, closeMinute, 0, 0);
  return now.getTime() >= close.getTime();
}

/**
 * Whether to pop the close-count reminder when a cashier clocks out / logs out,
 * given the facility's close-reminder mode. Supports opener ≠ closer:
 *   • closing_time     → only once the facility's closing time is reached (the
 *     closing shift), so the morning opener leaving at lunch isn't prompted.
 *   • opener_clock_out → only the person who opened the drawer.
 *   • manual           → never (staff close from the register page).
 */
export function shouldPromptCloseOnExit(
  session: RegisterSession | null,
  staffName: string,
  mode: RegisterCloseReminderMode,
  hours: BusinessHours,
): boolean {
  if (!session || session.status !== "open") return false;
  if (mode === "manual") return false;
  if (mode === "opener_clock_out") {
    return session.opening.countedBy === staffName;
  }
  return isPastCloseTime(hours);
}
