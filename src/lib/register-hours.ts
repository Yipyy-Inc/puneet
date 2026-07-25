import { businessHours } from "@/data/settings";
import type { RegisterSession } from "@/data/cash-drawer";
import type { RegisterCloseReminderMode } from "@/data/staff-onboarding";

// Facility-hours helpers for the cash-register close reminder. The closing time
// comes from the facility's business hours (data/settings.ts) so there's no
// separate field to keep in sync.

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
export function todayCloseTime(now: Date = new Date()): string | null {
  const day = businessHours[WEEKDAY_KEYS[now.getDay()]];
  return day?.isOpen ? day.closeTime : null;
}

/** Whether the facility's closing time for today has been reached. */
export function isPastCloseTime(now: Date = new Date()): boolean {
  const closeTime = todayCloseTime(now);
  if (!closeTime) return false;
  const [hours, minutes] = closeTime.split(":").map((n) => parseInt(n, 10));
  const close = new Date(now);
  close.setHours(hours, minutes, 0, 0);
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
): boolean {
  if (!session || session.status !== "open") return false;
  if (mode === "manual") return false;
  if (mode === "opener_clock_out") {
    return session.opening.countedBy === staffName;
  }
  return isPastCloseTime();
}
