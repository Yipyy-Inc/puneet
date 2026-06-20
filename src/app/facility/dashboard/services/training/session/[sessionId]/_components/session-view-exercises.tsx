"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  GraduationCap,
  ImagePlus,
  NotebookPen,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trainingQueries } from "@/lib/api/training";
import { useQuery } from "@tanstack/react-query";
import type { TrainingClass, TrainingSession } from "@/types/training";
import type { StudentBriefingRow } from "@/lib/training-pre-session";
import type { SessionAttendance } from "@/lib/training-enrollment";
import {
  DIFFICULTY_LABELS,
  getCurriculumExercisesForClass,
  getCurriculumStyleForClass,
  getCurriculumWeekForClass,
  getDisciplineIdForClassName,
  type TrainingExerciseDef,
} from "@/data/training-exercises";
import type {
  AttendanceMark,
  ExerciseRating,
  SessionExerciseEntry,
  SessionPhoto,
} from "./session-view-types";
import { RATING_LABELS } from "./session-view-types";

interface Props {
  session: TrainingSession;
  classRecord: TrainingClass | undefined;
  /** 1-based session number within the class — selects the curriculum week. */
  sessionNumber: number;
  attendance: Record<string, AttendanceMark>;
  rows: StudentBriefingRow[];
  entries: SessionExerciseEntry[];
  setEntries: React.Dispatch<React.SetStateAction<SessionExerciseEntry[]>>;
  sessionNotes: string;
  setSessionNotes: (value: string) => void;
  studentNotes: Record<string, string>;
  setStudentNote: (enrollmentId: string, value: string) => void;
  photos: SessionPhoto[];
  onAddPhotos: () => void;
  onSetPhotoCaption: (id: string, caption: string) => void;
  onRemovePhoto: (id: string) => void;
  onBack: () => void;
  onFinish: () => void;
}

const PRESENT_STATUSES: AttendanceMark["status"][] = ["present", "late"];

export function SessionExercisesSection({
  session,
  classRecord,
  sessionNumber,
  attendance,
  rows,
  entries,
  setEntries,
  sessionNotes,
  setSessionNotes,
  studentNotes,
  setStudentNote,
  photos,
  onAddPhotos,
  onSetPhotoCaption,
  onRemovePhoto,
  onBack,
  onFinish,
}: Props) {
  const { data: exercises = [] } = useQuery(trainingQueries.exercises());
  const { data: disciplines = [] } = useQuery(trainingQueries.disciplines());
  const { data: allAttendances = [] } = useQuery(
    trainingQueries.allAttendances(),
  );
  const { data: allEnrollments = [] } = useQuery(trainingQueries.enrollments());
  // Pre-selected exercises the trainer queued during the briefing — these
  // win over the prior-sessions auto-seed when both exist.
  const { data: plannedExerciseIds = [] } = useQuery(
    trainingQueries.plannedExercisesForSession(session.id),
  );

  // The session/class now carries its discipline directly (denormalized from
  // the course type), so prefer that. Fall back to name-matching the catalog
  // only for legacy sessions that predate the explicit tag.
  const preferredDisciplineId = useMemo(
    () =>
      session.disciplineId ??
      classRecord?.disciplineId ??
      getDisciplineIdForClassName(session.className),
    [session.disciplineId, classRecord?.disciplineId, session.className],
  );

  // Whether this course follows a fixed plan (structured) or is built from
  // scratch each session (adaptive). Adaptive courses (e.g. Reactive Rover,
  // Private 1-on-1) skip the curriculum pre-load entirely. Prefer the style
  // denormalized onto the session/class; fall back to name-matching the
  // catalog for legacy sessions that predate the explicit tag.
  const isAdaptive = useMemo(
    () =>
      (session.curriculumStyle ??
        classRecord?.curriculumStyle ??
        getCurriculumStyleForClass(session.className)) === "adaptive",
    [session.curriculumStyle, classRecord?.curriculumStyle, session.className],
  );

  // The course-type curriculum for THIS session's week — only for structured
  // courses. Adaptive courses have no course-level plan.
  const courseCurriculumExercises = useMemo(
    () =>
      isAdaptive
        ? []
        : getCurriculumExercisesForClass(session.className, sessionNumber),
    [isAdaptive, session.className, sessionNumber],
  );
  const courseCurriculumWeek = useMemo(
    () =>
      isAdaptive
        ? undefined
        : getCurriculumWeekForClass(session.className, sessionNumber),
    [isAdaptive, session.className, sessionNumber],
  );

  const presentRows = useMemo(
    () =>
      rows.filter((r) =>
        PRESENT_STATUSES.includes(attendance[r.enrollmentId]?.status ?? ""),
      ),
    [rows, attendance],
  );

  // Dog-specific private curriculum — for an adaptive course run 1-on-1, the
  // trainer may have built a per-dog session plan in the student profile. It
  // pre-loads exactly like the course curriculum, but follows the dog rather
  // than the course type. Keyed off the session ROSTER (not attendance) so a
  // single-dog session resolves the same plan regardless of who's marked
  // present, and marking a late arrival never reclassifies seeded entries.
  const soloPetId = useMemo(
    () => (rows.length === 1 ? rows[0]!.petId : undefined),
    [rows],
  );
  const { data: privatePlanWeeks = [] } = useQuery(
    trainingQueries.privateSessionPlanForPet(soloPetId ?? -1),
  );
  const privatePlanWeek = useMemo(
    () =>
      isAdaptive && soloPetId !== undefined
        ? privatePlanWeeks.find((w) => w.sessionNumber === sessionNumber)
        : undefined,
    [isAdaptive, soloPetId, privatePlanWeeks, sessionNumber],
  );
  const privatePlanExercises = useMemo<TrainingExerciseDef[]>(() => {
    if (!privatePlanWeek || privatePlanWeek.exerciseIds.length === 0) return [];
    const byId = new Map(exercises.map((e) => [e.id, e]));
    return privatePlanWeek.exerciseIds
      .map((id) => byId.get(id))
      .filter((e): e is TrainingExerciseDef => !!e && !e.isHidden);
  }, [privatePlanWeek, exercises]);

  // The active plan for this session — the course curriculum (structured) wins,
  // otherwise the dog-specific private plan (adaptive 1-on-1). Drives the
  // pre-load, the "Session N · {theme}" banner, and the CURRICULUM tag/badge.
  const planSource: "curriculum" | "private" =
    courseCurriculumExercises.length > 0 ? "curriculum" : "private";
  const curriculumExercises =
    courseCurriculumExercises.length > 0
      ? courseCurriculumExercises
      : privatePlanExercises;
  const curriculumWeek =
    courseCurriculumExercises.length > 0
      ? courseCurriculumWeek
      : privatePlanExercises.length > 0
        ? privatePlanWeek
        : undefined;
  const curriculumIdSet = useMemo(
    () => new Set(curriculumExercises.map((e) => e.id)),
    [curriculumExercises],
  );

  const disciplineNameById = useMemo(
    () => new Map(disciplines.map((d) => [d.id, d.name])),
    [disciplines],
  );

  // Planned seed priority:
  //   1. Exercises the trainer explicitly queued during the pre-session
  //      briefing — an intentional pick for this session, so it wins. This is
  //      also the "one-off plan" an adaptive course can still pre-load.
  //   2. The active plan for this session's week (course curriculum for
  //      structured courses, or a dog-specific private plan) — the system
  //      knows in advance what the session covers, so it pre-loads.
  //   3. Adaptive courses stop here and open with an empty list — the trainer
  //      builds it from scratch each session.
  //   4. Otherwise (structured), fall back to the union of exercises logged in
  //      the last 2 prior sessions so a returning class starts from continuity
  //      rather than a blank slate.
  const plannedSeed = useMemo<TrainingExerciseDef[]>(() => {
    if (plannedExerciseIds.length > 0) {
      const exerciseById = new Map(exercises.map((e) => [e.id, e]));
      return plannedExerciseIds
        .map((id) => exerciseById.get(id))
        .filter((ex): ex is TrainingExerciseDef => !!ex);
    }
    if (curriculumExercises.length > 0) return curriculumExercises;
    if (isAdaptive) return [];
    const exerciseByName = new Map(
      exercises.map((e) => [e.name.toLowerCase(), e]),
    );
    return collectPlannedExercises({
      session,
      classRecord,
      attendances: allAttendances,
      enrollments: allEnrollments,
      exerciseByName,
    });
  }, [
    plannedExerciseIds,
    curriculumExercises,
    isAdaptive,
    exercises,
    session,
    classRecord,
    allAttendances,
    allEnrollments,
  ]);

  // Seed once: when entries is empty and the present roster is known, push
  // the planned exercises in. Guarded by entries.length so reseeding never
  // happens after the trainer removes all rows.
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (seeded) return;
    if (presentRows.length === 0) return;
    if (plannedSeed.length === 0) return;
    setEntries((curr) => {
      if (curr.length > 0) return curr;
      return plannedSeed.map((ex) =>
        createEntry(
          ex,
          presentRows.map((r) => r.enrollmentId),
        ),
      );
    });
    setSeeded(true);
  }, [seeded, presentRows, plannedSeed, setEntries]);

  function addExercise(ex: TrainingExerciseDef) {
    setEntries((curr) => {
      if (curr.some((e) => e.exerciseId === ex.id)) return curr;
      return [
        ...curr,
        createEntry(
          ex,
          presentRows.map((r) => r.enrollmentId),
        ),
      ];
    });
  }

  function removeEntry(rowId: string) {
    setEntries((curr) => curr.filter((e) => e.rowId !== rowId));
  }

  // Curriculum exercises aren't deleted on trash — they're flagged "not
  // covered" so the session keeps an accurate record of what the plan was vs.
  // what actually got taught. Restore clears the flag.
  function markNotCovered(rowId: string) {
    setEntries((curr) =>
      curr.map((e) => (e.rowId === rowId ? { ...e, notCovered: true } : e)),
    );
  }

  function restoreEntry(rowId: string) {
    setEntries((curr) =>
      curr.map((e) => (e.rowId === rowId ? { ...e, notCovered: false } : e)),
    );
  }

  // Curriculum exercises render first (in plan order), manually-added ones
  // below — matching the spec's CURRICULUM-then-ADDED layout.
  const orderedEntries = useMemo(() => {
    const curriculum = entries.filter((e) => curriculumIdSet.has(e.exerciseId));
    const added = entries.filter((e) => !curriculumIdSet.has(e.exerciseId));
    return [...curriculum, ...added];
  }, [entries, curriculumIdSet]);

  const coveredCount = useMemo(
    () => entries.filter((e) => !e.notCovered).length,
    [entries],
  );

  function toggleInclude(rowId: string, enrollmentId: string) {
    setEntries((curr) =>
      curr.map((e) => {
        if (e.rowId !== rowId) return e;
        const current = e.students[enrollmentId];
        const included = current ? !current.included : false;
        return {
          ...e,
          students: {
            ...e.students,
            [enrollmentId]: {
              included,
              rating: current?.rating ?? null,
            },
          },
        };
      }),
    );
  }

  function setRating(
    rowId: string,
    enrollmentId: string,
    rating: ExerciseRating,
  ) {
    setEntries((curr) =>
      curr.map((e) => {
        if (e.rowId !== rowId) return e;
        const current = e.students[enrollmentId];
        return {
          ...e,
          students: {
            ...e.students,
            [enrollmentId]: {
              included: current?.included ?? true,
              rating,
            },
          },
        };
      }),
    );
  }

  if (presentRows.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <Sparkles className="text-muted-foreground size-8" />
        <p className="font-medium">No students marked present.</p>
        <p className="text-muted-foreground text-sm">
          Mark at least one student Present or Late before recording exercises.
        </p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-1.5 size-4" />
          Back to Attendance
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Plan banner — shows the session number + this week's theme when a plan
          (course curriculum or a dog-specific private plan) covers it. Adaptive
          sessions with no plan show a "build from scratch" note instead. */}
      {curriculumWeek ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 dark:border-indigo-900/50 dark:bg-indigo-950/30">
          <div className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 flex size-8 shrink-0 items-center justify-center rounded-lg">
            <GraduationCap className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-indigo-900 dark:text-indigo-100">
              Session {sessionNumber}
              {curriculumWeek.title ? ` · ${curriculumWeek.title}` : ""}
            </p>
            <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
              {planSource === "private"
                ? "Pre-loaded from this dog's custom session plan — rate each exercise, or add and remove as the session goes."
                : "Pre-loaded from the course curriculum — rate each dog, or add and remove as the class actually goes."}
            </p>
          </div>
        </div>
      ) : isAdaptive ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200 flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-amber-900 dark:text-amber-100">
              Adaptive session
            </p>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
              No pre-loaded plan — build today around what each dog needs. Add
              exercises below as you go.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Exercises</h2>
          <p className="text-muted-foreground text-xs">
            Each present student is included by default. De-select any dog that
            didn&#39;t work on the exercise. Tap a rating per dog.
          </p>
        </div>
        <span className="text-muted-foreground rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold tabular-nums dark:bg-slate-800">
          {coveredCount} exercise{coveredCount === 1 ? "" : "s"}
        </span>
      </div>

      <AddExerciseSearch
        exercises={exercises}
        disciplineNameById={disciplineNameById}
        preferredDisciplineId={preferredDisciplineId}
        curriculumIds={curriculumIdSet}
        existingExerciseIds={new Set(entries.map((e) => e.exerciseId))}
        onAdd={addExercise}
      />

      {entries.length === 0 ? (
        <Card className="text-muted-foreground flex flex-col items-center gap-2 border-dashed bg-transparent p-8 text-center text-sm">
          <Sparkles className="size-6 text-amber-400" />
          <p>No exercises yet. Add one above to start rating each dog.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {orderedEntries.map((entry) => {
            const isCurriculum = curriculumIdSet.has(entry.exerciseId);
            return (
              <ExerciseRatingCard
                key={entry.rowId}
                entry={entry}
                presentRows={presentRows}
                disciplineName={disciplineNameById.get(entry.disciplineId)}
                isCurriculum={isCurriculum}
                notCovered={!!entry.notCovered}
                studentNotes={studentNotes}
                setStudentNote={setStudentNote}
                onRemove={() =>
                  isCurriculum
                    ? markNotCovered(entry.rowId)
                    : removeEntry(entry.rowId)
                }
                onRestore={() => restoreEntry(entry.rowId)}
                onToggleInclude={(enrollmentId) =>
                  toggleInclude(entry.rowId, enrollmentId)
                }
                onSetRating={(enrollmentId, rating) =>
                  setRating(entry.rowId, enrollmentId, rating)
                }
              />
            );
          })}
        </div>
      )}

      <SessionPhotosCard
        photos={photos}
        onAddPhotos={onAddPhotos}
        onSetPhotoCaption={onSetPhotoCaption}
        onRemovePhoto={onRemovePhoto}
      />

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b bg-slate-50/60 px-4 py-2.5 dark:bg-slate-900/40">
          <NotebookPen className="text-indigo-600 size-4" />
          <Label
            htmlFor="session-notes"
            className="text-sm font-semibold leading-none"
          >
            Session Notes
          </Label>
          <span className="text-muted-foreground ml-auto text-[11px]">
            One field for the whole session
          </span>
        </div>
        <div className="p-3">
          <Textarea
            id="session-notes"
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="What happened in the class today? Anything notable to remember — weather if you were outdoors, distraction level, energy, group dynamics, anything to follow up on next session…"
            className="min-h-[120px] resize-y text-sm leading-relaxed"
          />
        </div>
      </Card>

      <div className="sticky bottom-0 -mx-4 mt-6 border-t bg-white/95 px-4 py-3 backdrop-blur dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-1.5 size-4" />
            Back to Attendance
          </Button>
          <Button
            onClick={onFinish}
            disabled={entries.length === 0}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <CheckCircle2 className="mr-1.5 size-4" />
            Finish Session
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Add Exercise — searchable picker
// ============================================================================

function AddExerciseSearch({
  exercises,
  disciplineNameById,
  preferredDisciplineId,
  curriculumIds,
  existingExerciseIds,
  onAdd,
}: {
  exercises: TrainingExerciseDef[];
  disciplineNameById: Map<string, string>;
  preferredDisciplineId: string | undefined;
  curriculumIds: Set<string>;
  existingExerciseIds: Set<string>;
  onAdd: (ex: TrainingExerciseDef) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (query.trim().length === 0) {
      // Curriculum exercises for this week float to the top (not yet added),
      // then the rest of the course's discipline fills out the suggestions.
      const curriculum = exercises.filter(
        (e) =>
          curriculumIds.has(e.id) &&
          !e.isHidden &&
          !existingExerciseIds.has(e.id),
      );
      const disciplineExtras = preferredDisciplineId
        ? exercises.filter(
            (e) =>
              e.disciplineId === preferredDisciplineId &&
              !e.isHidden &&
              !existingExerciseIds.has(e.id) &&
              !curriculumIds.has(e.id),
          )
        : [];
      return [...curriculum, ...disciplineExtras].slice(0, 8);
    }
    const q = query.trim().toLowerCase();
    return exercises
      .filter((e) => !e.isHidden && !existingExerciseIds.has(e.id))
      .filter((e) => e.name.toLowerCase().includes(q))
      .sort((a, b) => {
        if (
          a.disciplineId === preferredDisciplineId &&
          b.disciplineId !== preferredDisciplineId
        )
          return -1;
        if (
          b.disciplineId === preferredDisciplineId &&
          a.disciplineId !== preferredDisciplineId
        )
          return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 12);
  }, [query, exercises, preferredDisciplineId, curriculumIds, existingExerciseIds]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search exercise library to add…"
          className="border-0 pl-9 shadow-none focus-visible:ring-0"
        />
      </div>
      {open && results.length > 0 && (
        <div className="border-t">
          <ul className="max-h-72 divide-y overflow-y-auto">
            {results.map((ex) => (
              <li key={ex.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onAdd(ex);
                    setQuery("");
                  }}
                >
                  <Plus className="size-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ex.name}</p>
                    <p className="text-muted-foreground truncate text-[11px]">
                      {disciplineNameById.get(ex.disciplineId) ?? ex.disciplineId}
                      <span className="mx-1">·</span>
                      {DIFFICULTY_LABELS[ex.difficultyLevel]}
                    </p>
                  </div>
                  {curriculumIds.has(ex.id) ? (
                    <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                      Curriculum
                    </span>
                  ) : ex.disciplineId === preferredDisciplineId ? (
                    <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-700">
                      Course
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// Exercise rating card — one per planned/added exercise
// ============================================================================

const RATING_BTN_TONES: Record<ExerciseRating, string> = {
  1: "bg-rose-500 text-white",
  2: "bg-orange-500 text-white",
  3: "bg-amber-500 text-white",
  4: "bg-emerald-500 text-white",
  5: "bg-indigo-600 text-white",
};

const RATING_BTN_IDLE =
  "border bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300";

function ExerciseRatingCard({
  entry,
  presentRows,
  disciplineName,
  isCurriculum,
  notCovered,
  studentNotes,
  setStudentNote,
  onRemove,
  onRestore,
  onToggleInclude,
  onSetRating,
}: {
  entry: SessionExerciseEntry;
  presentRows: StudentBriefingRow[];
  disciplineName: string | undefined;
  /** From the course's session plan (CURRICULUM badge) vs added by the trainer
   *  (ADDED badge). Also decides whether trash marks "not covered" or deletes. */
  isCurriculum: boolean;
  notCovered: boolean;
  studentNotes: Record<string, string>;
  setStudentNote: (enrollmentId: string, value: string) => void;
  onRemove: () => void;
  onRestore: () => void;
  onToggleInclude: (enrollmentId: string) => void;
  onSetRating: (enrollmentId: string, rating: ExerciseRating) => void;
}) {
  const includedCount = presentRows.reduce(
    (n, r) => n + (entry.students[r.enrollmentId]?.included !== false ? 1 : 0),
    0,
  );
  const ratedCount = presentRows.reduce((n, r) => {
    const s = entry.students[r.enrollmentId];
    if (!s || s.included === false) return n;
    return n + (s.rating ? 1 : 0);
  }, 0);

  const sourceBadge = (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
        isCurriculum
          ? "bg-indigo-600 text-white"
          : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200",
      )}
    >
      {isCurriculum ? "Curriculum" : "Added"}
    </span>
  );

  // "Not covered" record — kept on screen, dimmed and struck, with a Restore.
  if (notCovered) {
    return (
      <Card className="overflow-hidden opacity-70">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground truncate text-sm font-semibold line-through decoration-slate-400">
                {entry.exerciseName}
              </p>
              {disciplineName && (
                <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-700">
                  {disciplineName}
                </span>
              )}
              {sourceBadge}
            </div>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              Marked as not covered this session
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRestore}
            className="text-muted-foreground hover:text-foreground h-8 gap-1.5 px-2"
            title="Restore — mark as covered after all"
          >
            <RotateCcw className="size-3.5" />
            Restore
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b bg-slate-50/60 px-4 py-2.5 dark:bg-slate-900/40">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{entry.exerciseName}</p>
            {disciplineName && (
              <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-700">
                {disciplineName}
              </span>
            )}
            {sourceBadge}
          </div>
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            {ratedCount} / {includedCount} rated · {presentRows.length - includedCount} skipped
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive h-8 px-2"
          title={
            isCurriculum
              ? "Mark as not covered this session"
              : "Remove exercise"
          }
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <ul className="divide-y">
        {presentRows.map((row) => {
          const studentEntry = entry.students[row.enrollmentId];
          const included = studentEntry?.included !== false;
          const rating = studentEntry?.rating ?? null;
          const note = studentNotes[row.enrollmentId] ?? "";
          return (
            <li
              key={row.enrollmentId}
              className={cn(
                "flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4",
                !included && "bg-slate-50/60 opacity-60 dark:bg-slate-900/40",
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={included}
                  onChange={() => onToggleInclude(row.enrollmentId)}
                  className="size-4 accent-emerald-600"
                  aria-label={`Include ${row.petName}`}
                />
                <StudentNotePopover
                  petName={row.petName}
                  note={note}
                  onChange={(value) => setStudentNote(row.enrollmentId, value)}
                />
                {!included && (
                  <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide">
                    <X className="size-3" /> not worked
                  </span>
                )}
              </div>
              <div className="grid w-full grid-cols-5 gap-1.5 sm:flex sm:w-auto sm:flex-wrap">
                {([1, 2, 3, 4, 5] as const).map((n) => {
                  const isActive = rating === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={!included}
                      onClick={() => onSetRating(row.enrollmentId, n)}
                      title={`${n} · ${RATING_LABELS[n]}`}
                      aria-label={`Rate ${n} — ${RATING_LABELS[n]}`}
                      className={cn(
                        "inline-flex h-12 min-w-[44px] flex-col items-center justify-center rounded-md px-2 text-sm font-bold transition-colors sm:h-11 sm:flex-row sm:gap-1.5",
                        isActive ? RATING_BTN_TONES[n] : RATING_BTN_IDLE,
                        !included && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <span className="text-base leading-none sm:text-sm">
                        {n}
                      </span>
                      {/* Word label shows inline on mobile so each option
                          is self-explaining at a glance; collapses on
                          larger screens where the inline name + secondary
                          caption already cover it. */}
                      <span className="text-[9px] font-semibold uppercase tracking-wider leading-tight sm:hidden">
                        {RATING_LABELS[n]}
                      </span>
                    </button>
                  );
                })}
                {rating && included && (
                  <span className="text-muted-foreground hidden items-center text-[10px] font-medium sm:inline-flex">
                    {RATING_LABELS[rating]}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Rating legend — shown once per card (not per student row) so a new or
          substitute trainer knows what 1–5 mean without a tooltip. 11px muted. */}
      <div className="border-t bg-slate-50/40 px-4 py-1.5 dark:bg-slate-900/30">
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] leading-tight">
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <span key={n} className="inline-flex items-center">
              <span className="font-bold tabular-nums text-slate-500">{n}=</span>
              {RATING_LABELS[n]}
            </span>
          ))}
        </p>
      </div>
    </Card>
  );
}

// ============================================================================
// Session photos gallery
// ============================================================================

function SessionPhotosCard({
  photos,
  onAddPhotos,
  onSetPhotoCaption,
  onRemovePhoto,
}: {
  photos: SessionPhoto[];
  onAddPhotos: () => void;
  onSetPhotoCaption: (id: string, caption: string) => void;
  onRemovePhoto: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b bg-slate-50/60 px-4 py-2.5 dark:bg-slate-900/40">
        <Camera className="text-indigo-600 size-4" />
        <Label className="text-sm font-semibold leading-none">
          Session Photos
        </Label>
        <span className="text-muted-foreground ml-auto text-[11px]">
          {photos.length === 0
            ? "Flow into each student's report card"
            : `${photos.length} photo${photos.length === 1 ? "" : "s"} attached`}
        </span>
      </div>

      {photos.length === 0 ? (
        <button
          type="button"
          onClick={onAddPhotos}
          className="text-muted-foreground hover:bg-slate-50 hover:text-foreground flex w-full flex-col items-center gap-2 border-dashed border-slate-200 px-4 py-6 text-center transition-colors dark:border-slate-800 dark:hover:bg-slate-900/40"
        >
          <ImagePlus className="size-6 text-indigo-400" />
          <span className="text-sm font-medium">
            Add a photo from camera or library
          </span>
          <span className="text-[11px]">
            Photos attach to the session and appear in each student&#39;s report
            card before/after section.
          </span>
        </button>
      ) : (
        <div className="p-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative overflow-hidden rounded-lg border bg-slate-100 dark:bg-slate-900"
              >
                <div className="relative aspect-square w-full">
                  <Image
                    src={photo.url}
                    alt={photo.caption || "Session photo"}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => onRemovePhoto(photo.id)}
                    className="absolute right-1.5 top-1.5 inline-flex size-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/80 group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label="Remove photo"
                    title="Remove photo"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <Input
                  value={photo.caption}
                  onChange={(e) => onSetPhotoCaption(photo.id, e.target.value)}
                  placeholder="Caption (optional)"
                  className="h-8 rounded-none border-0 border-t text-xs shadow-none focus-visible:ring-0"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={onAddPhotos}
              className="text-muted-foreground hover:bg-slate-50 hover:text-foreground flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-200 transition-colors dark:border-slate-800 dark:hover:bg-slate-900/40"
            >
              <ImagePlus className="size-5 text-indigo-400" />
              <span className="text-[11px] font-medium">Add more</span>
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// Per-student note popover
// ============================================================================

function StudentNotePopover({
  petName,
  note,
  onChange,
}: {
  petName: string;
  note: string;
  onChange: (value: string) => void;
}) {
  const hasNote = note.trim().length > 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800",
            hasNote && "text-indigo-700 dark:text-indigo-300",
          )}
          title={
            hasNote
              ? `Note added for ${petName} — tap to edit`
              : `Add a note for ${petName}`
          }
        >
          <span className="min-w-0 truncate">{petName}</span>
          {/* Always-visible note affordance — muted when empty so the trainer
              knows a per-dog note can be added, indigo once one exists. */}
          <StickyNote
            className={cn(
              "size-3.5 shrink-0",
              hasNote
                ? "text-indigo-600 dark:text-indigo-300"
                : "text-muted-foreground/40",
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <div className="space-y-2">
          <div>
            <p className="text-sm font-semibold leading-none">
              Note for {petName}
            </p>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Trainer-only · saves to the student&#39;s Notes tab for this session.
            </p>
          </div>
          <Textarea
            value={note}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Anything specific about ${petName} today — what went well, what to work on, behaviour observations…`}
            className="min-h-[100px] text-sm leading-relaxed"
            autoFocus
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function createEntry(
  exercise: TrainingExerciseDef,
  presentEnrollmentIds: string[],
): SessionExerciseEntry {
  const students: Record<
    string,
    { included: boolean; rating: ExerciseRating | null }
  > = {};
  for (const enrollmentId of presentEnrollmentIds) {
    students[enrollmentId] = { included: true, rating: null };
  }
  return {
    rowId: `entry-${exercise.id}-${Math.random().toString(36).slice(2, 8)}`,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    disciplineId: exercise.disciplineId,
    students,
  };
}

function collectPlannedExercises(input: {
  session: TrainingSession;
  classRecord: TrainingClass | undefined;
  attendances: SessionAttendance[];
  enrollments: { id: string; classId: string }[];
  exerciseByName: Map<string, TrainingExerciseDef>;
}): TrainingExerciseDef[] {
  const { session, attendances, enrollments, exerciseByName } = input;

  const enrollmentIdsForClass = new Set(
    enrollments
      .filter((e) => e.classId === session.classId)
      .map((e) => e.id),
  );

  const priorAttendances = attendances
    .filter(
      (a) =>
        enrollmentIdsForClass.has(a.enrollmentId) &&
        a.sessionId !== session.id &&
        (a.exercises?.length ?? 0) > 0,
    )
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));

  const seenSessionIds = new Set<string>();
  const planned: TrainingExerciseDef[] = [];
  const plannedIds = new Set<string>();

  for (const att of priorAttendances) {
    if (seenSessionIds.size >= 2 && !seenSessionIds.has(att.sessionId)) {
      break;
    }
    seenSessionIds.add(att.sessionId);
    for (const ex of att.exercises ?? []) {
      const def = exerciseByName.get(ex.exerciseName.toLowerCase());
      if (def && !plannedIds.has(def.id)) {
        planned.push(def);
        plannedIds.add(def.id);
      }
    }
  }

  return planned;
}
