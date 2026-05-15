"use client";

import { Car, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SlotEntry } from "@/lib/grooming-scheduling";

interface SlotGridProps {
  slots: SlotEntry[];
  /** Currently chosen start time (HH:MM). Empty string = nothing chosen. */
  selectedStartTime: string;
  onSelect: (startTime: string) => void;
  /** Drives the dimmed-vs-bright styling for non-recommended slots. */
  smartSchedulingEnabled: boolean;
  /** When true, drive-time annotations are shown next to each slot. */
  showDriveTime?: boolean;
  /** Caption shown when the slot list is empty. */
  emptyLabel?: string;
}

function formatTime(hhmm: string): string {
  // Render in 12-hour clock for staff-facing UI.
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function SlotGrid({
  slots,
  selectedStartTime,
  onSelect,
  smartSchedulingEnabled,
  showDriveTime = false,
  emptyLabel = "No slots available for this date.",
}: SlotGridProps) {
  if (slots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center text-xs text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {slots.map((slot) => {
          const isSelected = slot.startTime === selectedStartTime;
          const isConflict = slot.status === "conflict";
          // With Smart Scheduling on, only recommended slots get the
          // emphasis; available-but-not-recommended slots are dimmed.
          // With it off, every available slot is treated equally.
          const isDimmed =
            smartSchedulingEnabled && !isConflict && !slot.recommended;

          return (
            <button
              key={slot.startTime}
              type="button"
              disabled={isConflict}
              onClick={() => !isConflict && onSelect(slot.startTime)}
              data-selected={isSelected ? "true" : "false"}
              className={cn(
                "group relative rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
                isConflict &&
                  "cursor-not-allowed border-muted bg-muted/30 text-muted-foreground line-through",
                !isConflict &&
                  !isDimmed &&
                  !isSelected &&
                  "border-pink-200 bg-pink-50/60 hover:bg-pink-100 dark:border-pink-900 dark:bg-pink-950/20 dark:hover:bg-pink-950/40",
                !isConflict &&
                  isDimmed &&
                  !isSelected &&
                  "border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground hover:bg-muted/40",
                isSelected &&
                  "border-pink-400 bg-pink-100 text-pink-900 ring-2 ring-pink-300 dark:border-pink-700 dark:bg-pink-950/40 dark:text-pink-100 dark:ring-pink-700",
              )}
              title={
                isConflict
                  ? "Conflicts with an existing appointment"
                  : isDimmed
                    ? "Outside the recommended buffer — still pickable"
                    : "Recommended slot"
              }
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-semibold tabular-nums">
                  {formatTime(slot.startTime)}
                </span>
                {!isConflict && slot.recommended && smartSchedulingEnabled && (
                  <Sparkles className="size-3 text-pink-500" />
                )}
              </div>
              {showDriveTime &&
                !isConflict &&
                slot.driveMinFromPrev !== undefined && (
                  <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Car className="size-2.5" />
                    <span>~{slot.driveMinFromPrev} min drive</span>
                  </div>
                )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        {smartSchedulingEnabled && (
          <span className="inline-flex items-center gap-1">
            <Sparkles className="size-3 text-pink-500" />
            Recommended (Smart Scheduling on)
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-2 rounded-sm border border-muted bg-muted/30" />
          Conflict (occupied)
        </span>
        {smartSchedulingEnabled && (
          <span className="inline-flex items-center gap-1">
            <span className="inline-block size-2 rounded-sm border border-dashed border-muted-foreground/40" />
            Outside buffer
          </span>
        )}
      </div>
    </div>
  );
}
