"use client";

import { useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ClassType,
  SkillLevel,
  Trainer,
  TrainingClass,
  TrainingClassStatus,
  TrainingSession,
} from "@/types/training";

export type TrainingCalendarFilterState = {
  trainerIds: string[];
  classTypes: ClassType[];
  statuses: TrainingClassStatus[];
  skillLevels: SkillLevel[];
};

export const EMPTY_TRAINING_FILTERS: TrainingCalendarFilterState = {
  trainerIds: [],
  classTypes: [],
  statuses: [],
  skillLevels: [],
};

const CLASS_TYPE_OPTIONS: { value: ClassType; label: string }[] = [
  { value: "group", label: "Group class" },
  { value: "private", label: "Private 1-on-1" },
];

const STATUS_OPTIONS: { value: TrainingClassStatus; label: string }[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const SKILL_OPTIONS: { value: SkillLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "all-levels", label: "All Levels" },
];

export function applyTrainingCalendarFilters(
  sessions: TrainingSession[],
  classesById: Record<string, TrainingClass | undefined>,
  filters: TrainingCalendarFilterState,
): TrainingSession[] {
  const { trainerIds, classTypes, statuses, skillLevels } = filters;
  if (
    trainerIds.length === 0 &&
    classTypes.length === 0 &&
    statuses.length === 0 &&
    skillLevels.length === 0
  ) {
    return sessions;
  }
  return sessions.filter((sess) => {
    if (trainerIds.length > 0 && !trainerIds.includes(sess.trainerId))
      return false;
    if (statuses.length > 0 && !statuses.includes(sess.status)) return false;
    const cls = classesById[sess.classId];
    if (classTypes.length > 0) {
      if (!cls || !classTypes.includes(cls.classType)) return false;
    }
    if (skillLevels.length > 0) {
      if (!cls || !skillLevels.includes(cls.skillLevel)) return false;
    }
    return true;
  });
}

function countFilters(f: TrainingCalendarFilterState): number {
  return (
    f.trainerIds.length +
    f.classTypes.length +
    f.statuses.length +
    f.skillLevels.length
  );
}

function FilterSection<T extends string>({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
        {title}
      </p>
      <div className="grid grid-cols-1 gap-1.5">
        {options.map((opt) => {
          const id = `${title}-${opt.value}`;
          const isChecked = selected.includes(opt.value);
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-slate-50",
                isChecked && "bg-slate-50",
              )}
            >
              <Checkbox
                id={id}
                checked={isChecked}
                onCheckedChange={() => onToggle(opt.value)}
              />
              <span className="truncate text-slate-700">{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function TrainingCalendarFilters({
  filters,
  onChange,
  trainers,
}: {
  filters: TrainingCalendarFilterState;
  onChange: (next: TrainingCalendarFilterState) => void;
  trainers: Pick<Trainer, "id" | "name" | "status">[];
}) {
  const trainerOptions = useMemo(
    () =>
      trainers
        .filter((t) => t.status === "active")
        .map((t) => ({ value: t.id, label: t.name })),
    [trainers],
  );

  const total = countFilters(filters);

  function toggle<K extends keyof TrainingCalendarFilterState>(
    key: K,
    value: TrainingCalendarFilterState[K][number],
  ) {
    const current = filters[key] as string[];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-10 gap-2 rounded-full border-slate-200 bg-white px-4 shadow-sm hover:bg-slate-100",
            total > 0 && "border-indigo-300 bg-indigo-50 hover:bg-indigo-100",
          )}
        >
          <Filter className="size-4" /> Filters
          {total > 0 && (
            <Badge
              variant="default"
              className="ml-1 h-5 min-w-5 bg-indigo-600 px-1.5 text-white"
            >
              {total}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 max-h-[70vh] overflow-y-auto p-0"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-bold text-slate-800">Filters</p>
          {total > 0 && (
            <button
              type="button"
              onClick={() => onChange(EMPTY_TRAINING_FILTERS)}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              <X className="size-3" /> Clear all
            </button>
          )}
        </div>
        <div className="space-y-4 p-4">
          <FilterSection
            title="Trainer"
            options={trainerOptions}
            selected={filters.trainerIds}
            onToggle={(v) => toggle("trainerIds", v)}
          />
          <FilterSection
            title="Class Type"
            options={CLASS_TYPE_OPTIONS}
            selected={filters.classTypes}
            onToggle={(v) => toggle("classTypes", v)}
          />
          <FilterSection
            title="Status"
            options={STATUS_OPTIONS}
            selected={filters.statuses}
            onToggle={(v) => toggle("statuses", v)}
          />
          <FilterSection
            title="Skill Level"
            options={SKILL_OPTIONS}
            selected={filters.skillLevels}
            onToggle={(v) => toggle("skillLevels", v)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
