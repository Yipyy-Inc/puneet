"use client";

import { useMemo, useState } from "react";
import {
  LineChart as LineChartIcon,
  Gauge,
  Users,
  Smile,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getLocationsByFacility } from "@/data/locations";
import {
  revenueTrend12Months,
  npsTrend12Months,
  weeklyOccupancy,
} from "@/data/hq-analytics";
import { locationStyles } from "@/lib/hq/location-styles";
import { RevenueTrendLineChart } from "@/components/hq/charts/RevenueTrendLineChart";
import { OccupancyTrendChart } from "@/components/hq/charts/OccupancyTrendChart";
import { ClientGrowthChart } from "@/components/hq/charts/ClientGrowthChart";
import { NpsTrendChart } from "@/components/hq/charts/NpsTrendChart";

type PeriodKey = "week" | "month" | "quarter" | "year" | "custom";
type ChartTab = "revenue" | "occupancy" | "clients" | "nps";

const TABS: { key: ChartTab; label: string; icon: LucideIcon }[] = [
  { key: "revenue", label: "Revenue Trend", icon: LineChartIcon },
  { key: "occupancy", label: "Occupancy Trend", icon: Gauge },
  { key: "clients", label: "Client Growth", icon: Users },
  { key: "nps", label: "NPS Over Time", icon: Smile },
];

// The period selector sets how much history each time-series chart shows.
function trailingMonths(period: PeriodKey, customDays: number): number {
  switch (period) {
    case "week":
      return 3;
    case "month":
      return 6;
    case "quarter":
      return 9;
    case "year":
      return 12;
    case "custom":
      return Math.min(12, Math.max(3, Math.ceil(customDays / 30) + 2));
  }
}
function trailingWeeks(period: PeriodKey): number {
  return period === "week" ? 2 : 4;
}
function periodFactor(period: PeriodKey, customDays: number): number {
  switch (period) {
    case "week":
      return 7 / 30;
    case "month":
      return 1;
    case "quarter":
      return 3;
    case "year":
      return 12;
    case "custom":
      return Math.max(1, customDays) / 30;
  }
}

interface Props {
  period: PeriodKey;
  customDays: number;
  selectedIds: Set<string>;
}

/**
 * Tabbed trend-charts section for the Performance page. Each chart draws the
 * selected locations as distinct professional-palette series on shared axes and
 * responds to the page's period selector.
 */
export function PerformanceTrendCharts({
  period,
  customDays,
  selectedIds,
}: Props) {
  const [tab, setTab] = useState<ChartTab>("revenue");

  const allLocations = useMemo(() => getLocationsByFacility(11), []);
  const activeLocations = useMemo(
    () => allLocations.filter((l) => selectedIds.has(l.id)),
    [allLocations, selectedIds],
  );

  const [focusId, setFocusId] = useState(() => allLocations[0]?.id ?? "");
  const focus =
    activeLocations.find((l) => l.id === focusId) ?? activeLocations[0];

  const months = trailingMonths(period, customDays);
  const weeks = trailingWeeks(period);
  const factor = periodFactor(period, customDays);

  const revenueData = useMemo(
    () => revenueTrend12Months.slice(-months),
    [months],
  );
  const npsData = useMemo(() => npsTrend12Months.slice(-months), [months]);

  // Network-average NPS across the selected locations (latest month).
  const npsAverage = useMemo(() => {
    if (activeLocations.length === 0) return 0;
    const latest = npsTrend12Months[npsTrend12Months.length - 1];
    const sum = activeLocations.reduce(
      (acc, l) => acc + Number(latest[l.id as keyof typeof latest] ?? 0),
      0,
    );
    return Math.round(sum / activeLocations.length);
  }, [activeLocations]);

  const occupancyData = useMemo(() => {
    if (!focus) return [];
    return weeklyOccupancy.slice(-weeks).map((row) => ({
      week: row.week,
      boarding: row.boarding[focus.id] ?? 0,
      daycare: row.daycare[focus.id] ?? 0,
    }));
  }, [focus, weeks]);

  const clientGrowthData = useMemo(
    () =>
      activeLocations.map((l) => ({
        name: l.shortCode,
        new: Math.round((l.metrics?.newCustomers ?? 0) * factor),
        returning: Math.round((l.metrics?.returningCustomers ?? 0) * factor),
      })),
    [activeLocations, factor],
  );

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-semibold">Trend Charts</h2>
        <p className="text-muted-foreground text-xs">
          All selected locations on shared axes · driven by the period selector
        </p>
      </div>

      {/* Chart tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            data-active={tab === t.key}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              tab === t.key
                ? "bg-primary text-primary-foreground border-transparent"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border p-4">
        {tab === "revenue" && (
          <RevenueTrendLineChart
            data={revenueData}
            locations={activeLocations}
          />
        )}

        {tab === "occupancy" && (
          <div>
            {/* Per-chart location focus selector */}
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground mr-1 text-xs">
                Location:
              </span>
              {activeLocations.map((l) => {
                const s = locationStyles(l);
                const active = focus?.id === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setFocusId(l.id)}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors",
                      active
                        ? cn(s.badge, "ring-1", s.ringSoft)
                        : "text-muted-foreground hover:bg-muted/60",
                    )}
                  >
                    {l.shortCode}
                  </button>
                );
              })}
            </div>
            {focus ? (
              <OccupancyTrendChart data={occupancyData} />
            ) : (
              <p className="text-muted-foreground py-12 text-center text-sm">
                Select a location to view occupancy.
              </p>
            )}
          </div>
        )}

        {tab === "clients" && <ClientGrowthChart data={clientGrowthData} />}

        {tab === "nps" && (
          <NpsTrendChart
            data={npsData}
            locations={activeLocations}
            average={npsAverage}
          />
        )}
      </div>
    </div>
  );
}
