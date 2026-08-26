"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  MapPin,
  Download,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CalendarCheck,
  Activity,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { locationStyles } from "@/lib/hq/location-styles";
import {
  PERIODS,
  periodLabel,
  periodWindow,
  pctChange,
  type PeriodKey,
} from "@/lib/hq/period-window";
import { HqKpiTile } from "@/components/hq/HqKpiTile";
import {
  HqComparisonTable,
  bestWorstClass,
  type ColumnDef,
} from "@/components/hq/HqComparisonTable";
import { formatMetricCell } from "@/lib/hq/metrics-format";
import { PerformanceTrendCharts } from "@/components/hq/PerformanceTrendCharts";
import { useFacilityLocations } from "@/lib/api/locations";
import { useStaffHomeLocations } from "@/lib/api/staff";
import {
  useFacilityReport,
  type RevenueByLocationData,
  type ServiceMixByLocationData,
} from "@/lib/api/facility-reports";
import type { FacilityLocation } from "@/types/location";

// ============================================================================
// Real revenue, bookings, service mix and headcount per location. Was a
// 26-metric catalogue over a fixture; most of it had nowhere real to read
// from -- occupancy (`facility_rooms` has no `location_id`), NPS (no column
// anywhere), staff utilization/avg client rating/reviews (no source),
// cancellation/no-show rate and lead time (no `cancelled_at`, no `no_show`
// status). What's left is what the database can actually answer: revenue,
// bookings, service mix by branch, and real headcount from home-location.
// ============================================================================

type LocationRow = {
  locationId: string;
  location: FacilityLocation;
  revenue: number;
  revenueGrowth: number;
  bookings: number;
  bookingsGrowth: number;
  avgBookingValue: number;
  staffCount: number;
  groomingBookings: number;
  boardingBookings: number;
  daycareBookings: number;
  trainingBookings: number;
};

type MetricCategory = "financial" | "bookings" | "operational" | "staff";

type Metric = {
  key: keyof LocationRow;
  label: string;
  category: MetricCategory;
  format: (v: number) => string;
  higherIsBetter: boolean;
  growth?: keyof LocationRow;
};

const money = (v: number) => `$${v.toLocaleString()}`;
const count = (v: number) => v.toLocaleString();

const METRICS: Metric[] = [
  {
    key: "revenue",
    label: "Revenue",
    category: "financial",
    format: money,
    higherIsBetter: true,
    growth: "revenueGrowth",
  },
  {
    key: "avgBookingValue",
    label: "Avg Booking Value",
    category: "financial",
    format: (v) => `$${v.toFixed(2)}`,
    higherIsBetter: true,
  },
  {
    key: "bookings",
    label: "Total Bookings",
    category: "bookings",
    format: count,
    higherIsBetter: true,
    growth: "bookingsGrowth",
  },
  {
    key: "groomingBookings",
    label: "Grooming Bookings",
    category: "operational",
    format: count,
    higherIsBetter: true,
  },
  {
    key: "boardingBookings",
    label: "Boarding Bookings",
    category: "operational",
    format: count,
    higherIsBetter: true,
  },
  {
    key: "daycareBookings",
    label: "Daycare Bookings",
    category: "operational",
    format: count,
    higherIsBetter: true,
  },
  {
    key: "trainingBookings",
    label: "Training Bookings",
    category: "operational",
    format: count,
    higherIsBetter: true,
  },
  {
    key: "staffCount",
    label: "Staff Headcount",
    category: "staff",
    format: count,
    higherIsBetter: true,
  },
];

const CATEGORY_TABS: {
  key: MetricCategory;
  label: string;
  icon: LucideIcon;
}[] = [
  { key: "financial", label: "Financial", icon: DollarSign },
  { key: "bookings", label: "Bookings", icon: CalendarCheck },
  { key: "operational", label: "Operations", icon: Activity },
  { key: "staff", label: "Staff", icon: Users },
];

function ChangeChip({
  value,
  higherIsBetter,
}: {
  value: number;
  higherIsBetter: boolean;
}) {
  if (value === 0) {
    return (
      <span className="text-muted-foreground text-[10px] tabular-nums">
        vs last period —
      </span>
    );
  }
  const positive = higherIsBetter ? value >= 0 : value <= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums",
        positive
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400",
      )}
    >
      {positive ? (
        <TrendingUp className="size-2.5" />
      ) : (
        <TrendingDown className="size-2.5" />
      )}
      {value >= 0 ? "+" : ""}
      {value.toFixed(1)}% vs last period
    </span>
  );
}

function MetricCell({
  metric,
  row,
  data,
}: {
  metric: Metric;
  row: LocationRow;
  data: LocationRow[];
}) {
  const value = Number(row[metric.key]);
  const values = data.map((d) => Number(d[metric.key]));
  const highlight = bestWorstClass(value, values, metric.higherIsBetter);
  const growth = metric.growth ? Number(row[metric.growth]) : undefined;

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className={cn("text-lg font-bold tabular-nums", highlight)}>
        {formatMetricCell(value, metric.format)}
      </span>
      {growth !== undefined && (
        <ChangeChip value={growth} higherIsBetter={metric.higherIsBetter} />
      )}
    </div>
  );
}

function leaders(metric: Metric, data: LocationRow[]) {
  const entries = data.map((d) => ({ loc: d, value: Number(d[metric.key]) }));
  if (entries.length === 0) return { best: null, worst: null };
  let best = entries[0];
  let worst = entries[0];
  for (const e of entries) {
    if (metric.higherIsBetter ? e.value > best.value : e.value < best.value)
      best = e;
    if (metric.higherIsBetter ? e.value < worst.value : e.value > worst.value)
      worst = e;
  }
  return { best, worst: entries.length > 1 ? worst : null };
}

export function PerformanceClient() {
  const [category, setCategory] = useState<MetricCategory>("financial");
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null);

  const { data: locations, isPending: locationsPending } =
    useFacilityLocations();
  const { data: staff } = useStaffHomeLocations();

  const { from, to } = useMemo(
    () => periodWindow(period, customFrom, customTo),
    [period, customFrom, customTo],
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
  const revenueData = revenueReport?.data as RevenueByLocationData | undefined;
  const mixData = mixReport?.data as ServiceMixByLocationData | undefined;

  const label = periodLabel(period, customFrom, customTo);

  // Selected locations drive every table + the KPI tiles. Defaults to all
  // once the real list has loaded; `null` beforehand means "not decided yet".
  const activeIds = useMemo(
    () => selectedIds ?? new Set((locations ?? []).map((l) => l.id)),
    [selectedIds, locations],
  );
  const activeLocations = (locations ?? []).filter((l) => activeIds.has(l.id));

  const data: LocationRow[] = activeLocations.map((loc) => {
    const cur = revenueData?.current.find((r) => r.locationId === loc.id);
    const prev = revenueData?.previous.find((r) => r.locationId === loc.id);
    const revenue = cur?.revenue ?? 0;
    const bookings = cur?.bookings ?? 0;
    const mixRows = (mixData?.current ?? []).filter(
      (r) => r.locationId === loc.id,
    );
    const bookingsFor = (service: string) =>
      mixRows.find((r) => r.service === service)?.bookings ?? 0;
    return {
      locationId: loc.id,
      location: loc,
      revenue,
      revenueGrowth: pctChange(revenue, prev?.revenue ?? 0),
      bookings,
      bookingsGrowth: pctChange(bookings, prev?.bookings ?? 0),
      avgBookingValue: bookings > 0 ? revenue / bookings : 0,
      staffCount: (staff ?? []).filter(
        (s) => s.claimed && s.homeLocationId === loc.id,
      ).length,
      groomingBookings: bookingsFor("grooming"),
      boardingBookings: bookingsFor("boarding"),
      daycareBookings: bookingsFor("daycare"),
      trainingBookings: bookingsFor("training"),
    };
  });

  const allSelected = activeIds.size === (locations ?? []).length;
  const locationLabel = allSelected
    ? "All Locations"
    : `${activeIds.size} location${activeIds.size === 1 ? "" : "s"}`;

  function toggleLocation(id: string) {
    setSelectedIds((prev) => {
      const base = prev ?? new Set((locations ?? []).map((l) => l.id));
      const next = new Set(base);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const kpis = useMemo(() => {
    const revenueLeader = data.reduce(
      (best, d) => (d.revenue > (best?.revenue ?? -1) ? d : best),
      data[0] as LocationRow | undefined,
    );
    const bookingsLeader = data.reduce(
      (best, d) => (d.bookings > (best?.bookings ?? -1) ? d : best),
      data[0] as LocationRow | undefined,
    );
    return {
      revenue: data.reduce((sum, d) => sum + d.revenue, 0),
      bookings: data.reduce((sum, d) => sum + d.bookings, 0),
      staff: data.reduce((sum, d) => sum + d.staffCount, 0),
      revenueLeader,
      bookingsLeader,
    };
  }, [data]);

  const metricColumns = useMemo<ColumnDef<Metric>[]>(
    () => [
      {
        key: "metric",
        label: "Metric",
        align: "left",
        render: (m) => (
          <div>
            <p className="text-sm font-semibold">{m.label}</p>
            <p className="text-muted-foreground text-[10px]">
              {m.higherIsBetter ? "Higher is better" : "Lower is better"}
            </p>
          </div>
        ),
      },
      ...data.map<ColumnDef<Metric>>((row) => ({
        key: row.locationId,
        label: `${(row.location.shortCode ?? row.location.name).slice(0, 3)} · ${row.location.name}`,
        align: "right",
        render: (m) => <MetricCell metric={m} row={row} data={data} />,
      })),
      {
        key: "__best",
        label: "Best",
        align: "left",
        render: (m) => {
          const { best } = leaders(m, data);
          if (!best) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {(best.loc.location.shortCode ?? best.loc.location.name).slice(
                0,
                3,
              )}{" "}
              · {m.format(best.value)}
            </span>
          );
        },
      },
      {
        key: "__worst",
        label: "Worst",
        align: "left",
        render: (m) => {
          const { worst } = leaders(m, data);
          if (!worst) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">
              {(worst.loc.location.shortCode ?? worst.loc.location.name).slice(
                0,
                3,
              )}{" "}
              · {m.format(worst.value)}
            </span>
          );
        },
      },
    ],
    [data],
  );

  const categoryRows = useMemo(
    () => METRICS.filter((m) => m.category === category),
    [category],
  );

  if (locationsPending) {
    return (
      <div className="space-y-6 p-4 pt-6 md:p-8">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-7 p-4 pt-6 md:p-8">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/facility/hq/overview">
            <Button variant="ghost" size="icon" className="size-9">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
              <Link
                href="/facility/hq/overview"
                className="hover:text-foreground transition-colors"
              >
                HQ
              </Link>
              <ChevronRight className="size-3" />
              <span>Performance</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Location Performance
            </h1>
            <p className="text-muted-foreground text-sm">
              Metric-by-metric comparison · {label} · {activeLocations.length}{" "}
              of {(locations ?? []).length} locations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => toast.success("Performance report exported as CSV")}
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
          <Link href="/facility/hq/transfers">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeftRight className="size-3.5" />
              Transfers
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Period + location controls (drive every table + tile) ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="bg-muted/60 inline-flex items-center gap-1 rounded-xl border p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              data-active={period === p.key}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                period === p.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === "custom" && (
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

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <MapPin className="size-3.5" />
              {locationLabel}
              <ChevronDown className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-2">
            <label className="hover:bg-muted/60 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium">
              <Checkbox
                checked={allSelected}
                onCheckedChange={() =>
                  setSelectedIds(new Set((locations ?? []).map((l) => l.id)))
                }
              />
              All Locations
            </label>
            <Separator className="my-1" />
            {(locations ?? []).map((loc) => {
              const ls = locationStyles(loc);
              return (
                <label
                  key={loc.id}
                  className="hover:bg-muted/60 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                >
                  <Checkbox
                    checked={activeIds.has(loc.id)}
                    onCheckedChange={() => toggleLocation(loc.id)}
                  />
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      ls.badge,
                    )}
                  >
                    {(loc.shortCode ?? loc.name).slice(0, 3)}
                  </span>
                  <span className="truncate">{loc.name}</span>
                </label>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>

      {/* ── Highlight KPI tiles ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <HqKpiTile
          label={`Network Revenue · ${label}`}
          value={`$${kpis.revenue.toLocaleString()}`}
          sublabel={
            kpis.revenueLeader
              ? `Top: ${kpis.revenueLeader.location.name}`
              : undefined
          }
        />
        <HqKpiTile
          label={`Total Bookings · ${label}`}
          value={kpis.bookings.toLocaleString()}
          sublabel={
            kpis.bookingsLeader
              ? `Top: ${kpis.bookingsLeader.location.name}`
              : undefined
          }
        />
        <HqKpiTile
          label="Staff Headcount"
          value={kpis.staff.toLocaleString()}
        />
      </div>

      {/* ── Category tabs — switch which metric rows show ── */}
      <div className="flex flex-wrap items-center gap-1.5">
        {CATEGORY_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setCategory(t.key)}
            data-active={category === t.key}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              category === t.key
                ? "bg-primary text-primary-foreground border-transparent"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Metric table for the selected category ── */}
      <HqComparisonTable data={categoryRows} columns={metricColumns} />

      {/* ── Revenue trend chart ── */}
      <PerformanceTrendCharts locations={activeLocations} />

      <p className="text-muted-foreground text-[11px]">
        Best-performing location per metric is green, worst is red · figures are
        real, read live from bookings and payments.
      </p>
    </div>
  );
}
