"use client";

import { Clock, Heart, Palmtree, UserX } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  ScheduleShift,
  Position,
  EnhancedTimeOffRequest,
} from "@/types/scheduling";

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
  const color = position?.color ?? "#6366f1";

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
              "mx-auto h-2.5 w-full max-w-[28px] cursor-grab rounded-full transition-all hover:scale-110 active:cursor-grabbing",
              isDraft && "outline-1 outline-offset-1 outline-dashed",
              isDragging && "opacity-50",
              isOpen && "border border-dashed border-amber-500",
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
          <p className="font-medium">{position?.name ?? "Unknown"}</p>
          <p className="text-muted-foreground">
            {shift.startTime} – {shift.endTime}
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
            "group/pill flex cursor-grab items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-all hover:-translate-y-px hover:shadow-md active:cursor-grabbing",
            isDraft && "border-dashed",
            isDragging && "scale-95 opacity-40",
          )}
          style={{
            background: `linear-gradient(135deg, ${color}1a 0%, ${color}10 100%)`,
            borderColor: `${color}55`,
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
            className="size-2 shrink-0 rounded-full shadow-sm"
            style={{ backgroundColor: color }}
          />
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[11px] leading-tight font-semibold"
              style={{ color }}
            >
              {position?.name ?? "—"}
            </p>
            <p className="text-muted-foreground mt-0.5 flex items-center gap-1 truncate text-[10px]">
              <Clock className="size-2.5" />
              {shift.startTime} – {shift.endTime}
            </p>
          </div>
          {isDraft && (
            <div className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase">
              Draft
            </div>
          )}
          {isOpen && (
            <div className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-amber-700 uppercase dark:bg-amber-900/40 dark:text-amber-400">
              Open
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p className="font-medium">{position?.name}</p>
        <p>
          {shift.startTime} – {shift.endTime}
        </p>
        {shift.notes && (
          <p className="text-muted-foreground mt-1">{shift.notes}</p>
        )}
        <p className="text-muted-foreground mt-1 text-[10px]">
          Right-click for options · Alt+drop to copy
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── TimeOffCell ─────────────────────────────────────────────────────────────

const timeOffStyles: Record<
  string,
  { gradient: string; text: string; border: string; icon: React.ElementType }
> = {
  vacation: {
    gradient:
      "bg-gradient-to-r from-emerald-400 to-emerald-500 dark:from-emerald-600 dark:to-emerald-700",
    text: "text-white",
    border: "border-emerald-500/30",
    icon: Palmtree,
  },
  sick_leave: {
    gradient:
      "bg-gradient-to-r from-sky-100 to-blue-100 dark:from-sky-950/40 dark:to-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    icon: Heart,
  },
  personal: {
    gradient:
      "bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    icon: UserX,
  },
  bereavement: {
    gradient:
      "bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
    icon: UserX,
  },
  parental: {
    gradient:
      "bg-gradient-to-r from-purple-400 to-violet-500 dark:from-purple-600 dark:to-violet-700",
    text: "text-white",
    border: "border-purple-500/30",
    icon: UserX,
  },
  unpaid: {
    gradient:
      "bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-950/40 dark:to-pink-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
    icon: UserX,
  },
  other: {
    gradient:
      "bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-900 dark:to-slate-900",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200 dark:border-gray-800",
    icon: UserX,
  },
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
  const style = timeOffStyles[timeOff.type] ?? timeOffStyles.other;
  const label = timeOffLabels[timeOff.type] ?? timeOff.type;
  const isPending = timeOff.status === "pending";
  const Icon = style.icon;

  if (isCompact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "mx-auto h-2.5 w-full max-w-[28px] rounded-full border",
              style.gradient,
              style.border,
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
        "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 shadow-sm",
        style.gradient,
        style.border,
        isPending && "border-dashed",
      )}
    >
      <Icon className={cn("size-3 shrink-0", style.text)} />
      <span className={cn("truncate text-[11px] font-semibold", style.text)}>
        {label}
      </span>
      {isPending && (
        <span
          className={cn(
            "ml-auto rounded-full bg-white/30 px-1.5 py-0 text-[9px] font-medium",
            style.text,
          )}
        >
          Pending
        </span>
      )}
    </div>
  );
}
