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
