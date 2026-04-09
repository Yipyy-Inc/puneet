"use client";

import { X } from "lucide-react";
import { FilterSection } from "@/components/facility/operations/OperationsCalendarViews";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  OperationsCalendarFilters,
  OperationsCalendarFilterOptions,
} from "@/lib/operations-calendar";

type ToggleGroupKey =
  | "types"
  | "modules"
  | "taskTypes"
  | "bookingStatuses"
  | "taskStatuses"
  | "staff"
  | "staffRoles"
  | "locations"
  | "petTags"
  | "customerTags";

interface OperationsCalendarFiltersPanelProps {
  open: boolean;
  filters: OperationsCalendarFilters;
  filterOptions: OperationsCalendarFilterOptions;
  onToggleGroupValue: (group: ToggleGroupKey, value: string) => void;
  onUnassignedOnlyChange: (checked: boolean) => void;
  onShowRetailPosChange: (checked: boolean) => void;
  onShowCompletedTasksChange: (checked: boolean) => void;
  onTagLogicChange: (logic: OperationsCalendarFilters["tagLogic"]) => void;
  onClearAll: () => void;
  onClose: () => void;
}

export function OperationsCalendarFiltersPanel({
  open,
  filters,
  filterOptions,
  onToggleGroupValue,
  onUnassignedOnlyChange,
  onShowRetailPosChange,
  onShowCompletedTasksChange,
  onTagLogicChange,
  onClearAll,
  onClose,
}: OperationsCalendarFiltersPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <Card className="border-slate-200 bg-slate-50/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Filters</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClearAll}>
              <X className="size-3.5" />
              Clear all
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          <FilterSection
            title="Event Type"
            options={filterOptions.types}
            selectedValues={filters.types}
            onToggle={(value) => onToggleGroupValue("types", value)}
          />
          <FilterSection
            title="Module / Service"
            options={filterOptions.modules}
            selectedValues={filters.modules}
            onToggle={(value) => onToggleGroupValue("modules", value)}
          />
          <FilterSection
            title="Task Type"
            options={filterOptions.taskTypes}
            selectedValues={filters.taskTypes}
            onToggle={(value) => onToggleGroupValue("taskTypes", value)}
          />
          <FilterSection
            title="Booking Status"
            options={filterOptions.bookingStatuses}
            selectedValues={filters.bookingStatuses}
            onToggle={(value) => onToggleGroupValue("bookingStatuses", value)}
          />
          <FilterSection
            title="Task Status"
            options={filterOptions.taskStatuses}
            selectedValues={filters.taskStatuses}
            onToggle={(value) => onToggleGroupValue("taskStatuses", value)}
          />
          <FilterSection
            title="Staff"
            options={filterOptions.staff}
            selectedValues={filters.staff}
            onToggle={(value) => onToggleGroupValue("staff", value)}
          />
          <FilterSection
            title="Role Group"
            options={filterOptions.staffRoles}
            selectedValues={filters.staffRoles}
            onToggle={(value) => onToggleGroupValue("staffRoles", value)}
          />
          <FilterSection
            title="Resource / Location"
            options={filterOptions.locations}
            selectedValues={filters.locations}
            onToggle={(value) => onToggleGroupValue("locations", value)}
          />
          <FilterSection
            title="Pet Tags"
            options={filterOptions.petTags}
            selectedValues={filters.petTags}
            onToggle={(value) => onToggleGroupValue("petTags", value)}
          />
          <FilterSection
            title="Customer Tags"
            options={filterOptions.customerTags}
            selectedValues={filters.customerTags}
            onToggle={(value) => onToggleGroupValue("customerTags", value)}
          />
        </div>

        <div className="grid gap-2 rounded-lg border border-slate-200 bg-white/90 p-3 md:grid-cols-3">
          <label className="flex items-center justify-between gap-2 text-xs text-slate-700">
            Show unassigned only
            <Switch
              checked={filters.unassignedOnly}
              onCheckedChange={onUnassignedOnlyChange}
            />
          </label>

          <label className="flex items-center justify-between gap-2 text-xs text-slate-700">
            Show Retail / POS events
            <Switch checked={filters.showRetailPos} onCheckedChange={onShowRetailPosChange} />
          </label>

          <label className="flex items-center justify-between gap-2 text-xs text-slate-700">
            Show completed tasks
            <Switch
              checked={filters.showCompletedTasks}
              onCheckedChange={onShowCompletedTasksChange}
            />
          </label>

          <div className="space-y-1">
            <p className="text-xs text-slate-700">Tag logic</p>
            <Select value={filters.tagLogic} onValueChange={onTagLogicChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="and">AND (must match all)</SelectItem>
                <SelectItem value="or">OR (match any)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
