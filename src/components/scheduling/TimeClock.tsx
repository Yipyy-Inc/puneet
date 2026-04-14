"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatElapsed } from "@/lib/scheduling-utils";
import type {
  ScheduleShift,
  ScheduleEmployee,
  Position,
  TimeClockEntry,
  Department,
} from "@/types/scheduling";

interface TimeClockProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shifts: ScheduleShift[];
  employees: ScheduleEmployee[];
  positions: Position[];
  entries: TimeClockEntry[];
  onClockIn: (shiftId: string, employeeId: string) => void;
  onClockOut: (entryId: string) => void;
  department: Department;
}

function useTimer(clockedInAt: string | undefined): string {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!clockedInAt) {
      setElapsed(0);
      return;
    }
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(clockedInAt).getTime()) / 1000);
      setElapsed(Math.max(0, diff));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [clockedInAt]);

  return formatElapsed(elapsed);
}

function ShiftRow({
  shift,
  employee,
  position,
  entry,
  onClockIn,
  onClockOut,
}: {
  shift: ScheduleShift;
  employee: ScheduleEmployee | undefined;
  position: Position | undefined;
  entry: TimeClockEntry | undefined;
  onClockIn: () => void;
  onClockOut: () => void;
}) {
  const timer = useTimer(
    entry?.status === "clocked_in" ? entry.clockedInAt : undefined,
  );

  if (!employee) return null;

  const isClockedIn = entry?.status === "clocked_in";
  const isClockedOut = entry?.status === "clocked_out";

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Avatar className="size-9 shrink-0">
        <AvatarImage src={employee.avatar} alt={employee.name} />
        <AvatarFallback className="text-xs">{employee.initials}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{employee.name}</p>
          {isClockedIn && (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 text-[10px]">
              Live · {timer}
            </Badge>
          )}
          {isClockedOut && (
            <Badge variant="secondary" className="text-[10px]">
              Done
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          {position?.name ?? "—"} · {shift.startTime} – {shift.endTime}
        </p>
        {isClockedOut && entry?.actualMinutes !== undefined && (
          <p className="text-muted-foreground text-xs">
            Worked: {Math.floor(entry.actualMinutes / 60)}h {entry.actualMinutes % 60}m
          </p>
        )}
      </div>

      <div className="shrink-0">
        {!entry && (
          <Button size="sm" variant="outline" onClick={onClockIn} className="gap-1.5">
            <LogIn className="size-3.5" />
            Clock In
          </Button>
        )}
        {isClockedIn && (
          <Button
            size="sm"
            variant="outline"
            onClick={onClockOut}
            className="gap-1.5 border-orange-300 text-orange-600 hover:bg-orange-50"
          >
            <LogOut className="size-3.5" />
            Clock Out
          </Button>
        )}
        {isClockedOut && (
          <span className="text-muted-foreground text-xs">Clocked out</span>
        )}
      </div>
    </div>
  );
}

export function TimeClock({
  open,
  onOpenChange,
  shifts,
  employees,
  positions,
  entries,
  onClockIn,
  onClockOut,
  department,
}: TimeClockProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  const todayShifts = shifts.filter(
    (s) =>
      s.date === todayStr &&
      s.employeeId &&
      (s.status === "published" || s.status === "confirmed"),
  );

  const employeeMap = new Map(employees.map((e) => [e.id, e]));
  const positionMap = new Map(positions.map((p) => [p.id, p]));

  const getEntry = (shiftId: string) =>
    entries.find((e) => e.shiftId === shiftId);

  const activeCount = entries.filter((e) => e.status === "clocked_in").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/20 backdrop-blur-[2px]" />
        <DialogContent className="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2">
              <Clock className="size-4" />
              Time Clock
              <span className="text-muted-foreground text-sm font-normal ml-1">
                — {department.name}
              </span>
            </DialogTitle>
            <p className="text-muted-foreground text-sm">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
              {activeCount > 0 && (
                <span
                  className={cn(
                    "ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
                  )}
                >
                  <span className="size-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  {activeCount} clocked in
                </span>
              )}
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            {todayShifts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">
                  No published shifts today
                </p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Publish shifts to enable time clock
                </p>
              </div>
            ) : (
              todayShifts.map((shift) => (
                <ShiftRow
                  key={shift.id}
                  shift={shift}
                  employee={employeeMap.get(shift.employeeId!)}
                  position={positionMap.get(shift.positionId)}
                  entry={getEntry(shift.id)}
                  onClockIn={() => onClockIn(shift.id, shift.employeeId!)}
                  onClockOut={() => {
                    const entry = getEntry(shift.id);
                    if (entry) onClockOut(entry.id);
                  }}
                />
              ))
            )}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
