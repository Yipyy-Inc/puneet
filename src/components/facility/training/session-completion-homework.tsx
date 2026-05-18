"use client";

import { Fragment, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { BookOpen, Clock, Plus, Sparkles, Trash2, Users } from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_LEVELS,
  getDisciplineIdForClassName,
  groupExercisesByDisciplineAndDifficulty,
  type DifficultyLevel,
  type TrainingExerciseDef,
} from "@/data/training-exercises";

type TierMap = Partial<Record<DifficultyLevel, TrainingExerciseDef[]>>;
type GroupedByTier = Record<string, TierMap>;

/** A single homework prescription to dispatch when the session is saved. */
export interface HomeworkAssignment {
  /** Local-only id so we can key/edit/remove rows in the form. */
  rowId: string;
  /** Maps to the exercise from the library. The exercise's name becomes the
   *  homework's title; this id is kept for traceability. */
  exerciseId: string;
  exerciseName: string;
  /** Newline-separated text — split into individual bullets on save. */
  instructions: string;
  /** Cadence text — "Daily · 5 min" / "3x per week". */
  frequency: string;
}

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

// Module-level counter so row ids stay stable without invoking impure
// helpers from inside render. Matches the pattern from step-two.
let homeworkRowSeed = 0;
function makeHomeworkRow(
  exercises: TrainingExerciseDef[],
  preferredDisciplineId: string | undefined,
  groupedByTier: GroupedByTier,
): HomeworkAssignment {
  homeworkRowSeed += 1;
  const first = firstExerciseFor(
    groupedByTier,
    preferredDisciplineId,
    exercises,
  );
  return {
    rowId: `hw-${homeworkRowSeed}`,
    exerciseId: first?.id ?? "",
    exerciseName: first?.name ?? "",
    instructions: "",
    frequency: "",
  };
}

interface Props {
  /** Course name — fuzzy-matches the program catalog to pick the right
   *  discipline group at the top of the exercise picker. */
  className: string;
  /** Whether this session is private (1-on-1) — drives the scope label so
   *  staff know who the homework is for. */
  isPrivate: boolean;
  /** Pet name surfaced in the scope label for private sessions. */
  privatePetName?: string;
  /** Count of present/late students — surfaced on group sessions. */
  presentStudentCount: number;
  assignments: HomeworkAssignment[];
  setAssignments: (next: HomeworkAssignment[]) => void;
}

export function SessionCompletionHomework({
  className,
  isPrivate,
  privatePetName,
  presentStudentCount,
  assignments,
  setAssignments,
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

  // Sort so the course's discipline appears first in the picker.
  const disciplineOrder = useMemo(() => {
    const ids = Object.keys(groupedByTier);
    return ids.sort((a, b) => {
      if (a === preferredDisciplineId) return -1;
      if (b === preferredDisciplineId) return 1;
      return disciplineLabel(a).localeCompare(disciplineLabel(b));
    });
  }, [groupedByTier, preferredDisciplineId, disciplineLabel]);

  function addRow() {
    setAssignments([
      ...assignments,
      makeHomeworkRow(exercises, preferredDisciplineId, groupedByTier),
    ]);
  }

  function updateRow(rowId: string, next: HomeworkAssignment) {
    setAssignments(
      assignments.map((row) => (row.rowId === rowId ? next : row)),
    );
  }

  function removeRow(rowId: string) {
    setAssignments(assignments.filter((row) => row.rowId !== rowId));
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <BookOpen className="text-muted-foreground size-4" />
        <h3 className="text-sm font-bold tracking-tight text-slate-800">
          Homework
        </h3>
        {isPrivate ? (
          <Badge
            variant="outline"
            className="gap-1 border-orange-200 bg-orange-50 text-[10px] text-orange-700"
            title="Private session — homework goes to this owner."
          >
            <Sparkles className="size-3" />
            For {privatePetName ?? "this dog"}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="gap-1 border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700"
            title="Group class — same assignment goes to every present owner."
          >
            <Users className="size-3" />
            Sent to {presentStudentCount} owner
            {presentStudentCount === 1 ? "" : "s"}
          </Badge>
        )}
        <span className="text-muted-foreground ml-auto text-[11px]">
          {assignments.length} item{assignments.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-3 px-4 py-3">
        {assignments.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-3 text-center text-[12px]">
            No homework yet — assign one or more exercises for the owner to
            practice before the next session.
          </p>
        ) : (
          assignments.map((row) => (
            <div
              key={row.rowId}
              className="space-y-2 rounded-xl border bg-slate-50/40 px-3 py-3"
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                <div>
                  <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                    Exercise
                  </Label>
                  <Select
                    value={row.exerciseId}
                    onValueChange={(value) => {
                      for (const discId of disciplineOrder) {
                        const tiers = groupedByTier[discId];
                        if (!tiers) continue;
                        for (const level of DIFFICULTY_LEVELS) {
                          const found = tiers[level]?.find(
                            (e) => e.id === value,
                          );
                          if (found) {
                            updateRow(row.rowId, {
                              ...row,
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
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(row.rowId)}
                    className="text-muted-foreground hover:text-destructive h-8 px-2"
                    title="Remove homework"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                  <Clock className="mr-1 inline size-3 align-text-bottom" />
                  Frequency
                </Label>
                <Input
                  value={row.frequency}
                  onChange={(e) =>
                    updateRow(row.rowId, { ...row, frequency: e.target.value })
                  }
                  placeholder="e.g. Daily · 5 min, 3x per week, Every walk"
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                  Instructions
                </Label>
                <Textarea
                  value={row.instructions}
                  onChange={(e) =>
                    updateRow(row.rowId, {
                      ...row,
                      instructions: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder={[
                    "Reward within 1 second of the dog completing the cue.",
                    "Use small, soft, high-value treats.",
                    "End on a successful rep — quit while it's fun.",
                  ].join("\n")}
                  className="text-xs"
                />
                <p className="text-muted-foreground mt-1 text-[10px]">
                  One bullet per line. These render as a checklist in the
                  client&apos;s portal.
                </p>
              </div>
            </div>
          ))
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          className={cn(
            "h-8 gap-1 text-xs",
            assignments.length === 0 &&
              "border-indigo-200 text-indigo-700 hover:bg-indigo-50",
          )}
        >
          <Plus className="size-3.5" />
          Add homework
        </Button>
      </div>
    </div>
  );
}
