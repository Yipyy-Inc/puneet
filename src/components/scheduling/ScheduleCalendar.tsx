"use client";

import { useMemo, useState, useCallback } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { UserX, Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isHoliday } from "@/lib/scheduling-utils";
import { ShiftPill, TimeOffCell } from "./ScheduleCalendarPills";
import { AssignShiftDialog } from "./AssignShiftDialog";
import {
  getDatesForView,
  formatDateStr,
  dayNames,
  isToday,
  isWeekend,
  getTimeOffForDate,
  ShiftContextMenu,
  HoursBadge,
  type ContextMenuState,
} from "./ScheduleCalendarHelpers";
import type {
  ScheduleShift,
  ScheduleEmployee,
  Position,
  EnhancedTimeOffRequest,
  HolidayRate,
} from "@/types/scheduling";
import type { ViewMode } from "./ScheduleHeader";

interface ScheduleCalendarProps {
  viewMode: ViewMode;
  currentDate: Date;
  employees: ScheduleEmployee[];
  shifts: ScheduleShift[];
  positions: Position[];
  timeOffRequests: EnhancedTimeOffRequest[];
  holidayRates: HolidayRate[];
  overtimeThreshold: number;
  onShiftClick: (shift: ScheduleShift) => void;
  onCellClick: (employeeId: string | undefined, date: string) => void;
  onMoveShift: (shiftId: string, newEmployeeId: string | undefined, newDate: string) => void;
  onCopyShift: (shiftId: string, newEmployeeId: string | undefined, newDate: string) => void;
  onDeleteShift: (shiftId: string) => void;
  onAssignShift: (shiftId: string, employeeId: string | undefined) => void;
  getEmployeeHours: (employeeId: string) => number;
}

export function ScheduleCalendar({
  viewMode,
  currentDate,
  employees,
  shifts,
  positions,
  timeOffRequests,
  holidayRates,
  overtimeThreshold,
  onShiftClick,
  onCellClick,
  onMoveShift,
  onCopyShift,
  onDeleteShift,
  onAssignShift,
  getEmployeeHours,
}: ScheduleCalendarProps) {
  const dates = useMemo(() => getDatesForView(currentDate, viewMode), [currentDate, viewMode]);

  const positionMap = useMemo(() => {
    const map = new Map<string, Position>();
    positions.forEach((p) => map.set(p.id, p));
    return map;
  }, [positions]);

  const shiftsByKey = useMemo(() => {
    const map = new Map<string, ScheduleShift[]>();
    shifts.forEach((s) => {
      const key = `${s.employeeId ?? "unassigned"}-${s.date}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [shifts]);

  const hasOpenShifts = useMemo(() => shifts.some((s) => !s.employeeId), [shifts]);
  const isMonthView = viewMode === "month";
  const columnWidth = isMonthView ? "min-w-[40px]" : "min-w-[120px]";

  const [draggedShiftId, setDraggedShiftId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningShift, setAssigningShift] = useState<ScheduleShift | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, shift: ScheduleShift) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, shift });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, employeeId: string | undefined, dateStr: string) => {
      e.preventDefault();
      const shiftId = e.dataTransfer.getData("shiftId");
      if (!shiftId) return;
      setDraggedShiftId(null);
      setDragOverCell(null);
      if (e.altKey) {
        onCopyShift(shiftId, employeeId, dateStr);
      } else {
        onMoveShift(shiftId, employeeId, dateStr);
      }
    },
    [onMoveShift, onCopyShift],
  );

  const makeCellKey = (empId: string | undefined, dateStr: string) =>
    `${empId ?? "unassigned"}-${dateStr}`;

  const renderCell = (
    empId: string | undefined,
    date: Date,
    cellShifts: ScheduleShift[],
    timeOff?: EnhancedTimeOffRequest,
  ) => {
    const dateStr = formatDateStr(date);
    const cellKey = makeCellKey(empId, dateStr);
    const isDragOver = dragOverCell === cellKey;
    const weekend = isWeekend(date);
    const todayFlag = isToday(date);

    return (
      <div
        className={cn(
          "flex flex-1 cursor-pointer flex-col gap-1 border-r p-1 transition-colors",
          columnWidth,
          weekend && "bg-muted/10",
          todayFlag && "bg-primary/[0.02]",
          empId ? "hover:bg-muted/30" : "hover:bg-amber-100/40 dark:hover:bg-amber-900/10",
          isDragOver && "bg-primary/10 ring-1 ring-inset ring-primary/40",
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
        onDrop={(e) => handleDrop(e, empId, dateStr)}
      >
        {timeOff ? (
          <TimeOffCell timeOff={timeOff} isCompact={isMonthView} />
        ) : (
          cellShifts.map((shift) => (
            <ShiftPill
              key={shift.id}
              shift={shift}
              position={positionMap.get(shift.positionId)}
              isCompact={isMonthView}
              isOpen={!shift.employeeId}
              isDragging={draggedShiftId === shift.id}
              onClick={() => onShiftClick(shift)}
              onContextMenu={(e) => handleContextMenu(e, shift)}
              onDragStart={() => setDraggedShiftId(shift.id)}
            />
          ))
        )}
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col overflow-hidden">
        <div className="overflow-x-auto">
          <div className={cn("min-w-full", isMonthView && "min-w-[900px]")}>
            {/* Day Headers */}
            <div className="bg-muted/30 border-b">
              <div className="flex">
                <div className="bg-background/80 sticky left-0 z-20 flex w-[220px] min-w-[220px] items-center border-r px-4 py-2.5 backdrop-blur-sm">
                  <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                    Employees
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
                          todayFlag ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {dayLabel}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-semibold",
                          todayFlag ? "bg-primary text-primary-foreground" : "text-foreground",
                        )}
                      >
                        {date.getDate()}
                      </span>
                      {holiday && !isMonthView && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-0.5 mt-0.5 cursor-default">
                              <Star className="size-2.5 text-amber-500 fill-amber-400" />
                              <span className="text-[9px] text-amber-600 font-medium truncate max-w-[80px]">
                                {holiday.name}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            <p className="font-medium">{holiday.name}</p>
                            <p className="text-muted-foreground">×{holiday.multiplier} pay rate</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {holiday && isMonthView && (
                        <Star className="size-2 text-amber-400 fill-amber-300 mt-0.5" />
                      )}
                    </div>
                  );
                })}

                <div className="bg-background/80 sticky right-0 z-20 flex w-[80px] min-w-[80px] items-center justify-center border-l px-2 py-2.5 backdrop-blur-sm">
                  <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                    Hours
                  </span>
                </div>
              </div>
            </div>

            {/* Employee Rows */}
            <div className="divide-y">
              {hasOpenShifts && (
                <div className="group flex bg-amber-50/40 transition-colors hover:bg-amber-50/70 dark:bg-amber-950/10 dark:hover:bg-amber-950/20">
                  <div className="bg-background/80 sticky left-0 z-10 flex w-[220px] min-w-[220px] items-center gap-3 border-r px-4 py-3 backdrop-blur-sm">
                    <div className="flex size-8 items-center justify-center rounded-full border border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/30">
                      <UserX className="size-4 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-amber-700 dark:text-amber-400">Open Shifts</p>
                      <p className="text-[11px] text-amber-600/70 dark:text-amber-500/70">Unassigned</p>
                    </div>
                  </div>
                  {dates.map((date, i) => {
                    const dateStr = formatDateStr(date);
                    const cellShifts = shiftsByKey.get(`unassigned-${dateStr}`) ?? [];
                    return <div key={i} className="flex flex-1">{renderCell(undefined, date, cellShifts)}</div>;
                  })}
                  <div className="bg-background/80 sticky right-0 z-10 flex w-[80px] min-w-[80px] items-center justify-center border-l px-2 backdrop-blur-sm">
                    <span className="text-muted-foreground text-xs">—</span>
                  </div>
                </div>
              )}

              {employees.map((employee) => {
                const totalHours = getEmployeeHours(employee.id);
                return (
                  <div key={employee.id} className="group flex transition-colors hover:bg-muted/20">
                    <div className="bg-background/80 sticky left-0 z-10 flex w-[220px] min-w-[220px] items-center gap-3 border-r px-4 py-3 backdrop-blur-sm">
                      <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                        {employee.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{employee.name}</p>
                        <p className="text-muted-foreground truncate text-[11px]">{employee.role}</p>
                      </div>
                    </div>
                    {dates.map((date, i) => {
                      const dateStr = formatDateStr(date);
                      const cellShifts = shiftsByKey.get(`${employee.id}-${dateStr}`) || [];
                      const timeOff = getTimeOffForDate(timeOffRequests, employee.id, dateStr);
                      return <div key={i} className="flex flex-1">{renderCell(employee.id, date, cellShifts, timeOff)}</div>;
                    })}
                    <div className="bg-background/80 sticky right-0 z-10 flex w-[80px] min-w-[80px] items-center justify-center border-l px-2 backdrop-blur-sm">
                      <HoursBadge
                        totalHours={totalHours}
                        maxHours={employee.maxHoursPerWeek}
                        threshold={overtimeThreshold}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {contextMenu && (
        <ShiftContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onEdit={() => onShiftClick(contextMenu.shift)}
          onAssign={() => {
            setAssigningShift(contextMenu.shift);
            setAssignDialogOpen(true);
          }}
          onMakeOpen={() => onAssignShift(contextMenu.shift.id, undefined)}
          onCopy={() => onCopyShift(contextMenu.shift.id, contextMenu.shift.employeeId, contextMenu.shift.date)}
          onDelete={() => onDeleteShift(contextMenu.shift.id)}
        />
      )}

      <AssignShiftDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        shift={assigningShift}
        employees={employees}
        positions={positions}
        onAssign={onAssignShift}
      />
    </TooltipProvider>
  );
}
