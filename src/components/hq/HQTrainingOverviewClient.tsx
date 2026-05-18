"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
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
import { aggregateHqTrainingOverview } from "@/lib/hq-training-analytics";
import { getLocationsByFacility } from "@/data/locations";

/** Anchor the "this month" rollups to the mock data anchor (May 2026) so
 *  the demo lights up regardless of the user's real clock. Real backends
 *  would default to `new Date().toISOString()` here. */
const MOCK_MONTH_ANCHOR = "2026-05-17";

/** Doggieville is facility 11 per the locations seed — that's the only
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
  return new Date(`${iso.slice(0, 7)}-01T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function HQTrainingOverviewClient() {
  const locations = useMemo(() => getLocationsByFacility(FACILITY_ID), []);

  const { data: seriesList = [] } = useQuery(trainingQueries.series());
  const { data: enrollments = [] } = useQuery(
    trainingQueries.allSeriesEnrollments(),
  );
  const { data: attendances = [] } = useQuery(
    trainingQueries.allAttendances(),
  );
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">
          Training across all locations
        </h2>
        <p className="text-muted-foreground">
          Monday-morning rollup — every branch, every instructor, one
          screen. Showing month-of-{formatMonth(overview.monthKey)}.
        </p>
      </header>

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
        <Card className="from-indigo-50 to-violet-50 bg-linear-to-br shadow-sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <div className="bg-white/80 flex size-12 items-center justify-center rounded-xl shadow-sm">
                <Trophy className="text-amber-500 size-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Running the most classes
                </p>
                <p className="text-xl/tight font-bold text-slate-900">
                  {overview.topLocation.locationName}
                </p>
                <p className="text-muted-foreground text-[12px]">
                  {overview.topLocation.activeSeries} active series ·{" "}
                  {overview.topLocation.sessionsThisMonth} sessions this month
                  · {overview.topLocation.studentsEnrolled} enrolled
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
              <Star className="text-amber-500 size-4" />
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
                {overview.topInstructors.map((row, idx) => (
                  <li
                    key={row.instructorId}
                    className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
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
                        student{row.uniqueStudents === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <StarRow value={row.averageRating ?? 0} />
                      <span className="text-muted-foreground text-[10px]">
                        ({row.ratingsCount})
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
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
              {overview.locationBreakdown.map((row) => (
                <li
                  key={row.locationId}
                  className="grid grid-cols-1 gap-2 rounded-lg border bg-card px-3 py-2.5 sm:grid-cols-[1.5fr_repeat(4,1fr)] sm:items-center"
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
                      {overview.topLocation?.locationId === row.locationId && (
                        <p className="text-amber-600 inline-flex items-center gap-1 text-[10px] font-medium">
                          <Trophy className="size-3" />
                          Top performer
                        </p>
                      )}
                    </div>
                  </div>
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
                </li>
              ))}
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
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl/tight font-bold tabular-nums text-slate-900">
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
      <span className="text-muted-foreground hidden text-[10px] font-bold uppercase tracking-wider sm:inline">
        {label}
      </span>
      <span className="text-muted-foreground text-[11px] sm:hidden">
        {label}:
      </span>
      <span className="font-semibold tabular-nums text-slate-800">{value}</span>
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
      <div className="size-9 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-2 ring-white shadow-sm">
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
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700 ring-2 ring-white shadow-sm">
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
