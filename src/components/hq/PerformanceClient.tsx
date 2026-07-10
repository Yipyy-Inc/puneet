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
  Heart,
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
import { toast } from "sonner";
import { locationStyles } from "@/lib/hq/location-styles";
import { HqKpiTile } from "@/components/hq/HqKpiTile";
import {
  HqComparisonTable,
  bestWorstClass,
  type ColumnDef,
} from "@/components/hq/HqComparisonTable";
import { formatMetricCell } from "@/lib/hq/metrics-format";
import { PerformanceTrendCharts } from "@/components/hq/PerformanceTrendCharts";

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
  newBookings: number;
  noShowRate: number;
  avgLeadTimeDays: number;
  boardingOccupancy: number;
  daycareOccupancy: number;
  retentionRate: number;
  reviewCount: number;
  avgClientRating: number;
  outstandingInvoices: number;
  revPAK: number;
  servicesPerStaffHour: number;
};

interface Props {
  data: CompRow[];
}

type MetricCategory =
  | "bookings"
  | "financial"
  | "operational"
  | "customer"
  | "staff";

type Metric = {
  key: keyof CompRow;
  label: string;
  category: MetricCategory;
  format: (v: number) => string;
  higherIsBetter: boolean;
  /** Volume/currency metric that accumulates over the period (scales with the
   *  period selector). Rates and structural counts stay constant. */
  scales: boolean;
  growth?: keyof CompRow;
  /** Suppress the "% change vs last period" sub-line (e.g. the growth row). */
  hideChange?: boolean;
};

const pct = (v: number) => `${v}%`;
const count = (v: number) => v.toLocaleString();

// Metric catalogue, per spec Table 27, grouped by category.
const METRICS: Metric[] = [
  // ── Bookings ──
  {
    key: "bookings",
    label: "Total Bookings",
    category: "bookings",
    format: count,
    higherIsBetter: true,
    scales: true,
    growth: "bookingsGrowth",
  },
  {
    key: "newBookings",
    label: "New Bookings",
    category: "bookings",
    format: count,
    higherIsBetter: true,
    scales: true,
  },
  {
    key: "cancellationRate",
    label: "Cancellation Rate",
    category: "bookings",
    format: pct,
    higherIsBetter: false,
    scales: false,
  },
  {
    key: "noShowRate",
    label: "No-Show Rate",
    category: "bookings",
    format: pct,
    higherIsBetter: false,
    scales: false,
  },
  {
    key: "avgLeadTimeDays",
    label: "Avg Lead Time",
    category: "bookings",
    format: (v) => `${v.toFixed(1)} days`,
    higherIsBetter: true,
    scales: false,
  },
  // ── Financial ──
  {
    key: "revenue",
    label: "Revenue",
    category: "financial",
    format: (v) => `$${v.toLocaleString()}`,
    higherIsBetter: true,
    scales: true,
    growth: "revenueGrowth",
  },
  {
    key: "revenueGrowth",
    label: "Revenue Growth",
    category: "financial",
    format: (v) => `${v >= 0 ? "+" : ""}${v}%`,
    higherIsBetter: true,
    scales: false,
    hideChange: true,
  },
  {
    key: "avgBookingValue",
    label: "Avg Booking Value",
    category: "financial",
    format: (v) => `$${v.toFixed(2)}`,
    higherIsBetter: true,
    scales: false,
  },
  {
    key: "revPAK",
    label: "Revenue / Kennel-Night",
    category: "financial",
    format: (v) => `$${v.toFixed(0)}`,
    higherIsBetter: true,
    scales: false,
  },
  {
    key: "outstandingInvoices",
    label: "Outstanding Invoices",
    category: "financial",
    format: count,
    higherIsBetter: false,
    scales: false,
  },
  // ── Operations ──
  {
    key: "boardingOccupancy",
    label: "Boarding Occupancy",
    category: "operational",
    format: pct,
    higherIsBetter: true,
    scales: false,
  },
  {
    key: "daycareOccupancy",
    label: "Daycare Occupancy",
    category: "operational",
    format: pct,
    higherIsBetter: true,
    scales: false,
  },
  {
    key: "groomingVolume",
    label: "Grooming Appointments",
    category: "operational",
    format: count,
    higherIsBetter: true,
    scales: true,
  },
  {
    key: "trainingSessionsCompleted",
    label: "Training Sessions",
    category: "operational",
    format: count,
    higherIsBetter: true,
    scales: true,
  },
  {
    key: "boardingNights",
    label: "Boarding Nights",
    category: "operational",
    format: count,
    higherIsBetter: true,
    scales: true,
  },
  // ── Customer ──
  {
    key: "newCustomers",
    label: "New Clients",
    category: "customer",
    format: count,
    higherIsBetter: true,
    scales: true,
  },
  {
    key: "returningCustomers",
    label: "Returning Clients",
    category: "customer",
    format: count,
    higherIsBetter: true,
    scales: true,
  },
  {
    key: "retentionRate",
    label: "Retention Rate",
    category: "customer",
    format: pct,
    higherIsBetter: true,
    scales: false,
  },
  {
    key: "nps",
    label: "NPS Score",
    category: "customer",
    format: (v) => String(v),
    higherIsBetter: true,
    scales: false,
  },
  {
    key: "reviewCount",
    label: "Reviews",
    category: "customer",
    format: count,
    higherIsBetter: true,
    scales: true,
  },
  // ── Staff ──
  {
    key: "staffCount",
    label: "Staff Headcount",
    category: "staff",
    format: count,
    higherIsBetter: true,
    scales: false,
  },
  {
    key: "staffUtilization",
    label: "Staff Utilization",
    category: "staff",
    format: pct,
    higherIsBetter: true,
    scales: false,
  },
  {
    key: "avgClientRating",
    label: "Avg Client Rating",
    category: "staff",
    format: (v) => `${v.toFixed(1)} ★`,
    higherIsBetter: true,
    scales: false,
  },
  {
    key: "servicesPerStaffHour",
    label: "Services / Staff-Hour",
    category: "staff",
    format: (v) => v.toFixed(2),
    higherIsBetter: true,
    scales: false,
  },
];

const CATEGORY_TABS: {
  key: MetricCategory;
  label: string;
  icon: LucideIcon;
}[] = [
  { key: "bookings", label: "Bookings", icon: CalendarCheck },
  { key: "financial", label: "Financial", icon: DollarSign },
  { key: "operational", label: "Operations", icon: Activity },
  { key: "customer", label: "Customer", icon: Heart },
  { key: "staff", label: "Staff", icon: Users },
];

type PeriodKey = "week" | "month" | "quarter" | "year" | "custom";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "quarter", label: "This Quarter" },
  { key: "year", label: "Last 12 Months" },
  { key: "custom", label: "Custom" },
];

// Monthly figures are the source data; other periods scale by their share of a
// ~30-day month (quarter = 3 months, year = 12).
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

function periodLabel(period: PeriodKey, customDays: number): string {
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
      return customDays > 0
        ? `Custom · ${customDays} day${customDays === 1 ? "" : "s"}`
        : "Custom range";
  }
}

// Inclusive day count between two YYYY-MM-DD strings; 0 if unset/invalid.
function inclusiveDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}

// A value is "not offered" when a higher-is-better metric reads zero.
function scaledValue(metric: Metric, row: CompRow, factor: number): number {
  const base = Number(row[metric.key]);
  return metric.scales ? Math.round(base * factor) : base;
}
function isOffered(metric: Metric, row: CompRow): boolean {
  return !(Number(row[metric.key]) === 0 && metric.higherIsBetter);
}

// Best/worst location for a metric across the (offered) locations.
function leaders(metric: Metric, data: CompRow[], factor: number) {
  const entries = data
    .filter((d) => isOffered(metric, d))
    .map((d) => ({ loc: d, value: scaledValue(metric, d, factor) }));
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

// A metric×location cell: value in large text (scaled to the period), an
// optional "% change vs last period" beneath, best (green) / worst (red).
function MetricCell({
  metric,
  loc,
  data,
  factor,
}: {
  metric: Metric;
  loc: CompRow;
  data: CompRow[];
  factor: number;
}) {
  const offered = isOffered(metric, loc);
  const value = scaledValue(metric, loc, factor);
  const values = data.map((d) =>
    isOffered(metric, d) ? scaledValue(metric, d, factor) : NaN,
  );
  const highlight = offered
    ? bestWorstClass(value, values, metric.higherIsBetter)
    : "";
  const growth = metric.growth ? Number(loc[metric.growth]) : undefined;

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className={cn("text-lg font-bold tabular-nums", highlight)}>
        {formatMetricCell(offered ? value : undefined, metric.format)}
      </span>
      {!metric.hideChange &&
        (growth !== undefined ? (
          <ChangeChip value={growth} higherIsBetter={metric.higherIsBetter} />
        ) : (
          <span className="text-muted-foreground text-[10px] tabular-nums">
            vs last period —
          </span>
        ))}
    </div>
  );
}

export function PerformanceClient({ data }: Props) {
  const [category, setCategory] = useState<MetricCategory>("financial");
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(data.map((d) => d.locationId)),
  );

  const customDays = inclusiveDays(customFrom, customTo);
  const factor = periodFactor(period, customDays);
  const label = periodLabel(period, customDays);

  // Selected locations drive every table + the KPI tiles. At least one is kept.
  const activeData = useMemo(
    () => data.filter((d) => selectedIds.has(d.locationId)),
    [data, selectedIds],
  );
  const allSelected = selectedIds.size === data.length;
  const locationLabel = allSelected
    ? "All Locations"
    : `${selectedIds.size} location${selectedIds.size === 1 ? "" : "s"}`;

  function toggleLocation(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ── Network highlight KPIs (scaled to period, across selected locations) ──
  const kpis = useMemo(() => {
    const n = activeData.length || 1;
    const sum = (f: (d: CompRow) => number) =>
      activeData.reduce((acc, d) => acc + f(d), 0);
    const leaderBy = (f: (d: CompRow) => number) =>
      activeData.reduce(
        (best, d) => (f(d) > f(best) ? d : best),
        activeData[0],
      );
    return {
      revenue: Math.round(sum((d) => d.revenue) * factor),
      revenueGrowth: +(sum((d) => d.revenueGrowth) / n).toFixed(1),
      revenueLeader: leaderBy((d) => d.revenue),
      bookings: Math.round(sum((d) => d.bookings) * factor),
      bookingsGrowth: +(sum((d) => d.bookingsGrowth) / n).toFixed(1),
      bookingsLeader: leaderBy((d) => d.bookings),
      occupancy: Math.round(sum((d) => d.occupancyRate) / n),
      occupancyLeader: leaderBy((d) => d.occupancyRate),
      nps: Math.round(sum((d) => d.nps) / n),
      npsLeader: leaderBy((d) => d.nps),
    };
  }, [activeData, factor]);

  // Columns: Metric + one per selected location + Best + Worst.
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
      ...activeData.map<ColumnDef<Metric>>((loc) => ({
        key: loc.locationId,
        label: `${loc.shortCode} · ${loc.name}`,
        align: "right",
        render: (m) => (
          <MetricCell metric={m} loc={loc} data={activeData} factor={factor} />
        ),
      })),
      {
        key: "__best",
        label: "Best",
        align: "left",
        render: (m) => {
          const { best } = leaders(m, activeData, factor);
          if (!best) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {best.loc.shortCode} · {m.format(best.value)}
            </span>
          );
        },
      },
      {
        key: "__worst",
        label: "Worst",
        align: "left",
        render: (m) => {
          const { worst } = leaders(m, activeData, factor);
          if (!worst) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">
              {worst.loc.shortCode} · {m.format(worst.value)}
            </span>
          );
        },
      },
    ],
    [activeData, factor],
  );

  const categoryRows = useMemo(
    () => METRICS.filter((m) => m.category === category),
    [category],
  );

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
              Metric-by-metric comparison · {label} · {activeData.length} of{" "}
              {data.length} locations
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
                  setSelectedIds(new Set(data.map((d) => d.locationId)))
                }
              />
              All Locations
            </label>
            <Separator className="my-1" />
            {data.map((loc) => {
              const ls = locationStyles(loc);
              return (
                <label
                  key={loc.locationId}
                  className="hover:bg-muted/60 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                >
                  <Checkbox
                    checked={selectedIds.has(loc.locationId)}
                    onCheckedChange={() => toggleLocation(loc.locationId)}
                  />
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      ls.badge,
                    )}
                  >
                    {loc.shortCode}
                  </span>
                  <span className="truncate">{loc.name}</span>
                </label>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>

      {/* ── Highlight KPI tiles ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HqKpiTile
          label={`Network Revenue · ${label}`}
          value={`$${kpis.revenue.toLocaleString()}`}
          delta={kpis.revenueGrowth}
          sublabel={`Top: ${kpis.revenueLeader.name}`}
        />
        <HqKpiTile
          label={`Total Bookings · ${label}`}
          value={kpis.bookings.toLocaleString()}
          delta={kpis.bookingsGrowth}
          sublabel={`Top: ${kpis.bookingsLeader.name}`}
        />
        <HqKpiTile
          label="Avg Occupancy"
          value={kpis.occupancy}
          unit="%"
          sublabel={`Best: ${kpis.occupancyLeader.name} ${kpis.occupancyLeader.occupancyRate}%`}
        />
        <HqKpiTile
          label="Avg NPS"
          value={kpis.nps}
          sublabel={`Best: ${kpis.npsLeader.name} ${kpis.npsLeader.nps}`}
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

      {/* ── Tabbed trend charts ── */}
      <PerformanceTrendCharts
        period={period}
        customDays={customDays}
        selectedIds={selectedIds}
      />

      <p className="text-muted-foreground text-[11px]">
        Best-performing location per metric is green, worst is red · &ldquo;Not
        offered at this location&rdquo; marks a service not available at a
        branch.
      </p>
    </div>
  );
}
