"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Download,
  Trophy,
  Sparkles,
  ChevronRight,
  Crown,
  Medal,
  Target,
  Activity,
  Users,
  DollarSign,
  Heart,
  Zap,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  locationStyles,
  type LocationColorClasses,
} from "@/lib/hq/location-styles";
import { MetricBar } from "@/components/hq/charts/MetricBar";

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

type MetricGroup = "all" | "financial" | "operational" | "customer" | "staff";

type Metric = {
  key: keyof CompRow;
  label: string;
  group: Exclude<MetricGroup, "all">;
  format: (v: number) => string;
  higherIsBetter: boolean;
  growth?: keyof CompRow;
  unit?: string;
};

const METRICS: Metric[] = [
  { key: "revenue",                   label: "Revenue",               group: "financial",   format: (v) => `$${v.toLocaleString()}`,    higherIsBetter: true,  growth: "revenueGrowth" },
  { key: "bookings",                  label: "Total Bookings",        group: "financial",   format: (v) => v.toLocaleString(),          higherIsBetter: true,  growth: "bookingsGrowth" },
  { key: "avgBookingValue",           label: "Avg Booking Value",     group: "financial",   format: (v) => `$${v.toFixed(2)}`,          higherIsBetter: true },
  { key: "cancellationRate",          label: "Cancellation Rate",     group: "financial",   format: (v) => `${v}%`,                     higherIsBetter: false },
  { key: "occupancyRate",             label: "Occupancy Rate",        group: "operational", format: (v) => `${v}%`,                     higherIsBetter: true },
  { key: "daycareAttendance",         label: "Daycare Attendance",    group: "operational", format: (v) => v.toLocaleString(),          higherIsBetter: true },
  { key: "groomingVolume",            label: "Grooming Appointments", group: "operational", format: (v) => v.toLocaleString(),          higherIsBetter: true },
  { key: "boardingNights",            label: "Boarding Nights",       group: "operational", format: (v) => v.toLocaleString(),          higherIsBetter: true },
  { key: "trainingSessionsCompleted", label: "Training Sessions",     group: "operational", format: (v) => v.toLocaleString(),          higherIsBetter: true },
  { key: "newCustomers",              label: "New Clients",           group: "customer",    format: (v) => v.toLocaleString(),          higherIsBetter: true },
  { key: "returningCustomers",        label: "Returning Clients",     group: "customer",    format: (v) => v.toLocaleString(),          higherIsBetter: true },
  { key: "nps",                       label: "NPS Score",             group: "customer",    format: (v) => String(v),                   higherIsBetter: true },
  { key: "staffCount",                label: "Staff Headcount",       group: "staff",       format: (v) => v.toLocaleString(),          higherIsBetter: true },
  { key: "staffUtilization",          label: "Staff Utilization",     group: "staff",       format: (v) => `${v}%`,                     higherIsBetter: true },
  { key: "activeServices",            label: "Active Services",       group: "staff",       format: (v) => v.toLocaleString(),          higherIsBetter: true },
];

const GROUPS: { key: MetricGroup; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "all",         label: "All metrics",   icon: Sparkles },
  { key: "financial",   label: "Financial",     icon: DollarSign },
  { key: "operational", label: "Operations",    icon: Activity },
  { key: "customer",    label: "Customer",      icon: Heart },
  { key: "staff",       label: "Staff",         icon: Users },
];

function getBestIndex(data: CompRow[], key: keyof CompRow, higherIsBetter: boolean): number {
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

function rankByScore(data: CompRow[]) {
  return [...data]
    .map((row, idx) => ({
      idx,
      row,
      score:
        row.revenue / 1000 +
        row.bookings * 0.3 +
        row.occupancyRate * 2 +
        row.nps * 1.5 +
        row.staffUtilization * 1.2 -
        row.cancellationRate * 5,
    }))
    .sort((a, b) => b.score - a.score);
}

function ChangeChip({ value, higherIsBetter = true }: { value: number; higherIsBetter?: boolean }) {
  if (value === 0) {
    return <span className="text-muted-foreground text-[11px] tabular-nums">—</span>;
  }
  const positive = higherIsBetter ? value >= 0 : value <= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1 py-px text-[10px] font-semibold tabular-nums",
        positive
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      )}
    >
      {positive ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
      {value >= 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function PodiumCard({
  row,
  rank,
  s,
}: {
  row: CompRow;
  rank: 1 | 2 | 3;
  s: LocationColorClasses;
}) {
  const Icon = rank === 1 ? Crown : rank === 2 ? Trophy : Medal;
  const heightClass = rank === 1 ? "min-h-[180px]" : rank === 2 ? "min-h-[160px]" : "min-h-[140px]";
  const labelClass = rank === 1 ? "from-amber-400 to-amber-600" : rank === 2 ? "from-slate-300 to-slate-500" : "from-orange-400 to-orange-600";
  return (
    <div className="flex flex-col items-center">
      <Card
        className={cn(
          "relative w-full overflow-hidden border-2 transition-all duration-300",
          s.borderSoft,
          heightClass,
          rank === 1 && "ring-1 ring-amber-300/50 shadow-lg",
        )}
      >
        <div className={cn("absolute inset-0 bg-linear-to-b opacity-40", s.gradFrom, s.gradTo)} />
        <CardContent className="relative flex h-full flex-col items-center justify-center gap-2 px-4 py-4">
          <div
            className={cn(
              "absolute -top-3 left-1/2 -translate-x-1/2 flex size-7 items-center justify-center rounded-full bg-linear-to-br text-white shadow-md",
              labelClass,
            )}
          >
            <Icon className="size-3.5" />
          </div>
          <div
            className={cn(
              "mt-2 flex items-center justify-center rounded-2xl text-sm font-bold text-white shadow-md",
              s.bg,
              rank === 1 ? "size-14" : "size-11",
            )}
          >
            {row.shortCode}
          </div>
          <div className="text-center">
            <p className={cn("font-semibold leading-tight", rank === 1 ? "text-base" : "text-sm")}>
              {row.name}
            </p>
            <p className="text-muted-foreground text-[11px]">Top: {row.topService}</p>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="text-center">
              <p className={cn("font-bold tabular-nums", rank === 1 ? "text-lg" : "text-base", s.text)}>
                ${(row.revenue / 1000).toFixed(1)}k
              </p>
              <p className="text-muted-foreground text-[10px]">revenue</p>
            </div>
            <div className="bg-border h-8 w-px" />
            <div className="text-center">
              <p className={cn("font-bold tabular-nums", rank === 1 ? "text-lg" : "text-base")}>
                {row.occupancyRate}%
              </p>
              <p className="text-muted-foreground text-[10px]">occupancy</p>
            </div>
          </div>
          <span
            className={cn(
              "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              rank === 1
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                : rank === 2
                ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                : "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
            )}
          >
            #{rank} this period
          </span>
        </CardContent>
      </Card>
    </div>
  );
}

function HighlightCard({
  label,
  value,
  caption,
  icon: Icon,
  s,
}: {
  label: string;
  value: string;
  caption: string;
  icon: React.ComponentType<{ className?: string }>;
  s: LocationColorClasses;
}) {
  return (
    <Card className="group overflow-hidden">
      <CardContent className="relative pt-4 pb-4">
        <div className={cn("absolute inset-0 opacity-50 bg-linear-to-br", s.gradFrom, s.gradTo)} />
        <div className="relative flex items-start gap-3">
          <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", s.bgSoft)}>
            <Icon className={cn("size-4.5", s.text)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              {label}
            </p>
            <p className="mt-0.5 truncate text-base font-bold">{value}</p>
            <p className="text-muted-foreground truncate text-[11px]">{caption}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LocationComparisonClient({ data }: Props) {
  const [group, setGroup] = useState<MetricGroup>("all");

  const filteredMetrics = useMemo(
    () => (group === "all" ? METRICS : METRICS.filter((m) => m.group === group)),
    [group],
  );

  const ranking = useMemo(() => rankByScore(data), [data]);

  // Highlight winners
  const bestRevenueIdx = getBestIndex(data, "revenue", true);
  const fastestGrowthIdx = getBestIndex(data, "revenueGrowth", true);
  const bestOccupancyIdx = getBestIndex(data, "occupancyRate", true);
  const bestNpsIdx = getBestIndex(data, "nps", true);

  const cardsCount = data.length;

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
              <Link href="/facility/hq/overview" className="hover:text-foreground transition-colors">
                HQ
              </Link>
              <ChevronRight className="size-3" />
              <span>Comparison</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Location Comparison</h1>
            <p className="text-muted-foreground text-sm">
              Side-by-side performance across {cardsCount} locations · April 2026
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => toast.success("Comparison report exported as CSV")}
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

      {/* ── Champion podium ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Crown className="size-4 text-amber-500" />
              This Month&apos;s Standings
            </h2>
            <p className="text-muted-foreground text-xs">
              Composite score · revenue, occupancy, retention, satisfaction
            </p>
          </div>
        </div>
        <div className="grid items-end gap-3 sm:grid-cols-3">
          {/* Render in podium order: 2nd, 1st, 3rd */}
          {(() => {
            const order: { rank: 1 | 2 | 3; idx: number }[] = [];
            if (ranking[1]) order.push({ rank: 2, idx: ranking[1].idx });
            if (ranking[0]) order.push({ rank: 1, idx: ranking[0].idx });
            if (ranking[2]) order.push({ rank: 3, idx: ranking[2].idx });
            return order.map(({ rank, idx }) => {
              const row = data[idx];
              const s = locationStyles(row);
              return <PodiumCard key={row.locationId} row={row} rank={rank} s={s} />;
            });
          })()}
        </div>
      </div>

      {/* ── Highlight reel ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <HighlightCard
          label="Top Revenue"
          value={`$${(data[bestRevenueIdx]?.revenue / 1000).toFixed(1)}k`}
          caption={`${data[bestRevenueIdx]?.name} leads the network`}
          icon={DollarSign}
          s={locationStyles(data[bestRevenueIdx])}
        />
        <HighlightCard
          label="Fastest Growth"
          value={`+${data[fastestGrowthIdx]?.revenueGrowth}%`}
          caption={`${data[fastestGrowthIdx]?.name} accelerating fastest`}
          icon={Zap}
          s={locationStyles(data[fastestGrowthIdx])}
        />
        <HighlightCard
          label="Best Occupancy"
          value={`${data[bestOccupancyIdx]?.occupancyRate}%`}
          caption={`${data[bestOccupancyIdx]?.name} maxing capacity`}
          icon={Target}
          s={locationStyles(data[bestOccupancyIdx])}
        />
        <HighlightCard
          label="Top Satisfaction"
          value={`NPS ${data[bestNpsIdx]?.nps}`}
          caption={`${data[bestNpsIdx]?.name} loved by customers`}
          icon={Heart}
          s={locationStyles(data[bestNpsIdx])}
        />
      </div>

      {/* ── Header strip with location chips ── */}
      <Card className="overflow-hidden">
        <div className="border-b">
          <div className="flex items-center gap-1 overflow-x-auto p-1.5">
            {GROUPS.map((g) => (
              <button
                key={g.key}
                onClick={() => setGroup(g.key)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  group === g.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <g.icon className="size-3.5" />
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location header row */}
        <div className="bg-muted/30 grid border-b text-[11px] font-semibold tracking-wider uppercase">
          <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr]">
            <div className="text-muted-foreground px-4 py-3">Metric</div>
            <div
              className={cn(
                "grid divide-x",
                cardsCount === 2 && "grid-cols-2",
                cardsCount === 3 && "grid-cols-3",
                cardsCount === 4 && "grid-cols-4",
                cardsCount >= 5 && "grid-cols-5",
              )}
            >
              {data.map((loc) => {
                const s = locationStyles(loc);
                return (
                  <div
                    key={loc.locationId}
                    className="flex items-center justify-center gap-2 px-3 py-3"
                  >
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-md text-[10px] font-bold text-white",
                        s.bg,
                      )}
                    >
                      {loc.shortCode}
                    </span>
                    <span className={cn("text-[11px]", s.text)}>{loc.name.split("–")[1]?.trim() ?? loc.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Metric rows */}
        <div className="divide-y">
          {filteredMetrics.map((metric) => {
            const bestIdx = getBestIndex(data, metric.key, metric.higherIsBetter);
            const numericValues = data.map((row) => Number(row[metric.key]) || 0);
            const peak = Math.max(...numericValues, 1);

            return (
              <div
                key={metric.key as string}
                className="hover:bg-muted/20 group grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] transition-colors"
              >
                <div className="flex flex-col justify-center px-4 py-3">
                  <p className="text-xs font-semibold">{metric.label}</p>
                  <p className="text-muted-foreground text-[10px]">
                    {metric.higherIsBetter ? "Higher is better" : "Lower is better"}
                  </p>
                </div>
                <div
                  className={cn(
                    "grid divide-x",
                    cardsCount === 2 && "grid-cols-2",
                    cardsCount === 3 && "grid-cols-3",
                    cardsCount === 4 && "grid-cols-4",
                    cardsCount >= 5 && "grid-cols-5",
                  )}
                >
                  {data.map((row, i) => {
                    const v = Number(row[metric.key]);
                    const s = locationStyles(row);
                    const isBest = i === bestIdx && v !== 0;
                    const pct = peak === 0 ? 0 : (v / peak) * 100;
                    const growthVal = metric.growth ? Number(row[metric.growth]) : undefined;

                    return (
                      <div
                        key={row.locationId}
                        className={cn("flex flex-col justify-center gap-1.5 px-3 py-3", isBest && s.bgSofter)}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={cn(
                              "text-sm font-semibold tabular-nums",
                              isBest && s.text,
                              v === 0 && "text-muted-foreground",
                            )}
                          >
                            {v === 0 && metric.higherIsBetter ? (
                              <span className="text-muted-foreground text-xs">N/A</span>
                            ) : (
                              metric.format(v)
                            )}
                          </span>
                          {isBest && (
                            <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-bold", s.text)}>
                              <Trophy className="size-2.5 fill-current" />
                              best
                            </span>
                          )}
                        </div>
                        <MetricBar
                          percent={pct}
                          fillClassName={cn(s.bg, !isBest && "opacity-60")}
                          trackClassName="bg-muted"
                          size="xs"
                        />
                        {growthVal !== undefined && (
                          <ChangeChip value={growthVal} higherIsBetter={metric.higherIsBetter} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <p>
          Trophy marks the best-performing location per metric · N/A = service not offered at this location
        </p>
        <p>Composite score considers revenue, occupancy, NPS, utilization & cancellations.</p>
      </div>
    </div>
  );
}
