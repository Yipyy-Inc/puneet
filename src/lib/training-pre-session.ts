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
import type { Note, Tag, TagAssignment } from "@/types/tags";
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

/** Practice window — if the owner logged at least one practice within this
 *  many days of the session, the roster card flips its homework chip to a
 *  green check. Roughly mirrors a weekly cadence. */
export const RECENT_PRACTICE_WINDOW_DAYS = 7;

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

/** Walk back `days` from a `YYYY-MM-DD` string, returning another
 *  `YYYY-MM-DD`. UTC math so the answer doesn't drift across daylight-
 *  saving boundaries. */
function subtractDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
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

/** Heads-up alert about a pet that surfaces in the red Alerts box at the
 *  top of the briefing roster. Sourced from pet tags + notes + the pet
 *  record itself — anything the trainer must see before the dog walks in. */
export type PetAlertKind =
  | "critical-tag"
  | "warning-tag"
  | "behavior-note"
  | "medication-note"
  | "care-note"
  | "special-needs"
  | "trainer-alert";

export interface PetAlert {
  kind: PetAlertKind;
  /** Short label rendered as the chip head — e.g. "Bite history" / "Medication". */
  label: string;
  /** Free-text detail rendered inside the alert block — the actual note
   *  content, tag description, or pet.specialNeeds value. */
  detail: string;
}

/** Per-student summary of homework that was assigned at the previous
 *  session — drives the collapsible "Homework summary" block on the
 *  briefing roster. Surfaces who practiced and who didn't. */
export interface PreviousHomeworkRow {
  petId: number;
  petName: string;
  petBreed: string;
  petImageUrl?: string;
  /** Homework items assigned at the previous session (title + frequency). */
  assignedItems: { id: string; title: string; frequency?: string }[];
  /** Practice entries logged on or after the previous session date. */
  practiceCount: number;
  /** True when at least one practice has been logged since the previous
   *  session — drives the green-check / gray-dash submission icon. */
  submitted: boolean;
  /** Most recent practice date (if any). */
  lastPracticedISO: string | null;
}

export interface HomeworkSummary {
  /** ISO date of the previous session in this series. */
  previousSessionDate: string;
  /** One row per roster pet that was assigned homework at the previous
   *  session. Pets without prior homework drop out of the list entirely. */
  rows: PreviousHomeworkRow[];
  /** Aggregate stats — drives the "X of Y submitted" caption. */
  submittedCount: number;
  totalCount: number;
}

/** A single owner-uploaded homework video that the trainer can review in
 *  the briefing panel. Sourced from the practice log on each TrainingHomework
 *  for the pet — one entry per practice day that has a `videoUrl`. */
export interface HomeworkVideoSubmission {
  homeworkId: string;
  homeworkTitle: string;
  /** YYYY-MM-DD — the day the owner was practicing for. */
  practiceDate: string;
  /** ISO timestamp the video itself was attached. Falls back to the entry's
   *  `markedAt` when the owner uploaded a video alongside the original
   *  practice tap. */
  attachedAtISO: string;
  videoUrl: string;
}

/** Compact rollup of attendance for the briefing roster — scoped to the
 *  same series enrollment so a missed prior session reads as a series
 *  pattern, not a lifetime stat. */
export interface BriefingAttendanceSummary {
  /** Sessions attended (present + late) prior to this one. */
  attended: number;
  /** Sessions missed (absent) prior to this one. */
  missed: number;
  /** Total prior sessions on file for this enrollment. */
  total: number;
}

export interface StudentBriefingRow {
  enrollmentId: string;
  petId: number;
  petName: string;
  petBreed: string;
  petImageUrl?: string;
  ownerName: string;
  /** Tappable contact for the trainer — surfaces under the dog name on the
   *  roster card. */
  ownerPhone?: string;
  /** Did the owner submit homework practice (with or without a video) in the
   *  lead-up to this session? Looks at the practice log on every active
   *  homework for the pet within the last `RECENT_PRACTICE_WINDOW_DAYS`. */
  homeworkSubmitted: boolean;
  /** Per-pet attendance rate scoped to this series enrollment. Empty when
   *  the pet has no prior attendance records on file. */
  attendance: BriefingAttendanceSummary;
  notes: TrainerNote[];
  vaccineWarning: {
    hasWarning: boolean;
    soonestDays: number | null;
    soonestName: string | null;
  };
  homework: StudentHomeworkSnapshot;
  /** Owner-uploaded homework videos surfaced for this briefing, newest first.
   *  Empty when the owner hasn't submitted any clips. */
  homeworkVideos: HomeworkVideoSubmission[];
  /** Behavioral / care / medical alerts the trainer needs to see before
   *  class. Empty when nothing's flagged. */
  petAlerts: PetAlert[];
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
  /** Catalog of pet tags + per-pet assignments. Used to derive critical /
   *  warning alerts (bite history, reactive, etc.) for the Alerts section. */
  petTags?: Tag[];
  petTagAssignments?: TagAssignment[];
  /** Per-pet notes catalog — surfaces behavioral, medical, and pinned care
   *  notes onto the alert section. */
  petNotes?: Note[];
  ownerLookup: (petId: number) => string;
  todayISO: string;
}

/** Walk every signal on a pet and collect the trainer-facing alerts. */
function collectPetAlerts(
  petId: number,
  pet: Pet | undefined,
  petTags: Tag[],
  petTagAssignments: TagAssignment[],
  petNotes: Note[],
  trainerNotes: TrainerNote[] = [],
): PetAlert[] {
  const alerts: PetAlert[] = [];

  // Trainer notes flagged "Mark as Active Alert" land at the very top of the
  // section — these are the bite-history / muzzle-required style heads-ups
  // staff actively curate in the Notes tab.
  for (const tn of trainerNotes) {
    if (tn.petId !== petId) continue;
    if (!tn.isActiveAlert || tn.deactivatedAt) continue;
    alerts.push({
      kind: "trainer-alert",
      label: "Active alert",
      detail: tn.note,
    });
  }
  const tagById = new Map(petTags.map((t) => [t.id, t]));
  const assignedTagIds = new Set(
    petTagAssignments
      .filter((a) => a.entityType === "pet" && a.entityId === petId)
      .map((a) => a.tagId),
  );
  // Critical first, then warning. Informational tags don't earn a slot in
  // the red Alerts box — they live elsewhere on the profile.
  for (const tagId of assignedTagIds) {
    const tag = tagById.get(tagId);
    if (!tag || !tag.isActive) continue;
    if (tag.priority === "critical") {
      alerts.push({
        kind: "critical-tag",
        label: tag.name,
        detail: tag.description ?? "Flagged as critical by staff.",
      });
    } else if (tag.priority === "warning") {
      alerts.push({
        kind: "warning-tag",
        label: tag.name,
        detail: tag.description ?? "Flagged as a heads-up by staff.",
      });
    }
  }

  // Notes — pinned behavior / medical / care notes only. Unpinned general
  // notes don't qualify as alerts.
  for (const note of petNotes) {
    if (note.category !== "pet" || note.entityId !== petId) continue;
    if (note.subType === "behavior") {
      alerts.push({
        kind: "behavior-note",
        label: "Behavior note",
        detail: note.content,
      });
    } else if (note.subType === "medical") {
      alerts.push({
        kind: "medication-note",
        label: "Medication / medical",
        detail: note.content,
      });
    } else if (note.isPinned) {
      alerts.push({
        kind: "care-note",
        label: "Care note",
        detail: note.content,
      });
    }
  }

  // Pet-record fields that are free-text but rarely empty when they matter.
  const specialNeeds = pet?.specialNeeds?.trim();
  if (specialNeeds) {
    alerts.push({
      kind: "special-needs",
      label: "Special needs",
      detail: specialNeeds,
    });
  }

  // Dedupe by label+detail so a tag and a note saying the same thing don't
  // double-up. Critical-tag stays first when it tied with a note.
  const seen = new Set<string>();
  const ordered = alerts.sort((a, b) => alertPriorityRank(a) - alertPriorityRank(b));
  return ordered.filter((a) => {
    const key = `${a.kind}::${a.label}::${a.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const ALERT_PRIORITY_RANK: Record<PetAlertKind, number> = {
  // Trainer-curated active alerts always rank first — they're the
  // bite-history / muzzle-required heads-ups staff explicitly raised.
  "trainer-alert": -1,
  "critical-tag": 0,
  "medication-note": 1,
  "warning-tag": 2,
  "behavior-note": 3,
  "special-needs": 4,
  "care-note": 5,
};
function alertPriorityRank(a: PetAlert): number {
  return ALERT_PRIORITY_RANK[a.kind];
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
    let homeworkSubmitted = false;
    const recentWindowStart = subtractDays(
      input.todayISO,
      RECENT_PRACTICE_WINDOW_DAYS,
    );
    const homeworkVideos: HomeworkVideoSubmission[] = [];
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
      for (const entry of hw.practiceLog ?? []) {
        if (entry.date >= recentWindowStart) homeworkSubmitted = true;
        if (!entry.videoUrl) continue;
        homeworkVideos.push({
          homeworkId: hw.id,
          homeworkTitle: hw.title,
          practiceDate: entry.date,
          attachedAtISO: entry.videoAttachedAt ?? entry.markedAt,
          videoUrl: entry.videoUrl,
        });
      }
    }
    // Newest submissions first — most relevant to the trainer about to walk
    // into the session.
    homeworkVideos.sort((a, b) => b.attachedAtISO.localeCompare(a.attachedAtISO));

    // Attendance summary scoped to this series enrollment (or to this pet
    // if we can't pin a single enrollment) — drives the "X of Y attended"
    // chip. Only counts sessions earlier than the one we're briefing for so
    // the trainer sees the running pattern up to *now*.
    const priorAttendances = input.attendances.filter((a) => {
      if (a.petId !== petId) return false;
      if (a.sessionId === input.session.id) return false;
      return a.sessionDate < input.session.date;
    });
    let attended = 0;
    let missed = 0;
    for (const a of priorAttendances) {
      if (a.status === "present" || a.status === "late") attended++;
      else if (a.status === "absent") missed++;
    }
    const attendance: BriefingAttendanceSummary = {
      attended,
      missed,
      total: priorAttendances.length,
    };

    rows.push({
      enrollmentId,
      petId,
      petName: enrollment.petName,
      petBreed: enrollment.petBreed,
      petImageUrl: pet?.imageUrl,
      ownerName: input.ownerLookup(petId),
      ownerPhone: enrollment.ownerPhone,
      homeworkSubmitted,
      attendance,
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
      homeworkVideos,
      petAlerts: collectPetAlerts(
        petId,
        pet,
        input.petTags ?? [],
        input.petTagAssignments ?? [],
        input.petNotes ?? [],
        input.trainerNotes,
      ),
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

interface HomeworkSummaryInput {
  rows: StudentBriefingRow[];
  session: TrainingSession;
  enrollments: Enrollment[];
  attendances: SessionAttendance[];
  homework: TrainingHomework[];
}

export interface PreviousSessionSummary {
  /** ISO date of the previous session this summary belongs to. */
  sessionDate: string;
  /** ISO session id (from the attendance record) — useful when a future
   *  surface wants to deep-link back to that session's full notes. */
  sessionId: string;
  /** Trainer's session-wide summary text, extracted from the previous
   *  session's attendance records. */
  summary: string;
}

/** Find the most recent prior session for the roster pets and pull its
 *  shared session summary. Returns `null` when no prior session attendance
 *  has a non-empty `trainerNotes` to surface. */
export function selectPreviousSessionSummary(input: {
  rows: StudentBriefingRow[];
  session: TrainingSession;
  attendances: SessionAttendance[];
}): PreviousSessionSummary | null {
  const { rows, session, attendances } = input;
  const rosterPetIds = new Set(rows.map((r) => r.petId));
  if (rosterPetIds.size === 0) return null;

  const candidates = attendances.filter(
    (a) =>
      rosterPetIds.has(a.petId) &&
      a.sessionId !== session.id &&
      a.sessionDate < session.date &&
      a.trainerNotes.trim().length > 0,
  );
  if (candidates.length === 0) return null;
  // Newest first — most relevant.
  candidates.sort((a, b) => {
    if (a.sessionDate !== b.sessionDate)
      return a.sessionDate < b.sessionDate ? 1 : -1;
    return a.sessionNumber - b.sessionNumber > 0 ? -1 : 1;
  });
  const latest = candidates[0]!;
  // Within the chosen session, the session-wide summary is the first
  // paragraph (the save flow joins `sessionSummary + "\n\n" + perStudent`).
  // For a private 1-on-1, no `\n\n` exists and the whole note IS the
  // summary, so the split-and-take-first still does the right thing.
  const summary = latest.trainerNotes.split("\n\n")[0]!.trim();
  if (!summary) return null;
  return {
    sessionDate: latest.sessionDate,
    sessionId: latest.sessionId,
    summary,
  };
}

/** Compute the previous-session homework summary for the briefing roster.
 *  Returns `null` when this is the first session (no prior attendances on
 *  file) or when no homework was assigned at the previous session. */
export function aggregateHomeworkSummary(
  input: HomeworkSummaryInput,
): HomeworkSummary | null {
  const { rows, session, enrollments, attendances, homework } = input;
  const rosterPetIds = new Set(rows.map((r) => r.petId));
  if (rosterPetIds.size === 0) return null;

  // Find the previous-session date — max session date across all attendances
  // for roster pets that's strictly earlier than the briefing session.
  const priorDates = attendances
    .filter(
      (a) =>
        rosterPetIds.has(a.petId) &&
        a.sessionId !== session.id &&
        a.sessionDate < session.date,
    )
    .map((a) => a.sessionDate);
  if (priorDates.length === 0) return null;
  const previousSessionDate = priorDates.sort().slice(-1)[0]!;

  // Build the petId → series-enrollment ids map by walking attendances.
  // (Homework records reference series enrollment ids, not pet ids.)
  const enrollmentIdsByPet = new Map<number, Set<string>>();
  for (const att of attendances) {
    if (!rosterPetIds.has(att.petId)) continue;
    const set = enrollmentIdsByPet.get(att.petId) ?? new Set();
    set.add(att.enrollmentId);
    enrollmentIdsByPet.set(att.petId, set);
  }
  // Also bridge through class enrollments so pets without any series-side
  // attendance still have a chance to surface (defensive — won't fire in
  // the current seed but keeps the helper resilient).
  const enrollmentByPet = new Map(
    enrollments.map((e) => [e.petId, e]),
  );
  void enrollmentByPet;

  const rosterByPetId = new Map(rows.map((r) => [r.petId, r]));

  let submittedCount = 0;
  const summaryRows: PreviousHomeworkRow[] = [];
  for (const petId of rosterPetIds) {
    const enrollmentIds = enrollmentIdsByPet.get(petId);
    if (!enrollmentIds || enrollmentIds.size === 0) continue;
    const assignedHomework = homework.filter(
      (hw) =>
        enrollmentIds.has(hw.enrollmentId) &&
        hw.sessionDate === previousSessionDate,
    );
    if (assignedHomework.length === 0) continue;

    let practiceCount = 0;
    let lastPracticedISO: string | null = null;
    for (const hw of assignedHomework) {
      for (const entry of hw.practiceLog ?? []) {
        if (entry.date < previousSessionDate) continue;
        practiceCount++;
        if (!lastPracticedISO || entry.date > lastPracticedISO) {
          lastPracticedISO = entry.date;
        }
      }
    }
    const submitted = practiceCount > 0;
    if (submitted) submittedCount++;

    const rosterRow = rosterByPetId.get(petId);
    summaryRows.push({
      petId,
      petName: rosterRow?.petName ?? "",
      petBreed: rosterRow?.petBreed ?? "",
      petImageUrl: rosterRow?.petImageUrl,
      assignedItems: assignedHomework.map((hw) => ({
        id: hw.id,
        title: hw.title,
        frequency: hw.frequency,
      })),
      practiceCount,
      submitted,
      lastPracticedISO,
    });
  }

  if (summaryRows.length === 0) return null;

  // Sort: non-submitters first so the trainer's eye lands on who skipped
  // practice, then alphabetical for stable ordering.
  summaryRows.sort((a, b) => {
    if (a.submitted !== b.submitted) return a.submitted ? 1 : -1;
    return a.petName.localeCompare(b.petName);
  });

  return {
    previousSessionDate,
    rows: summaryRows,
    submittedCount,
    totalCount: summaryRows.length,
  };
}
