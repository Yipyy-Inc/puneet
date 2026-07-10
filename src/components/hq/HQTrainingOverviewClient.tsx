"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowLeftRight,
  Award,
  BookOpen,
  Building2,
  DollarSign,
  GraduationCap,
  MapPin,
  Sparkles,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import {
  aggregateHqTrainingOverview,
  type HqTrainingProgramRow,
} from "@/lib/hq-training-analytics";
import { getLocationsByFacility } from "@/data/locations";
import {
  HqComparisonTable,
  type ColumnDef,
} from "@/components/hq/HqComparisonTable";
import { locationStyles } from "@/lib/hq/location-styles";
import {
  InstructorTransferDialog,
  type InstructorTransfer,
} from "@/components/hq/InstructorTransferDialog";

/** Anchor the "this month" rollups to the mock data anchor (May 2026) so
 *  the demo lights up regardless of the user's real clock. Real backends
 *  would default to `new Date().toISOString()` here. */
const MOCK_MONTH_ANCHOR = "2026-05-17";

/** Yipyy is facility 11 per the locations seed — that's the only
 *  multi-location facility in the mock so the HQ page is hardcoded to it. */
const FACILITY_ID = 11;

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatMonth(iso: string): string {
  return new Date(`${iso.slice(0, 7)}-01T00:00:00`).toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric",
    },
  );
}

export function HQTrainingOverviewClient() {
  const locations = useMemo(() => getLocationsByFacility(FACILITY_ID), []);

  const { data: seriesList = [] } = useQuery(trainingQueries.series());
  const { data: enrollments = [] } = useQuery(
    trainingQueries.allSeriesEnrollments(),
  );
  const { data: attendances = [] } = useQuery(trainingQueries.allAttendances());
  const { data: trainers = [] } = useQuery(trainingQueries.trainers());
  const { data: packages = [] } = useQuery(trainingQueries.packages());

  const overview = useMemo(
    () =>
      aggregateHqTrainingOverview({
        locations,
        seriesList,
        enrollments,
        attendances,
        trainers,
        packages,
        monthAnchor: MOCK_MONTH_ANCHOR,
      }),
    [locations, seriesList, enrollments, attendances, trainers, packages],
  );

  const [transferOpen, setTransferOpen] = useState(false);
  const [transfers, setTransfers] = useState<InstructorTransfer[]>([]);

  const locById = useMemo(
    () => new Map(locations.map((l) => [l.id, l])),
    [locations],
  );

  // Each instructor's busiest teaching location — pre-fills a transfer's origin.
  const homeByInstructor = useMemo(() => {
    const counts = new Map<string, Map<string, number>>();
    for (const s of seriesList) {
      if (!s.instructorId || !s.locationId) continue;
      const byLoc = counts.get(s.instructorId) ?? new Map<string, number>();
      byLoc.set(s.locationId, (byLoc.get(s.locationId) ?? 0) + 1);
      counts.set(s.instructorId, byLoc);
    }
    const home: Record<string, string> = {};
    for (const [instructorId, byLoc] of counts) {
      const top = [...byLoc.entries()].sort((a, b) => b[1] - a[1])[0];
      if (top) home[instructorId] = top[0];
    }
    return home;
  }, [seriesList]);

  const programColumns = useMemo<ColumnDef<HqTrainingProgramRow>[]>(
    () => [
      {
        key: "programName",
        label: "Program",
        align: "left",
        sortable: true,
        sortValue: (r) => r.programName,
        render: (r) => (
          <span className="font-medium text-slate-800">{r.programName}</span>
        ),
      },
      {
        key: "enrollments",
        label: "Enrollments",
        align: "right",
        sortable: true,
        sortValue: (r) => r.enrollments,
        render: (r) => <span className="tabular-nums">{r.enrollments}</span>,
      },
      {
        key: "completionRate",
        label: "Completion",
        align: "right",
        sortable: true,
        sortValue: (r) => r.completionRate,
        render: (r) => (
          <span className="tabular-nums">
            {Math.round(r.completionRate * 100)}%
          </span>
        ),
      },
      {
        key: "graduationRate",
        label: "Graduation",
        align: "right",
        sortable: true,
        sortValue: (r) => r.graduationRate,
        render: (r) => (
          <span className="tabular-nums">
            {Math.round(r.graduationRate * 100)}%
          </span>
        ),
      },
      {
        key: "revenue",
        label: "Revenue",
        align: "right",
        sortable: true,
        sortValue: (r) => r.revenue,
        render: (r) => (
          <span className="font-semibold tabular-nums">
            {formatCurrency(r.revenue)}
          </span>
        ),
      },
      {
        key: "locations",
        label: "Locations",
        align: "left",
        render: (r) =>
          r.locationIds.length === 0 ? (
            <span className="text-muted-foreground text-xs">—</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {r.locationIds.map((id) => {
                const loc = locById.get(id);
                if (!loc) return null;
                return (
                  <span
                    key={id}
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white",
                      locationStyles(loc).bg,
                    )}
                  >
                    {loc.shortCode}
                  </span>
                );
              })}
            </div>
          ),
      },
    ],
    [locById],
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <header className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">
            Training across all locations
          </h2>
          <p className="text-muted-foreground">
            Monday-morning rollup — every branch, every instructor, one screen.
            Showing month-of-{formatMonth(overview.monthKey)}.
          </p>
        </header>
        <div className="flex flex-col items-end gap-1">
          <Button className="gap-1.5" onClick={() => setTransferOpen(true)}>
            <ArrowLeftRight className="size-4" />
            Instructor Transfer
          </Button>
          {transfers.length > 0 && (
            <span className="text-muted-foreground text-[11px]">
              {transfers.length} transfer{transfers.length === 1 ? "" : "s"}{" "}
              created this session
            </span>
          )}
        </div>
      </div>

      {/* KPI strip ──────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Students Enrolled"
          value={overview.totalStudentsEnrolled.toString()}
          hint={`Across ${overview.locationBreakdown.length} location${overview.locationBreakdown.length === 1 ? "" : "s"}`}
          icon={Users}
          tone="indigo"
        />
        <KpiCard
          label="Sessions Completed"
          value={overview.totalSessionsThisMonth.toString()}
          hint={`In ${formatMonth(overview.monthKey)}`}
          icon={BookOpen}
          tone="emerald"
        />
        <KpiCard
          label="Training Revenue"
          value={formatCurrency(overview.totalRevenue)}
          hint="Across active + recent enrollments"
          icon={DollarSign}
          tone="amber"
        />
        <KpiCard
          label="Active Series"
          value={overview.activeSeriesCount.toString()}
          hint={
            overview.topLocation
              ? `${overview.topLocation.locationName} leads`
              : "No active series"
          }
          icon={GraduationCap}
          tone="sky"
        />
      </section>

      {/* Top location banner ───────────────────────────────────────────── */}
      {overview.topLocation && (
        <Card className="bg-linear-to-br from-indigo-50 to-violet-50 shadow-sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-white/80 shadow-sm">
                <Trophy className="size-6 text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Running the most classes
                </p>
                <p className="text-xl/tight font-bold text-slate-900">
                  {overview.topLocation.locationName}
                </p>
                <p className="text-muted-foreground text-[12px]">
                  {overview.topLocation.activeSeries} active series ·{" "}
                  {overview.topLocation.sessionsThisMonth} sessions this month ·{" "}
                  {overview.topLocation.studentsEnrolled} enrolled
                </p>
              </div>
            </div>
            {overview.topLocation.color && (
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: overview.topLocation.color }}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Top instructors + location breakdown side-by-side on desktop ───── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="size-4 text-amber-500" />
              Top Instructors
              <Badge
                variant="outline"
                className="border-slate-200 bg-slate-50 text-[10px] text-slate-600"
              >
                By avg student rating
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {overview.topInstructors.length === 0 ? (
              <p className="text-muted-foreground text-[12.5px] italic">
                Not enough student ratings on file yet — instructors need at
                least 3 ratings to land on this leaderboard.
              </p>
            ) : (
              <ol className="space-y-2">
                {overview.topInstructors.map((row, idx) => {
                  const netAvg = overview.networkAverageRating;
                  const rating = row.averageRating ?? 0;
                  const delta =
                    netAvg !== null
                      ? Math.round((rating - netAvg) * 10) / 10
                      : null;
                  return (
                    <li
                      key={row.instructorId}
                      className="bg-card flex items-center gap-3 rounded-lg border px-3 py-2"
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                          idx === 0
                            ? "bg-amber-100 text-amber-700"
                            : idx === 1
                              ? "bg-slate-200 text-slate-700"
                              : idx === 2
                                ? "bg-orange-100 text-orange-700"
                                : "bg-slate-100 text-slate-600",
                        )}
                      >
                        {idx + 1}
                      </span>
                      <InstructorAvatar
                        name={row.instructorName}
                        photoUrl={row.photoUrl}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {row.instructorName}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          {row.totalSessions} sessions · {row.uniqueStudents}{" "}
                          student{row.uniqueStudents === 1 ? "" : "s"} ·{" "}
                          {formatCurrency(row.revenue)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1">
                          <StarRow value={rating} />
                          <span className="text-muted-foreground text-[10px]">
                            ({row.ratingsCount})
                          </span>
                        </div>
                        {delta !== null && (
                          <span
                            className={cn(
                              "text-[10px] font-semibold tabular-nums",
                              delta > 0
                                ? "text-emerald-600"
                                : delta < 0
                                  ? "text-rose-600"
                                  : "text-muted-foreground",
                            )}
                          >
                            {delta > 0 ? "+" : ""}
                            {delta.toFixed(1)} vs network avg
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
            {overview.networkAverageRating !== null &&
              overview.topInstructors.length > 0 && (
                <p className="text-muted-foreground mt-3 text-[11px]">
                  Network average:{" "}
                  <strong>{overview.networkAverageRating.toFixed(1)}★</strong>{" "}
                  across all rated instructors — deltas above show each
                  instructor relative to it.
                </p>
              )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="text-muted-foreground size-4" />
              Location breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {overview.locationBreakdown.map((row) => {
                const hasTraining =
                  row.activeSeries > 0 ||
                  row.studentsEnrolled > 0 ||
                  row.sessionsThisMonth > 0;
                return (
                  <li
                    key={row.locationId}
                    className={cn(
                      "bg-card grid grid-cols-1 gap-2 rounded-lg border px-3 py-2.5 sm:grid-cols-[1.5fr_repeat(4,1fr)] sm:items-center",
                      !hasTraining && "opacity-70",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {row.color ? (
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: row.color }}
                        />
                      ) : (
                        <MapPin className="text-muted-foreground size-3.5" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {row.locationName}
                        </p>
                        {overview.topLocation?.locationId ===
                          row.locationId && (
                          <p className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600">
                            <Trophy className="size-3" />
                            Top performer
                          </p>
                        )}
                      </div>
                    </div>
                    {hasTraining ? (
                      <>
                        <Metric
                          label="Students"
                          value={row.studentsEnrolled.toString()}
                          icon={Users}
                        />
                        <Metric
                          label="Active series"
                          value={row.activeSeries.toString()}
                          icon={GraduationCap}
                        />
                        <Metric
                          label="Sessions / mo"
                          value={row.sessionsThisMonth.toString()}
                          icon={BookOpen}
                        />
                        <Metric
                          label="Revenue"
                          value={formatCurrency(row.revenue)}
                          icon={DollarSign}
                        />
                      </>
                    ) : (
                      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[12px] italic sm:col-span-4">
                        <GraduationCap className="size-3.5" />
                        No active training
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="text-muted-foreground mt-3 inline-flex items-center gap-1 text-[11px]">
              <Sparkles className="size-3" />
              All training data is unified — instructors see only their
              location&apos;s calendar by default; owners + HQ managers see
              every location at once.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Program performance ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="text-muted-foreground size-4" />
            Program Performance
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            Enrolment, completion, graduation, and revenue by program across the
            network — the numbers behind &ldquo;which programs to expand&rdquo;.
          </p>
        </CardHeader>
        <CardContent>
          {overview.programPerformance.length === 0 ? (
            <p className="text-muted-foreground text-[12.5px] italic">
              No programs with enrolments yet.
            </p>
          ) : (
            <HqComparisonTable
              data={overview.programPerformance}
              columns={programColumns}
              searchKey="programName"
              searchPlaceholder="Search programs…"
            />
          )}
        </CardContent>
      </Card>

      {transferOpen && (
        <InstructorTransferDialog
          trainers={trainers}
          locations={locations}
          homeByInstructor={homeByInstructor}
          onOpenChange={(o) => {
            if (!o) setTransferOpen(false);
          }}
          onCreate={(transfer) => {
            setTransfers((prev) => [transfer, ...prev]);
            setTransferOpen(false);
            const toName =
              locById.get(transfer.toLocationId)?.name ?? transfer.toLocationId;
            toast.success(
              `${transfer.instructorName} transferred to ${toName} on ${transfer.effectiveDate}`,
            );
          }}
        />
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Users;
  tone: "indigo" | "emerald" | "amber" | "sky";
}) {
  const toneCls = {
    indigo: "bg-indigo-100 text-indigo-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    sky: "bg-sky-100 text-sky-700",
  }[tone];
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            toneCls,
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
            {label}
          </p>
          <p className="text-2xl/tight font-bold text-slate-900 tabular-nums">
            {value}
          </p>
          <p className="text-muted-foreground truncate text-[11px]">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Users;
}) {
  return (
    <div className="flex items-center gap-1.5 sm:flex-col sm:items-start sm:gap-0">
      <Icon className="text-muted-foreground size-3.5 sm:hidden" />
      <span className="text-muted-foreground hidden text-[10px] font-bold tracking-wider uppercase sm:inline">
        {label}
      </span>
      <span className="text-muted-foreground text-[11px] sm:hidden">
        {label}:
      </span>
      <span className="font-semibold text-slate-800 tabular-nums">{value}</span>
    </div>
  );
}

function InstructorAvatar({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl?: string;
}) {
  if (photoUrl) {
    return (
      <div className="size-9 shrink-0 overflow-hidden rounded-full bg-slate-100 shadow-sm ring-2 ring-white">
        <Image
          src={photoUrl}
          alt={name}
          width={36}
          height={36}
          className="size-full object-cover"
          unoptimized
        />
      </div>
    );
  }
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700 shadow-sm ring-2 ring-white">
      {initials || <Award className="size-4" />}
    </div>
  );
}

function StarRow({ value }: { value: number }) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full;
        const half = !filled && i === full && hasHalf;
        return (
          <Star
            key={i}
            className={cn(
              "size-3",
              filled
                ? "fill-amber-400 text-amber-400"
                : half
                  ? "fill-amber-400/60 text-amber-400"
                  : "text-slate-300",
            )}
          />
        );
      })}
      <span className="text-muted-foreground ml-1 text-[10px] tabular-nums">
        {value.toFixed(1)}
      </span>
    </span>
  );
}
