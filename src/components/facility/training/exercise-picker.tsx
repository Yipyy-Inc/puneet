"use client";

import { Fragment, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { trainingQueries } from "@/lib/api/training";
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_LEVELS,
  groupExercisesByDisciplineAndDifficulty,
  type TrainingExerciseDef,
} from "@/data/training-exercises";

interface Props {
  value: string;
  onSelect: (exercise: TrainingExerciseDef | null) => void;
  /** When provided, that discipline's tier blocks appear first with a
   *  "Course" pill so trainers see the right options immediately. */
  preferredDisciplineId?: string;
  /** Tailwind classes for the trigger — callers often pass `h-8 text-sm` to
   *  match a compact form. */
  triggerClassName?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Tier-aware exercise picker shared by Session Completion Step 2, the
 * homework editor in session completion, and the standalone homework dialog.
 *
 * Renders exercises grouped by discipline → difficulty tier so the picker
 * mirrors a real training program's progression (Foundation → Competition).
 */
export function ExercisePicker({
  value,
  onSelect,
  preferredDisciplineId,
  triggerClassName,
  placeholder = "Pick an exercise…",
  disabled,
}: Props) {
  const { data: disciplines = [] } = useQuery(trainingQueries.disciplines());
  const { data: exercises = [] } = useQuery(trainingQueries.exercises());

  const groupedByTier = useMemo(
    () => groupExercisesByDisciplineAndDifficulty(exercises),
    [exercises],
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

  function handleSelect(nextValue: string) {
    for (const discId of disciplineOrder) {
      const tiers = groupedByTier[discId];
      if (!tiers) continue;
      for (const level of DIFFICULTY_LEVELS) {
        const found = tiers[level]?.find((e) => e.id === nextValue);
        if (found) {
          onSelect(found);
          return;
        }
      }
    }
    onSelect(null);
  }

  return (
    <Select value={value} onValueChange={handleSelect} disabled={disabled}>
      <SelectTrigger className={cn("text-sm", triggerClassName)}>
        <SelectValue placeholder={placeholder} />
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
  );
}
