"use client";

import type { RefObject } from "react";
import { CalendarClock } from "lucide-react";
import {
  DayColumns,
  DayTimeline,
  ListView,
  ResourceColumnsView,
  type EventRenderSettings,
} from "@/components/facility/operations/OperationsCalendarViews";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  type OperationsCalendarEvent,
  type OperationsCalendarView,
  type CalendarAxisMode,
  getEventsForDay,
  startOfDay,
} from "@/lib/operations-calendar";

interface OperationsCalendarContentProps {
  axisMode: CalendarAxisMode;
  resourceTypeLabel?: string;
  resourceResources?: Array<{ id: string; name: string; type: string }>;
  view: OperationsCalendarView;
  anchorDate: Date;
  days: Date[];
  visibleEvents: OperationsCalendarEvent[];
  activeFilterCount: number;
  timelineRef: RefObject<HTMLDivElement | null>;
  renderSettings: EventRenderSettings;
  onClearAllFilters: () => void;
  onEventClick?: (event: OperationsCalendarEvent) => void;
  onSlotCreate?: (slot: Date) => void;
}

export function OperationsCalendarContent({
  axisMode,
  resourceTypeLabel,
  resourceResources,
  view,
  anchorDate,
  days,
  visibleEvents,
  activeFilterCount,
  timelineRef,
  renderSettings,
  onClearAllFilters,
  onEventClick,
  onSlotCreate,
}: OperationsCalendarContentProps) {
  return (
    <Card className="border-slate-200 bg-slate-50/50">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4 text-slate-600" />
            Operations Calendar
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <Badge variant="outline">{visibleEvents.length} visible events</Badge>
            <span>
              {axisMode === "resource"
                ? `Resource Calendar${resourceTypeLabel ? ` - ${resourceTypeLabel}` : ""}`
                : "Bookings, add-ons, tasks, facility events, and optional retail"}
            </span>
          </div>
        </div>
        <Separator className="mt-3" />
      </CardHeader>
      <CardContent className="pt-2">
        {visibleEvents.length === 0 ? (
          <div className="flex min-h-60 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white">
            <p className="text-sm font-medium text-slate-700">No matching events</p>
            <p className="text-xs text-slate-500">Adjust filters or choose another range.</p>
            {activeFilterCount > 0 && (
              <Button size="sm" variant="outline" onClick={onClearAllFilters}>
                Reset filters
              </Button>
            )}
          </div>
        ) : (
          <>
            {axisMode === "resource" && view !== "day-list" && view !== "week-list" && view !== "month-list" ? (
              <ResourceColumnsView
                resources={resourceResources ?? []}
                events={visibleEvents}
                renderSettings={renderSettings}
                onEventClick={onEventClick}
                onSlotCreate={onSlotCreate}
              />
            ) : (
              <>
            {view === "day" && (
              <DayTimeline
                day={startOfDay(anchorDate)}
                events={getEventsForDay(visibleEvents, anchorDate)}
                timelineRef={timelineRef}
                renderSettings={renderSettings}
                onEventClick={onEventClick}
                onSlotCreate={onSlotCreate}
              />
            )}
            {view === "week" && (
              <DayColumns
                days={days}
                events={visibleEvents}
                renderSettings={renderSettings}
                onEventClick={onEventClick}
                onSlotCreate={onSlotCreate}
              />
            )}
            {view === "two-week" && (
              <DayColumns
                days={days}
                events={visibleEvents}
                renderSettings={renderSettings}
                onEventClick={onEventClick}
                onSlotCreate={onSlotCreate}
              />
            )}
            {view === "month" && (
              <DayColumns
                days={days}
                events={visibleEvents}
                showMonthMask
                anchorDate={anchorDate}
                renderSettings={renderSettings}
                onEventClick={onEventClick}
              />
            )}
              </>
            )}
            {(view === "day-list" || view === "week-list" || view === "month-list") && (
              <ListView
                days={days}
                events={visibleEvents}
                renderSettings={renderSettings}
                onEventClick={onEventClick}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
