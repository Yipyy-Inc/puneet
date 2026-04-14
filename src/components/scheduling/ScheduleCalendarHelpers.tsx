"use client";

import { useEffect, useRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { computeOvertimeHours } from "@/lib/scheduling-utils";
import type { ScheduleShift, EnhancedTimeOffRequest } from "@/types/scheduling";
import type { ViewMode } from "./ScheduleHeader";

// ─── Date Utilities ───────────────────────────────────────────────────────────

export function getDatesForView(currentDate: Date, viewMode: ViewMode): Date[] {
  const dates: Date[] = [];
  const start = new Date(currentDate);
  const dayOfWeek = start.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(start.getDate() + mondayOffset);

  const totalDays = viewMode === "month" ? 35 : viewMode === "2weeks" ? 14 : 7;

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

export function formatDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

export const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function getTimeOffForDate(
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

// ─── Context Menu ─────────────────────────────────────────────────────────────

export interface ContextMenuState {
  x: number;
  y: number;
  shift: ScheduleShift;
}

interface ShiftContextMenuProps {
  menu: ContextMenuState;
  onClose: () => void;
  onEdit: () => void;
  onAssign: () => void;
  onMakeOpen: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

export function ShiftContextMenu({
  menu,
  onClose,
  onEdit,
  onAssign,
  onMakeOpen,
  onCopy,
  onDelete,
}: ShiftContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const isAssigned = !!menu.shift.employeeId;

  const item = (label: string, onClick: () => void, danger = false) => (
    <button
      key={label}
      className={cn(
        "hover:bg-muted/60 w-full px-3 py-1.5 text-left text-sm transition-colors",
        danger && "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20",
      )}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
        onClose();
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      ref={ref}
      className="bg-popover fixed z-50 min-w-[180px] overflow-hidden rounded-md border shadow-lg"
      style={{ left: menu.x, top: menu.y }}
    >
      {item("Edit Shift", onEdit)}
      {isAssigned
        ? item("Reassign to…", onAssign)
        : item("Assign Employee", onAssign)}
      {isAssigned && item("Make Open Shift", onMakeOpen)}
      <div className="bg-border my-0.5 h-px" />
      {item("Copy Shift", onCopy)}
      <div className="bg-border my-0.5 h-px" />
      {item("Delete Shift", onDelete, true)}
    </div>
  );
}

// ─── Hours Badge ─────────────────────────────────────────────────────────────

export function HoursBadge({
  totalHours,
  maxHours,
  threshold,
}: {
  totalHours: number;
  maxHours: number;
  threshold: number;
}) {
  const isOverMax = totalHours > maxHours;
  const { overtime } = computeOvertimeHours(totalHours, threshold);
  const hasOT = overtime > 0;
  const regular = totalHours - overtime;

  const badge = (
    <span
      className={cn(
        "cursor-default rounded-full px-2 py-0.5 text-xs font-semibold",
        isOverMax
          ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
          : hasOT
            ? "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400"
            : "text-muted-foreground",
      )}
    >
      {totalHours.toFixed(1)}h
    </span>
  );

  if (!hasOT) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        <p className="font-medium">Hours Breakdown</p>
        <p>Regular: {regular.toFixed(1)}h</p>
        <p className="text-orange-600">OT: {overtime.toFixed(1)}h</p>
      </TooltipContent>
    </Tooltip>
  );
}
