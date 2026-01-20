"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export interface TimeRangeSliderProps {
  minTime?: string; // HH:mm format, default "06:00"
  maxTime?: string; // HH:mm format, default "22:00"
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  onTimeChange: (start: string, end: string) => void;
  onApply?: () => void;
  onApplyToAll?: () => void;
  step?: number; // in minutes, default 30
  className?: string;
}

export function TimeRangeSlider({
  minTime = "06:00",
  maxTime = "22:00",
  startTime,
  endTime,
  onTimeChange,
  onApply,
  onApplyToAll,
  step = 30,
  className,
}: TimeRangeSliderProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isValidTime = (time: string) => /^\d{2}:\d{2}$/.test(time);

  // Convert time string to minutes since midnight
  const timeToMinutes = (time: string): number => {
    if (!isValidTime(time)) return 0;
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Convert minutes to time string
  const minutesToTime = (minutes: number): string => {
    const safe = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
    const hours = Math.floor(safe / 60);
    const mins = safe % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  // Snap/clamp helpers
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
  const snap = (minutes: number) => Math.round(minutes / step) * step;

  const minMinutes = timeToMinutes(minTime);
  const maxMinutes = timeToMinutes(maxTime);
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  // Calculate duration
  const durationMinutes = endMinutes - startMinutes;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const durationText = minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;

  // Determine if it's half-day or full-day
  const daycareType = durationMinutes / 60 <= 5 ? "Half Day" : "Full Day";

  const enforceAndEmit = (nextStartMinutes: number, nextEndMinutes: number) => {
    // Keep within bounds and enforce at least `step` gap
    const minEnd = minMinutes + step;
    const maxStart = maxMinutes - step;

    let s = snap(clamp(nextStartMinutes, minMinutes, maxStart));
    let e = snap(clamp(nextEndMinutes, minEnd, maxMinutes));

    if (e - s < step) {
      // Prefer moving the end forward; if impossible, move start backward.
      const candidateEnd = s + step;
      if (candidateEnd <= maxMinutes) {
        e = candidateEnd;
      } else {
        s = Math.max(minMinutes, e - step);
      }
    }

    onTimeChange(minutesToTime(s), minutesToTime(e));
  };

  if (!isExpanded) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("w-full justify-between font-normal", className)}
        onClick={() => setIsExpanded(true)}
      >
        <span className="text-muted-foreground">
          {startTime} - {endTime}
        </span>
        <Badge variant="secondary">{daycareType}</Badge>
      </Button>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">{durationText}</div>
        <Badge variant="secondary">{daycareType}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Check-in</Label>
          <Input
            type="time"
            value={startTime}
            min={minTime}
            max={minutesToTime(endMinutes - step)}
            step={step * 60}
            className="h-9"
            onChange={(e) => {
              const v = e.target.value;
              if (!isValidTime(v)) return;
              enforceAndEmit(timeToMinutes(v), endMinutes);
            }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Check-out</Label>
          <Input
            type="time"
            value={endTime}
            min={minutesToTime(startMinutes + step)}
            max={maxTime}
            step={step * 60}
            className="h-9"
            onChange={(e) => {
              const v = e.target.value;
              if (!isValidTime(v)) return;
              enforceAndEmit(startMinutes, timeToMinutes(v));
            }}
          />
        </div>
      </div>

      {/* Apply buttons */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onApply?.();
            setIsExpanded(false);
          }}
        >
          Done
        </Button>
        {onApplyToAll && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onApplyToAll?.();
              setIsExpanded(false);
            }}
          >
            Apply to All
          </Button>
        )}
      </div>
    </div>
  );
}
