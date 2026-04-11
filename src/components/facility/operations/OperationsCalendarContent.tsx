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
    <Card className="animate-in slide-in-from-bottom-6 fade-in duration-700 ease-out border border-white/80 bg-white/70 backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 rounded-[1.5rem] overflow-hidden transition-all">
      <CardHeader className="pb-4 bg-white/40 border-b border-slate-100/60 backdrop-blur-md relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-3.5 text-xl font-bold tracking-tight">
            <div className="flex items-center justify-center p-2.5 bg-sky-50 rounded-[14px] ring-1 ring-inset ring-sky-200/70 text-sky-600 shadow-inner animate-in zoom-in-50 duration-500 delay-200 backdrop-blur-sm">
              <CalendarClock className="size-5" />
            </div>
            <span className="text-slate-900 drop-shadow-sm">
              Client Schedule
            </span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-4 text-[13px] text-slate-500 font-medium">
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 delay-300">
              <div className="flex items-center gap-2 bg-white/80 border border-slate-200/60 shadow-sm text-indigo-700 px-4 py-1.5 rounded-full transition-all hover:shadow-md hover:border-indigo-200">
                <div className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2 bg-indigo-500"></span>
                </div>
                <span className="font-semibold">{visibleEvents.length} active events</span>
              </div>
            </div>
            <span className="text-slate-400/90 hidden sm:inline-block animate-in fade-in duration-500 delay-500 font-medium tracking-wide">
              {axisMode === "resource"
                ? `Resource View${resourceTypeLabel ? ` • ${resourceTypeLabel}` : ""}`
                : "Click any date & time to create a quick appointment."}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 transition-all duration-500 ease-in-out bg-[#fdfdfd]/80">
        {visibleEvents.length === 0 ? (
          <div className="relative flex min-h-[450px] flex-col items-center justify-center overflow-hidden p-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-slate-100/60 rounded-full blur-[64px] pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col items-center space-y-6">
              <div className="flex items-center justify-center p-5 bg-white rounded-full shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] ring-1 ring-slate-200/50 animate-bounce duration-1000">
                <div className="p-3 bg-sky-50 rounded-full text-sky-500 shadow-inner">
                  <CalendarClock className="size-8 stroke-[1.5]" />
                </div>
              </div>
              
              <div className="text-center space-y-2.5 max-w-sm">
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">Your schedule is clear</h3>
                <p className="text-[15px] font-medium text-slate-500 leading-relaxed drop-shadow-sm">
                  You're perfectly caught up. Select a different date or add a new luxury appointment above to get started.
                </p>
              </div>
              
              {activeFilterCount > 0 && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={onClearAllFilters} 
                  className="mt-2 rounded-full h-9 px-6 bg-white/80 border-slate-200 shadow-sm transition-all hover:bg-white hover:shadow-md hover:border-slate-300 font-medium text-slate-600 hover:text-slate-900 active:scale-95"
                >
                  Clear {activeFilterCount} active filters
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 lg:p-8 pt-6 bg-white/60 animate-in slide-in-from-bottom-4 fade-in duration-500 fill-mode-both min-h-[400px]">
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
                onSlotCreate={onSlotCreate}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
