/**
 * Customer Portal — per-pet training dashboard aggregator.
 *
 * Pure functions that turn the existing slices of training state into the
 * four-section payload the "My Pets" tab renders:
 *
 *   1. Current Program  — active series + start/end + progress
 *   2. Session History  — last 5 attended sessions with notes + ratings
 *   3. Progress Charts  — per-exercise rating-over-time data
 *   4. Homework         — active items with instructions + practice state
 *
 * Lives at the lib layer so the component stays presentational and we can
 * unit-test the rollups without standing up a renderer.
 */
import type {
  ClientTrainingPackage,
  SessionAttendance,
  TrainingEnrollment,
  TrainingHomework,
} from "@/lib/training-enrollment";
import type {
  TrainingSeries,
  TrainingSeriesSession,
} from "@/lib/training-series";
import type { Pet } from "@/types/pet";
import {
  aggregateActivePackagesForPet,
  type ClientTrainingPackageRow,
} from "@/lib/client-training-packages";
import {
  getLastPracticedDate,
  getPracticeStreakDays,
  hasPracticedToday,
} from "@/lib/training-homework";
import type { ExerciseProgressPoint } from "@/components/training/exercise-progress-chart";

/** "Current Program" section payload. */
export interface CurrentProgramSection {
  enrollment: TrainingEnrollment | null;
  series: TrainingSeries | null;
  /** Series start/end — surfaced as "Mar 7 → Apr 11" in the header. */
  startDate: string | null;
  endDate: string | null;
  /** Next upcoming session date — `null` when the series has wrapped. */
  nextSession: TrainingSeriesSession | null;
  /** True when the pet has no current enrollment and should see a
   *  "Browse training classes" CTA. */
  isBetweenPrograms: boolean;
}

/** Single attended session shown in the History timeline. */
export interface SessionHistoryEntry {
  attendance: SessionAttendance;
  /** Session number labeled as "Session N" in the timeline header. */
  sessionLabel: string;
}

/** "Session History" section payload. */
export interface SessionHistorySection {
  /** Last 5 attended (present/late) sessions, newest first. */
  recentSessions: SessionHistoryEntry[];
  /** Total attended count across all enrollments — drives the
   *  "See all N sessions" link. */
  totalAttended: number;
}

/** One exercise's chart-ready time series. */
export interface ProgressChartTrack {
  exerciseName: string;
  points: ExerciseProgressPoint[];
  /** Latest rating, for the at-a-glance star next to the title. */
  latestRating: 1 | 2 | 3 | 4 | 5;
  /** Latest minus first — drives the "up X stars" trend chip. */
  delta: number;
  ratingsCount: number;
}

/** "Progress Charts" section payload. */
export interface ProgressChartsSection {
  /** Top-N exercises with at least 2 ratings, ordered by how rich the
   *  story is (ratingsCount desc, then positive delta). */
  charts: ProgressChartTrack[];
  /** Total exercises rated — surfaced as "tracking X exercises". */
  trackedExerciseCount: number;
}

/** "Homework" section payload — full list of active items so the owner can
 *  tap **Mark as Done** inline for whichever they practiced. */
export interface HomeworkSection {
  /** All active homework records for this pet, sorted oldest-due first. */
  activeItems: TrainingHomework[];
  activeCount: number;
  /** Number of items the owner has logged practice for today. */
  practicedTodayCount: number;
  streakDays: number;
  lastPracticedISO: string | null;
  overdueCount: number;
  /** True when at least one active homework is due today (or earlier) and
   *  not yet practiced — drives the prominent CTA tone. */
  needsPracticeToday: boolean;
}

/** "Training Credits" section payload — kept around so the rest of the
 *  customer training surfaces can still reference it via the same helper,
 *  even though the dashboard itself no longer renders it as a panel. */
export interface PackagesSection {
  rows: ClientTrainingPackageRow[];
  totalSessionsRemaining: number;
  lowBalanceCount: number;
  exhaustedCount: number;
}

export interface PetTrainingDashboard {
  pet: Pet;
  ownerName: string;
  currentProgram: CurrentProgramSection;
  sessionHistory: SessionHistorySection;
  progressCharts: ProgressChartsSection;
  homework: HomeworkSection;
  packages: PackagesSection;
}

interface BuildInput {
  pet: Pet;
  ownerName: string;
  enrollments: TrainingEnrollment[];
  seriesList: TrainingSeries[];
  attendances: SessionAttendance[];
  homework: TrainingHomework[];
  packages: ClientTrainingPackage[];
  todayISO: string;
  nowMs: number;
  /** How many sessions to surface in the History timeline. Defaults to 5
   *  per the customer-portal spec. */
  historyLimit?: number;
  /** Cap on the number of progress charts to render. Defaults to 3 — keeps
   *  the dashboard scrollable on mobile while still highlighting the
   *  richest stories. */
  chartLimit?: number;
}

export function buildPetTrainingDashboard(
  input: BuildInput,
): PetTrainingDashboard {
  return {
    pet: input.pet,
    ownerName: input.ownerName,
    currentProgram: buildCurrentProgram(input),
    sessionHistory: buildSessionHistory(input),
    progressCharts: buildProgressCharts(input),
    homework: buildHomework(input),
    packages: buildPackages(input),
  };
}

function buildCurrentProgram(input: BuildInput): CurrentProgramSection {
  const petEnrollments = input.enrollments.filter(
    (e) => e.petId === input.pet.id,
  );
  if (petEnrollments.length === 0) {
    return {
      enrollment: null,
      series: null,
      startDate: null,
      endDate: null,
      nextSession: null,
      isBetweenPrograms: true,
    };
  }
  const sorted = petEnrollments.slice().sort((a, b) => {
    if (a.status === "enrolled" && b.status !== "enrolled") return -1;
    if (b.status === "enrolled" && a.status !== "enrolled") return 1;
    return b.enrollmentDate.localeCompare(a.enrollmentDate);
  });
  const enrollment = sorted[0]!;
  const series =
    input.seriesList.find((s) => s.id === enrollment.seriesId) ?? null;
  const isBetweenPrograms = enrollment.status !== "enrolled";

  let startDate: string | null = null;
  let endDate: string | null = null;
  let nextSession: TrainingSeriesSession | null = null;
  if (series) {
    startDate = series.startDate;
    // End = last session date from the calculated session list, or fall back
    // to whatever the schema carries.
    const sessions = series.sessions ?? [];
    if (sessions.length > 0) {
      const sortedSessions = sessions
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date));
      endDate = sortedSessions[sortedSessions.length - 1]!.date;
    }
    const upcoming = sessions
      .filter(
        (s) =>
          s.status === "scheduled" &&
          new Date(`${s.date}T${s.startTime}`).getTime() >= input.nowMs,
      )
      .sort((a, b) => a.date.localeCompare(b.date));
    nextSession = upcoming[0] ?? null;
  }
  return {
    enrollment,
    series,
    startDate,
    endDate,
    nextSession,
    isBetweenPrograms,
  };
}

function buildSessionHistory(input: BuildInput): SessionHistorySection {
  const attended = input.attendances
    .filter(
      (a) =>
        a.petId === input.pet.id &&
        (a.status === "present" || a.status === "late"),
    )
    .slice()
    .sort((a, b) => {
      // Newest first; tiebreak by session number descending so back-to-back
      // dates still read in the right order.
      if (a.sessionDate !== b.sessionDate) {
        return a.sessionDate < b.sessionDate ? 1 : -1;
      }
      return b.sessionNumber - a.sessionNumber;
    });
  const limit = input.historyLimit ?? 5;
  const recentSessions: SessionHistoryEntry[] = attended
    .slice(0, limit)
    .map((attendance) => ({
      attendance,
      sessionLabel: `Session ${attendance.sessionNumber}`,
    }));
  return { recentSessions, totalAttended: attended.length };
}

function buildProgressCharts(input: BuildInput): ProgressChartsSection {
  // Walk the pet's present/late attendance records, expand each exercise
  // rating into a flat row, then group by exercise name.
  type Row = {
    exerciseName: string;
    sessionDate: string;
    rating: 1 | 2 | 3 | 4 | 5;
    context: string;
  };
  const rows: Row[] = [];
  const petEnrollments = new Map(
    input.enrollments
      .filter((e) => e.petId === input.pet.id)
      .map((e) => [e.id, e]),
  );
  for (const a of input.attendances) {
    if (a.petId !== input.pet.id) continue;
    if (a.status !== "present" && a.status !== "late") continue;
    const enrollment = petEnrollments.get(a.enrollmentId);
    const context = enrollment?.seriesName ?? "";
    for (const ex of a.exercises ?? []) {
      rows.push({
        exerciseName: ex.exerciseName,
        sessionDate: a.sessionDate,
        rating: ex.rating,
        context,
      });
    }
  }

  const byExercise = new Map<string, Row[]>();
  for (const r of rows) {
    const arr = byExercise.get(r.exerciseName);
    if (arr) arr.push(r);
    else byExercise.set(r.exerciseName, [r]);
  }

  const tracks: ProgressChartTrack[] = [];
  for (const [exerciseName, rs] of byExercise) {
    if (rs.length < 2) continue;
    const sorted = rs.slice().sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
    const points = sorted.map<ExerciseProgressPoint>((r, idx) => ({
      sessionNumber: idx + 1,
      date: r.sessionDate,
      rating: r.rating,
      context: r.context,
    }));
    tracks.push({
      exerciseName,
      points,
      latestRating: points[points.length - 1]!.rating,
      delta: points[points.length - 1]!.rating - points[0]!.rating,
      ratingsCount: points.length,
    });
  }
  tracks.sort((a, b) => {
    // Richer stories first (more points), then biggest positive delta, then
    // alphabetical so the order stays stable session-to-session.
    if (a.ratingsCount !== b.ratingsCount) return b.ratingsCount - a.ratingsCount;
    if (a.delta !== b.delta) return b.delta - a.delta;
    return a.exerciseName.localeCompare(b.exerciseName);
  });
  const chartLimit = input.chartLimit ?? 3;
  return {
    charts: tracks.slice(0, chartLimit),
    trackedExerciseCount: tracks.length,
  };
}

function buildHomework(input: BuildInput): HomeworkSection {
  const enrollmentIds = new Set(
    input.enrollments
      .filter((e) => e.petId === input.pet.id)
      .map((e) => e.id),
  );
  const petHomework = input.homework.filter((h) =>
    enrollmentIds.has(h.enrollmentId),
  );
  const active = petHomework.filter((h) => !h.completed);

  let practicedTodayCount = 0;
  let bestStreak = 0;
  let lastPracticed: string | null = null;
  let overdueCount = 0;
  let needsPracticeToday = false;
  for (const hw of active) {
    if (hasPracticedToday(hw, input.todayISO)) {
      practicedTodayCount++;
    } else if (hw.nextDueDate && hw.nextDueDate <= input.todayISO) {
      needsPracticeToday = true;
    }
    const streak = getPracticeStreakDays(hw, input.todayISO);
    if (streak > bestStreak) bestStreak = streak;
    const last = getLastPracticedDate(hw);
    if (last && (!lastPracticed || last > lastPracticed)) lastPracticed = last;
    if (hw.nextDueDate && hw.nextDueDate < input.todayISO) overdueCount++;
  }

  // Order: items due today/past first (oldest due-date wins), then anything
  // without a due date by assignment date desc so the newest assignments
  // surface above older ones.
  const sortedActive = active.slice().sort((a, b) => {
    const aHasDue = !!a.nextDueDate;
    const bHasDue = !!b.nextDueDate;
    if (aHasDue !== bHasDue) return aHasDue ? -1 : 1;
    if (aHasDue && bHasDue) {
      return (a.nextDueDate ?? "").localeCompare(b.nextDueDate ?? "");
    }
    return b.sessionDate.localeCompare(a.sessionDate);
  });

  return {
    activeItems: sortedActive,
    activeCount: active.length,
    practicedTodayCount,
    streakDays: bestStreak,
    lastPracticedISO: lastPracticed,
    overdueCount,
    needsPracticeToday,
  };
}

function buildPackages(input: BuildInput): PackagesSection {
  const rows = aggregateActivePackagesForPet(
    input.pet.id,
    input.packages,
    input.todayISO,
  );
  let totalSessionsRemaining = 0;
  let lowBalanceCount = 0;
  let exhaustedCount = 0;
  for (const row of rows) {
    totalSessionsRemaining += row.sessionsRemaining;
    if (row.exhausted) exhaustedCount++;
    else if (row.lowBalance) lowBalanceCount++;
  }
  return { rows, totalSessionsRemaining, lowBalanceCount, exhaustedCount };
}

/** Convenience filter — the pets a customer should see on the My Pets tab.
 *  We only include pets that have at least one enrollment on file. */
export function pickEligiblePets(
  pets: Pet[],
  enrollments: TrainingEnrollment[],
  clientId: number,
): Pet[] {
  const ownerEnrollmentPetIds = new Set(
    enrollments
      .filter((e) => e.ownerId === clientId)
      .map((e) => e.petId),
  );
  return pets.filter((p) => ownerEnrollmentPetIds.has(p.id));
}
