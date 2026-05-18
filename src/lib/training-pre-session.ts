/**
 * Pre-session briefing — auto-generated 15 minutes before each training
 * session start. Surfaces every student's behavioral notes, vaccine alerts,
 * and homework status so the instructor walks into the session prepared.
 *
 * Built around two pure helpers:
 *   - `generatePreSessionBriefingTasks()` materializes the task entries
 *     that show up in the Training Tasks page.
 *   - `aggregateStudentBriefing()` turns a session + its students into the
 *     panel-ready row data.
 */
import type {
  Enrollment,
  TrainerNote,
  TrainerNoteCategory,
  TrainingClass,
  TrainingSession,
} from "@/types/training";
import type { Pet, VaccinationRecord } from "@/types/pet";
import type {
  SessionAttendance,
  TrainingHomework,
} from "@/lib/training-enrollment";
import {
  computeVaccineWarning,
  getConsecutiveNoShows,
} from "@/lib/training-students";
import {
  getLastPracticedDate,
  getPracticeStreakDays,
  hasPracticedToday,
} from "@/lib/training-homework";

/** Minutes before session start when the briefing task fires. Matches the
 *  facility-side expectation; could later be a Settings → Training value. */
export const BRIEFING_LEAD_MINUTES = 15;

/** How long after session start the briefing task stays in view, in case
 *  the trainer didn't open it in time. */
export const BRIEFING_GRACE_MINUTES = 45;

/** Window forward from "now" we'll generate briefings for — keeps the task
 *  list from filling up with sessions far in the future. */
export const BRIEFING_LOOKAHEAD_HOURS = 24;

export type PreSessionBriefingStatus = "pending" | "active" | "briefed";

export interface PreSessionBriefingTask {
  id: string;
  sessionId: string;
  classId: string;
  className: string;
  location?: string;
  /** ISO datetime — the moment the briefing should be reviewed
   *  (session start − BRIEFING_LEAD_MINUTES). */
  scheduledAt: string;
  /** ISO datetime — when the session itself starts. */
  sessionStartAt: string;
  /** ISO datetime — session end, so the panel can show duration. */
  sessionEndAt: string;
  trainerId: string;
  trainerName: string;
  studentCount: number;
  /** "active" while we're inside the lead/grace window so the task pulses;
   *  "pending" if the session is still further out, "briefed" once the
   *  trainer marks the panel reviewed. */
  status: PreSessionBriefingStatus;
}

/** Combine an ISO date (`YYYY-MM-DD`) + an `HH:MM` time string into a local
 *  ISO timestamp string. Trainers think in local time, so we keep it that
 *  way and let `toISOString()` convert when the result is stored. */
function combineLocalISO(date: string, time: string): string {
  const [y, m, d] = date.split("-").map((p) => Number(p));
  const [hh, mm] = time.split(":").map((p) => Number(p));
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) {
    return new Date().toISOString();
  }
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

function minusMinutes(iso: string, minutes: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - minutes);
  return d.toISOString();
}

/** Materialize briefing tasks for every training session that's still
 *  upcoming (or recently started) within the lookahead window. */
export function generatePreSessionBriefingTasks(input: {
  sessions: TrainingSession[];
  classes: TrainingClass[];
  briefedSessionIds?: Set<string>;
  nowMs: number;
  lookaheadHours?: number;
}): PreSessionBriefingTask[] {
  const {
    sessions,
    classes,
    briefedSessionIds,
    nowMs,
    lookaheadHours = BRIEFING_LOOKAHEAD_HOURS,
  } = input;
  const classById = new Map(classes.map((c) => [c.id, c]));
  const horizonMs = nowMs + lookaheadHours * 60 * 60 * 1000;
  const graceMs = BRIEFING_GRACE_MINUTES * 60 * 1000;
  const leadMs = BRIEFING_LEAD_MINUTES * 60 * 1000;

  const tasks: PreSessionBriefingTask[] = [];
  for (const session of sessions) {
    if (session.status !== "scheduled" && session.status !== "in-progress") {
      continue;
    }
    const sessionStartISO = combineLocalISO(session.date, session.startTime);
    const sessionEndISO = combineLocalISO(session.date, session.endTime);
    const startMs = new Date(sessionStartISO).getTime();
    // Skip sessions that already finished long enough that the briefing is
    // no longer useful.
    if (startMs + graceMs < nowMs) continue;
    if (startMs > horizonMs) continue;

    const briefingISO = minusMinutes(sessionStartISO, BRIEFING_LEAD_MINUTES);
    const briefingMs = new Date(briefingISO).getTime();
    const inActiveWindow =
      nowMs >= briefingMs - leadMs && nowMs <= startMs + graceMs;

    const isBriefed = briefedSessionIds?.has(session.id) ?? false;

    const cls = classById.get(session.classId);
    const location = cls?.location;

    tasks.push({
      id: `pre-session-${session.id}`,
      sessionId: session.id,
      classId: session.classId,
      className: session.className,
      location,
      scheduledAt: briefingISO,
      sessionStartAt: sessionStartISO,
      sessionEndAt: sessionEndISO,
      trainerId: session.trainerId,
      trainerName: session.trainerName,
      studentCount: session.attendees.length,
      status: isBriefed
        ? "briefed"
        : inActiveWindow
          ? "active"
          : "pending",
    });
  }
  return tasks.sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );
}

/** Most-relevant trainer notes for the briefing — limit to the per-pet most
 *  recent N. We prioritize "behavior" + "concern" + "achievement" categories
 *  since those are what trainers most need to remember before the session;
 *  "general" + "progress" only fill in remaining slots. */
export function selectBriefingNotes(
  petId: number,
  notes: TrainerNote[],
  limit: number = 3,
): TrainerNote[] {
  const priorityRank: Record<TrainerNoteCategory, number> = {
    concern: 0,
    behavior: 1,
    achievement: 2,
    progress: 3,
    general: 4,
  };
  const filtered = notes.filter((n) => n.petId === petId);
  filtered.sort((a, b) => {
    const pa = priorityRank[a.category] ?? 5;
    const pb = priorityRank[b.category] ?? 5;
    if (pa !== pb) return pa - pb;
    return b.date.localeCompare(a.date);
  });
  return filtered.slice(0, limit);
}

export interface StudentHomeworkSnapshot {
  activeCount: number;
  practicedTodayCount: number;
  streakDays: number;
  lastPracticedISO: string | null;
  /** How many of the active homework items have a `nextDueDate` already
   *  past today — surfaces the "owner has been slipping" signal. */
  overdueCount: number;
}

export interface StudentBriefingRow {
  enrollmentId: string;
  petId: number;
  petName: string;
  petBreed: string;
  petImageUrl?: string;
  ownerName: string;
  notes: TrainerNote[];
  vaccineWarning: {
    hasWarning: boolean;
    soonestDays: number | null;
    soonestName: string | null;
  };
  homework: StudentHomeworkSnapshot;
  consecutiveNoShows: number;
}

interface AggregateInput {
  session: TrainingSession;
  enrollments: Enrollment[];
  trainerNotes: TrainerNote[];
  vaccinations: VaccinationRecord[];
  attendances: SessionAttendance[];
  homework: TrainingHomework[];
  pets: Pet[];
  ownerLookup: (petId: number) => string;
  todayISO: string;
}

export function aggregateStudentBriefing(
  input: AggregateInput,
): StudentBriefingRow[] {
  const enrollmentById = new Map(input.enrollments.map((e) => [e.id, e]));
  const petById = new Map(input.pets.map((p) => [p.id, p]));

  // Group homework by pet via the enrollment chain. The new active homework
  // model is tied to a *series* enrollment, but the briefing only cares
  // about per-pet rollups so we can just bucket by petId.
  const homeworkByPet = new Map<number, TrainingHomework[]>();
  for (const hw of input.homework) {
    if (hw.completed) continue;
    // Look up the pet behind this homework via the series-enrollment id.
    // Class enrollments and series enrollments share the petId in the seed,
    // so we use the enrollmentById map first and fall back to scanning the
    // session attendances when the homework's enrollmentId isn't there.
    const enrollment = enrollmentById.get(hw.enrollmentId);
    let petId = enrollment?.petId;
    if (petId === undefined) {
      const att = input.attendances.find(
        (a) => a.enrollmentId === hw.enrollmentId,
      );
      petId = att?.petId;
    }
    if (petId === undefined) continue;
    const list = homeworkByPet.get(petId) ?? [];
    list.push(hw);
    homeworkByPet.set(petId, list);
  }

  const rows: StudentBriefingRow[] = [];
  for (const enrollmentId of input.session.attendees) {
    const enrollment = enrollmentById.get(enrollmentId);
    if (!enrollment) continue;
    const petId = enrollment.petId;
    const pet = petById.get(petId);
    const petHomework = homeworkByPet.get(petId) ?? [];

    let practicedTodayCount = 0;
    let bestStreak = 0;
    let lastPracticedISO: string | null = null;
    let overdueCount = 0;
    for (const hw of petHomework) {
      if (hasPracticedToday(hw, input.todayISO)) practicedTodayCount++;
      const streak = getPracticeStreakDays(hw, input.todayISO);
      if (streak > bestStreak) bestStreak = streak;
      const last = getLastPracticedDate(hw);
      if (last && (!lastPracticedISO || last > lastPracticedISO)) {
        lastPracticedISO = last;
      }
      if (hw.nextDueDate && hw.nextDueDate < input.todayISO) {
        overdueCount++;
      }
    }

    rows.push({
      enrollmentId,
      petId,
      petName: enrollment.petName,
      petBreed: enrollment.petBreed,
      petImageUrl: pet?.imageUrl,
      ownerName: input.ownerLookup(petId),
      notes: selectBriefingNotes(petId, input.trainerNotes),
      vaccineWarning: computeVaccineWarning(
        petId,
        input.vaccinations,
        input.todayISO,
      ),
      homework: {
        activeCount: petHomework.length,
        practicedTodayCount,
        streakDays: bestStreak,
        lastPracticedISO,
        overdueCount,
      },
      consecutiveNoShows: getConsecutiveNoShows(petId, input.attendances),
    });
  }
  // Surface pets with active alerts first so the trainer's eye lands on
  // them: vaccine warning > behavior/concern note > no-show risk > rest.
  rows.sort((a, b) => {
    const aPriority = priorityForRow(a);
    const bPriority = priorityForRow(b);
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.petName.localeCompare(b.petName);
  });
  return rows;
}

function priorityForRow(row: StudentBriefingRow): number {
  if (row.vaccineWarning.hasWarning) return 0;
  if (row.notes.some((n) => n.category === "concern" || n.category === "behavior")) {
    return 1;
  }
  if (row.consecutiveNoShows >= 2) return 2;
  return 3;
}
