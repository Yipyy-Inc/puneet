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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  onMarkEventComplete?: (event: OperationsCalendarEvent) => void;
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
  onMarkEventComplete,
  onSlotCreate,
}: OperationsCalendarContentProps) {
  return (
    <Card className="animate-in slide-in-from-bottom-6 fade-in overflow-hidden rounded-3xl border border-white/80 bg-white/70 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 backdrop-blur-xl transition-all duration-700 ease-out">
      <CardHeader className="relative z-10 border-b border-slate-100/60 bg-white/40 pb-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-3.5 text-xl font-bold tracking-tight">
            <div className="animate-in zoom-in-50 flex items-center justify-center rounded-[14px] bg-sky-50 p-2.5 text-sky-600 shadow-inner ring-1 ring-sky-200/70 backdrop-blur-sm delay-200 duration-500 ring-inset">
              <CalendarClock className="size-5" />
            </div>
            <span className="text-slate-900 drop-shadow-sm">
              Client Schedule
            </span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-4 text-[13px] font-medium text-slate-500">
            <div className="animate-in fade-in slide-in-from-right-4 delay-300 duration-500">
              <div className="flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-4 py-1.5 text-indigo-700 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md">
                <div className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-indigo-500"></span>
                </div>
                <span className="font-semibold">
                  {visibleEvents.length} active events
                </span>
              </div>
            </div>
            <span className="animate-in fade-in hidden font-medium tracking-wide text-slate-400/90 delay-500 duration-500 sm:inline-block">
              {axisMode === "resource"
                ? `Resource View${resourceTypeLabel ? ` • ${resourceTypeLabel}` : ""}`
                : "Click any date & time to create a quick appointment."}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="bg-[#fdfdfd]/80 p-0 transition-all duration-500 ease-in-out">
        {visibleEvents.length === 0 ? (
          <div className="animate-in fade-in zoom-in-95 relative flex min-h-[450px] flex-col items-center justify-center overflow-hidden p-8 duration-500">
            <div className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-100/60 blur-3xl"></div>

            <div className="relative z-10 flex flex-col items-center space-y-6">
              <div className="flex animate-bounce items-center justify-center rounded-full bg-white p-5 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] ring-1 ring-slate-200/50 duration-1000">
                <div className="rounded-full bg-sky-50 p-3 text-sky-500 shadow-inner">
                  <CalendarClock className="size-8 stroke-[1.5]" />
                </div>
              </div>

              <div className="max-w-sm space-y-2.5 text-center">
                <h3 className="text-xl font-bold tracking-tight text-slate-800">
                  Your schedule is clear
                </h3>
                <p className="text-[15px] leading-relaxed font-medium text-slate-500 drop-shadow-sm">
                  You&apos;re perfectly caught up. Select a different date or
                  add a new luxury appointment above to get started.
                </p>
              </div>

              {activeFilterCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onClearAllFilters}
                  className="mt-2 h-9 rounded-full border-slate-200 bg-white/80 px-6 font-medium text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-md active:scale-95"
                >
                  Clear {activeFilterCount} active filters
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom-4 fade-in fill-mode-both min-h-[400px] bg-white/60 p-3 duration-500 sm:p-4">
            {axisMode === "resource" &&
            view !== "day-list" &&
            view !== "week-list" &&
            view !== "month-list" ? (
              <ResourceColumnsView
                resources={resourceResources ?? []}
                events={visibleEvents}
                renderSettings={renderSettings}
                onEventClick={onEventClick}
                onMarkEventComplete={onMarkEventComplete}
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
                    onMarkEventComplete={onMarkEventComplete}
                    onSlotCreate={onSlotCreate}
                  />
                )}
                {view === "week" && (
                  <DayColumns
                    days={days}
                    events={visibleEvents}
                    renderSettings={renderSettings}
                    onEventClick={onEventClick}
                    onMarkEventComplete={onMarkEventComplete}
                    onSlotCreate={onSlotCreate}
                  />
                )}
                {view === "two-week" && (
                  <DayColumns
                    days={days}
                    events={visibleEvents}
                    renderSettings={renderSettings}
                    onEventClick={onEventClick}
                    onMarkEventComplete={onMarkEventComplete}
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
                    onMarkEventComplete={onMarkEventComplete}
                    onSlotCreate={onSlotCreate}
                  />
                )}
              </>
            )}
            {(view === "day-list" ||
              view === "week-list" ||
              view === "month-list") && (
              <ListView
                days={days}
                events={visibleEvents}
                renderSettings={renderSettings}
                onEventClick={onEventClick}
                onMarkEventComplete={onMarkEventComplete}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
