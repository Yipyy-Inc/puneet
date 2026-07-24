// Pure, server-safe report-range helpers. Kept OUT of the "use client"
// report-range-picker so Server Components (e.g. the reports route) can call
// previousWindow()/defaultReportRange() at render time without tripping the
// "client function invoked from the server" boundary error.

/** A concrete reporting window. Endpoints are ISO `YYYY-MM-DD` strings. */
export interface ReportRange {
  from: string;
  to: string;
  preset: RangePreset;
}

export type RangePreset = "30d" | "90d" | "365d" | "mtd" | "custom";

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "365d", label: "Last 365 days" },
  { value: "mtd", label: "Month to date" },
  { value: "custom", label: "Custom…" },
];

function iso(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Resolve a preset to a concrete {from, to} window relative to today. */
export function presetRange(preset: RangePreset): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  if (preset === "30d") from.setDate(from.getDate() - 30);
  else if (preset === "90d") from.setDate(from.getDate() - 90);
  else if (preset === "365d") from.setDate(from.getDate() - 365);
  else if (preset === "mtd") from.setDate(1);
  return { from: iso(from), to: iso(to) };
}

/** The default window used by reports on first load. */
export function defaultReportRange(preset: RangePreset = "90d"): ReportRange {
  return { ...presetRange(preset), preset };
}

/** The equal-length window immediately preceding `range` — the comparison base for period-over-period deltas. */
export function previousWindow(range: { from: string; to: string }): {
  from: string;
  to: string;
} {
  const from = new Date(range.from + "T00:00:00Z");
  const to = new Date(range.to + "T00:00:00Z");
  const lengthDays = Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)),
  );
  const prevTo = new Date(from);
  prevTo.setUTCDate(prevTo.getUTCDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setUTCDate(prevFrom.getUTCDate() - lengthDays);
  return {
    from: prevFrom.toISOString().split("T")[0],
    to: prevTo.toISOString().split("T")[0],
  };
}

/** Human label for the active window, e.g. "Jan 1 – Mar 31, 2026". */
export function formatRangeLabel(range: ReportRange): string {
  const fmt = (s: string) =>
    new Date(s + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return `${fmt(range.from)} – ${fmt(range.to)}`;
}
