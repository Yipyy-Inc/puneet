/**
 * Pet milestones — automatically derived "celebration moments" for the
 * customer trophy shelf and the facility student-profile Overview section.
 * Pure functions over attendance + enrollment + homework history; no
 * separate persistence layer.
 *
 * The triggers come from the product spec — first session, first mastery,
 * first graduation, total-session thresholds (5 / 10 / 25), and homework
 * cadence milestones (first submission, 7-day streak, 30-day streak).
 */
import type {
  SessionAttendance,
  TrainingEnrollment,
  TrainingHomework,
} from "@/lib/training-enrollment";
import type { TrainingSeries } from "@/lib/training-series";

export type MilestoneKind =
  | "first-session"
  | "first-mastered"
  | "first-series"
  | "five-sessions"
  | "ten-sessions"
  | "twenty-five-sessions"
  | "first-homework"
  | "seven-day-homework-streak"
  | "thirty-day-homework-streak"
  /** Legacy — predates the spec rewrite. Kept so older derivations don't
   *  silently drop, but no longer emitted by `computePetMilestones`. */
  | "four-week-streak";

/** Human-readable label for a milestone — the same string used in the
 *  notification email subject and the trophy-card title. */
export const MILESTONE_LABELS: Record<MilestoneKind, string> = {
  "first-session": "First session completed",
  "first-mastered": "First exercise mastered",
  "first-series": "First series graduated",
  "five-sessions": "5 sessions attended",
  "ten-sessions": "10 sessions attended",
  "twenty-five-sessions": "25 sessions attended",
  "first-homework": "First homework submitted",
  "seven-day-homework-streak": "7-day homework streak",
  "thirty-day-homework-streak": "30-day homework streak",
  "four-week-streak": "Consistent for 4 weeks in a row",
};

/** Order milestones appear in Settings + the trophy shelf. Mirrors the spec's
 *  bulleted list so staff and customers see them in the same sequence. */
export const MILESTONE_ORDER: MilestoneKind[] = [
  "first-session",
  "first-mastered",
  "first-series",
  "five-sessions",
  "ten-sessions",
  "twenty-five-sessions",
  "first-homework",
  "seven-day-homework-streak",
  "thirty-day-homework-streak",
];

export interface Milestone {
  kind: MilestoneKind;
  title: string;
  /** Short qualifier — e.g. exercise name or series name. */
  detail?: string;
  /** YYYY-MM-DD the milestone unlocked on. */
  achievedISO: string;
}

interface ComputeInput {
  attendances: SessionAttendance[];
  enrollments: TrainingEnrollment[];
  seriesById: Map<string, TrainingSeries>;
  /** Optional — required only for homework-driven milestones. The compute
   *  function silently skips homework milestones if this is empty. */
  homework?: TrainingHomework[];
}

const PRESENT_OR_LATE: SessionAttendance["status"][] = ["present", "late"];

function isAttended(a: SessionAttendance): boolean {
  return PRESENT_OR_LATE.includes(a.status);
}

/** Walk the attendance + homework log chronologically and surface every
 *  milestone the pet has reached. Returned list is sorted oldest → newest so
 *  the trophy shelf reads like a growing collection. */
export function computePetMilestones(input: ComputeInput): Milestone[] {
  const { attendances, enrollments, seriesById, homework = [] } = input;
  const out: Milestone[] = [];

  const sorted = [...attendances].sort((a, b) => {
    if (a.sessionDate !== b.sessionDate)
      return a.sessionDate < b.sessionDate ? -1 : 1;
    return a.sessionNumber - b.sessionNumber;
  });

  // ── 1. First session completed ─────────────────────────────────────────
  const firstAttended = sorted.find(isAttended);
  if (firstAttended) {
    out.push({
      kind: "first-session",
      title: MILESTONE_LABELS["first-session"],
      achievedISO: firstAttended.sessionDate,
    });
  }

  // ── 2. First exercise mastered (any rating === 5) ──────────────────────
  for (const a of sorted) {
    if (!isAttended(a) || !a.exercises) continue;
    const mastered = a.exercises.find((ex) => ex.rating === 5);
    if (mastered) {
      out.push({
        kind: "first-mastered",
        title: MILESTONE_LABELS["first-mastered"],
        detail: mastered.exerciseName,
        achievedISO: a.sessionDate,
      });
      break;
    }
  }

  // ── 3. Completed first series ──────────────────────────────────────────
  const completedEnrollments = enrollments.filter(
    (e) => e.status === "completed",
  );
  if (completedEnrollments.length > 0) {
    // Pick the one that finished earliest. We approximate the completion
    // date with the latest attendance date for that enrollment; if there
    // are none, fall back to the series' last scheduled session date.
    const withDate = completedEnrollments
      .map((e) => {
        const lastAttendance = sorted
          .filter((a) => a.enrollmentId === e.id && isAttended(a))
          .at(-1);
        if (lastAttendance)
          return { enrollment: e, dateISO: lastAttendance.sessionDate };
        const series = seriesById.get(e.seriesId);
        const lastSession = series?.sessions.at(-1);
        return { enrollment: e, dateISO: lastSession?.date ?? "" };
      })
      .filter((row) => !!row.dateISO)
      .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    const first = withDate[0];
    if (first) {
      out.push({
        kind: "first-series",
        title: MILESTONE_LABELS["first-series"],
        detail: first.enrollment.seriesName,
        achievedISO: first.dateISO,
      });
    }
  }

  // ── 4. 5 / 10 / 25 sessions attended ───────────────────────────────────
  let attendedCount = 0;
  const sessionThresholds: { count: number; kind: MilestoneKind }[] = [
    { count: 5, kind: "five-sessions" },
    { count: 10, kind: "ten-sessions" },
    { count: 25, kind: "twenty-five-sessions" },
  ];
  const remainingThresholds = new Set(sessionThresholds.map((t) => t.kind));
  for (const a of sorted) {
    if (!isAttended(a)) continue;
    attendedCount++;
    for (const t of sessionThresholds) {
      if (attendedCount === t.count && remainingThresholds.has(t.kind)) {
        out.push({
          kind: t.kind,
          title: MILESTONE_LABELS[t.kind],
          achievedISO: a.sessionDate,
        });
        remainingThresholds.delete(t.kind);
      }
    }
    if (remainingThresholds.size === 0) break;
  }

  // ── 5. Homework-driven milestones ──────────────────────────────────────
  if (homework.length > 0) {
    // Flatten every practice entry across every homework with the dates the
    // owner reported practice on. Dedupe per day — multiple homeworks
    // practiced the same day still count as a single streak day.
    const practiceDates = new Set<string>();
    let firstPracticeISO: string | null = null;
    for (const hw of homework) {
      for (const entry of hw.practiceLog ?? []) {
        if (!entry.date) continue;
        practiceDates.add(entry.date);
        if (!firstPracticeISO || entry.date < firstPracticeISO) {
          firstPracticeISO = entry.date;
        }
      }
    }
    if (firstPracticeISO) {
      out.push({
        kind: "first-homework",
        title: MILESTONE_LABELS["first-homework"],
        achievedISO: firstPracticeISO,
      });
    }

    // Streak detection — sort dedup-sorted practice dates, find the first
    // run of N consecutive days. The milestone date is the last day of the
    // qualifying run so it lines up with when the streak completed.
    const sortedDates = [...practiceDates].sort();
    const streakTargets: { days: number; kind: MilestoneKind }[] = [
      { days: 7, kind: "seven-day-homework-streak" },
      { days: 30, kind: "thirty-day-homework-streak" },
    ];
    for (const target of streakTargets) {
      const hitISO = firstNConsecutiveDays(sortedDates, target.days);
      if (hitISO) {
        out.push({
          kind: target.kind,
          title: MILESTONE_LABELS[target.kind],
          achievedISO: hitISO,
        });
      }
    }
  }

  // Chronological order so the trophy shelf reads as a growing collection.
  out.sort((a, b) => a.achievedISO.localeCompare(b.achievedISO));
  return out;
}

/** Walk `sortedDates` (ascending, deduped, `YYYY-MM-DD`) and return the last
 *  date of the first run of `n` consecutive calendar days, or null. */
function firstNConsecutiveDays(
  sortedDates: string[],
  n: number,
): string | null {
  if (sortedDates.length < n) return null;
  let run = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = sortedDates[i - 1]!;
    const curr = sortedDates[i]!;
    if (addDays(prev, 1) === curr) {
      run++;
      if (run >= n) return curr;
    } else {
      run = 1;
    }
  }
  return null;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── Legacy helpers kept exported for back-compat with the existing
//    pet-progress-charts MilestonesSection consumer. ─────────────────────

/** ISO-week key formatted as `YYYY-Www` (e.g. `2026-W18`). Calendar-friendly
 *  so lexicographic compare equals chronological compare. */
export function isoWeekKey(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}
