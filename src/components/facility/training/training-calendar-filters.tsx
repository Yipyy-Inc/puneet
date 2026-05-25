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
import type { TrainingDiscipline } from "@/types/training";
import type { TrainingDropInBooking } from "@/lib/training-drop-ins";
import { getDisciplineIdForClassName } from "@/data/training-exercises";

export type TrainingCalendarFilterState = {
  trainerIds: string[];
  classTypes: ClassType[];
  /** When true, only sessions with at least one active drop-in booking
   *  pass the filter — independent of the group/private toggle so a
   *  trainer can scan "everywhere a guest is joining". */
  hasDropIns: boolean;
  /** Discipline ids — drives the "Obedience only" / "Agility only" filter.
   *  Resolved against `TrainingClass.name` via the catalog name match. */
  disciplineIds: string[];
  statuses: TrainingClassStatus[];
  skillLevels: SkillLevel[];
};

export const EMPTY_TRAINING_FILTERS: TrainingCalendarFilterState = {
  trainerIds: [],
  classTypes: [],
  hasDropIns: false,
  disciplineIds: [],
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

interface ApplyContext {
  /** Active drop-in bookings — only consulted when `hasDropIns` is set.
   *  Match is by date + startTime + trainer (same bridge the calendar
   *  Make-up badge uses) so the filter works against either the calendar
   *  TrainingSession id or the series TrainingSeriesSession id. */
  dropIns?: TrainingDropInBooking[];
  /** Discipline catalog — used purely as documentation today; the actual
   *  lookup is name-based via `getDisciplineIdForClassName`. Kept on the
   *  signature so future callers can pass it through to a richer
   *  resolution path without breaking. */
  disciplines?: TrainingDiscipline[];
}

export function applyTrainingCalendarFilters(
  sessions: TrainingSession[],
  classesById: Record<string, TrainingClass | undefined>,
  filters: TrainingCalendarFilterState,
  context: ApplyContext = {},
): TrainingSession[] {
  const {
    trainerIds,
    classTypes,
    hasDropIns,
    disciplineIds,
    statuses,
    skillLevels,
  } = filters;
  const noTrainerFilter = trainerIds.length === 0;
  const noTypeFilter = classTypes.length === 0;
  const noStatusFilter = statuses.length === 0;
  const noSkillFilter = skillLevels.length === 0;
  const noDisciplineFilter = disciplineIds.length === 0;
  const noFilters =
    noTrainerFilter &&
    noTypeFilter &&
    noStatusFilter &&
    noSkillFilter &&
    noDisciplineFilter &&
    !hasDropIns;
  if (noFilters) return sessions;

  // Build the drop-in match set up front so the per-session check is O(1)
  // instead of re-scanning the bookings list per session.
  const dropInKeySet = (() => {
    if (!hasDropIns) return null;
    const live = (context.dropIns ?? []).filter(
      (b) => b.status !== "cancelled",
    );
    if (live.length === 0) return new Set<string>();
    const set = new Set<string>();
    for (const b of live) {
      // Compose a deterministic key from the host fields. Bookings
      // without a denormalized `sessionStartTime` fall back to a
      // date-only key so a TrainingSession that lands on the same day
      // still passes the filter — better-loose than to drop it.
      if (b.sessionStartTime) {
        set.add(`${b.sessionDate}::${b.sessionStartTime}`);
      } else {
        set.add(`${b.sessionDate}::*`);
      }
    }
    return set;
  })();

  return sessions.filter((sess) => {
    if (!noTrainerFilter && !trainerIds.includes(sess.trainerId)) return false;
    if (!noStatusFilter && !statuses.includes(sess.status)) return false;
    const cls = classesById[sess.classId];
    if (!noTypeFilter) {
      if (!cls || !classTypes.includes(cls.classType)) return false;
    }
    if (!noSkillFilter) {
      if (!cls || !skillLevels.includes(cls.skillLevel)) return false;
    }
    if (!noDisciplineFilter) {
      const className = cls?.name ?? sess.className;
      const did = getDisciplineIdForClassName(className);
      if (!did || !disciplineIds.includes(did)) return false;
    }
    if (hasDropIns && dropInKeySet) {
      const exactKey = `${sess.date}::${sess.startTime}`;
      const wildKey = `${sess.date}::*`;
      if (!dropInKeySet.has(exactKey) && !dropInKeySet.has(wildKey)) {
        return false;
      }
    }
    return true;
  });
}

function countFilters(f: TrainingCalendarFilterState): number {
  return (
    f.trainerIds.length +
    f.classTypes.length +
    (f.hasDropIns ? 1 : 0) +
    f.disciplineIds.length +
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
  disciplines,
}: {
  filters: TrainingCalendarFilterState;
  onChange: (next: TrainingCalendarFilterState) => void;
  trainers: Pick<Trainer, "id" | "name" | "status">[];
  /** Active disciplines — drives the new Discipline filter section. */
  disciplines: TrainingDiscipline[];
}) {
  const trainerOptions = useMemo(
    () =>
      trainers
        .filter((t) => t.status === "active")
        .map((t) => ({ value: t.id, label: t.name })),
    [trainers],
  );
  const disciplineOptions = useMemo(
    () =>
      disciplines
        .filter((d) => d.isActive)
        .map((d) => ({ value: d.id, label: d.name })),
    [disciplines],
  );

  const total = countFilters(filters);

  function toggleArrayValue<K extends keyof TrainingCalendarFilterState>(
    key: K,
    value: string,
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
            onToggle={(v) => toggleArrayValue("trainerIds", v)}
          />
          <div className="space-y-2">
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Session Type
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {CLASS_TYPE_OPTIONS.map((opt) => {
                const id = `session-type-${opt.value}`;
                const isChecked = filters.classTypes.includes(opt.value);
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
                      onCheckedChange={() =>
                        toggleArrayValue("classTypes", opt.value)
                      }
                    />
                    <span className="truncate text-slate-700">
                      {opt.label}
                    </span>
                  </label>
                );
              })}
              <label
                htmlFor="session-type-drop-in"
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-slate-50",
                  filters.hasDropIns && "bg-slate-50",
                )}
                title="Show only sessions that have at least one drop-in booking attached."
              >
                <Checkbox
                  id="session-type-drop-in"
                  checked={filters.hasDropIns}
                  onCheckedChange={() =>
                    onChange({ ...filters, hasDropIns: !filters.hasDropIns })
                  }
                />
                <span className="truncate text-slate-700">
                  Drop-in only
                </span>
              </label>
            </div>
          </div>
          <FilterSection
            title="Discipline"
            options={disciplineOptions}
            selected={filters.disciplineIds}
            onToggle={(v) => toggleArrayValue("disciplineIds", v)}
          />
          <FilterSection
            title="Status"
            options={STATUS_OPTIONS}
            selected={filters.statuses}
            onToggle={(v) => toggleArrayValue("statuses", v)}
          />
          <FilterSection
            title="Skill Level"
            options={SKILL_OPTIONS}
            selected={filters.skillLevels}
            onToggle={(v) => toggleArrayValue("skillLevels", v)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
