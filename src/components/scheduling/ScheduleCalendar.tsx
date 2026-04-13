"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  ScheduleShift,
  ScheduleEmployee,
  Position,
  EnhancedTimeOffRequest,
} from "@/types/scheduling";
import type { ViewMode } from "./ScheduleHeader";

interface ScheduleCalendarProps {
  viewMode: ViewMode;
  currentDate: Date;
  employees: ScheduleEmployee[];
  shifts: ScheduleShift[];
  positions: Position[];
  timeOffRequests: EnhancedTimeOffRequest[];
  onShiftClick: (shift: ScheduleShift) => void;
  onCellClick: (employeeId: string, date: string) => void;
  getEmployeeHours: (employeeId: string) => number;
}

function getDatesForView(currentDate: Date, viewMode: ViewMode): Date[] {
  const dates: Date[] = [];
  const start = new Date(currentDate);
  const dayOfWeek = start.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(start.getDate() + mondayOffset);

  const totalDays =
    viewMode === "month" ? 35 : viewMode === "2weeks" ? 14 : 7;

  if (viewMode === "month") {
    const firstOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const dow = firstOfMonth.getDay();
    const startOffset = dow === 0 ? -6 : 1 - dow;
    firstOfMonth.setDate(firstOfMonth.getDate() + startOffset);
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(firstOfMonth);
      d.setDate(firstOfMonth.getDate() + i);
      dates.push(d);
    }
  } else {
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
  }

  return dates;
}

function formatDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getTimeOffForDate(
  requests: EnhancedTimeOffRequest[],
  employeeId: string,
  dateStr: string,
): EnhancedTimeOffRequest | undefined {
  return requests.find(
    (r) =>
      r.employeeId === employeeId &&
      r.startDate <= dateStr &&
      r.endDate >= dateStr &&
      (r.status === "approved" || r.status === "pending"),
  );
}

const timeOffColors: Record<string, { bg: string; text: string; border: string }> = {
  vacation: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
  sick_leave: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" },
  personal: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800" },
  bereavement: { bg: "bg-slate-50 dark:bg-slate-950/30", text: "text-slate-700 dark:text-slate-400", border: "border-slate-200 dark:border-slate-800" },
  parental: { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
  unpaid: { bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-400", border: "border-rose-200 dark:border-rose-800" },
  other: { bg: "bg-gray-50 dark:bg-gray-950/30", text: "text-gray-700 dark:text-gray-400", border: "border-gray-200 dark:border-gray-800" },
};

const timeOffLabels: Record<string, string> = {
  vacation: "Vacation",
  sick_leave: "Sick Leave",
  personal: "Personal",
  bereavement: "Bereavement",
  parental: "Parental",
  unpaid: "Unpaid",
  other: "Other",
};

export function ScheduleCalendar({
  viewMode,
  currentDate,
  employees,
  shifts,
  positions,
  timeOffRequests,
  onShiftClick,
  onCellClick,
  getEmployeeHours,
}: ScheduleCalendarProps) {
  const dates = useMemo(
    () => getDatesForView(currentDate, viewMode),
    [currentDate, viewMode],
  );

  const positionMap = useMemo(() => {
    const map = new Map<string, Position>();
    positions.forEach((p) => map.set(p.id, p));
    return map;
  }, [positions]);

  const shiftsByKey = useMemo(() => {
    const map = new Map<string, ScheduleShift[]>();
    shifts.forEach((s) => {
      const key = `${s.employeeId}-${s.date}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [shifts]);

  const isMonthView = viewMode === "month";
  const columnWidth = isMonthView ? "min-w-[40px]" : "min-w-[120px]";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col overflow-hidden">
        <div className="overflow-x-auto">
          <div className={cn("min-w-full", isMonthView && "min-w-[900px]")}>
            {/* Day Headers */}
            <div className="bg-muted/30 border-b">
              <div className="flex">
                {/* Employee column header */}
                <div className="bg-background/80 sticky left-0 z-20 flex w-[220px] min-w-[220px] items-center border-r px-4 py-2.5 backdrop-blur-sm">
                  <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                    Employees
                  </span>
                </div>

                {/* Date columns */}
                {dates.map((date, i) => {
                  const todayFlag = isToday(date);
                  const weekend = isWeekend(date);
                  // Compute column day name index
                  const dayIdx = date.getDay();
                  const dayLabel =
                    dayIdx === 0
                      ? "Sun"
                      : dayNames[dayIdx - 1];

                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex flex-1 flex-col items-center justify-center border-r py-2",
                        columnWidth,
                        weekend && "bg-muted/20",
                        todayFlag && "bg-primary/5",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[10px] font-medium uppercase tracking-wider",
                          todayFlag
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        {dayLabel}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-semibold",
                          todayFlag
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground",
                        )}
                      >
                        {date.getDate()}
                      </span>
                    </div>
                  );
                })}

                {/* Hours column */}
                <div className="bg-background/80 sticky right-0 z-20 flex w-[80px] min-w-[80px] items-center justify-center border-l px-2 py-2.5 backdrop-blur-sm">
                  <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                    Hours
                  </span>
                </div>
              </div>
            </div>

            {/* Employee Rows */}
            <div className="divide-y">
              {employees.map((employee) => {
                const totalHours = getEmployeeHours(employee.id);
                const isOverHours = totalHours > employee.maxHoursPerWeek;

                return (
                  <div
                    key={employee.id}
                    className="group flex transition-colors hover:bg-muted/20"
                  >
                    {/* Employee Info */}
                    <div className="bg-background/80 sticky left-0 z-10 flex w-[220px] min-w-[220px] items-center gap-3 border-r px-4 py-3 backdrop-blur-sm">
                      <Avatar className="size-8 ring-2 ring-background shadow-sm">
                        <AvatarImage src={employee.avatar} alt={employee.name} />
                        <AvatarFallback className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-[11px] font-semibold">
                          {employee.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {employee.name}
                        </p>
                        <p className="text-muted-foreground truncate text-[11px]">
                          {employee.role}
                        </p>
                      </div>
                    </div>

                    {/* Shift Cells */}
                    {dates.map((date, i) => {
                      const dateStr = formatDateStr(date);
                      const cellShifts =
                        shiftsByKey.get(`${employee.id}-${dateStr}`) || [];
                      const timeOff = getTimeOffForDate(
                        timeOffRequests,
                        employee.id,
                        dateStr,
                      );
                      const weekend = isWeekend(date);
                      const todayFlag = isToday(date);

                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex flex-1 cursor-pointer flex-col gap-1 border-r p-1 transition-colors",
                            columnWidth,
                            weekend && "bg-muted/10",
                            todayFlag && "bg-primary/[0.02]",
                            "hover:bg-muted/30",
                          )}
                          onClick={() => {
                            if (cellShifts.length === 0) {
                              onCellClick(employee.id, dateStr);
                            }
                          }}
                        >
                          {timeOff ? (
                            <TimeOffCell
                              timeOff={timeOff}
                              isCompact={isMonthView}
                            />
                          ) : (
                            cellShifts.map((shift) => (
                              <ShiftPill
                                key={shift.id}
                                shift={shift}
                                position={positionMap.get(shift.positionId)}
                                isCompact={isMonthView}
                                onClick={() => onShiftClick(shift)}
                              />
                            ))
                          )}
                        </div>
                      );
                    })}

                    {/* Hours Total */}
                    <div className="bg-background/80 sticky right-0 z-10 flex w-[80px] min-w-[80px] items-center justify-center border-l px-2 backdrop-blur-sm">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          isOverHours
                            ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                            : "text-muted-foreground",
                        )}
                      >
                        {totalHours.toFixed(1)}h
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── Shift Pill ──────────────────────────────────────────────────────────────

function ShiftPill({
  shift,
  position,
  isCompact,
  onClick,
}: {
  shift: ScheduleShift;
  position: Position | undefined;
  isCompact: boolean;
  onClick: () => void;
}) {
  const isDraft = shift.status === "draft";
  const color = position?.color || "#6366f1";

  if (isCompact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "mx-auto size-3 cursor-pointer rounded-full transition-transform hover:scale-125",
              isDraft && "ring-2 ring-dashed ring-offset-1",
            )}
            style={{ backgroundColor: color }}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">{position?.name || "Unknown"}</p>
          <p className="text-muted-foreground">
            {shift.startTime} - {shift.endTime}
          </p>
          {isDraft && (
            <Badge variant="outline" className="mt-1 text-[10px]">
              Draft
            </Badge>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "group/pill flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 transition-all hover:shadow-md",
            isDraft && "border-dashed opacity-75",
          )}
          style={{
            backgroundColor: `${color}12`,
            borderColor: `${color}40`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <div
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[11px] font-medium"
              style={{ color }}
            >
              {position?.name || "—"}
            </p>
            <p className="text-muted-foreground text-[10px]">
              {shift.startTime} - {shift.endTime}
            </p>
          </div>
          {isDraft && (
            <div className="bg-muted text-muted-foreground rounded px-1 py-0.5 text-[9px] font-medium">
              Draft
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p className="font-medium">{position?.name}</p>
        <p>
          {shift.startTime} - {shift.endTime}
        </p>
        {shift.notes && (
          <p className="text-muted-foreground mt-1">{shift.notes}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Time Off Cell ───────────────────────────────────────────────────────────

function TimeOffCell({
  timeOff,
  isCompact,
}: {
  timeOff: EnhancedTimeOffRequest;
  isCompact: boolean;
}) {
  const colors = timeOffColors[timeOff.type] || timeOffColors.other;
  const label = timeOffLabels[timeOff.type] || timeOff.type;
  const isPending = timeOff.status === "pending";

  if (isCompact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "mx-auto size-3 rounded-full border",
              colors.bg,
              colors.border,
              isPending && "animate-pulse",
            )}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">{label}</p>
          <Badge
            variant={isPending ? "outline" : "secondary"}
            className="mt-1 text-[10px]"
          >
            {isPending ? "Pending" : "Approved"}
          </Badge>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2 py-1.5",
        colors.bg,
        colors.border,
        isPending && "border-dashed",
      )}
    >
      <div className={cn("text-[11px] font-medium", colors.text)}>{label}</div>
      {isPending && (
        <Badge
          variant="outline"
          className="text-[9px] px-1 py-0"
        >
          Pending
        </Badge>
      )}
    </div>
  );
}
