export type DateRange = "all" | "today" | "week" | "month" | "custom";

/**
 * Inclusive epoch bounds for a date-range preset. `from`/`to` are null when
 * unbounded. `custom` uses the YYYY-MM-DD strings (local midnight → end of day).
 * Shared by the Call Log and Recordings filters.
 */
export function dateRangeBounds(
  range: DateRange,
  customFrom: string,
  customTo: string,
): { from: number | null; to: number | null } {
  if (range === "today") {
    const s = new Date();
    s.setHours(0, 0, 0, 0);
    return { from: s.getTime(), to: null };
  }
  if (range === "week") {
    const s = new Date();
    s.setHours(0, 0, 0, 0);
    s.setDate(s.getDate() - s.getDay()); // back to Sunday
    return { from: s.getTime(), to: null };
  }
  if (range === "month") {
    return { from: Date.now() - 30 * 86_400_000, to: null };
  }
  if (range === "custom") {
    return {
      from: customFrom ? new Date(`${customFrom}T00:00:00`).getTime() : null,
      to: customTo ? new Date(`${customTo}T23:59:59.999`).getTime() : null,
    };
  }
  return { from: null, to: null };
}

/**
 * The immediately-preceding period of equal length, for period-over-period
 * comparisons. Returns null for "all" (and custom without both bounds).
 */
export function previousPeriodBounds(
  range: DateRange,
  customFrom: string,
  customTo: string,
  now: number = Date.now(),
): { from: number; to: number } | null {
  if (range === "today") {
    const s = new Date(now);
    s.setHours(0, 0, 0, 0);
    const start = s.getTime();
    return { from: start - 86_400_000, to: start };
  }
  if (range === "week") {
    const s = new Date(now);
    s.setHours(0, 0, 0, 0);
    s.setDate(s.getDate() - s.getDay());
    const start = s.getTime();
    return { from: start - 7 * 86_400_000, to: start };
  }
  if (range === "month") {
    return { from: now - 60 * 86_400_000, to: now - 30 * 86_400_000 };
  }
  if (range === "custom" && customFrom && customTo) {
    const f = new Date(`${customFrom}T00:00:00`).getTime();
    const t = new Date(`${customTo}T23:59:59.999`).getTime();
    return { from: f - (t - f), to: f };
  }
  return null;
}

/** Short label for the comparison period (""→ no comparison). */
export const PREVIOUS_PERIOD_LABEL: Record<DateRange, string> = {
  all: "",
  today: "yesterday",
  week: "last week",
  month: "prev. 30 days",
  custom: "prev. period",
};
