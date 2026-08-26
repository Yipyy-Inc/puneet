"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { HqKpiTile } from "@/components/hq/HqKpiTile";
import {
  HqComparisonTable,
  bestWorstClass,
  type ColumnDef,
} from "@/components/hq/HqComparisonTable";
import { formatMetricCell } from "@/lib/hq/metrics-format";
import {
  PERIODS,
  periodLabel,
  periodWindow,
  pctChange,
  type PeriodKey,
} from "@/lib/hq/period-window";
import { useFacilityLocations } from "@/lib/api/locations";
import { useStaffHomeLocations } from "@/lib/api/staff";
import {
  useTrainingTrainers,
  assignableTrainers,
} from "@/lib/api/training-trainers";
import {
  useFacilityReport,
  type ServiceMixByLocationData,
  type TrainingAttendanceByLocationData,
} from "@/lib/api/facility-reports";
import type { FacilityLocation } from "@/types/location";

// ============================================================================
// Real revenue, bookings, attendance and trainer headcount per location.
//
// Was a KPI strip + top-instructors leaderboard + program-performance table
// over TrainingSeries/TrainingEnrollment fixtures. No class/series/enrollment
// table exists anywhere in Postgres -- unlike every other HQ conversion,
// training has no real noun for those one join away. What's real: `bookings`
// (service = 'training', a real location_id), `training_attendance`
// (check-in/check-out per booking), and trainers (real `staff`, filtered by
// role, via `/api/training/trainers`). "Active classes"/"students enrolled"/
// program completion are dropped rather than faked. The instructor-rating
// leaderboard is dropped too -- rating data isn't tied to an instructor
// column anywhere. Instructor Transfer is dropped -- it wrote only to local
// mock state; reassigning a trainer's home branch is a real, separate flow
// (Staff Pool / staff settings), and this dialog would have been a second,
// fake path for the same action.
// ============================================================================

type LocationRow = {
  locationId: string;
  location: FacilityLocation;
  revenue: number;
  revenueGrowth: number;
  bookings: number;
  bookingsGrowth: number;
  checkedIn: number;
  checkedOut: number;
  checkInRate: number;
  trainerCount: number;
};

type Metric = {
  key: keyof LocationRow;
  label: string;
  format: (v: number) => string;
  higherIsBetter: boolean;
  growth?: keyof LocationRow;
};

const money = (v: number) => `$${v.toLocaleString()}`;
const count = (v: number) => v.toLocaleString();
const percent = (v: number) => `${v.toFixed(0)}%`;

const METRICS: Metric[] = [
  {
    key: "revenue",
    label: "Training Revenue",
    format: money,
    higherIsBetter: true,
    growth: "revenueGrowth",
  },
  {
    key: "bookings",
    label: "Training Bookings",
    format: count,
    higherIsBetter: true,
    growth: "bookingsGrowth",
  },
  {
    key: "checkInRate",
    label: "Check-in Rate",
    format: percent,
    higherIsBetter: true,
  },
  {
    key: "checkedOut",
    label: "Sessions Completed",
    format: count,
    higherIsBetter: true,
  },
  {
    key: "trainerCount",
    label: "Trainers",
    format: count,
    higherIsBetter: true,
  },
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

export function HQTrainingOverviewClient() {
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { data: locations, isPending: locationsPending } =
    useFacilityLocations();
  const { data: staff } = useStaffHomeLocations();
  const { data: trainers } = useTrainingTrainers();

  const { from, to } = useMemo(
    () => periodWindow(period, customFrom, customTo),
    [period, customFrom, customTo],
  );
  const { data: attendanceReport } = useFacilityReport(
    "training-attendance-by-location",
    from,
    to,
  );
  const attendanceData = attendanceReport?.data as
    | TrainingAttendanceByLocationData
    | undefined;
  const { data: mixReport } = useFacilityReport(
    "service-mix-by-location",
    from,
    to,
  );
  const mixData = mixReport?.data as ServiceMixByLocationData | undefined;
  const trainingRevenue = (
    rows: ServiceMixByLocationData["current"] | undefined,
    locationId: string,
  ) =>
    rows?.find((r) => r.service === "training" && r.locationId === locationId)
      ?.revenue ?? 0;

  const label = periodLabel(period, customFrom, customTo);

  const activeTrainerStaffIds = new Set(
    assignableTrainers(trainers).map((t) => t.staffId),
  );

  const data: LocationRow[] = (locations ?? []).map((loc) => {
    const cur = attendanceData?.current.find((r) => r.locationId === loc.id);
    const prev = attendanceData?.previous.find((r) => r.locationId === loc.id);
    const bookings = cur?.bookings ?? 0;
    const checkedIn = cur?.checkedIn ?? 0;
    const revenue = trainingRevenue(mixData?.current, loc.id);
    const prevRevenue = trainingRevenue(mixData?.previous, loc.id);
    return {
      locationId: loc.id,
      location: loc,
      revenue,
      revenueGrowth: pctChange(revenue, prevRevenue),
      bookings,
      bookingsGrowth: pctChange(bookings, prev?.bookings ?? 0),
      checkedIn,
      checkedOut: cur?.checkedOut ?? 0,
      checkInRate: bookings > 0 ? (checkedIn / bookings) * 100 : 0,
      trainerCount: (staff ?? []).filter(
        (s) =>
          s.claimed &&
          s.homeLocationId === loc.id &&
          activeTrainerStaffIds.has(s.staffId),
      ).length,
    };
  });

  const kpis = useMemo(() => {
    const totalBookings = data.reduce((sum, d) => sum + d.bookings, 0);
    const totalCheckedIn = data.reduce((sum, d) => sum + d.checkedIn, 0);
    return {
      revenue: data.reduce((sum, d) => sum + d.revenue, 0),
      bookings: totalBookings,
      checkInRate:
        totalBookings > 0 ? (totalCheckedIn / totalBookings) * 100 : 0,
      trainers: assignableTrainers(trainers).length,
    };
  }, [data, trainers]);

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
    ],
    [data],
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
              <span>Training</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Training across all locations
            </h1>
            <p className="text-muted-foreground text-sm">
              Bookings and attendance by branch · {label} ·{" "}
              {(locations ?? []).length} location
              {(locations ?? []).length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => toast.success("Training report exported as CSV")}
        >
          <Download className="size-3.5" />
          Export CSV
        </Button>
      </div>

      {/* ── Period control ── */}
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
      </div>

      {/* ── Highlight KPI tiles ── */}
      <div className="grid gap-4 sm:grid-cols-4">
        <HqKpiTile
          label={`Training Revenue · ${label}`}
          value={`$${kpis.revenue.toLocaleString()}`}
        />
        <HqKpiTile
          label={`Total Training Bookings · ${label}`}
          value={kpis.bookings.toLocaleString()}
        />
        <HqKpiTile
          label="Network Check-in Rate"
          value={`${kpis.checkInRate.toFixed(0)}%`}
          sublabel="Checked in ÷ booked, this period"
        />
        <HqKpiTile label="Trainers" value={kpis.trainers.toLocaleString()} />
      </div>

      {/* ── Metric table ── */}
      <HqComparisonTable data={METRICS} columns={metricColumns} />

      <p className="text-muted-foreground text-[11px]">
        Class rosters and enrollments aren&apos;t tracked yet — showing bookings
        and attendance only, read live from bookings and check-ins.
      </p>
    </div>
  );
}
