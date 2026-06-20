import type { QueryClient } from "@tanstack/react-query";
import type { TrainerNote, TrainingSession } from "@/types/training";
import type {
  SessionAttendance,
  TrainingEnrollment,
  TrainingHomework,
  SessionExerciseRating,
} from "@/lib/training-enrollment";
import { trainingQueries } from "@/lib/api/training";
import { buildTrainingReportCard } from "@/lib/training-report-cards";
import { fanOutReportCardUpsert } from "@/lib/training-report-cards";
import { fanOutHomeworkUpsert } from "@/lib/training-homework";
import type {
  AttendanceMark,
  SessionExerciseEntry,
  SessionPhoto,
} from "./session-view-types";

const PRESENT_STATUSES: AttendanceMark["status"][] = ["present", "late"];

export interface SaveSessionInput {
  queryClient: QueryClient;
  session: TrainingSession;
  rows: { enrollmentId: string; petId: number; petName: string }[];
  attendance: Record<string, AttendanceMark>;
  exerciseEntries: SessionExerciseEntry[];
  sessionNotes: string;
  studentNotes: Record<string, string>;
  photos: SessionPhoto[];
  trainerName: string;
  trainerId: string;
  petImageById: Map<number, string | undefined>;
}

export interface PresentStudentSummary {
  classEnrollmentId: string;
  seriesEnrollment: TrainingEnrollment | undefined;
  petId: number;
  petName: string;
  status: "present" | "late";
}

/** Walk every present student → build & fan out attendance, status flip,
 *  report card, and per-student trainer notes. Returns the list of present
 *  students with their resolved series enrollment so the caller can drive a
 *  homework prompt afterwards. */
export function saveSession(input: SaveSessionInput): PresentStudentSummary[] {
  const {
    queryClient,
    session,
    rows,
    attendance,
    exerciseEntries,
    sessionNotes,
    studentNotes,
    photos,
    trainerName,
    trainerId,
    petImageById,
  } = input;

  const allSeriesEnrollments =
    queryClient.getQueryData<TrainingEnrollment[]>(
      trainingQueries.allSeriesEnrollments().queryKey,
    ) ?? [];

  const nowISO = new Date().toISOString();
  const presentSummary: PresentStudentSummary[] = [];
  const reportCardPhotos = photos.map((p) => ({
    url: p.url,
    caption: p.caption || undefined,
    takenAt: p.takenAtISO,
  }));

  for (const row of rows) {
    const mark = attendance[row.enrollmentId];
    if (!mark || !PRESENT_STATUSES.includes(mark.status)) continue;
    const status = mark.status as "present" | "late";

    // Map class enrollment → series enrollment for this pet — the most
    // recent active series enrollment for the pet. In demo seeds each pet
    // has at most one active series enrollment at a time so this resolves
    // unambiguously.
    const seriesEnrollment = allSeriesEnrollments
      .filter((e) => e.petId === row.petId && e.status === "enrolled")
      .sort((a, b) => b.enrollmentDate.localeCompare(a.enrollmentDate))[0];

    // Exercises rated for this student (only ones marked included AND with a
    // rating actually set).
    const exercises: SessionExerciseRating[] = [];
    for (const entry of exerciseEntries) {
      // Curriculum exercises the trainer marked "not covered" stay on screen as
      // a record but aren't part of what was actually taught — skip them.
      if (entry.notCovered) continue;
      const studentEntry = entry.students[row.enrollmentId];
      if (!studentEntry) continue;
      if (studentEntry.included === false) continue;
      if (studentEntry.rating === null) continue;
      exercises.push({
        exerciseName: entry.exerciseName,
        rating: studentEntry.rating,
      });
    }

    // Combined trainer notes — session-wide summary then per-student
    // addendum. Persisted on the attendance record (read by Training History
    // tab) and split out below as a separate trainer-only TrainerNote.
    const perStudent = (studentNotes[row.enrollmentId] ?? "").trim();
    const combinedNotes = [sessionNotes.trim(), perStudent]
      .filter(Boolean)
      .join("\n\n");

    if (seriesEnrollment) {
      const attendanceRecord: SessionAttendance = {
        id: `att-${seriesEnrollment.id}-${session.id}`,
        enrollmentId: seriesEnrollment.id,
        sessionId: session.id,
        sessionNumber: seriesEnrollment.currentSessionNumber || 1,
        sessionDate: session.date,
        petId: row.petId,
        petName: row.petName,
        status,
        checkInTime: mark.markedAtISO,
        checkOutTime: nowISO,
        trainerNotes: combinedNotes,
        exercises,
        homeworkUnlocked: true,
        certificateGenerated: false,
        createdAt: nowISO,
        updatedAt: nowISO,
      };

      // Fan out: all-attendances catalog + per-pet cache.
      fanOutAttendance(queryClient, attendanceRecord);

      // Build & fan out the draft session report card.
      const allAttendancesNow =
        queryClient.getQueryData<SessionAttendance[]>(
          trainingQueries.allAttendances().queryKey,
        ) ?? [];
      const card = buildTrainingReportCard({
        kind: "session",
        enrollment: seriesEnrollment,
        attendances: allAttendancesNow,
        throughSessionNumber: attendanceRecord.sessionNumber,
        createdBy: trainerName,
        createdById: 0,
        date: session.date,
        petImageUrl: petImageById.get(row.petId),
        photos: reportCardPhotos,
        sessionSummary: combinedNotes,
      });
      fanOutReportCardUpsert(queryClient, card);

      // Bump sessionsAttended on the series enrollment.
      bumpSeriesEnrollmentProgress(queryClient, seriesEnrollment.id);
    }

    // Per-student trainer-only note — saves to the student's Notes tab.
    if (perStudent) {
      const note: TrainerNote = {
        id: `note-${row.enrollmentId}-${session.id}`,
        enrollmentId: row.enrollmentId,
        petId: row.petId,
        petName: row.petName,
        classId: session.classId,
        className: session.className,
        sessionId: session.id,
        trainerId,
        trainerName,
        date: session.date,
        note: perStudent,
        category: "general",
        isPrivate: true,
      };
      fanOutTrainerNote(queryClient, note);
    }

    presentSummary.push({
      classEnrollmentId: row.enrollmentId,
      seriesEnrollment,
      petId: row.petId,
      petName: row.petName,
      status,
    });
  }

  // Flip session.status → completed in the sessions cache.
  queryClient.setQueryData<TrainingSession[]>(
    trainingQueries.sessions().queryKey,
    (prev = []) =>
      prev.map((s) =>
        s.id === session.id ? { ...s, status: "completed" } : s,
      ),
  );

  // ── Graduation sweep ──────────────────────────────────────────────
  // If this was the final session of any series we touched, fire the
  // graduation flow: build a `series-completion` report card for every
  // enrollment in that series with ≥1 attended session, and flip the
  // enrollment's status to "completed".
  runGraduationSweep({
    queryClient,
    session,
    presentSummary,
    petImageById,
    photos: reportCardPhotos,
    trainerName,
  });

  return presentSummary;
}

/** Detect "final session" per series and run the graduation flow.
 *  Idempotent — same-id cards upsert via `fanOutReportCardUpsert`. */
function runGraduationSweep(input: {
  queryClient: QueryClient;
  session: TrainingSession;
  presentSummary: PresentStudentSummary[];
  petImageById: Map<number, string | undefined>;
  photos: { url: string; caption?: string; takenAt: string }[];
  trainerName: string;
}): void {
  const {
    queryClient,
    session,
    presentSummary,
    petImageById,
    photos,
    trainerName,
  } = input;
  const touchedSeriesIds = new Set<string>();
  for (const p of presentSummary) {
    if (p.seriesEnrollment) touchedSeriesIds.add(p.seriesEnrollment.seriesId);
  }
  if (touchedSeriesIds.size === 0) return;

  const seriesList =
    queryClient.getQueryData<
      Array<{
        id: string;
        sessions: Array<{ date: string }>;
      }>
    >(trainingQueries.series().queryKey) ?? [];
  const allEnrollments =
    queryClient.getQueryData<TrainingEnrollment[]>(
      trainingQueries.allSeriesEnrollments().queryKey,
    ) ?? [];
  const allAttendances =
    queryClient.getQueryData<SessionAttendance[]>(
      trainingQueries.allAttendances().queryKey,
    ) ?? [];
  const nowISO = new Date().toISOString();

  for (const seriesId of touchedSeriesIds) {
    const seriesRecord = seriesList.find((s) => s.id === seriesId);
    if (!seriesRecord || seriesRecord.sessions.length === 0) continue;
    const lastSessionDate = seriesRecord.sessions
      .map((s) => s.date)
      .sort()
      .slice(-1)[0]!;
    if (lastSessionDate !== session.date) continue; // not the final session

    const seriesEnrollments = allEnrollments.filter(
      (e) =>
        e.seriesId === seriesId &&
        e.status !== "dropped" &&
        e.status !== "waitlisted",
    );
    for (const enrollment of seriesEnrollments) {
      const attendedCount = allAttendances.filter(
        (a) =>
          a.enrollmentId === enrollment.id &&
          (a.status === "present" || a.status === "late"),
      ).length;
      if (attendedCount < 1) continue;

      const gradCard = buildTrainingReportCard({
        kind: "series-completion",
        enrollment,
        attendances: allAttendances,
        throughSessionNumber: enrollment.totalSessions,
        createdBy: trainerName,
        createdById: 0,
        date: lastSessionDate,
        petImageUrl: petImageById.get(enrollment.petId),
        photos,
      });
      fanOutReportCardUpsert(queryClient, gradCard);

      // Flip enrollment to "completed". Walk every series-enrollment
      // cache so HQ + per-series + per-pet views all re-render.
      const cache = queryClient.getQueryCache();
      cache
        .findAll({ queryKey: ["training", "series-enrollments"] })
        .forEach((q) => {
          queryClient.setQueryData<TrainingEnrollment[]>(
            q.queryKey,
            (prev = []) =>
              prev.map((e) =>
                e.id === enrollment.id
                  ? { ...e, status: "completed", updatedAt: nowISO }
                  : e,
              ),
          );
        });
      cache.findAll({ queryKey: ["training", "series"] }).forEach((q) => {
        if (q.queryKey[3] !== "enrollments") return;
        queryClient.setQueryData<TrainingEnrollment[]>(
          q.queryKey,
          (prev = []) =>
            prev.map((e) =>
              e.id === enrollment.id
                ? { ...e, status: "completed", updatedAt: nowISO }
                : e,
            ),
        );
      });
    }
  }
}

function fanOutAttendance(
  queryClient: QueryClient,
  record: SessionAttendance,
): void {
  const cache = queryClient.getQueryCache();
  cache.findAll({ queryKey: ["training", "attendances"] }).forEach((query) => {
    const key = query.queryKey;
    // Accept: all-attendances catalog + per-pet caches keyed on this pet.
    const scope = key[2];
    let accepts = false;
    if (scope === "all") accepts = true;
    else if (scope === "pet" && key[3] === record.petId) accepts = true;
    if (!accepts) return;
    queryClient.setQueryData<SessionAttendance[]>(key, (prev = []) => {
      const idx = prev.findIndex((a) => a.id === record.id);
      if (idx === -1) return [...prev, record];
      const next = prev.slice();
      next[idx] = record;
      return next;
    });
  });
}

function fanOutTrainerNote(queryClient: QueryClient, note: TrainerNote): void {
  const cache = queryClient.getQueryCache();
  cache
    .findAll({ queryKey: trainingQueries.trainerNotes().queryKey })
    .forEach((query) => {
      queryClient.setQueryData<TrainerNote[]>(query.queryKey, (prev = []) => {
        const idx = prev.findIndex((n) => n.id === note.id);
        if (idx === -1) return [note, ...prev];
        const next = prev.slice();
        next[idx] = note;
        return next;
      });
    });
  // Per-enrollment note cache, if it's been populated.
  const perEnrollmentKey = trainingQueries.notesByEnrollment(
    note.enrollmentId,
  ).queryKey;
  queryClient.setQueryData<TrainerNote[]>(perEnrollmentKey, (prev) => {
    if (!prev) return prev;
    const idx = prev.findIndex((n) => n.id === note.id);
    if (idx === -1) return [note, ...prev];
    const next = prev.slice();
    next[idx] = note;
    return next;
  });
}

function bumpSeriesEnrollmentProgress(
  queryClient: QueryClient,
  enrollmentId: string,
): void {
  const cache = queryClient.getQueryCache();
  cache
    .findAll({ queryKey: ["training", "series-enrollments"] })
    .forEach((query) => {
      queryClient.setQueryData<TrainingEnrollment[]>(
        query.queryKey,
        (prev = []) =>
          prev.map((e) => {
            if (e.id !== enrollmentId) return e;
            const sessionsAttended = e.sessionsAttended + 1;
            const currentSessionNumber = Math.min(
              e.currentSessionNumber + 1,
              e.totalSessions,
            );
            const progress = Math.round(
              (sessionsAttended / e.totalSessions) * 100,
            );
            return {
              ...e,
              sessionsAttended,
              currentSessionNumber,
              progress,
              updatedAt: new Date().toISOString(),
            };
          }),
      );
    });
  cache
    .findAll({
      queryKey: ["training", "series"],
    })
    .forEach((query) => {
      const key = query.queryKey;
      // The seriesEnrollments(seriesId) cache lives at
      // ["training","series", seriesId, "enrollments"].
      if (key[3] !== "enrollments") return;
      queryClient.setQueryData<TrainingEnrollment[]>(key, (prev = []) =>
        prev.map((e) => {
          if (e.id !== enrollmentId) return e;
          const sessionsAttended = e.sessionsAttended + 1;
          const currentSessionNumber = Math.min(
            e.currentSessionNumber + 1,
            e.totalSessions,
          );
          const progress = Math.round(
            (sessionsAttended / e.totalSessions) * 100,
          );
          return {
            ...e,
            sessionsAttended,
            currentSessionNumber,
            progress,
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    });
}

// Re-exported here so the homework-prompt dialog can fan out without
// re-importing it through a deeper chain.
export { fanOutHomeworkUpsert };
export type { TrainingHomework };
