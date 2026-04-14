import type { HolidayRate } from "@/types/scheduling";

/**
 * Compute shift duration in hours (minus break).
 */
export function computeShiftHours(
  startTime: string,
  endTime: string,
  breakMinutes: number,
): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const totalMinutes = eh * 60 + em - (sh * 60 + sm) - breakMinutes;
  return Math.max(0, totalMinutes / 60);
}

/**
 * Split total hours into regular and overtime buckets.
 */
export function computeOvertimeHours(
  totalHours: number,
  threshold: number,
): { regular: number; overtime: number } {
  if (totalHours <= threshold) {
    return { regular: totalHours, overtime: 0 };
  }
  return { regular: threshold, overtime: totalHours - threshold };
}

/**
 * Find holiday rate for a given date (checks department-specific first, then global).
 */
export function isHoliday(
  date: string,
  holidayRates: HolidayRate[],
  departmentId?: string,
): HolidayRate | undefined {
  // Prefer department-specific holiday
  const deptHoliday = holidayRates.find(
    (h) => h.date === date && h.departmentId === departmentId,
  );
  if (deptHoliday) return deptHoliday;
  // Fall back to global (no departmentId)
  return holidayRates.find((h) => h.date === date && !h.departmentId);
}

/**
 * Format a duration in minutes as "Xh Ym".
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Format elapsed seconds as MM:SS.
 */
export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
