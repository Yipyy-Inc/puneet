"use client";

import { X } from "lucide-react";
import { FilterSection } from "@/components/facility/operations/OperationsCalendarViews";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  OperationsCalendarFilters,
  OperationsCalendarFilterOptions,
} from "@/lib/operations-calendar";

type ToggleGroupKey = "modules";

interface OperationsCalendarFiltersPanelProps {
  open: boolean;
  filters: OperationsCalendarFilters;
  filterOptions: OperationsCalendarFilterOptions;
  onToggleGroupValue: (group: ToggleGroupKey, value: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

export function OperationsCalendarFiltersPanel({
  open,
  filters,
  filterOptions,
  onToggleGroupValue,
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
        <p className="text-xs text-slate-600">
          Service filters include built-in services and active custom modules
          configured for this facility.
        </p>
        <FilterSection
          title="Service Type"
          options={filterOptions.modules}
          selectedValues={filters.modules}
          onToggle={(value) => onToggleGroupValue("modules", value)}
        />
      </CardContent>
    </Card>
  );
}
