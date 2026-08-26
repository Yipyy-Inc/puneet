// ============================================================================
// The real report window for an HQ period selector, shared by every HQ report
// screen that lets someone pick "This Week"/"This Month"/etc. Extracted out
// of `PerformanceClient.tsx` once a second screen (HQ Training) needed the
// identical date math. Unlike the fixtures these screens replaced (a monthly
// baseline scaled by a factor), this is the ACTUAL date range sent to
// `facility_report_dataset` — the server derives the previous window of the
// same length itself, so growth is a real comparison, not an invented one.
// ============================================================================

export type PeriodKey = "week" | "month" | "quarter" | "year" | "custom";

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "quarter", label: "This Quarter" },
  { key: "year", label: "Last 12 Months" },
  { key: "custom", label: "Custom" },
];

export function periodLabel(
  period: PeriodKey,
  customFrom: string,
  customTo: string,
) {
  switch (period) {
    case "week":
      return "This Week";
    case "month":
      return "This Month";
    case "quarter":
      return "This Quarter";
    case "year":
      return "Last 12 Months";
    case "custom":
      return customFrom && customTo
        ? `${customFrom} – ${customTo}`
        : "Custom range";
  }
}

export function periodWindow(
  period: PeriodKey,
  customFrom: string,
  customTo: string,
): { from: string; to: string } {
  const now = new Date();
  switch (period) {
    case "week": {
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const from = new Date(to);
      from.setDate(from.getDate() - 7);
      return { from: from.toISOString(), to: to.toISOString() };
    }
    case "month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { from: from.toISOString(), to: to.toISOString() };
    }
    case "quarter": {
      const qStart = Math.floor(now.getMonth() / 3) * 3;
      const from = new Date(now.getFullYear(), qStart, 1);
      const to = new Date(now.getFullYear(), qStart + 3, 1);
      return { from: from.toISOString(), to: to.toISOString() };
    }
    case "year": {
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const from = new Date(to);
      from.setFullYear(from.getFullYear() - 1);
      return { from: from.toISOString(), to: to.toISOString() };
    }
    case "custom": {
      if (!customFrom || !customTo) return periodWindow("month", "", "");
      return {
        from: new Date(`${customFrom}T00:00:00`).toISOString(),
        to: new Date(`${customTo}T23:59:59`).toISOString(),
      };
    }
  }
}

export function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return +(((current - previous) / previous) * 100).toFixed(1);
}
