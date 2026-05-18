"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Award,
  Equal,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import type { TrainingEnrollment } from "@/lib/training-enrollment";
import type { TrainingSeries } from "@/lib/training-series";
import type { ExerciseProgressPoint } from "@/components/training/exercise-progress-chart";

// Recharts is heavy — load it on demand so the tab doesn't pay the cost
// until the user opens it. Matches the existing analytics-panel pattern.
const ExerciseProgressChart = dynamic(
  () =>
    import("@/components/training/exercise-progress-chart").then(
      (m) => m.ExerciseProgressChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/40 h-[160px] w-full animate-pulse rounded-lg" />
    ),
  },
);

const TIER_LABEL: Record<number, string> = {
  1: "Needs work",
  2: "Developing",
  3: "Good",
  4: "Great",
  5: "Mastered",
};

const TIER_COLOR: Record<number, string> = {
  1: "#f43f5e", // rose
  2: "#f59e0b", // amber
  3: "#0ea5e9", // sky
  4: "#10b981", // emerald
  5: "#8b5cf6", // violet
};

interface Props {
  petId: number;
  petName: string;
  enrollments: TrainingEnrollment[];
  seriesById: Map<string, TrainingSeries>;
}

interface ExerciseTrack {
  name: string;
  points: ExerciseProgressPoint[];
  firstRating: 1 | 2 | 3 | 4 | 5;
  latestRating: 1 | 2 | 3 | 4 | 5;
  delta: number;
}

/** Build one ExerciseTrack per distinct exercise name across the pet's
 *  attendance records. Points are global across series, sorted oldest →
 *  newest so a chart reads the dog's full journey end-to-end. */
function buildExerciseTracks(
  rows: {
    sessionDate: string;
    sessionNumber: number;
    rating: 1 | 2 | 3 | 4 | 5;
    exerciseName: string;
    context: string;
  }[],
): ExerciseTrack[] {
  const byExercise = new Map<string, typeof rows>();
  for (const r of rows) {
    const arr = byExercise.get(r.exerciseName);
    if (arr) arr.push(r);
    else byExercise.set(r.exerciseName, [r]);
  }

  const tracks: ExerciseTrack[] = [];
  // Renumber the points to a 1..N "lifetime session" index so multiple
  // series sit on a single chronological axis. Otherwise S1/S2 from two
  // different series would overlap on the X-axis.
  for (const [name, rs] of byExercise) {
    const sorted = [...rs].sort((a, b) => {
      if (a.sessionDate !== b.sessionDate)
        return a.sessionDate < b.sessionDate ? -1 : 1;
      return a.sessionNumber - b.sessionNumber;
    });
    const points = sorted.map<ExerciseProgressPoint>((r, idx) => ({
      sessionNumber: idx + 1,
      date: r.sessionDate,
      rating: r.rating,
      context: r.context,
    }));
    const firstRating = points[0].rating;
    const latestRating = points[points.length - 1].rating;
    tracks.push({
      name,
      points,
      firstRating,
      latestRating,
      delta: latestRating - firstRating,
    });
  }

  // Sort: longest journey first (more data points = richer story), then by
  // largest positive delta. Single-point exercises sink to the bottom.
  tracks.sort((a, b) => {
    if (b.points.length !== a.points.length)
      return b.points.length - a.points.length;
    return b.delta - a.delta;
  });
  return tracks;
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">
        <TrendingUp className="size-3" />+{delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[11px] font-bold text-rose-700">
        <TrendingDown className="size-3" />
        {delta}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
      <Equal className="size-3" />
      0
    </span>
  );
}

export function TrainingProfileProgress({
  petId,
  petName,
  enrollments,
  seriesById,
}: Props) {
  const { data: attendances = [] } = useQuery(
    trainingQueries.attendancesForPet(petId),
  );

  // Flatten attendance.exercises into individual rating rows tagged with the
  // session context so the chart tooltip can say "Basic Obedience S3".
  const ratingRows = useMemo(() => {
    const enrollmentById = new Map(enrollments.map((e) => [e.id, e]));
    const rows: {
      sessionDate: string;
      sessionNumber: number;
      rating: 1 | 2 | 3 | 4 | 5;
      exerciseName: string;
      context: string;
    }[] = [];
    for (const a of attendances) {
      if (!a.exercises || a.exercises.length === 0) continue;
      if (a.status === "absent") continue;
      const enrollment = enrollmentById.get(a.enrollmentId);
      const series = enrollment
        ? seriesById.get(enrollment.seriesId)
        : undefined;
      const context = series?.seriesName ?? enrollment?.courseTypeName ?? "";
      for (const ex of a.exercises) {
        rows.push({
          sessionDate: a.sessionDate,
          sessionNumber: a.sessionNumber,
          rating: ex.rating,
          exerciseName: ex.exerciseName,
          context,
        });
      }
    }
    return rows;
  }, [attendances, enrollments, seriesById]);

  const tracks = useMemo(
    () => buildExerciseTracks(ratingRows),
    [ratingRows],
  );

  // Header rollup numbers.
  const summary = useMemo(() => {
    let mastered = 0;
    let improved = 0;
    let biggestMover: ExerciseTrack | null = null;
    for (const t of tracks) {
      if (t.latestRating === 5) mastered++;
      if (t.delta > 0) improved++;
      if (
        t.points.length >= 2 &&
        (!biggestMover || t.delta > biggestMover.delta)
      ) {
        biggestMover = t;
      }
    }
    return {
      tracked: tracks.length,
      mastered,
      improved,
      biggestMover,
    };
  }, [tracks]);

  if (tracks.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
        <Sparkles className="text-muted-foreground/30 mx-auto mb-2 size-8" />
        No progress data yet — exercise ratings show up here once {petName}{" "}
        has attended a session.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top hero ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-linear-to-br from-indigo-50 via-white to-emerald-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              {petName}&apos;s progress journey
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {summary.tracked} exercise
              {summary.tracked === 1 ? "" : "s"} tracked
              {summary.improved > 0 && (
                <>
                  {" · "}
                  <span className="text-emerald-700">
                    {summary.improved} improved
                  </span>
                </>
              )}
              {summary.mastered > 0 && (
                <>
                  {" · "}
                  <span className="text-violet-700">
                    {summary.mastered} mastered
                  </span>
                </>
              )}
            </p>
            {summary.biggestMover && summary.biggestMover.delta > 0 && (
              <p className="text-muted-foreground mt-1 text-xs">
                Biggest gain:{" "}
                <span className="font-semibold text-slate-700">
                  {summary.biggestMover.name}
                </span>{" "}
                — went from{" "}
                <span className="font-semibold">
                  {summary.biggestMover.firstRating}/5
                </span>{" "}
                to{" "}
                <span className="font-semibold">
                  {summary.biggestMover.latestRating}/5
                </span>
                .
              </p>
            )}
          </div>
          {summary.mastered > 0 && (
            <div className="flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5 text-violet-700">
              <Award className="size-4" />
              <span className="text-sm font-semibold">
                {summary.mastered} mastered
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chart grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tracks.map((t) => {
          const color = TIER_COLOR[t.latestRating];
          const singlePoint = t.points.length === 1;
          return (
            <div
              key={t.name}
              className="bg-card rounded-xl border shadow-sm"
            >
              <div className="flex items-start justify-between gap-2 border-b px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    <Target className="mr-1 inline size-3 align-text-bottom text-slate-400" />
                    {t.name}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    {t.points.length} session
                    {t.points.length === 1 ? "" : "s"} ·{" "}
                    {TIER_LABEL[t.latestRating]}
                  </p>
                </div>
                <DeltaBadge delta={t.delta} />
              </div>

              <div className="px-2 pt-2 pb-1">
                <ExerciseProgressChart data={t.points} color={color} />
              </div>

              <div className="text-muted-foreground flex items-center justify-between gap-3 border-t px-4 py-2 text-[11px]">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white tabular-nums",
                    )}
                    style={{ backgroundColor: TIER_COLOR[t.firstRating] }}
                  >
                    {t.firstRating}
                  </span>
                  Started
                </span>
                <ArrowRight className="size-3 text-slate-300" />
                <span className="inline-flex items-center gap-1.5">
                  {singlePoint ? "Most recent" : "Now"}
                  <span
                    className="inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white tabular-nums"
                    style={{ backgroundColor: TIER_COLOR[t.latestRating] }}
                  >
                    {t.latestRating}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
        <Sparkles className="size-3" />
        Clients see this same view in their portal — a powerful way for
        owners to watch their dog&apos;s journey.
      </p>
    </div>
  );
}
