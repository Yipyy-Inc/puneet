"use client";

import { useMemo } from "react";
import { UserX, Star, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isHoliday } from "@/lib/scheduling-utils";
import { getDatesForView, formatDateStr, isToday, isWeekend } from "./ScheduleCalendarHelpers";
import type {
  ScheduleShift,
  ScheduleEmployee,
  Position,
  EnhancedTimeOffRequest,
  HolidayRate,
} from "@/types/scheduling";

export interface ScheduleMonthViewProps {
  currentDate: Date;
  employees: ScheduleEmployee[];
  shifts: ScheduleShift[];
  positions: Position[];
  timeOffRequests: EnhancedTimeOffRequest[];
  holidayRates: HolidayRate[];
  onShiftClick: (shift: ScheduleShift) => void;
  onCellClick: (employeeId: string | undefined, date: string) => void;
}

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ScheduleMonthView({
  currentDate,
  employees,
  shifts,
  positions,
  timeOffRequests,
  holidayRates,
  onShiftClick,
  onCellClick,
}: ScheduleMonthViewProps) {
  const dates = useMemo(
    () => getDatesForView(currentDate, "month"),
    [currentDate],
  );
  const currentMonth = currentDate.getMonth();

  const employeeMap = useMemo(() => {
    const m = new Map<string, ScheduleEmployee>();
    employees.forEach((e) => m.set(e.id, e));
    return m;
  }, [employees]);

  const positionMap = useMemo(() => {
    const m = new Map<string, Position>();
    positions.forEach((p) => m.set(p.id, p));
    return m;
  }, [positions]);

  const shiftsByDate = useMemo(() => {
    const m = new Map<string, ScheduleShift[]>();
    shifts.forEach((s) => {
      if (!m.has(s.date)) m.set(s.date, []);
      m.get(s.date)!.push(s);
    });
    m.forEach((arr) =>
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime)),
    );
    return m;
  }, [shifts]);

  const timeOffByDate = useMemo(() => {
    const m = new Map<string, EnhancedTimeOffRequest[]>();
    dates.forEach((d) => {
      const dateStr = formatDateStr(d);
      const matching = timeOffRequests.filter(
        (r) =>
          r.startDate <= dateStr &&
          r.endDate >= dateStr &&
          (r.status === "approved" || r.status === "pending"),
      );
      if (matching.length) m.set(dateStr, matching);
    });
    return m;
  }, [timeOffRequests, dates]);

  const rows = Math.ceil(dates.length / 7);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-border/60 bg-muted/20">
        {WEEK_DAYS.map((d, i) => (
          <div
            key={d}
            className={cn(
              "py-3 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
              i >= 5 && "text-muted-foreground/70",
            )}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className="grid flex-1 grid-cols-7 overflow-y-auto"
        style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
      >
        {dates.map((date, idx) => {
          const dateStr = formatDateStr(date);
          const inCurrentMonth = date.getMonth() === currentMonth;
          const todayFlag = isToday(date);
          const weekend = isWeekend(date);
          const dayShifts = shiftsByDate.get(dateStr) ?? [];
          const dayTimeOff = timeOffByDate.get(dateStr) ?? [];
          const holiday = isHoliday(dateStr, holidayRates);

          const openShifts = dayShifts.filter((s) => !s.employeeId);
          const assignedShifts = dayShifts.filter((s) => s.employeeId);
          const maxPreview = 3;

          return (
            <div
              key={idx}
              className={cn(
                "group relative flex min-h-[120px] cursor-pointer flex-col border-b border-r border-border/50 p-2 transition-colors hover:bg-muted/30",
                weekend && "bg-muted/10",
                !inCurrentMonth && "bg-muted/5",
                todayFlag && "bg-indigo-50/40 dark:bg-indigo-950/20",
              )}
              onClick={() => onCellClick(undefined, dateStr)}
            >
              <div className="mb-1.5 flex items-start justify-between">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-transform",
                    todayFlag
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                      : !inCurrentMonth
                        ? "text-muted-foreground/50"
                        : "text-foreground",
                  )}
                >
                  {date.getDate()}
                </span>
                <div className="flex items-center gap-1">
                  {holiday && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Star className="size-3.5 cursor-default fill-amber-400 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        <p className="font-medium">{holiday.name}</p>
                        <p className="text-muted-foreground">
                          ×{holiday.multiplier} pay rate
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {dayTimeOff.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-0.5 rounded-full bg-emerald-100/80 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <Coffee className="size-2.5" />
                          {dayTimeOff.length}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        <p className="font-medium">
                          {dayTimeOff.length} on time off
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                {openShifts.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShiftClick(openShifts[0]);
                    }}
                    className="flex items-center gap-1 rounded-md border border-dashed border-amber-400/70 bg-amber-50/70 px-1.5 py-1 text-left transition-colors hover:bg-amber-100/80 dark:bg-amber-950/20"
                  >
                    <UserX className="size-3 shrink-0 text-amber-600" />
                    <span className="truncate text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                      {openShifts.length} open
                    </span>
                  </button>
                )}

                {assignedShifts.slice(0, maxPreview).map((shift) => {
                  const pos = positionMap.get(shift.positionId);
                  const emp = shift.employeeId
                    ? employeeMap.get(shift.employeeId)
                    : null;
                  const color = pos?.color ?? "#6366f1";
                  const isDraft = shift.status === "draft";

                  return (
                    <button
                      type="button"
                      key={shift.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onShiftClick(shift);
                      }}
                      className={cn(
                        "group/pill flex items-center gap-1.5 rounded-md border px-1.5 py-1 text-left transition-all hover:-translate-y-px hover:shadow-sm",
                        isDraft && "border-dashed",
                      )}
                      style={{
                        backgroundColor: `${color}14`,
                        borderColor: `${color}40`,
                      }}
                    >
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span
                        className="truncate text-[10px] font-semibold"
                        style={{ color }}
                      >
                        {emp?.initials ?? "?"}
                      </span>
                      <span className="ml-auto truncate text-[10px] opacity-80">
                        {shift.startTime.slice(0, 5)}
                      </span>
                    </button>
                  );
                })}

                {assignedShifts.length > maxPreview && (
                  <span className="px-1 text-[10px] font-medium text-muted-foreground">
                    +{assignedShifts.length - maxPreview} more
                  </span>
                )}

                {assignedShifts.length === 0 &&
                  openShifts.length === 0 &&
                  inCurrentMonth && (
                    <span className="mt-auto text-[10px] italic text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100">
                      + Add shift
                    </span>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
