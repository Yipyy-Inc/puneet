"use client";

import { Fragment, useMemo } from "react";
import { UserX, Star, Sigma } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isHoliday, computeShiftHours } from "@/lib/scheduling-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShiftPill, TimeOffCell } from "./ScheduleCalendarPills";
import {
  getDatesForView,
  formatDateStr,
  dayNames,
  isToday,
  isWeekend,
  getTimeOffForDate,
  HoursBadge,
} from "./ScheduleCalendarHelpers";
import type {
  ScheduleShift,
  ScheduleEmployee,
  Position,
  EnhancedTimeOffRequest,
  HolidayRate,
} from "@/types/scheduling";
import type { ViewMode } from "./ScheduleHeader";

export interface ScheduleGridViewProps {
  viewMode: Exclude<ViewMode, "month" | "day">;
  currentDate: Date;
  employees: ScheduleEmployee[];
  shifts: ScheduleShift[];
  positions: Position[];
  timeOffRequests: EnhancedTimeOffRequest[];
  holidayRates: HolidayRate[];
  overtimeThreshold: number;
  draggedShiftId: string | null;
  dragOverCell: string | null;
  setDraggedShiftId: (id: string | null) => void;
  setDragOverCell: (key: string | null) => void;
  onShiftClick: (shift: ScheduleShift) => void;
  onCellClick: (employeeId: string | undefined, date: string) => void;
  onContextMenu: (e: React.MouseEvent, shift: ScheduleShift) => void;
  onDrop: (
    e: React.DragEvent,
    employeeId: string | undefined,
    date: string,
  ) => void;
  getEmployeeHours: (employeeId: string) => number;
}

export function ScheduleGridView(props: ScheduleGridViewProps) {
  const {
    viewMode,
    currentDate,
    employees,
    shifts,
    positions,
    timeOffRequests,
    holidayRates,
    overtimeThreshold,
    draggedShiftId,
    dragOverCell,
    setDraggedShiftId,
    setDragOverCell,
    onShiftClick,
    onCellClick,
    onContextMenu,
    onDrop,
    getEmployeeHours,
  } = props;

  const dates = useMemo(
    () => getDatesForView(currentDate, viewMode),
    [currentDate, viewMode],
  );

  const positionMap = useMemo(() => {
    const m = new Map<string, Position>();
    positions.forEach((p) => m.set(p.id, p));
    return m;
  }, [positions]);

  const shiftsByKey = useMemo(() => {
    const m = new Map<string, ScheduleShift[]>();
    shifts.forEach((s) => {
      const key = `${s.employeeId ?? "unassigned"}-${s.date}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(s);
    });
    return m;
  }, [shifts]);

  const hasOpenShifts = useMemo(
    () => shifts.some((s) => !s.employeeId),
    [shifts],
  );

  const dailyTotals = useMemo(() => {
    const map = new Map<string, number>();
    dates.forEach((d) => map.set(formatDateStr(d), 0));
    shifts.forEach((s) => {
      if (!s.employeeId) return;
      if (!map.has(s.date)) return;
      map.set(
        s.date,
        (map.get(s.date) ?? 0) +
          computeShiftHours(s.startTime, s.endTime, s.breakMinutes),
      );
    });
    return map;
  }, [shifts, dates]);

  const grandTotalHours = useMemo(() => {
    let sum = 0;
    dailyTotals.forEach((v) => {
      sum += v;
    });
    return sum;
  }, [dailyTotals]);

  const isCompact = viewMode === "2weeks";
  const empColWidth = isCompact ? 220 : 240;
  const hoursColWidth = 84;

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `${empColWidth}px repeat(${dates.length}, minmax(0, 1fr)) ${hoursColWidth}px`,
  };

  // Find today's column index for the vertical accent overlay
  const todayColIdx = dates.findIndex((d) => isToday(d));

  const renderCell = (
    empId: string | undefined,
    date: Date,
    cellShifts: ScheduleShift[],
    timeOff?: EnhancedTimeOffRequest,
  ) => {
    const dateStr = formatDateStr(date);
    const cellKey = `${empId ?? "unassigned"}-${dateStr}`;
    const isDragOver = dragOverCell === cellKey;
    const weekend = isWeekend(date);
    const todayFlag = isToday(date);

    return (
      <div
        key={cellKey}
        className={cn(
          "group/cell border-border/50 relative flex min-h-[60px] cursor-pointer flex-col gap-1 border-r border-b p-1.5 transition-colors",
          weekend &&
            "bg-[repeating-linear-gradient(135deg,rgba(148,163,184,0.08)_0px,rgba(148,163,184,0.08)_6px,transparent_6px,transparent_12px)] dark:bg-[repeating-linear-gradient(135deg,rgba(148,163,184,0.06)_0px,rgba(148,163,184,0.06)_6px,transparent_6px,transparent_12px)]",
          todayFlag && "bg-indigo-50/40 dark:bg-indigo-950/10",
          empId
            ? "hover:bg-muted/40"
            : "hover:bg-amber-50/60 dark:hover:bg-amber-950/10",
          isDragOver && "bg-primary/10 ring-primary/40 ring-1 ring-inset",
        )}
        onClick={() => {
          if (cellShifts.length === 0 && !timeOff) onCellClick(empId, dateStr);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = e.altKey ? "copy" : "move";
          setDragOverCell(cellKey);
        }}
        onDragLeave={() => setDragOverCell(null)}
        onDrop={(e) => onDrop(e, empId, dateStr)}
      >
        {timeOff ? (
          <TimeOffCell timeOff={timeOff} isCompact={isCompact} />
        ) : (
          cellShifts.map((shift) => (
            <ShiftPill
              key={shift.id}
              shift={shift}
              position={positionMap.get(shift.positionId)}
              isCompact={isCompact}
              isOpen={!shift.employeeId}
              isDragging={draggedShiftId === shift.id}
              onClick={() => onShiftClick(shift)}
              onContextMenu={(e) => onContextMenu(e, shift)}
              onDragStart={() => setDraggedShiftId(shift.id)}
            />
          ))
        )}
      </div>
    );
  };

  // Vertical "today" accent line — positioned overlay
  const todayLeftCalc =
    todayColIdx >= 0
      ? `calc(${empColWidth}px + (100% - ${empColWidth}px - ${hoursColWidth}px) * ${todayColIdx} / ${dates.length} + (100% - ${empColWidth}px - ${hoursColWidth}px) / ${dates.length} / 2)`
      : null;

  return (
    <div className="h-full overflow-x-hidden overflow-y-auto">
      <div className="relative grid" style={gridStyle}>
        {/* Vertical today accent line */}
        {todayLeftCalc && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-10"
            style={{ left: todayLeftCalc }}
          >
            <div className="absolute inset-y-0 -translate-x-1/2 border-l-2 border-dashed border-indigo-500/40" />
          </div>
        )}
        {/* ─── Header row ───────────────────────────────────── */}
        <div className="border-border/60 bg-background/95 sticky top-0 z-20 flex items-center border-r border-b px-4 py-3 backdrop-blur-sm">
          <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.08em] uppercase">
            Staff
          </span>
        </div>
        {dates.map((date, i) => {
          const todayFlag = isToday(date);
          const weekend = isWeekend(date);
          const dayIdx = date.getDay();
          const dayLabel = dayIdx === 0 ? "Sun" : dayNames[dayIdx - 1];
          const dateStr = formatDateStr(date);
          const holiday = isHoliday(dateStr, holidayRates);

          return (
            <div
              key={`header-${i}`}
              className={cn(
                "border-border/60 sticky top-0 z-20 flex flex-col items-center justify-center gap-0.5 border-r border-b py-2.5 backdrop-blur-sm",
                weekend
                  ? "bg-[repeating-linear-gradient(135deg,rgba(148,163,184,0.10)_0px,rgba(148,163,184,0.10)_6px,rgba(255,255,255,0.7)_6px,rgba(255,255,255,0.7)_12px)] dark:bg-[repeating-linear-gradient(135deg,rgba(148,163,184,0.10)_0px,rgba(148,163,184,0.10)_6px,rgba(15,23,42,0.7)_6px,rgba(15,23,42,0.7)_12px)]"
                  : "bg-background/95",
                todayFlag &&
                  "bg-gradient-to-b from-indigo-50/90 to-indigo-50/40 dark:from-indigo-950/40 dark:to-indigo-950/10",
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-semibold tracking-[0.08em] uppercase",
                  todayFlag
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-muted-foreground",
                )}
              >
                {dayLabel}
              </span>
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-transform",
                  todayFlag
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                    : "text-foreground",
                )}
              >
                {date.getDate()}
              </span>
              {holiday && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex cursor-default items-center gap-0.5 truncate">
                      <Star className="size-2.5 shrink-0 fill-amber-400 text-amber-500" />
                      <span className="max-w-[80px] truncate text-[9px] font-medium text-amber-600">
                        {holiday.name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <p className="font-medium">{holiday.name}</p>
                    <p className="text-muted-foreground">
                      ×{holiday.multiplier} pay rate
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        })}
        <div className="border-border/60 bg-background/95 sticky top-0 z-20 flex items-center justify-center border-b border-l px-2 backdrop-blur-sm">
          <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.08em] uppercase">
            Hours
          </span>
        </div>

        {/* ─── Employee rows ────────────────────────────────── */}
        {employees.map((employee) => {
          const totalHours = getEmployeeHours(employee.id);
          return (
            <Fragment key={employee.id}>
              <div className="border-border/50 bg-background hover:bg-muted/20 flex items-center gap-3 border-r border-b px-4 py-3 transition-colors">
                <Avatar className="ring-background size-9 shrink-0 ring-2">
                  <AvatarImage src={employee.avatar} alt={employee.name} />
                  <AvatarFallback className="bg-linear-to-br from-indigo-100 via-slate-100 to-slate-50 text-[11px] font-semibold text-slate-700 dark:from-indigo-900/30 dark:via-slate-900 dark:to-slate-950 dark:text-slate-200">
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
              {dates.map((date) => {
                const dateStr = formatDateStr(date);
                const cellShifts =
                  shiftsByKey.get(`${employee.id}-${dateStr}`) ?? [];
                const timeOff = getTimeOffForDate(
                  timeOffRequests,
                  employee.id,
                  dateStr,
                );
                return renderCell(employee.id, date, cellShifts, timeOff);
              })}
              <div className="border-border/50 bg-background hover:bg-muted/20 flex items-center justify-center border-b border-l px-2 transition-colors">
                <HoursBadge
                  totalHours={totalHours}
                  maxHours={employee.maxHoursPerWeek}
                  threshold={overtimeThreshold}
                />
              </div>
            </Fragment>
          );
        })}

        {/* ─── Open shifts row (anchored at the bottom) ───── */}
        {hasOpenShifts && (
          <Fragment>
            <div className="border-border/50 sticky bottom-[52px] z-20 flex items-center gap-3 border-t-2 border-r border-b border-dashed border-amber-300 bg-gradient-to-r from-amber-50 via-amber-50/70 to-amber-50/40 px-4 py-3 backdrop-blur-md dark:border-amber-700/40 dark:from-amber-950/40 dark:via-amber-950/20 dark:to-amber-950/10">
              <div className="flex size-10 items-center justify-center rounded-full border border-dashed border-amber-400 bg-white shadow-sm dark:bg-amber-950/30">
                <UserX className="size-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-amber-700 dark:text-amber-400">
                  Open Shifts
                </p>
                <p className="truncate text-[11px] text-amber-600/80 dark:text-amber-500/80">
                  Available to claim
                </p>
              </div>
            </div>
            {dates.map((date) => {
              const dateStr = formatDateStr(date);
              const cellShifts = shiftsByKey.get(`unassigned-${dateStr}`) ?? [];
              return (
                <div
                  key={`open-${dateStr}`}
                  className={cn(
                    "group/open-cell border-border/50 sticky bottom-[52px] z-20 flex min-h-[60px] cursor-pointer flex-col gap-1 border-t-2 border-r border-b border-dashed border-amber-300 bg-gradient-to-b from-amber-50/70 to-amber-50/30 p-1.5 backdrop-blur-md transition-colors hover:from-amber-100/80 hover:to-amber-100/40 dark:border-amber-700/40 dark:from-amber-950/30 dark:to-amber-950/10 dark:hover:from-amber-900/30",
                    isToday(date) &&
                      "from-indigo-50/70 to-amber-50/30 dark:from-indigo-950/30",
                  )}
                  onClick={() => {
                    if (cellShifts.length === 0)
                      onCellClick(undefined, dateStr);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = e.altKey ? "copy" : "move";
                    setDragOverCell(`unassigned-${dateStr}`);
                  }}
                  onDragLeave={() => setDragOverCell(null)}
                  onDrop={(e) => onDrop(e, undefined, dateStr)}
                >
                  {cellShifts.length === 0 ? (
                    <span className="text-muted-foreground/40 m-auto text-[10px] italic opacity-0 transition-opacity group-hover/open-cell:opacity-100">
                      + Post open shift
                    </span>
                  ) : (
                    cellShifts.map((shift) => (
                      <ShiftPill
                        key={shift.id}
                        shift={shift}
                        position={positionMap.get(shift.positionId)}
                        isCompact={isCompact}
                        isOpen
                        isDragging={draggedShiftId === shift.id}
                        onClick={() => onShiftClick(shift)}
                        onContextMenu={(e) => onContextMenu(e, shift)}
                        onDragStart={() => setDraggedShiftId(shift.id)}
                      />
                    ))
                  )}
                </div>
              );
            })}
            <div className="border-border/50 sticky bottom-[52px] z-20 flex items-center justify-center border-t-2 border-b border-l border-dashed border-amber-300 bg-amber-50/40 px-2 backdrop-blur-md dark:border-amber-700/40 dark:bg-amber-950/10">
              <span className="text-muted-foreground text-xs">—</span>
            </div>
          </Fragment>
        )}

        {/* ─── Daily totals row (anchored at the bottom) ───── */}
        <div className="border-border/60 sticky bottom-0 z-30 flex h-[52px] items-center gap-2 border-t-2 border-r bg-slate-50/95 px-4 backdrop-blur-md dark:bg-slate-900/80">
          <div className="bg-background flex size-7 items-center justify-center rounded-full border shadow-sm">
            <Sigma className="size-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold tracking-wide uppercase">
              Daily Total
            </p>
            <p className="text-muted-foreground truncate text-[10px]">
              All employees combined
            </p>
          </div>
        </div>
        {dates.map((date, i) => {
          const dateStr = formatDateStr(date);
          const dayHours = dailyTotals.get(dateStr) ?? 0;
          const todayFlag = isToday(date);
          const weekend = isWeekend(date);
          return (
            <div
              key={`total-${i}`}
              className={cn(
                "border-border/60 sticky bottom-0 z-30 flex h-[52px] items-center justify-center border-t-2 border-r bg-slate-50/95 backdrop-blur-md dark:bg-slate-900/80",
                weekend &&
                  "bg-[repeating-linear-gradient(135deg,rgba(148,163,184,0.10)_0px,rgba(148,163,184,0.10)_6px,rgba(248,250,252,0.95)_6px,rgba(248,250,252,0.95)_12px)] dark:bg-[repeating-linear-gradient(135deg,rgba(148,163,184,0.10)_0px,rgba(148,163,184,0.10)_6px,rgba(15,23,42,0.8)_6px,rgba(15,23,42,0.8)_12px)]",
                todayFlag &&
                  "bg-indigo-50/80 dark:bg-indigo-950/30",
              )}
            >
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  dayHours === 0
                    ? "text-muted-foreground/50"
                    : todayFlag
                      ? "text-indigo-700 dark:text-indigo-300"
                      : "text-foreground",
                )}
              >
                {dayHours === 0 ? "—" : `${dayHours.toFixed(1)}h`}
              </span>
            </div>
          );
        })}
        <div className="border-border/60 sticky right-0 bottom-0 z-30 flex h-[52px] items-center justify-center border-t-2 border-b border-l bg-indigo-50/80 px-2 backdrop-blur-md dark:bg-indigo-950/30">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm tabular-nums dark:bg-indigo-500">
                {grandTotalHours.toFixed(1)}h
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              Total employee hours this period
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
