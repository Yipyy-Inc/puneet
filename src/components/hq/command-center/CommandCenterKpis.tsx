"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { HqKpiTile } from "@/components/hq/HqKpiTile";
import { usePermission } from "@/hooks/use-facility-rbac";
import {
  useFacilityReport,
  type RevenueByLocationData,
  type ServiceMixByLocationData,
} from "@/lib/api/facility-reports";

// ============================================================================
// The Command Center KPI tiles, from the same ledger the Reports page reads.
//
// ── WHAT THIS REPLACED ────────────────────────────────────────────────────
//
// `buildCommandCenterKpis` scaled a fixture's ONE monthly total by a range
// factor (today = 1/30th of the month, "This Week" = 7/30ths) rather than
// reading a real window — a slow Tuesday and a slammed one produced the exact
// same "Today" figure, always 1/30th of April 2026's number.
//
// Occupancy and Outstanding Payments tiles are gone, not converted: neither
// has a real per-location source (occupancy joined this decision earlier;
// outstanding-by-location needs a query this pass didn't build).
// ============================================================================

type Range = "today" | "week" | "month" | "custom";

const RANGES: { key: Range; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom" },
];

function dayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function windowFor(
  range: Range,
  customFrom: string,
  customTo: string,
  now: Date,
): { from: string; to: string; label: string; priorNoun: string } {
  const todayStart = dayStart(now);
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);

  if (range === "today") {
    return {
      from: todayStart.toISOString(),
      to: tomorrowStart.toISOString(),
      label: "Today",
      priorNoun: "day",
    };
  }
  if (range === "week") {
    return {
      from: new Date(todayStart.getTime() - 6 * 86_400_000).toISOString(),
      to: tomorrowStart.toISOString(),
      label: "This Week",
      priorNoun: "week",
    };
  }
  if (range === "month") {
    return {
      from: new Date(todayStart.getTime() - 29 * 86_400_000).toISOString(),
      to: tomorrowStart.toISOString(),
      label: "This Month",
      priorNoun: "month",
    };
  }
  // custom
  if (customFrom && customTo) {
    const from = new Date(`${customFrom}T00:00:00`);
    const to = new Date(
      new Date(`${customTo}T00:00:00`).getTime() + 86_400_000,
    );
    const days = Math.max(
      1,
      Math.round((to.getTime() - from.getTime()) / 86_400_000),
    );
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      label: `Custom · ${days} day${days === 1 ? "" : "s"}`,
      priorNoun: "period",
    };
  }
  // No valid custom range yet — fall back to a month-equivalent view.
  return {
    from: new Date(todayStart.getTime() - 29 * 86_400_000).toISOString(),
    to: tomorrowStart.toISOString(),
    label: "Custom",
    priorNoun: "period",
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function sum<T extends { revenue: number; bookings: number }>(
  rows: T[] | undefined,
  key: "revenue" | "bookings",
): number {
  return (rows ?? []).reduce((s, r) => s + r[key], 0);
}

export function CommandCenterKpis() {
  const router = useRouter();
  // Revenue/financial tiles are Manager+ only (spec A5 / F0.2).
  const canSeeRevenue = usePermission("financial_view_revenue");
  const [range, setRange] = useState<Range>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  // Snapshot "now" once at mount, not on every render.
  const [now] = useState(() => new Date());

  const { from, to, label, priorNoun } = useMemo(
    () => windowFor(range, customFrom, customTo, now),
    [range, customFrom, customTo, now],
  );

  const { data: revenueReport } = useFacilityReport(
    "revenue-by-location",
    from,
    to,
  );
  const { data: mixReport } = useFacilityReport(
    "service-mix-by-location",
    from,
    to,
  );

  const revenue = revenueReport?.data as RevenueByLocationData | undefined;
  const mix = mixReport?.data as ServiceMixByLocationData | undefined;

  const curRevenue = sum(revenue?.current, "revenue");
  const prevRevenue = sum(revenue?.previous, "revenue");
  const deltaPct = prevRevenue
    ? round1(((curRevenue - prevRevenue) / prevRevenue) * 100)
    : 0;
  const totalBookings = sum(revenue?.current, "bookings");

  const byService = new Map<string, number>();
  for (const row of mix?.current ?? []) {
    byService.set(
      row.service,
      (byService.get(row.service) ?? 0) + row.bookings,
    );
  }
  const bookingsSub = Array.from(byService.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(
      ([service, count]) =>
        `${service[0].toUpperCase()}${service.slice(1)} ${count}`,
    )
    .join(" · ");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="bg-muted/60 inline-flex items-center gap-1 rounded-xl border p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              data-active={range === r.key}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                range === r.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {range === "custom" && (
          <div className="flex items-center gap-2">
            <DatePicker
              value={customFrom}
              onValueChange={(v) => setCustomFrom(v)}
              placeholder="From"
              max={customTo || undefined}
              className="h-9 w-40"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <DatePicker
              value={customTo}
              onValueChange={(v) => setCustomTo(v)}
              placeholder="To"
              min={customFrom || undefined}
              className="h-9 w-40"
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {canSeeRevenue && (
          <HqKpiTile
            label={`Network Revenue · ${label}`}
            value={`$${curRevenue.toLocaleString()}`}
            delta={deltaPct}
            sublabel={`vs. prior ${priorNoun}`}
          />
        )}
        <HqKpiTile
          label={`Total Bookings · ${label}`}
          value={totalBookings.toLocaleString()}
          sublabel={bookingsSub || "No bookings in this window"}
          onClick={() => router.push("/facility/dashboard/bookings")}
        />
      </div>
    </div>
  );
}
