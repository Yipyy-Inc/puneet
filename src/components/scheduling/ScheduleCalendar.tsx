"use client";

import { useCallback, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScheduleGridView } from "./ScheduleGridView";
import { ScheduleMonthView } from "./ScheduleMonthView";
import { ScheduleDayView } from "./ScheduleDayView";
import { AssignShiftDialog } from "./AssignShiftDialog";
import {
  ShiftContextMenu,
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
  onMoveShift: (
    shiftId: string,
    newEmployeeId: string | undefined,
    newDate: string,
  ) => void;
  onCopyShift: (
    shiftId: string,
    newEmployeeId: string | undefined,
    newDate: string,
  ) => void;
  onDeleteShift: (shiftId: string) => void;
  onAssignShift: (shiftId: string, employeeId: string | undefined) => void;
  getEmployeeHours: (employeeId: string) => number;
}

export function ScheduleCalendar(props: ScheduleCalendarProps) {
  const [draggedShiftId, setDraggedShiftId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningShift, setAssigningShift] = useState<ScheduleShift | null>(
    null,
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, shift: ScheduleShift) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, shift });
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, employeeId: string | undefined, dateStr: string) => {
      e.preventDefault();
      const shiftId = e.dataTransfer.getData("shiftId");
      if (!shiftId) return;
      setDraggedShiftId(null);
      setDragOverCell(null);
      if (e.altKey) {
        props.onCopyShift(shiftId, employeeId, dateStr);
      } else {
        props.onMoveShift(shiftId, employeeId, dateStr);
      }
    },
    [props],
  );

  return (
    <TooltipProvider delayDuration={200}>
      {props.viewMode === "day" ? (
        <ScheduleDayView
          currentDate={props.currentDate}
          employees={props.employees}
          shifts={props.shifts}
          positions={props.positions}
          timeOffRequests={props.timeOffRequests}
          holidayRates={props.holidayRates}
          onShiftClick={props.onShiftClick}
          onCellClick={props.onCellClick}
        />
      ) : props.viewMode === "month" ? (
        <ScheduleMonthView
          currentDate={props.currentDate}
          employees={props.employees}
          shifts={props.shifts}
          positions={props.positions}
          timeOffRequests={props.timeOffRequests}
          holidayRates={props.holidayRates}
          onShiftClick={props.onShiftClick}
          onCellClick={props.onCellClick}
        />
      ) : (
        <ScheduleGridView
          viewMode={props.viewMode}
          currentDate={props.currentDate}
          employees={props.employees}
          shifts={props.shifts}
          positions={props.positions}
          timeOffRequests={props.timeOffRequests}
          holidayRates={props.holidayRates}
          overtimeThreshold={props.overtimeThreshold}
          draggedShiftId={draggedShiftId}
          dragOverCell={dragOverCell}
          setDraggedShiftId={setDraggedShiftId}
          setDragOverCell={setDragOverCell}
          onShiftClick={props.onShiftClick}
          onCellClick={props.onCellClick}
          onContextMenu={handleContextMenu}
          onDrop={handleDrop}
          getEmployeeHours={props.getEmployeeHours}
        />
      )}

      {contextMenu && (
        <ShiftContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onEdit={() => props.onShiftClick(contextMenu.shift)}
          onAssign={() => {
            setAssigningShift(contextMenu.shift);
            setAssignDialogOpen(true);
          }}
          onMakeOpen={() =>
            props.onAssignShift(contextMenu.shift.id, undefined)
          }
          onCopy={() =>
            props.onCopyShift(
              contextMenu.shift.id,
              contextMenu.shift.employeeId,
              contextMenu.shift.date,
            )
          }
          onDelete={() => props.onDeleteShift(contextMenu.shift.id)}
        />
      )}

      <AssignShiftDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        shift={assigningShift}
        employees={props.employees}
        positions={props.positions}
        onAssign={props.onAssignShift}
      />
    </TooltipProvider>
  );
}
