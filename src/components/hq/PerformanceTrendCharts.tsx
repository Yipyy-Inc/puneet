"use client";

import { useMemo } from "react";
import type { FacilityLocation } from "@/types/location";
import { useRevenueTrendByLocation } from "@/lib/api/facility-reports";
import { RevenueTrendLineChart } from "@/components/hq/charts/RevenueTrendLineChart";

// ============================================================================
// Real revenue trend, per selected location. Was a 4-tab section (Revenue,
// Occupancy, Client Growth, NPS) over a fixture -- only revenue survives.
// `facility_rooms` has no `location_id`, so occupancy cannot be broken out
// per branch; `customer-value` has no location dimension either; NPS has no
// column anywhere in the schema. Three tabs' worth of numbers were invented
// for a shape nothing here can fill honestly, so the tabs went with them.
// ============================================================================

interface Props {
  locations: FacilityLocation[];
}

export function PerformanceTrendCharts({ locations }: Props) {
  const { data: trendRows } = useRevenueTrendByLocation(12);

  // Pivot the trend's tidy rows into { month, [locationId]: revenue }[].
  const trendData = useMemo(() => {
    const byMonth = new Map<string, Record<string, number | string>>();
    for (const row of trendRows ?? []) {
      const key = row.locationId ?? "none";
      const entry = byMonth.get(row.month) ?? { month: row.month };
      entry[key] = row.revenue;
      byMonth.set(row.month, entry);
    }
    return Array.from(byMonth.values()).sort((a, b) =>
      String(a.month).localeCompare(String(b.month)),
    ) as { month: string; [locationId: string]: number | string }[];
  }, [trendRows]);

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-semibold">Revenue Trend</h2>
        <p className="text-muted-foreground text-xs">
          Last 12 months · selected locations
        </p>
      </div>
      <div className="rounded-xl border p-4">
        {locations.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">
            Select a location to view its trend.
          </p>
        ) : (
          <RevenueTrendLineChart data={trendData} locations={locations} />
        )}
      </div>
    </div>
  );
}
