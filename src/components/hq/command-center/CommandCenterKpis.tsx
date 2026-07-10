"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import type { Location } from "@/types/location";
import { DatePicker } from "@/components/ui/date-picker";
import { HqKpiTile } from "@/components/hq/HqKpiTile";
import {
  buildCommandCenterKpis,
  type CommandCenterRange,
} from "@/lib/hq/command-center-kpis";

const RANGES: { key: CommandCenterRange; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom" },
];

// Inclusive day count between two YYYY-MM-DD strings; 0 if either is unset or
// the range is invalid (from after to). Pure — no clock read.
function inclusiveDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}

interface Props {
  locations: Location[];
}

/**
 * The four HQ Command Center KPI tiles plus the date-range selector that drives
 * them. Built on the shared HqKpiTile primitive and sourced entirely from
 * hq-analytics + LocationMetrics via buildCommandCenterKpis.
 */
export function CommandCenterKpis({ locations }: Props) {
  const router = useRouter();
  const [range, setRange] = useState<CommandCenterRange>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const customDays = inclusiveDays(customFrom, customTo);
  // Custom with no valid range yet → fall back to a month-equivalent view.
  const effectiveCustomDays =
    range === "custom" && customDays > 0 ? customDays : 30;

  const kpis = buildCommandCenterKpis(locations, range, effectiveCustomDays);

  const occupancySub = kpis.occupancy.perLocation
    .map((l) => `${l.shortCode} ${l.rate}%`)
    .join(" · ");
  const bookingsSub = `Boarding ${kpis.bookings.byService.boarding} · Daycare ${kpis.bookings.byService.daycare} · Grooming ${kpis.bookings.byService.grooming} · Training ${kpis.bookings.byService.training}`;

  return (
    <div className="space-y-4">
      {/* Date-range selector — drives all four tiles */}
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

      {/* Four KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HqKpiTile
          label={`Network Revenue · ${kpis.rangeLabel}`}
          value={`$${kpis.revenue.value.toLocaleString()}`}
          delta={kpis.revenue.deltaPct}
          sublabel={`vs. prior ${kpis.priorNoun}`}
        />
        <HqKpiTile
          label={`Total Bookings · ${kpis.rangeLabel}`}
          value={kpis.bookings.total.toLocaleString()}
          sublabel={bookingsSub}
        />
        <HqKpiTile
          label="Average Occupancy"
          value={kpis.occupancy.weighted}
          unit="%"
          sublabel={occupancySub}
        />
        <HqKpiTile
          label="Outstanding Payments"
          value={`$${kpis.outstanding.total.toLocaleString()}`}
          sublabel={`${kpis.outstanding.invoiceCount} open invoices · manage`}
          onClick={() =>
            router.push("/facility/dashboard/settings?section=financial")
          }
        />
      </div>
    </div>
  );
}
