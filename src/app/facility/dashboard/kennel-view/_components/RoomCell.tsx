"use client";

import { Plus } from "lucide-react";
import { Ban, Lock } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";

interface RoomCellProps {
  date: string;
  dateLabel: string;
  roomName: string;
  isToday?: boolean;
  isPastWeek?: boolean;
  isMaintenance?: boolean;
  isBlocked?: boolean;
  blockedReason?: string;
  onAddBooking?: () => void;
  onBlockRoom?: () => void;
  onUnblockRoom?: () => void;
}

export function RoomCell({
  dateLabel,
  roomName,
  isToday,
  isPastWeek,
  isMaintenance,
  isBlocked,
  blockedReason,
  onAddBooking,
  onBlockRoom,
  onUnblockRoom,
}: RoomCellProps) {
  const disabled = isMaintenance || isBlocked || isPastWeek;

  const cellClasses = cn(
    "group relative min-h-[64px] min-w-[64px] flex-1 border-r last:border-r-0",
    isToday && "bg-primary/5",
    isMaintenance && "cursor-not-allowed bg-red-50/60 dark:bg-red-950/30",
    isBlocked &&
      "cursor-not-allowed bg-[repeating-linear-gradient(45deg,rgba(239,68,68,0.08)_0,rgba(239,68,68,0.08)_6px,transparent_6px,transparent_12px)]",
    !disabled && "hover:bg-muted/40 cursor-pointer",
  );

  const trigger = (
    <div
      className={cellClasses}
      data-cell="room"
      onClick={() => !disabled && onAddBooking?.()}
    >
      {!disabled && (
        <div className="flex h-full items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <div className="bg-background text-muted-foreground flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] shadow-sm">
            <Plus className="size-3" />
            Add
          </div>
        </div>
      )}
      {isBlocked && (
        <div className="flex h-full items-center justify-center">
          <Lock
            className="size-3.5 text-red-500/70"
            aria-label={blockedReason ?? "Blocked"}
          />
        </div>
      )}
    </div>
  );

  if (isPastWeek || isMaintenance) {
    return trigger;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{trigger}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>
          {roomName} — {dateLabel}
        </ContextMenuLabel>
        <ContextMenuSeparator />
        {!isBlocked && (
          <ContextMenuItem onSelect={() => onAddBooking?.()}>
            <Plus className="size-4" />
            New booking here
          </ContextMenuItem>
        )}
        {!isBlocked ? (
          <ContextMenuItem onSelect={() => onBlockRoom?.()} variant="destructive">
            <Ban className="size-4" />
            Block room…
          </ContextMenuItem>
        ) : (
          <ContextMenuItem onSelect={() => onUnblockRoom?.()}>
            <Lock className="size-4" />
            Remove block
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
