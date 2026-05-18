"use client";

import { Fragment, useMemo } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  PawPrint,
  Plus,
  Star,
  StickyNote,
  Target,
  Timer,
  Trash2,
  User2,
  Users,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_LEVELS,
  getDisciplineIdForClassName,
  groupExercisesByDisciplineAndDifficulty,
  type DifficultyLevel,
  type TrainingExerciseDef,
} from "@/data/training-exercises";

/** One logged exercise on a session for a single student. */
export interface SessionExerciseLog {
  /** Local-only id so we can key/edit/remove rows inside the form. */
  rowId: string;
  exerciseId: string;
  exerciseName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  note: string;
}

export interface PresentStudentRow {
  enrollmentId: string;
  petId: number;
  petName: string;
  petBreed: string;
  petPhotoUrl?: string;
  ownerName: string;
  /** "present" or "late" — absent students don't appear in this step. */
  attendanceLabel: "Present" | "Late";
}

type TierMap = Partial<Record<DifficultyLevel, TrainingExerciseDef[]>>;
type GroupedByTier = Record<string, TierMap>;

/** Walk the tiered groups in progression order and return the first exercise
 *  reachable — used to default a freshly-added row to the lowest-tier item in
 *  the course's discipline. */
function firstExerciseFor(
  groupedByTier: GroupedByTier,
  preferredDisciplineId: string | undefined,
  fallback: TrainingExerciseDef[],
): TrainingExerciseDef | null {
  const preferredTiers = preferredDisciplineId
    ? groupedByTier[preferredDisciplineId]
    : undefined;
  if (preferredTiers) {
    for (const level of DIFFICULTY_LEVELS) {
      const list = preferredTiers[level];
      if (list && list.length > 0) return list[0]!;
    }
  }
  return fallback[0] ?? null;
}

// Module-level counter so row ids stay stable without calling impure
// helpers from inside render. Matches the homework editor pattern.
let rowIdSeed = 0;
function makeRow(
  exercises: TrainingExerciseDef[],
  preferredDisciplineId: string | undefined,
  groupedByTier: GroupedByTier,
): SessionExerciseLog {
  rowIdSeed += 1;
  const first = firstExerciseFor(
    groupedByTier,
    preferredDisciplineId,
    exercises,
  );
  return {
    rowId: `row-${rowIdSeed}`,
    exerciseId: first?.id ?? "",
    exerciseName: first?.name ?? "",
    rating: 3,
    note: "",
  };
}

interface Props {
  /** Course/session name — used to pick the right discipline group at the
   *  top of the exercise picker. */
  className: string;
  /** Drives the scope label on the exercises card and toggles the
   *  per-student individual notes section. */
  isPrivate: boolean;
  /** Students who were marked present or late in Step 1. Absent students do
   *  not appear here. */
  students: PresentStudentRow[];
  /** Single shared exercise list applied to the whole class. */
  sharedExercises: SessionExerciseLog[];
  setSharedExercises: (next: SessionExerciseLog[]) => void;
  /** Per-student optional note. Only used in group sessions (private has
   *  one student so the session summary covers it). */
  individualNotes: Record<string, string>;
  setIndividualNote: (enrollmentId: string, note: string) => void;
}

function StarRating({
  value,
  onChange,
}: {
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (next: 1 | 2 | 3 | 4 | 5) => void;
}) {
  return (
    <div className="flex items-center gap-0.5" role="radiogroup">
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          onClick={() => onChange(n)}
          className={cn(
            "rounded-sm p-0.5 transition-colors",
            n <= value
              ? "text-amber-500"
              : "text-slate-300 hover:text-amber-300",
          )}
        >
          <Star className={cn("size-4", n <= value && "fill-current")} />
        </button>
      ))}
      <span className="text-muted-foreground ml-1.5 text-[10px] font-semibold tabular-nums">
        {value}/5
      </span>
    </div>
  );
}

function ExerciseRow({
  log,
  groupedByTier,
  disciplineOrder,
  disciplineLabel,
  preferredDisciplineId,
  onChange,
  onRemove,
}: {
  log: SessionExerciseLog;
  groupedByTier: GroupedByTier;
  disciplineOrder: string[];
  disciplineLabel: (id: string) => string;
  preferredDisciplineId: string | undefined;
  onChange: (next: SessionExerciseLog) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-card grid grid-cols-1 gap-2 rounded-lg border px-3 py-2 sm:grid-cols-[1fr_auto_auto]">
      <div className="min-w-0">
        <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
          Exercise
        </Label>
        <Select
          value={log.exerciseId}
          onValueChange={(value) => {
            for (const discId of disciplineOrder) {
              const tiers = groupedByTier[discId];
              if (!tiers) continue;
              for (const level of DIFFICULTY_LEVELS) {
                const found = tiers[level]?.find((e) => e.id === value);
                if (found) {
                  onChange({
                    ...log,
                    exerciseId: value,
                    exerciseName: found.name,
                  });
                  return;
                }
              }
            }
          }}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Pick an exercise…" />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {disciplineOrder.map((discId) => {
              const tiers = groupedByTier[discId];
              if (!tiers) return null;
              const nonEmptyTiers = DIFFICULTY_LEVELS.filter(
                (level) => (tiers[level]?.length ?? 0) > 0,
              );
              if (nonEmptyTiers.length === 0) return null;
              return (
                <SelectGroup key={discId}>
                  <SelectLabel className="text-[10px] uppercase tracking-wider">
                    {disciplineLabel(discId)}
                    {discId === preferredDisciplineId && (
                      <span className="ml-1.5 rounded-full bg-indigo-100 px-1 py-0.5 text-[9px] font-bold text-indigo-700">
                        Course
                      </span>
                    )}
                  </SelectLabel>
                  {nonEmptyTiers.map((level) => (
                    <Fragment key={level}>
                      <div className="text-muted-foreground/80 px-2 pb-0.5 pt-1.5 text-[9px] font-bold uppercase tracking-wider">
                        {DIFFICULTY_LABELS[level]}
                      </div>
                      {tiers[level]!.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </Fragment>
                  ))}
                </SelectGroup>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
          Rating
        </Label>
        <div className="flex h-8 items-center">
          <StarRating
            value={log.rating}
            onChange={(rating) => onChange({ ...log, rating })}
          />
        </div>
      </div>
      <div className="flex items-start sm:items-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive h-8 px-2 sm:h-8"
          title="Remove exercise"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <div className="sm:col-span-3">
        <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
          Note (optional)
        </Label>
        <Input
          value={log.note}
          onChange={(e) => onChange({ ...log, note: e.target.value })}
          placeholder="e.g. Strong recall on flat ground, needs work with distraction."
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}

export function SessionCompletionStepTwo({
  className,
  isPrivate,
  students,
  sharedExercises,
  setSharedExercises,
  individualNotes,
  setIndividualNote,
}: Props) {
  const { data: disciplines = [] } = useQuery(trainingQueries.disciplines());
  const { data: exercises = [] } = useQuery(trainingQueries.exercises());

  const groupedByTier = useMemo(
    () => groupExercisesByDisciplineAndDifficulty(exercises),
    [exercises],
  );

  const preferredDisciplineId = useMemo(
    () => getDisciplineIdForClassName(className),
    [className],
  );

  const disciplineLabel = useMemo(() => {
    const map = new Map(disciplines.map((d) => [d.id, d.name]));
    return (id: string) => map.get(id) ?? id;
  }, [disciplines]);

  const disciplineOrder = useMemo(() => {
    const ids = Object.keys(groupedByTier);
    return ids.sort((a, b) => {
      if (a === preferredDisciplineId) return -1;
      if (b === preferredDisciplineId) return 1;
      return disciplineLabel(a).localeCompare(disciplineLabel(b));
    });
  }, [groupedByTier, preferredDisciplineId, disciplineLabel]);

  function addRow() {
    setSharedExercises([
      ...sharedExercises,
      makeRow(exercises, preferredDisciplineId, groupedByTier),
    ]);
  }

  function updateRow(rowId: string, next: SessionExerciseLog) {
    setSharedExercises(
      sharedExercises.map((row) => (row.rowId === rowId ? next : row)),
    );
  }

  function removeRow(rowId: string) {
    setSharedExercises(sharedExercises.filter((row) => row.rowId !== rowId));
  }

  if (students.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed py-12 text-center text-sm">
        No present students to log exercises for. (Everyone was marked
        absent.)
      </div>
    );
  }

  const privatePetName = isPrivate ? students[0]?.petName : undefined;

  return (
    <div className="space-y-3">
      {/* Shared exercise editor — class-wide ratings ─────────────────── */}
      <div className="bg-card rounded-xl border shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
          <Target className="text-muted-foreground size-4" />
          <h3 className="text-sm font-bold tracking-tight text-slate-800">
            Exercises &amp; ratings
          </h3>
          {isPrivate ? (
            <Badge
              variant="outline"
              className="gap-1 border-orange-200 bg-orange-50 text-[10px] text-orange-700"
              title="Private 1-on-1 — these ratings are for this dog."
            >
              <User2 className="size-3" />
              For {privatePetName}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="gap-1 border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700"
              title="Group class — same ratings apply to every present student."
            >
              <Users className="size-3" />
              Applies to {students.length} present student
              {students.length === 1 ? "" : "s"}
            </Badge>
          )}
          <span className="text-muted-foreground ml-auto text-[11px]">
            {sharedExercises.length} logged
          </span>
        </div>

        <div className="space-y-2 px-4 py-3">
          {sharedExercises.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-3 text-center text-[12px]">
              No exercises logged yet — add the ones the{" "}
              {isPrivate ? "session" : "class"} covered with a 1-5 rating.
            </p>
          ) : (
            sharedExercises.map((row) => (
              <ExerciseRow
                key={row.rowId}
                log={row}
                groupedByTier={groupedByTier}
                disciplineOrder={disciplineOrder}
                disciplineLabel={disciplineLabel}
                preferredDisciplineId={preferredDisciplineId}
                onChange={(next) => updateRow(row.rowId, next)}
                onRemove={() => removeRow(row.rowId)}
              />
            ))
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            className="h-8 gap-1 text-xs"
          >
            <Plus className="size-3.5" />
            Add exercise
          </Button>
        </div>
      </div>

      {/* Individual notes per dog — group classes only ──────────────── */}
      {!isPrivate && (
        <div className="bg-card rounded-xl border shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
            <StickyNote className="text-muted-foreground size-4" />
            <h3 className="text-sm font-bold tracking-tight text-slate-800">
              Individual notes
            </h3>
            <Badge
              variant="outline"
              className="gap-1 border-slate-200 bg-slate-50 text-[10px] text-slate-600"
              title="Each note appears only on that dog's training history."
            >
              Per dog · optional
            </Badge>
            <span className="text-muted-foreground ml-auto text-[11px]">
              Faster than 8 separate sessions, still captures the
              dog-specific story.
            </span>
          </div>
          <ul className="divide-y divide-slate-100">
            {students.map((student) => {
              const note = individualNotes[student.enrollmentId] ?? "";
              return (
                <li
                  key={student.enrollmentId}
                  className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-start"
                >
                  <div className="flex items-center gap-2 sm:w-44">
                    <div className="relative shrink-0">
                      {student.petPhotoUrl ? (
                        <div className="size-9 overflow-hidden rounded-xl ring-2 ring-white shadow-sm">
                          <Image
                            src={student.petPhotoUrl}
                            alt={student.petName}
                            width={36}
                            height={36}
                            className="size-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-xl ring-2 ring-white shadow-sm">
                          <PawPrint className="size-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {student.petName}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1 border text-[9px]",
                            student.attendanceLabel === "Late"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700",
                          )}
                        >
                          {student.attendanceLabel === "Late" ? (
                            <Timer className="size-2.5" />
                          ) : (
                            <CheckCircle2 className="size-2.5" />
                          )}
                          {student.attendanceLabel}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Textarea
                    rows={2}
                    value={note}
                    onChange={(e) =>
                      setIndividualNote(student.enrollmentId, e.target.value)
                    }
                    placeholder={`e.g. ${student.petName} had a breakthrough on the heel pattern today.`}
                    className="flex-1 text-xs"
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
