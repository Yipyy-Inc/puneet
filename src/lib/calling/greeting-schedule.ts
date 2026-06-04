import type { CallingSettings } from "@/types/calling";

/** Greeting profile the schedule should activate at a given moment. */
export type ScheduledGreetingType = "default" | "after_hours" | "holiday";

// getDay() is 0=Sunday … 6=Saturday — map to the businessHours keys.
const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Which greeting profile should be live right now:
 *   - a configured holiday today        → "holiday" (Holiday Season)
 *   - outside business hours / day off  → "after_hours" (After Hours)
 *   - otherwise                         → "default" (Main Greeting)
 *
 * This is the logic a 5-minute cron would run server-side; in the mock it runs
 * client-side whenever the greetings view is open.
 */
export function computeScheduledGreeting(
  now: Date,
  businessHours: CallingSettings["businessHours"],
  holidays: { date: string }[],
): ScheduledGreetingType {
  if (holidays.some((h) => h.date === localDateKey(now))) return "holiday";

  const day = businessHours[DAY_KEYS[now.getDay()]];
  if (!day?.enabled) return "after_hours";

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = day.open.split(":").map(Number);
  const [closeH, closeM] = day.close.split(":").map(Number);
  if (minutesNow < openH * 60 + openM || minutesNow >= closeH * 60 + closeM) {
    return "after_hours";
  }
  return "default";
}
