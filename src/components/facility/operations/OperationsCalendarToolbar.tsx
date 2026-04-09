"use client";

import type { ReactNode } from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  LayoutPanelTop,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type CalendarVisualConfig,
  type CalendarAxisMode,
  type OperationsCalendarSavedView,
  type OperationsCalendarView,
  CALENDAR_ZOOM_OPTIONS,
  OPERATIONS_CALENDAR_VIEWS,
  formatDateKey,
} from "@/lib/operations-calendar";

interface OperationsCalendarToolbarProps {
  axisMode: CalendarAxisMode;
  onAxisModeChange: (mode: CalendarAxisMode) => void;
  resourceTypeOptions: Array<{ value: string; label: string }>;
  selectedResourceType: string;
  onSelectedResourceTypeChange: (value: string) => void;
  view: OperationsCalendarView;
  onViewChange: (view: OperationsCalendarView) => void;
  anchorDate: Date;
  onDateChange: (date: string | "") => void;
  onToday: () => void;
  onStep: (direction: -1 | 1) => void;
  rangeLabel: string;
  searchTerm: string;
  onSearchTermChange: (next: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  showConfig: boolean;
  onToggleConfig: () => void;
  canConfigureCalendar: boolean;
  reportsOpen: boolean;
  onToggleReports: () => void;
  activeFilterCount: number;
  showCompletedTasks: boolean;
  onToggleShowCompletedTasks: () => void;
  newEventMenu?: ReactNode;
  visualConfig: CalendarVisualConfig;
  onZoomChange: (zoomLevel: CalendarVisualConfig["zoomLevel"]) => void;
  selectedSavedViewId: string;
  savedViews: OperationsCalendarSavedView[];
  onSelectSavedView: (savedViewId: string) => void;
  onSavePersonalView: () => void;
  onSaveFacilityView: () => void;
  canCreateFacilityViews: boolean;
  onDeleteSavedView: (savedViewId: string) => void;
}

export function OperationsCalendarToolbar({
  axisMode,
  onAxisModeChange,
  resourceTypeOptions,
  selectedResourceType,
  onSelectedResourceTypeChange,
  view,
  onViewChange,
  anchorDate,
  onDateChange,
  onToday,
  onStep,
  rangeLabel,
  searchTerm,
  onSearchTermChange,
  showFilters,
  onToggleFilters,
  showConfig,
  onToggleConfig,
  canConfigureCalendar,
  reportsOpen,
  onToggleReports,
  activeFilterCount,
  showCompletedTasks,
  onToggleShowCompletedTasks,
  newEventMenu,
  visualConfig,
  onZoomChange,
  selectedSavedViewId,
  savedViews,
  onSelectSavedView,
  onSavePersonalView,
  onSaveFacilityView,
  canCreateFacilityViews,
  onDeleteSavedView,
}: OperationsCalendarToolbarProps) {
  return (
    <div className="from-background to-muted/20 rounded-xl border border-slate-200 bg-linear-to-r p-4 shadow-xs">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onToday}>
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onStep(-1)}
            aria-label="Go to previous period"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onStep(1)}
            aria-label="Go to next period"
          >
            <ChevronRight className="size-4" />
          </Button>
          <DatePicker
            value={formatDateKey(anchorDate)}
            onValueChange={onDateChange}
            className="w-[168px]"
          />
          <div className="pl-1 text-sm font-medium text-slate-700">{rangeLabel}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full min-w-56 max-w-80">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder="Search pet, customer, booking ID, confirmation..."
              className="pl-8"
            />
          </div>

          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={onToggleFilters}
            className="gap-2"
          >
            <Filter className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-1 rounded-full">{activeFilterCount}</Badge>
            )}
          </Button>

          <Button
            variant={showCompletedTasks ? "outline" : "default"}
            onClick={onToggleShowCompletedTasks}
            className="gap-2"
          >
            Completed tasks
          </Button>

          <Button
            variant={showConfig ? "default" : "outline"}
            onClick={onToggleConfig}
            className="gap-2"
            disabled={!canConfigureCalendar}
          >
            <Settings2 className="size-4" />
            Calendar Config
          </Button>

          <Button
            variant={reportsOpen ? "default" : "outline"}
            onClick={onToggleReports}
            className="gap-2"
          >
            <BarChart3 className="size-4" />
            Reports
          </Button>

          {newEventMenu}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {OPERATIONS_CALENDAR_VIEWS.map((mode) => (
          <Button
            key={mode.value}
            size="sm"
            variant={view === mode.value ? "default" : "outline"}
            onClick={() => onViewChange(mode.value)}
          >
            {mode.label}
          </Button>
        ))}
        <Select value={visualConfig.zoomLevel} onValueChange={onZoomChange}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CALENDAR_ZOOM_OPTIONS.map((zoom) => (
              <SelectItem key={zoom.value} value={zoom.value}>
                {zoom.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={axisMode}
          onValueChange={(value) => onAxisModeChange(value as CalendarAxisMode)}
        >
          <SelectTrigger className="h-8 min-w-36">
            <LayoutPanelTop className="mr-1 size-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="master">Master</SelectItem>
            <SelectItem value="resource">Resource</SelectItem>
          </SelectContent>
        </Select>

        {axisMode === "resource" && (
          <Select
            value={selectedResourceType}
            onValueChange={onSelectedResourceTypeChange}
          >
            <SelectTrigger className="h-8 min-w-44">
              <SelectValue placeholder="Select resource" />
            </SelectTrigger>
            <SelectContent>
              {resourceTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white/90 p-2">
        <Layers className="text-muted-foreground size-4" />
        <Select value={selectedSavedViewId} onValueChange={onSelectSavedView}>
          <SelectTrigger className="h-8 min-w-56">
            <SelectValue placeholder="Saved views" />
          </SelectTrigger>
          <SelectContent>
            {savedViews.map((savedView) => (
              <SelectItem key={savedView.id} value={savedView.id}>
                {savedView.name} {savedView.scope === "facility" ? "(Facility)" : "(Personal)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={onSavePersonalView}>
          Save Personal View
        </Button>
        {canCreateFacilityViews && (
          <Button variant="outline" size="sm" onClick={onSaveFacilityView}>
            Save Facility View
          </Button>
        )}
        {selectedSavedViewId && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => onDeleteSavedView(selectedSavedViewId)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
