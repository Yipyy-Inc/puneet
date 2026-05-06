"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CalendarFilterState,
  BookingWorkflowStatus,
} from "../_lib/calendar-types";
import type { RoomCategory } from "@/types/rooms";

interface CalendarFiltersProps {
  state: CalendarFilterState;
  categories: RoomCategory[];
  onChange: (next: CalendarFilterState) => void;
  onReset: () => void;
}

const ALL_STATUSES: BookingWorkflowStatus[] = [
  "pending",
  "confirmed",
  "checked_in",
  "completed",
];

const STATUS_LABEL: Record<BookingWorkflowStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked-in",
  completed: "Checked-out",
};

const ALL_SIZES: Array<"small" | "medium" | "large" | "xlarge"> = [
  "small",
  "medium",
  "large",
  "xlarge",
];

const SIZE_LABEL: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  xlarge: "X-Large",
};

const ALL_SPECIES: Array<"dog" | "cat"> = ["dog", "cat"];

function FilterPill({
  active,
  count,
  label,
  children,
}: {
  active: boolean;
  count?: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={active ? "default" : "outline"}
          size="sm"
          className="gap-1.5 rounded-full"
        >
          {label}
          {count !== undefined && count > 0 && (
            <Badge
              variant="secondary"
              className="h-5 min-w-5 rounded-full px-1.5 text-[10px]"
            >
              {count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-2">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function MultiToggleList<T extends string>({
  options,
  selected,
  onToggle,
  labelMap,
}: {
  options: readonly T[];
  selected: T[];
  onToggle: (v: T) => void;
  labelMap?: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((opt) => {
        const checked = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={cn(
              "hover:bg-muted flex items-center justify-between rounded-md px-2 py-1.5 text-sm",
              checked && "bg-muted font-medium",
            )}
          >
            <span>{labelMap?.[opt] ?? opt}</span>
            {checked && <span className="size-2 rounded-full bg-primary" />}
          </button>
        );
      })}
    </div>
  );
}

export function CalendarFilters({
  state,
  categories,
  onChange,
  onReset,
}: CalendarFiltersProps) {
  const toggle = <K extends keyof CalendarFilterState>(
    key: K,
    value: CalendarFilterState[K] extends Array<infer U> ? U : never,
  ) => {
    const arr = state[key] as unknown as Array<typeof value>;
    const next = arr.includes(value)
      ? arr.filter((v) => v !== value)
      : [...arr, value];
    onChange({ ...state, [key]: next });
  };

  const activeCount =
    state.categoryIds.length +
    state.bookingStatuses.length +
    state.petSizes.length +
    state.species.length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Filter className="size-3.5" />
        Filters
      </div>

      {/* Category */}
      <FilterPill
        active={state.categoryIds.length > 0}
        count={state.categoryIds.length}
        label="Category"
      >
        <MultiToggleList
          options={categories.map((c) => c.id)}
          selected={state.categoryIds}
          onToggle={(v) => toggle("categoryIds", v)}
          labelMap={Object.fromEntries(categories.map((c) => [c.id, c.name]))}
        />
      </FilterPill>

      {/* Booking status */}
      <FilterPill
        active={state.bookingStatuses.length > 0}
        count={state.bookingStatuses.length}
        label="Status"
      >
        <MultiToggleList
          options={ALL_STATUSES}
          selected={state.bookingStatuses}
          onToggle={(v) => toggle("bookingStatuses", v)}
          labelMap={STATUS_LABEL}
        />
      </FilterPill>

      {/* Pet size */}
      <FilterPill
        active={state.petSizes.length > 0}
        count={state.petSizes.length}
        label="Size"
      >
        <MultiToggleList
          options={ALL_SIZES}
          selected={state.petSizes}
          onToggle={(v) => toggle("petSizes", v)}
          labelMap={SIZE_LABEL}
        />
      </FilterPill>

      {/* Species */}
      <FilterPill
        active={state.species.length > 0}
        count={state.species.length}
        label="Species"
      >
        <MultiToggleList
          options={ALL_SPECIES}
          selected={state.species}
          onToggle={(v) => toggle("species", v)}
          labelMap={{ dog: "Dogs", cat: "Cats" }}
        />
      </FilterPill>

      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="gap-1 text-xs"
        >
          <X className="size-3" />
          Clear all
        </Button>
      )}
    </div>
  );
}
