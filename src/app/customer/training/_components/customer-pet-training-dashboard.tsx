"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  GraduationCap,
  LineChart,
  MapPin,
  PawPrint,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  User2,
} from "lucide-react";
import type { PetTrainingDashboard } from "@/lib/customer-training-dashboard";
import {
  fanOutHomeworkUpsert,
  hasPracticedToday,
  markPracticedToday,
} from "@/lib/training-homework";
import type {
  SessionAttendance,
  TrainingEnrollment,
  TrainingHomework,
} from "@/lib/training-enrollment";
import type { TrainingSeries } from "@/lib/training-series";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PetProgressCharts } from "@/components/training/pet-progress-charts";
import { PathwayJourney } from "@/components/training/pathway-journey";
import { MilestoneTrophyShelf } from "@/components/training/milestone-visuals";
import { EXERCISE_RATING_LABELS } from "@/lib/training-report-cards";
import { computePetMilestones } from "@/lib/pet-milestones";
import { useQuery } from "@tanstack/react-query";
import { trainingQueries } from "@/lib/api/training";

// Recharts pulls a heavy dependency tree — defer it to first paint so the
// rest of the dashboard renders fast on the customer portal.
const ExerciseProgressChart = dynamic(
  () =>
    import("@/components/training/exercise-progress-chart").then(
      (m) => m.ExerciseProgressChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

interface Props {
  dashboard: PetTrainingDashboard;
  todayISO: string;
  nowMs: number;
  /** Series enrollments for this customer — passed through so the Progress
   *  sub-tab can render the full per-exercise chart set scoped to this pet. */
  enrollments: TrainingEnrollment[];
  /** Series id → series record map (built once in the parent) — also feeds
   *  the Progress sub-tab so chart tooltips show series names. */
  seriesById: Map<string, TrainingSeries>;
  /** Facility-wide attendance records (the parent already queries them).
   *  Used by the Overview mini progress panel to compute start → current
   *  per-exercise ratings scoped to the active enrollment. */
  attendances: SessionAttendance[];
}

function formatDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatShort(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map((p) => Number(p));
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function relativeDays(iso: string, todayISO: string): string {
  const today = new Date(`${todayISO}T00:00:00`).getTime();
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
  const days = Math.round((target - today) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 0 && days < 7) return `in ${days}d`;
  if (days < 0 && days > -7) return `${-days}d ago`;
  if (days >= 7) return `in ${Math.round(days / 7)}w`;
  return `${Math.round(-days / 7)}w ago`;
}

export function CustomerPetTrainingDashboard({
  dashboard,
  todayISO,
  nowMs,
  enrollments,
  seriesById,
  attendances,
}: Props) {
  const { pet, currentProgram } = dashboard;
  void nowMs;

  // Scope to this pet only — the parent already passes the whole owner's
  // enrollments, and the Progress component uses petId for the attendance
  // query, so we just keep enrollments that belong to this pet.
  const petEnrollments = enrollments.filter((e) => e.petId === pet.id);
  const petAttendances = attendances.filter((a) =>
    petEnrollments.some((e) => e.id === a.enrollmentId),
  );
  const petEnrollmentIds = petEnrollments.map((e) => e.id);
  const { data: petHomework = [] } = useQuery(
    trainingQueries.homeworkForEnrollments(petEnrollmentIds),
  );
  const milestones = computePetMilestones({
    attendances: petAttendances,
    enrollments: petEnrollments,
    seriesById,
    homework: petHomework,
  });

  return (
    <article className="space-y-3">
      {/* Pet header ────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center gap-3">
        <div className="relative shrink-0">
          {pet.imageUrl ? (
            <div className="size-12 overflow-hidden rounded-xl shadow-sm ring-2 ring-white">
              <Image
                src={pet.imageUrl}
                alt={pet.name}
                width={48}
                height={48}
                className="size-full object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl shadow-sm ring-2 ring-white">
              <PawPrint className="size-5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg/tight font-bold text-slate-900">{pet.name}</h3>
          <p className="text-muted-foreground text-[12px]">
            {pet.breed}
            {currentProgram.enrollment &&
              !currentProgram.isBetweenPrograms &&
              ` · ${currentProgram.enrollment.courseTypeName}`}
            {currentProgram.isBetweenPrograms && " · Between programs"}
          </p>
        </div>
        {currentProgram.enrollment && (
          <Badge
            variant="outline"
            className={cn(
              "gap-1 text-[10px]",
              currentProgram.isBetweenPrograms
                ? "border-slate-200 bg-slate-50 text-slate-600"
                : "border-emerald-200 bg-emerald-50 text-emerald-700",
            )}
          >
            <GraduationCap className="size-3" />
            {currentProgram.isBetweenPrograms ? "Past program" : "Active"}
          </Badge>
        )}
      </header>

      {/* Sub-tabs — Overview / Session History / Progress. Homework stays
          inside Overview so the per-pet view still surfaces what to practice
          today; the customer also has a top-level Homework tab for the full
          board. */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Session History</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3 pt-3">
          <CurrentProgramPanel dashboard={dashboard} todayISO={todayISO} />
          <PathwayJourney
            petId={pet.id}
            petName={pet.name}
            enrollments={petEnrollments}
          />
          <CurrentSeriesProgressPanel
            enrollment={currentProgram.enrollment}
            attendances={attendances}
          />
          <HomeworkPanel dashboard={dashboard} todayISO={todayISO} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4 pt-3">
          <SessionHistoryPanel dashboard={dashboard} todayISO={todayISO} />
          <MilestoneTrophyShelf petName={pet.name} milestones={milestones} />
        </TabsContent>

        <TabsContent value="progress" className="pt-3">
          <PetProgressCharts
            petId={pet.id}
            petName={pet.name}
            enrollments={petEnrollments}
            seriesById={seriesById}
            audience="customer"
          />
        </TabsContent>
      </Tabs>
    </article>
  );
}

/** ──────────── 1 · Current Program ─────────────────────────────────── */
function CurrentProgramPanel({
  dashboard,
  todayISO,
}: {
  dashboard: PetTrainingDashboard;
  todayISO: string;
}) {
  const { currentProgram, pet } = dashboard;
  const { enrollment, series, startDate, endDate, upcomingSessions, isBetweenPrograms } =
    currentProgram;
  const progressPct = enrollment
    ? Math.round(
        (enrollment.sessionsAttended /
          Math.max(1, enrollment.totalSessions)) *
          100,
      )
    : 0;

  return (
    <Panel icon={GraduationCap} title="Current Program" iconTone="indigo">
      {!enrollment ? (
        <div className="space-y-3">
          <p className="text-muted-foreground text-[12.5px]/relaxed">
            {pet.name} isn&apos;t enrolled in a training series yet — browse
            upcoming classes to get started.
          </p>
          <Button asChild size="sm" className="h-8 gap-1 text-[12px]">
            <Link href="/customer/training?tab=classes">
              Browse classes
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-base font-semibold text-slate-800">
                {enrollment.seriesName}
              </p>
              <p className="text-muted-foreground text-[11.5px]">
                {enrollment.courseTypeName}
                {startDate && endDate && (
                  <>
                    {" · "}
                    <CalendarDays className="mr-0.5 inline size-3 align-text-bottom" />
                    {formatShort(startDate)} → {formatShort(endDate)}
                  </>
                )}
              </p>
            </div>
            {series?.instructorName && (
              <Badge
                variant="outline"
                className="gap-1 border-slate-200 bg-slate-50 text-[10px] text-slate-600"
              >
                <User2 className="size-3" />
                {series.instructorName}
              </Badge>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground inline-flex items-center gap-1 font-medium uppercase tracking-wider">
                Progress
              </span>
              <span className="font-semibold tabular-nums text-slate-800">
                {enrollment.sessionsAttended} of {enrollment.totalSessions} ·{" "}
                {progressPct}%
              </span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>

          {upcomingSessions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                <CalendarDays className="size-3" />
                Upcoming sessions
              </p>
              <ul className="space-y-2">
                {upcomingSessions.map((s) => (
                  <li
                    key={`${s.sessionNumber}-${s.date}`}
                    className="rounded-md border bg-slate-50/60 px-2.5 py-2"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                      <p className="text-[12.5px] font-semibold text-slate-800">
                        Session {s.sessionNumber}
                        {s.theme ? ` · ${s.theme}` : ""}
                      </p>
                      <p className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
                        <CalendarDays className="size-3" />
                        {formatDate(s.date)} · {formatTime(s.startTime)} ·{" "}
                        {relativeDays(s.date, todayISO)}
                      </p>
                    </div>
                    {series?.location && (
                      <p className="text-muted-foreground mt-0.5 inline-flex items-center gap-1 text-[11px]">
                        <MapPin className="size-3" />
                        {series.location}
                      </p>
                    )}
                    {s.exercises.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {s.exercises.map((name, i) => (
                          <li
                            key={`${s.sessionNumber}-ex-${i}`}
                            className="flex items-center gap-2 text-[12px] text-slate-700"
                          >
                            <Target className="text-indigo-500 size-3 shrink-0" />
                            <span className="truncate">{name}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {s.hasPlan && (
                      <p className="text-indigo-700 mt-1.5 inline-flex items-start gap-1 rounded-md bg-indigo-50/70 px-2 py-1 text-[11px]">
                        <BookOpen className="mt-0.5 size-3 shrink-0" />
                        Practice these at home before class to get the most out
                        of your session.
                      </p>
                    )}
                    {!s.hasPlan && s.adaptive && (
                      <p className="text-muted-foreground mt-1.5 inline-flex items-start gap-1 text-[11px]">
                        <Sparkles className="mt-0.5 size-3 shrink-0 text-amber-500" />
                        Your trainer tailors each session to what your dog needs
                        that day.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : isBetweenPrograms ? (
            <p className="text-muted-foreground text-[12px] italic">
              Program complete — pick the next course to keep building on their
              training.
            </p>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

/** ──────────── 2 · Session History ─────────────────────────────────── */
function SessionHistoryPanel({
  dashboard,
  todayISO,
}: {
  dashboard: PetTrainingDashboard;
  todayISO: string;
}) {
  const { sessionHistory, pet } = dashboard;
  if (sessionHistory.recentSessions.length === 0) {
    return (
      <Panel icon={CalendarDays} title="Session History" iconTone="sky">
        <p className="text-muted-foreground text-[12.5px]/relaxed">
          No sessions logged yet for {pet.name}. After the first session,
          you&apos;ll see your trainer&apos;s notes and ratings here.
        </p>
      </Panel>
    );
  }
  return (
    <Panel icon={CalendarDays} title="Session History" iconTone="sky">
      <ol className="relative ml-1.5 space-y-3 border-l-2 border-slate-200 pl-4">
        {sessionHistory.recentSessions.map((entry) => {
          const a = entry.attendance;
          return (
            <li key={a.id} className="relative">
              <span className="absolute -left-[1.41rem] top-1 size-3 rounded-full border-2 border-white bg-indigo-500 shadow-sm" />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">
                  {entry.sessionLabel}
                </p>
                <p className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
                  <CalendarDays className="size-3" />
                  {formatDate(a.sessionDate)} ·{" "}
                  {relativeDays(a.sessionDate, todayISO)}
                </p>
              </div>
              {a.exercises && a.exercises.length > 0 && (
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  Rating scale: 1 {EXERCISE_RATING_LABELS[1]} · 2{" "}
                  {EXERCISE_RATING_LABELS[2]} · 3 {EXERCISE_RATING_LABELS[3]} · 4{" "}
                  {EXERCISE_RATING_LABELS[4]} · 5 {EXERCISE_RATING_LABELS[5]}
                </p>
              )}
              {a.trainerNotes && a.trainerNotes.trim() && (
                <p className="mt-1 text-[12.5px]/relaxed text-slate-700">
                  {a.trainerNotes}
                </p>
              )}
              {a.exercises && a.exercises.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {a.exercises.map((ex, idx) => (
                    <li
                      key={`${a.id}-${idx}`}
                      className="flex items-center justify-between gap-2 text-[12px]"
                    >
                      <span className="truncate text-slate-700">
                        {ex.exerciseName}
                      </span>
                      <StarRow value={ex.rating} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      {sessionHistory.totalAttended >
        sessionHistory.recentSessions.length && (
        <div className="mt-3 border-t pt-2">
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="-mx-2 h-7 gap-1 text-[11px]"
          >
            <Link href="/customer/training?tab=classes">
              See all {sessionHistory.totalAttended} sessions
              <ArrowUpRight className="size-3" />
            </Link>
          </Button>
        </div>
      )}
    </Panel>
  );
}

/** ──────────── 3 · Progress Charts ─────────────────────────────────── */
function ProgressChartsPanel({
  dashboard,
}: {
  dashboard: PetTrainingDashboard;
}) {
  const { progressCharts, pet } = dashboard;
  if (progressCharts.charts.length === 0) {
    return (
      <Panel icon={LineChart} title="Progress Charts" iconTone="emerald">
        <p className="text-muted-foreground text-[12.5px]/relaxed">
          Once {pet.name} has been rated on the same exercise across two or
          more sessions, you&apos;ll see their improvement chart here.
        </p>
      </Panel>
    );
  }
  return (
    <Panel icon={LineChart} title="Progress Charts" iconTone="emerald">
      <p className="text-muted-foreground mb-2 text-[11.5px]">
        Tracking {progressCharts.trackedExerciseCount} exercise
        {progressCharts.trackedExerciseCount === 1 ? "" : "s"} —
        {progressCharts.charts.length < progressCharts.trackedExerciseCount
          ? ` showing the top ${progressCharts.charts.length}`
          : " showing every one with at least two ratings"}
        .
      </p>
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {progressCharts.charts.map((track) => (
          <li
            key={track.exerciseName}
            className="rounded-lg border bg-slate-50/40 px-3 py-2.5"
          >
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">
                {track.exerciseName}
              </p>
              <div className="flex items-center gap-1.5">
                <StarRow value={track.latestRating} />
                {track.delta !== 0 && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1 text-[10px]",
                      track.delta > 0
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-700",
                    )}
                  >
                    {track.delta > 0 ? (
                      <TrendingUp className="size-3" />
                    ) : (
                      <TrendingDown className="size-3" />
                    )}
                    {track.delta > 0 ? "+" : ""}
                    {track.delta} ★
                  </Badge>
                )}
              </div>
            </div>
            <ExerciseProgressChart data={track.points} height={140} />
            <p className="text-muted-foreground mt-1 text-[10.5px]">
              {track.ratingsCount} ratings across sessions
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** ──────────── Mini progress (Overview) ───────────────────────────── */
const RATING_TIER_LABEL: Record<number, string> = {
  1: "Developing",
  2: "Getting it",
  3: "Good",
  4: "Excellent",
  5: "Mastered",
};
const RATING_TIER_COLOR: Record<number, string> = {
  1: "#f43f5e",
  2: "#f59e0b",
  3: "#0ea5e9",
  4: "#10b981",
  5: "#8b5cf6",
};

interface MiniExerciseRow {
  name: string;
  start: 1 | 2 | 3 | 4 | 5;
  current: 1 | 2 | 3 | 4 | 5;
  delta: number;
  ratingsCount: number;
}

function CurrentSeriesProgressPanel({
  enrollment,
  attendances,
}: {
  enrollment: TrainingEnrollment | null | undefined;
  attendances: SessionAttendance[];
}) {
  const rows = useMemo<MiniExerciseRow[]>(() => {
    if (!enrollment) return [];
    // Pull every attended session for this enrollment, ordered chronologically,
    // then group by exercise name with first + last rating.
    const scoped = attendances
      .filter(
        (a) =>
          a.enrollmentId === enrollment.id &&
          (a.status === "present" || a.status === "late") &&
          a.exercises &&
          a.exercises.length > 0,
      )
      .slice()
      .sort((a, b) => {
        if (a.sessionDate !== b.sessionDate)
          return a.sessionDate < b.sessionDate ? -1 : 1;
        return a.sessionNumber - b.sessionNumber;
      });

    const byExercise = new Map<
      string,
      { first: 1 | 2 | 3 | 4 | 5; last: 1 | 2 | 3 | 4 | 5; count: number }
    >();
    for (const att of scoped) {
      for (const ex of att.exercises ?? []) {
        const prev = byExercise.get(ex.exerciseName);
        if (prev) {
          prev.last = ex.rating;
          prev.count += 1;
        } else {
          byExercise.set(ex.exerciseName, {
            first: ex.rating,
            last: ex.rating,
            count: 1,
          });
        }
      }
    }

    const out: MiniExerciseRow[] = [];
    for (const [name, data] of byExercise) {
      out.push({
        name,
        start: data.first,
        current: data.last,
        delta: data.last - data.first,
        ratingsCount: data.count,
      });
    }
    // Most movement first, then by current rating, then alphabetical.
    out.sort((a, b) => {
      if (b.delta !== a.delta) return b.delta - a.delta;
      if (b.current !== a.current) return b.current - a.current;
      return a.name.localeCompare(b.name);
    });
    return out;
  }, [enrollment, attendances]);

  if (!enrollment || rows.length === 0) return null;

  return (
    <Panel icon={LineChart} title="Progress so far" iconTone="emerald">
      <p className="text-muted-foreground -mt-1 mb-2 text-[11.5px]">
        Every exercise in{" "}
        <span className="font-medium text-slate-700">
          {enrollment.seriesName}
        </span>
        , from where you started to where you are now.
      </p>
      <ul className="space-y-2.5">
        {rows.map((row) => (
          <MiniProgressRow key={row.name} row={row} />
        ))}
      </ul>
      <p className="text-muted-foreground mt-2 text-[11px]">
        Open the <span className="font-medium text-slate-700">Progress</span>{" "}
        tab for the full per-session chart.
      </p>
    </Panel>
  );
}

function MiniProgressRow({ row }: { row: MiniExerciseRow }) {
  const min = Math.min(row.start, row.current);
  const max = Math.max(row.start, row.current);
  const improved = row.delta > 0;
  const regressed = row.delta < 0;
  const trackTone = improved
    ? "bg-emerald-400"
    : regressed
      ? "bg-rose-300"
      : "bg-slate-300";

  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-slate-800 truncate">
          {row.name}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-muted-foreground text-[10px]">
            Start{" "}
            <span className="font-semibold text-slate-700">{row.start}</span>{" "}
            → Now{" "}
            <span className="font-semibold text-slate-700">{row.current}</span>
          </span>
          {improved && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
              <TrendingUp className="size-2.5" />+{row.delta}
            </span>
          )}
          {regressed && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
              <TrendingDown className="size-2.5" />
              {row.delta}
            </span>
          )}
          {!improved && !regressed && row.ratingsCount > 1 && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              Steady
            </span>
          )}
        </div>
      </div>

      {/* 5-segment rail with start (gray) + current (color) markers and a
          tinted connector between them. Single-rating rows show start only. */}
      <div className="relative">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const inRange = n >= min && n <= max;
            return (
              <div
                key={n}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  inRange ? trackTone : "bg-slate-200/70",
                )}
              />
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-0">
          <Marker
            position={row.start}
            kind="start"
            color="#94a3b8"
            label={`Start: ${row.start} · ${RATING_TIER_LABEL[row.start]}`}
          />
          <Marker
            position={row.current}
            kind="current"
            color={RATING_TIER_COLOR[row.current]!}
            label={`Now: ${row.current} · ${RATING_TIER_LABEL[row.current]}`}
          />
        </div>
      </div>
    </li>
  );
}

function Marker({
  position,
  kind,
  color,
  label,
}: {
  position: number;
  kind: "start" | "current";
  color: string;
  label: string;
}) {
  // Center each segment at the midpoint of its 1/5 slice.
  const leftPct = ((position - 0.5) / 5) * 100;
  const size = kind === "current" ? "size-3.5" : "size-2.5";
  return (
    <span
      className={cn(
        "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white shadow-sm",
        size,
      )}
      style={{ left: `${leftPct}%`, backgroundColor: color }}
      title={label}
    />
  );
}

/** ──────────── 4 · Homework ─────────────────────────────────────────── */
function HomeworkPanel({
  dashboard,
  todayISO,
}: {
  dashboard: PetTrainingDashboard;
  todayISO: string;
}) {
  const { homework, pet } = dashboard;
  return (
    <Panel icon={BookOpen} title="Homework" iconTone="violet">
      {homework.activeCount === 0 ? (
        <p className="text-muted-foreground text-[12.5px]/relaxed">
          No active homework right now — {pet.name} is between assignments.
          New exercises will appear here after the next session.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className="gap-1 border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700"
            >
              <BookOpen className="size-3" />
              {homework.activeCount} active
            </Badge>
            {homework.practicedTodayCount > 0 && (
              <Badge
                variant="outline"
                className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
              >
                <CheckCircle2 className="size-3" />
                {homework.practicedTodayCount} done today
              </Badge>
            )}
            {homework.streakDays >= 2 && (
              <Badge
                variant="outline"
                className="gap-1 border-orange-200 bg-orange-50 text-[10px] text-orange-700"
              >
                <Flame className="size-3" />
                {homework.streakDays}-day streak
              </Badge>
            )}
            {homework.overdueCount > 0 && (
              <Badge
                variant="outline"
                className="gap-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700"
              >
                <AlertTriangle className="size-3" />
                {homework.overdueCount} overdue
              </Badge>
            )}
          </div>
          <ul className="space-y-2">
            {homework.activeItems.map((item) => (
              <HomeworkRow key={item.id} item={item} todayISO={todayISO} />
            ))}
          </ul>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="-mx-2 h-7 gap-1 text-[11px]"
          >
            <Link href="/customer/training?tab=homework">
              Open Homework tab for resources & media
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>
      )}
    </Panel>
  );
}

function HomeworkRow({
  item,
  todayISO,
}: {
  item: TrainingHomework;
  todayISO: string;
}) {
  const queryClient = useQueryClient();
  const [practicedNow, setPracticedNow] = useState(false);
  const practiced = practicedNow || hasPracticedToday(item, todayISO);

  function markDone() {
    if (practiced) return;
    const updated = markPracticedToday(item, todayISO);
    fanOutHomeworkUpsert(queryClient, updated);
    setPracticedNow(true);
    toast.success(`Nice work — "${item.title}" marked done for today.`);
  }

  const dueLabel = item.nextDueDate
    ? `Due ${relativeDays(item.nextDueDate, todayISO).toLowerCase()}`
    : null;
  const overdue =
    !!item.nextDueDate &&
    item.nextDueDate < todayISO &&
    !practiced;

  return (
    <li
      className={cn(
        "rounded-lg border bg-card px-3 py-2.5",
        overdue && "border-rose-200 bg-rose-50/40",
        practiced && "opacity-90",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">{item.title}</p>
          <p className="text-muted-foreground mt-0.5 inline-flex flex-wrap items-center gap-x-1.5 text-[11px]">
            {item.frequency && (
              <>
                <Clock className="size-3" />
                {item.frequency}
              </>
            )}
            {dueLabel && (
              <>
                {item.frequency && (
                  <span className="text-muted-foreground/50">·</span>
                )}
                <CalendarDays className="size-3" />
                <span className={cn(overdue && "font-medium text-rose-700")}>
                  {dueLabel}
                </span>
              </>
            )}
          </p>
        </div>
        <Button
          size="sm"
          onClick={markDone}
          disabled={practiced}
          className={cn(
            "h-8 shrink-0 gap-1 px-3",
            practiced
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
              : "bg-emerald-600 text-white hover:bg-emerald-700",
          )}
        >
          <CheckCircle2 className="size-3.5" />
          {practiced ? "Done today" : "Mark as Done"}
        </Button>
      </div>
      {item.description && (
        <p className="mt-2 text-[12px]/relaxed text-slate-600">
          {item.description}
        </p>
      )}
      {item.instructions.length > 0 && (
        <ul className="mt-2 space-y-1">
          {item.instructions.map((line, idx) => (
            <li
              key={`${item.id}-inst-${idx}`}
              className="flex items-start gap-2 text-[12px]/relaxed text-slate-700"
            >
              <Circle className="text-muted-foreground/40 mt-1 size-2 shrink-0 fill-current" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** Compact 5-star renderer matching the report-card StarRow visual. */
function StarRow({ value }: { value: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${value} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-3",
            i < value ? "fill-amber-400 text-amber-400" : "text-slate-300",
          )}
        />
      ))}
    </span>
  );
}

function ChartSkeleton() {
  return (
    <div
      className="animate-pulse rounded-md bg-slate-100"
      style={{ height: 140 }}
      aria-hidden
    />
  );
}

function Panel({
  icon: Icon,
  title,
  iconTone,
  children,
}: {
  icon: typeof BookOpen;
  title: string;
  iconTone: "slate" | "indigo" | "amber" | "violet" | "rose" | "sky" | "emerald";
  children: React.ReactNode;
}) {
  const toneCls = {
    slate: "bg-slate-100 text-slate-700",
    indigo: "bg-indigo-100 text-indigo-700",
    amber: "bg-amber-100 text-amber-700",
    violet: "bg-violet-100 text-violet-700",
    rose: "bg-rose-100 text-rose-700",
    sky: "bg-sky-100 text-sky-700",
    emerald: "bg-emerald-100 text-emerald-700",
  }[iconTone];
  return (
    <section className="bg-card flex flex-col rounded-xl border px-3 py-3 shadow-sm">
      <header className="mb-2 flex items-center gap-2">
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg",
            toneCls,
          )}
        >
          <Icon className="size-4" />
        </div>
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
          {title}
        </h4>
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}
