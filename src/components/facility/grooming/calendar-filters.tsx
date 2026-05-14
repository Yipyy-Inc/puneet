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
  GroomingAppointment,
  GroomingStatus,
  Stylist,
} from "@/types/grooming";
import type { PetSize } from "@/types/base";

export type CalendarFilterState = {
  groomerIds: string[];
  serviceNames: string[];
  statuses: GroomingStatus[];
  petSizes: PetSize[];
};

export const EMPTY_FILTERS: CalendarFilterState = {
  groomerIds: [],
  serviceNames: [],
  statuses: [],
  petSizes: [],
};

const STATUS_OPTIONS: { value: GroomingStatus; label: string }[] = [
  { value: "scheduled", label: "Pending" },
  { value: "checked-in", label: "Checked In" },
  { value: "in-progress", label: "In Progress" },
  { value: "ready-for-pickup", label: "Ready for Pickup" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no-show", label: "No Show" },
];

const SIZE_OPTIONS: { value: PetSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "giant", label: "Giant (XL)" },
];

export function applyCalendarFilters(
  appointments: GroomingAppointment[],
  filters: CalendarFilterState,
): GroomingAppointment[] {
  const { groomerIds, serviceNames, statuses, petSizes } = filters;
  if (
    groomerIds.length === 0 &&
    serviceNames.length === 0 &&
    statuses.length === 0 &&
    petSizes.length === 0
  ) {
    return appointments;
  }
  return appointments.filter((a) => {
    if (groomerIds.length > 0 && !groomerIds.includes(a.stylistId)) return false;
    if (serviceNames.length > 0 && !serviceNames.includes(a.packageName))
      return false;
    if (statuses.length > 0 && !statuses.includes(a.status)) return false;
    if (petSizes.length > 0 && !petSizes.includes(a.petSize)) return false;
    return true;
  });
}

function countFilters(f: CalendarFilterState): number {
  return (
    f.groomerIds.length +
    f.serviceNames.length +
    f.statuses.length +
    f.petSizes.length
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

export function CalendarFilters({
  filters,
  onChange,
  stylists,
  appointments,
}: {
  filters: CalendarFilterState;
  onChange: (next: CalendarFilterState) => void;
  stylists: Pick<Stylist, "id" | "name" | "status">[];
  appointments: GroomingAppointment[];
}) {
  const groomerOptions = useMemo(
    () =>
      stylists
        .filter((s) => s.status === "active")
        .map((s) => ({ value: s.id, label: s.name })),
    [stylists],
  );

  const serviceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const a of appointments) if (a.packageName) set.add(a.packageName);
    return Array.from(set)
      .sort()
      .map((name) => ({ value: name, label: name }));
  }, [appointments]);

  const total = countFilters(filters);

  function toggle<K extends keyof CalendarFilterState>(
    key: K,
    value: CalendarFilterState[K][number],
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
            total > 0 && "border-blue-300 bg-blue-50 hover:bg-blue-100",
          )}
        >
          <Filter className="size-4" /> Filters
          {total > 0 && (
            <Badge
              variant="default"
              className="ml-1 h-5 min-w-5 bg-blue-600 px-1.5 text-white"
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
              onClick={() => onChange(EMPTY_FILTERS)}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              <X className="size-3" /> Clear all
            </button>
          )}
        </div>
        <div className="space-y-4 p-4">
          <FilterSection
            title="Groomer"
            options={groomerOptions}
            selected={filters.groomerIds}
            onToggle={(v) => toggle("groomerIds", v)}
          />
          <FilterSection
            title="Service Type"
            options={serviceOptions}
            selected={filters.serviceNames}
            onToggle={(v) => toggle("serviceNames", v)}
          />
          <FilterSection
            title="Status"
            options={STATUS_OPTIONS}
            selected={filters.statuses}
            onToggle={(v) => toggle("statuses", v)}
          />
          <FilterSection
            title="Pet Size"
            options={SIZE_OPTIONS}
            selected={filters.petSizes}
            onToggle={(v) => toggle("petSizes", v)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
