"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  UserCog,
  Star,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Location } from "@/types/location";
import type { StaffCrossLocationPerformance } from "@/data/hq-analytics";

interface Props {
  staff: StaffCrossLocationPerformance[];
  locations: Location[];
}

const RATING_THRESHOLD = 0.4; // delta in stars that flags as a divergence

export function StaffPerformanceClient({ staff, locations }: Props) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    staff[0]?.staffId ?? "",
  );

  const selected = useMemo(
    () => staff.find((s) => s.staffId === selectedStaffId),
    [staff, selectedStaffId],
  );

  // Find rating divergence for the selected staff member
  const ratingDivergence = useMemo(() => {
    if (!selected || selected.locations.length < 2) return null;
    const ratings = selected.locations.map((l) => l.avgRating);
    const max = Math.max(...ratings);
    const min = Math.min(...ratings);
    if (max - min >= RATING_THRESHOLD) {
      const best = selected.locations.find((l) => l.avgRating === max);
      const worst = selected.locations.find((l) => l.avgRating === min);
      return {
        delta: max - min,
        bestLocation: locations.find((l) => l.id === best?.locationId),
        worstLocation: locations.find((l) => l.id === worst?.locationId),
      };
    }
    return null;
  }, [selected, locations]);

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      {/* Header */}
      <div>
        <Link
          href="/facility/hq/reports"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
        >
          <ArrowLeft className="size-3" />
          All HQ Reports
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <UserCog className="size-6 text-violet-600" />
          Staff Cross-Location Performance
        </h1>
        <p className="text-muted-foreground text-sm">
          For staff who work at multiple locations, compare their performance
          side by side. Divergent ratings often surface coaching opportunities.
        </p>
      </div>

      {/* Staff selector tabs */}
      <div className="flex flex-wrap gap-2">
        {staff.map((s) => {
          const active = s.staffId === selectedStaffId;
          return (
            <button
              key={s.staffId}
              onClick={() => setSelectedStaffId(s.staffId)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-muted",
              )}
            >
              <UserCog className="size-4" />
              <span className="font-medium">{s.name}</span>
              <Badge
                variant={active ? "secondary" : "outline"}
                className="text-[10px]"
              >
                {s.locations.length} locations
              </Badge>
            </button>
          );
        })}
      </div>

      {selected && (
        <>
          {/* Divergence alert */}
          {ratingDivergence && (
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-900/10">
              <CardContent className="flex items-start gap-3 py-4">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    Rating divergence detected — investigate
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    {selected.name} averages{" "}
                    <strong>
                      {ratingDivergence.bestLocation?.shortCode}{" "}
                      {selected.locations
                        .find((l) => l.locationId === ratingDivergence.bestLocation?.id)
                        ?.avgRating.toFixed(1)}
                      ★
                    </strong>{" "}
                    but only{" "}
                    <strong>
                      {ratingDivergence.worstLocation?.shortCode}{" "}
                      {selected.locations
                        .find((l) => l.locationId === ratingDivergence.worstLocation?.id)
                        ?.avgRating.toFixed(1)}
                      ★
                    </strong>{" "}
                    at the other location. Look at scheduling, equipment, and
                    team dynamics.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Per-location breakdown */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {selected.locations.map((loc) => {
              const fullLoc = locations.find((l) => l.id === loc.locationId);
              if (!fullLoc) return null;
              return (
                <Card key={loc.locationId} className="overflow-hidden">
                  <div
                    className="h-1"
                    style={{ backgroundColor: fullLoc.color }}
                  />
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span
                        className="flex size-8 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: fullLoc.color }}
                      >
                        {fullLoc.shortCode}
                      </span>
                      {fullLoc.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <MetricRow
                      label="Avg rating"
                      value={`${loc.avgRating.toFixed(1)}★`}
                      icon={
                        <Star className="size-4 text-amber-500" fill="currentColor" />
                      }
                    />
                    <MetricRow
                      label="Bookings"
                      value={loc.bookings.toLocaleString()}
                    />
                    <MetricRow
                      label="Completion rate"
                      value={`${loc.completionRate}%`}
                    />
                    <MetricRow
                      label="Revenue generated"
                      value={`$${loc.revenueGenerated.toLocaleString()}`}
                      icon={<TrendingUp className="size-4 text-emerald-500" />}
                    />
                    <MetricRow
                      label="Hours worked"
                      value={`${loc.hoursWorked}h`}
                    />
                    <div className="bg-muted/40 rounded-md px-2.5 py-1.5 text-[11px]">
                      <span className="text-muted-foreground">
                        Revenue per hour:
                      </span>{" "}
                      <strong>
                        ${(loc.revenueGenerated / loc.hoursWorked).toFixed(0)}
                      </strong>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Side-by-side comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Side-by-side comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2 font-semibold">Metric</th>
                      {selected.locations.map((loc) => {
                        const fullLoc = locations.find(
                          (l) => l.id === loc.locationId,
                        );
                        return (
                          <th
                            key={loc.locationId}
                            className="px-4 py-2 text-right font-semibold"
                            style={{ color: fullLoc?.color }}
                          >
                            {fullLoc?.shortCode}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[
                      { key: "bookings", label: "Bookings", format: (v: number) => v.toLocaleString() },
                      { key: "avgRating", label: "Avg rating", format: (v: number) => `${v.toFixed(1)}★` },
                      { key: "completionRate", label: "Completion rate", format: (v: number) => `${v}%` },
                      { key: "revenueGenerated", label: "Revenue generated", format: (v: number) => `$${v.toLocaleString()}` },
                      { key: "hoursWorked", label: "Hours worked", format: (v: number) => `${v}h` },
                    ].map((row) => {
                      const values = selected.locations.map(
                        (l) => l[row.key as keyof typeof l] as number,
                      );
                      const max = Math.max(...values);
                      return (
                        <tr key={row.key}>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {row.label}
                          </td>
                          {selected.locations.map((loc) => {
                            const v = loc[
                              row.key as keyof typeof loc
                            ] as number;
                            const isMax = v === max;
                            return (
                              <td
                                key={loc.locationId}
                                className={cn(
                                  "px-4 py-2.5 text-right tabular-nums",
                                  isMax && "font-bold",
                                )}
                              >
                                {row.format(v)}
                                {isMax && (
                                  <span className="ml-1 text-[10px] text-emerald-600">
                                    best
                                  </span>
                                )}
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

          <div className="flex justify-end">
            <Button variant="outline" size="sm">
              Export staff report
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function MetricRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
