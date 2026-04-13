"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ScheduleShift, Position, EnhancedTimeOffRequest } from "@/types/scheduling";

// ─── ShiftPill ───────────────────────────────────────────────────────────────

export interface ShiftPillProps {
  shift: ScheduleShift;
  position: Position | undefined;
  isCompact: boolean;
  isOpen?: boolean;
  isDragging?: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
}

export function ShiftPill({
  shift,
  position,
  isCompact,
  isOpen = false,
  isDragging = false,
  onClick,
  onContextMenu,
  onDragStart,
}: ShiftPillProps) {
  const isDraft = shift.status === "draft";
  const color = position?.color || "#6366f1";

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("shiftId", shift.id);
    e.dataTransfer.effectAllowed = "copyMove";
    onDragStart(e);
  };

  if (isCompact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "mx-auto size-3 rounded-full transition-transform hover:scale-125 cursor-grab active:cursor-grabbing",
              isDraft && "ring-2 ring-dashed ring-offset-1",
              isDragging && "opacity-50",
            )}
            style={{ backgroundColor: color }}
            draggable
            onDragStart={handleDragStart}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            onContextMenu={(e) => {
              e.stopPropagation();
              onContextMenu(e);
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
            "group/pill flex items-center gap-1.5 rounded-md border px-2 py-1.5 transition-all hover:shadow-md cursor-grab active:cursor-grabbing",
            isDraft && "border-dashed opacity-75",
            isDragging && "opacity-40 scale-95",
          )}
          style={{
            backgroundColor: `${color}12`,
            borderColor: `${color}40`,
          }}
          draggable
          onDragStart={handleDragStart}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onContextMenu={(e) => {
            e.stopPropagation();
            onContextMenu(e);
          }}
        >
          <div
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium" style={{ color }}>
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
          {isOpen && (
            <div className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              Open
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
        <p className="text-muted-foreground text-[10px] mt-1">
          Right-click for options · Alt+drop to copy
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── TimeOffCell ─────────────────────────────────────────────────────────────

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

export function TimeOffCell({
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
        <Badge variant="outline" className="text-[9px] px-1 py-0">
          Pending
        </Badge>
      )}
    </div>
  );
}
