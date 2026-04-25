"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Download,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type CompRow = {
  locationId: string;
  name: string;
  shortCode: string;
  color: string;
  revenue: number;
  revenueGrowth: number;
  bookings: number;
  bookingsGrowth: number;
  newCustomers: number;
  returningCustomers: number;
  occupancyRate: number;
  staffUtilization: number;
  avgBookingValue: number;
  cancellationRate: number;
  daycareAttendance: number;
  groomingVolume: number;
  boardingNights: number;
  trainingSessionsCompleted: number;
  staffCount: number;
  activeServices: number;
  topService: string;
  nps: number;
};

interface Props {
  data: CompRow[];
}

type Metric = {
  key: keyof CompRow;
  label: string;
  format: (v: number | string) => string;
  higherIsBetter: boolean;
  growth?: keyof CompRow;
};

const METRICS: Metric[] = [
  { key: "revenue",            label: "Revenue",                 format: (v) => `$${Number(v).toLocaleString()}`, higherIsBetter: true,  growth: "revenueGrowth" },
  { key: "bookings",           label: "Bookings",                format: (v) => String(v),                        higherIsBetter: true,  growth: "bookingsGrowth" },
  { key: "newCustomers",       label: "New Clients",             format: (v) => String(v),                        higherIsBetter: true },
  { key: "returningCustomers", label: "Returning Clients",       format: (v) => String(v),                        higherIsBetter: true },
  { key: "occupancyRate",      label: "Occupancy Rate",          format: (v) => `${v}%`,                          higherIsBetter: true },
  { key: "staffUtilization",   label: "Staff Utilization",       format: (v) => `${v}%`,                          higherIsBetter: true },
  { key: "avgBookingValue",    label: "Avg Booking Value",       format: (v) => `$${Number(v).toFixed(2)}`,       higherIsBetter: true },
  { key: "cancellationRate",   label: "Cancellation Rate",       format: (v) => `${v}%`,                          higherIsBetter: false },
  { key: "daycareAttendance",  label: "Daycare Attendance",      format: (v) => String(v),                        higherIsBetter: true },
  { key: "groomingVolume",     label: "Grooming Appointments",   format: (v) => String(v),                        higherIsBetter: true },
  { key: "boardingNights",     label: "Boarding Nights",         format: (v) => String(v),                        higherIsBetter: true },
  { key: "trainingSessionsCompleted", label: "Training Sessions", format: (v) => String(v),                       higherIsBetter: true },
  { key: "staffCount",         label: "Staff Headcount",         format: (v) => String(v),                        higherIsBetter: false },
  { key: "activeServices",     label: "Active Services",         format: (v) => String(v),                        higherIsBetter: true },
  { key: "nps",                label: "NPS Score",               format: (v) => String(v),                        higherIsBetter: true },
];

function getBestIdx(data: CompRow[], key: keyof CompRow, higherIsBetter: boolean): number {
  let best = -1;
  let bestVal = higherIsBetter ? -Infinity : Infinity;
  data.forEach((row, i) => {
    const v = Number(row[key]);
    if (v === 0 && higherIsBetter) return;
    if (higherIsBetter ? v > bestVal : v < bestVal) {
      bestVal = v;
      best = i;
    }
  });
  return best;
}

export function LocationComparisonClient({ data }: Props) {
  const [filter, setFilter] = useState<"all" | "financial" | "operational" | "staff">("all");

  const filteredMetrics = METRICS.filter((m) => {
    if (filter === "all") return true;
    if (filter === "financial") return ["revenue", "bookings", "avgBookingValue", "cancellationRate"].includes(m.key as string);
    if (filter === "operational") return ["occupancyRate", "daycareAttendance", "groomingVolume", "boardingNights", "trainingSessionsCompleted", "newCustomers", "returningCustomers"].includes(m.key as string);
    if (filter === "staff") return ["staffUtilization", "staffCount", "activeServices", "nps"].includes(m.key as string);
    return true;
  });

  const overallBest = data.reduce((best, row, i) => {
    const score = row.revenue + row.bookings * 50 + row.occupancyRate * 200 + row.nps * 100;
    return score > best.score ? { idx: i, score } : best;
  }, { idx: 0, score: -Infinity });

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/facility/hq/overview">
            <Button variant="ghost" size="icon" className="size-9">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Location Comparison</h1>
            <p className="text-muted-foreground text-sm">Side-by-side performance · April 2026</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => toast.success("Report exported as CSV")}
        >
          <Download className="size-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Winner banner */}
      <div className="from-amber-50 to-amber-100/60 flex items-center gap-3 rounded-2xl border border-amber-200 bg-linear-to-r px-4 py-3 dark:from-amber-950/30 dark:to-amber-900/10 dark:border-amber-900/40">
        <Trophy className="size-5 text-amber-500" />
        <p className="text-sm font-medium">
          <strong style={{ color: data[overallBest.idx]?.color }}>{data[overallBest.idx]?.name}</strong>{" "}
          leads overall this month across revenue, occupancy, and customer satisfaction.
        </p>
      </div>

      {/* Location Headers */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `220px repeat(${data.length}, 1fr)` }}>
        <div /> {/* spacer */}
        {data.map((loc, i) => (
          <Card
            key={loc.locationId}
            className="overflow-hidden"
            style={{ borderColor: `${loc.color}40` }}
          >
            <CardContent className="pt-4 pb-3 text-center">
              <div
                className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: loc.color }}
              >
                {loc.shortCode}
              </div>
              <p className="text-sm font-semibold">{loc.name}</p>
              <p className="text-muted-foreground text-xs">Top: {loc.topService}</p>
              {i === overallBest.idx && (
                <Badge className="mt-1.5 gap-1 text-[10px]" style={{ backgroundColor: loc.color }}>
                  <Trophy className="size-2.5" /> Leader
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {(["all", "financial", "operational", "staff"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Comparison Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <colgroup>
                <col style={{ width: "220px" }} />
                {data.map((d) => <col key={d.locationId} />)}
              </colgroup>
              <tbody className="divide-y">
                {filteredMetrics.map((metric) => {
                  const bestIdx = getBestIdx(data, metric.key, metric.higherIsBetter);
                  return (
                    <tr key={metric.key as string} className="group hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs font-medium text-gray-600 dark:text-gray-400">
                        {metric.label}
                      </td>
                      {data.map((row, i) => {
                        const val = row[metric.key];
                        const numVal = Number(val);
                        const isBest = i === bestIdx && numVal !== 0;
                        const growth = metric.growth ? Number(row[metric.growth]) : undefined;
                        return (
                          <td key={row.locationId} className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span
                                className={cn(
                                  "font-[tabular-nums] text-sm font-semibold",
                                  isBest && "text-emerald-600 dark:text-emerald-400",
                                )}
                              >
                                {numVal === 0 ? (
                                  <span className="text-muted-foreground text-xs">N/A</span>
                                ) : metric.format(val as number)}
                                {isBest && (
                                  <Trophy className="ml-1 inline-block size-3 text-amber-500" />
                                )}
                              </span>
                              {growth !== undefined && (
                                <span
                                  className={cn(
                                    "flex items-center gap-0.5 text-[10px] font-medium",
                                    growth >= 0 ? "text-emerald-600" : "text-red-500",
                                  )}
                                >
                                  {growth >= 0 ? (
                                    <TrendingUp className="size-2.5" />
                                  ) : (
                                    <TrendingDown className="size-2.5" />
                                  )}
                                  {growth >= 0 ? "+" : ""}{growth}%
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-center text-xs">
        Trophy icon marks the best-performing location per metric · N/A = service not offered at this location
      </p>
    </div>
  );
}
