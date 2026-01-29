"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export interface TimeRangeSliderProps {
  minTime?: string; // HH:mm format, default "06:00"
  maxTime?: string; // HH:mm format, default "22:00"
  /** When set, check-in (start) is constrained to [min, max] and check-out (end) uses pickUpWindow. */
  dropOffWindow?: { min: string; max: string };
  pickUpWindow?: { min: string; max: string };
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  onTimeChange: (start: string, end: string) => void;
  onApply?: () => void;
  onApplyToAll?: () => void;
  step?: number; // in minutes, default 30
  className?: string;
  /** When true, the slider is shown expanded by default (no click required). */
  defaultExpanded?: boolean;
}

export function TimeRangeSlider({
  minTime = "06:00",
  maxTime = "22:00",
  dropOffWindow,
  pickUpWindow,
  startTime,
  endTime,
  onTimeChange,
  onApply,
  onApplyToAll,
  step = 30,
  className,
  defaultExpanded = true,
}: TimeRangeSliderProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  const isValidTime = (time: string) => /^\d{2}:\d{2}$/.test(time);

  const timeToMinutes = (time: string): number => {
    if (!isValidTime(time)) return 0;
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number): string => {
    const safe = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
    const hours = Math.floor(safe / 60);
    const mins = safe % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  const clamp = (n: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, n));
  const snap = (minutes: number) => Math.round(minutes / step) * step;

  const startMinMinutes = dropOffWindow
    ? timeToMinutes(dropOffWindow.min)
    : timeToMinutes(minTime);
  const startMaxMinutes = dropOffWindow
    ? timeToMinutes(dropOffWindow.max)
    : timeToMinutes(maxTime);
  const endMinMinutes = pickUpWindow
    ? timeToMinutes(pickUpWindow.min)
    : timeToMinutes(minTime);
  const endMaxMinutes = pickUpWindow
    ? timeToMinutes(pickUpWindow.max)
    : timeToMinutes(maxTime);

  const trackMin = Math.min(startMinMinutes, endMinMinutes);
  const trackMax = Math.max(startMaxMinutes, endMaxMinutes);
  const trackSpan = trackMax - trackMin || 1;

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  const startPercent = ((startMinutes - trackMin) / trackSpan) * 100;
  const endPercent = ((endMinutes - trackMin) / trackSpan) * 100;

  const durationMinutes = endMinutes - startMinutes;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const durationText =
    minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;
  const daycareType = durationMinutes / 60 <= 5 ? "Half Day" : "Full Day";

  const enforceAndEmit = useCallback(
    (nextStartMinutes: number, nextEndMinutes: number) => {
      let s = snap(clamp(nextStartMinutes, startMinMinutes, startMaxMinutes));
      let e = snap(clamp(nextEndMinutes, endMinMinutes, endMaxMinutes));
      if (e - s < step) {
        if (s + step <= endMaxMinutes) {
          e = s + step;
        } else {
          s = Math.max(startMinMinutes, e - step);
        }
      }
      onTimeChange(minutesToTime(s), minutesToTime(e));
    },
    [
      startMinMinutes,
      startMaxMinutes,
      endMinMinutes,
      endMaxMinutes,
      step,
      onTimeChange,
    ],
  );

  const percentToMinutes = (percent: number) => {
    const m = trackMin + (percent / 100) * trackSpan;
    return snap(Math.round(m));
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const clickedMinutes = percentToMinutes(percent);
    const distToStart = Math.abs(clickedMinutes - startMinutes);
    const distToEnd = Math.abs(clickedMinutes - endMinutes);
    if (distToStart <= distToEnd) {
      const newEnd = Math.max(startMinutes + step, endMinutes);
      if (clickedMinutes >= endMinMinutes && clickedMinutes <= endMaxMinutes)
        enforceAndEmit(startMinutes, clickedMinutes);
      else if (clickedMinutes < startMinutes)
        enforceAndEmit(
          Math.max(startMinMinutes, clickedMinutes),
          Math.max(clickedMinutes + step, endMinutes),
        );
    } else {
      if (clickedMinutes >= startMinMinutes && clickedMinutes <= startMaxMinutes)
        enforceAndEmit(clickedMinutes, endMinutes);
      else if (clickedMinutes > endMinutes)
        enforceAndEmit(
          Math.min(startMinutes, clickedMinutes - step),
          Math.min(endMaxMinutes, clickedMinutes),
        );
    }
  };

  const handleThumbMouseDown = (which: "start" | "end") => () =>
    setDragging(which);
  const handleMouseUp = useCallback(() => setDragging(null), []);
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(
        0,
        Math.min(100, ((e.clientX - rect.left) / rect.width) * 100),
      );
      const m = percentToMinutes(percent);
      if (dragging === "start") {
        const newStart = clamp(m, startMinMinutes, startMaxMinutes);
        if (newStart < endMinutes - step) enforceAndEmit(newStart, endMinutes);
      } else {
        const newEnd = clamp(m, endMinMinutes, endMaxMinutes);
        if (newEnd > startMinutes + step) enforceAndEmit(startMinutes, newEnd);
      }
    },
    [dragging, enforceAndEmit, endMinutes, startMinutes, step],
  );

  useEffect(() => {
    const up = () => setDragging(null);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const timeMarkers: string[] = [];
  for (let m = trackMin; m <= trackMax; m += 120) {
    timeMarkers.push(minutesToTime(m));
  }
  if (timeMarkers[timeMarkers.length - 1] !== minutesToTime(trackMax)) {
    timeMarkers.push(minutesToTime(trackMax));
  }

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
        <div>
          <div className="text-lg font-bold">{startTime}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Check-in Time
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-muted-foreground">
            {durationText}
          </div>
          <Badge variant="secondary">{daycareType}</Badge>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">{endTime}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Check-out Time
          </div>
        </div>
      </div>

      <div
        ref={trackRef}
        role="slider"
        aria-valuemin={trackMin}
        aria-valuemax={trackMax}
        aria-valuenow={startMinutes}
        tabIndex={0}
        className="relative h-10 w-full cursor-pointer select-none"
        onClick={handleTrackClick}
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="absolute inset-0 flex items-center">
          <div className="h-2 w-full rounded-full bg-muted" />
          <div
            className="absolute h-2 rounded-full bg-primary"
            style={{
              left: `${startPercent}%`,
              width: `${endPercent - startPercent}%`,
            }}
          />
          <div
            className="absolute h-5 w-5 -translate-x-1/2 rounded-full border-2 border-primary bg-background shadow-md transition-none hover:scale-110"
            style={{ left: `${startPercent}%`, top: "50%", transform: "translate(-50%, -50%)" }}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleThumbMouseDown("start")();
            }}
          />
          <div
            className="absolute h-5 w-5 -translate-x-1/2 rounded-full border-2 border-primary bg-background shadow-md transition-none hover:scale-110"
            style={{ left: `${endPercent}%`, top: "50%", transform: "translate(-50%, -50%)" }}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleThumbMouseDown("end")();
            }}
          />
        </div>
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        {timeMarkers.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Check-in</Label>
          <Input
            type="time"
            value={startTime}
            min={minutesToTime(startMinMinutes)}
            max={minutesToTime(startMaxMinutes)}
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
            min={minutesToTime(endMinMinutes)}
            max={minutesToTime(endMaxMinutes)}
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
