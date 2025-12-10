"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface TimeRangeSliderProps {
  minTime?: string; // HH:mm format, default "06:00"
  maxTime?: string; // HH:mm format, default "22:00"
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  onTimeChange: (start: string, end: string) => void;
  step?: number; // in minutes, default 30
  className?: string;
}

export function TimeRangeSlider({
  minTime = "06:00",
  maxTime = "22:00",
  startTime,
  endTime,
  onTimeChange,
  step = 30,
  className,
}: TimeRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<"start" | "end" | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Convert time string to minutes since midnight
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Convert minutes to time string
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  // Snap to nearest step
  const snapToStep = useCallback(
    (minutes: number): number => {
      return Math.round(minutes / step) * step;
    },
    [step],
  );

  const minMinutes = timeToMinutes(minTime);
  const maxMinutes = timeToMinutes(maxTime);
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const totalMinutes = maxMinutes - minMinutes;

  // Calculate positions as percentages
  const startPercent = ((startMinutes - minMinutes) / totalMinutes) * 100;
  const endPercent = ((endMinutes - minMinutes) / totalMinutes) * 100;

  // Calculate duration
  const durationMinutes = endMinutes - startMinutes;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const durationText = minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;

  // Determine if it's half-day or full-day
  const daycareType = durationMinutes / 60 <= 5 ? "Half Day" : "Full Day";

  const handleMouseDown = (handle: "start" | "end") => {
    setIsDragging(handle);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !trackRef.current) return;

      const track = trackRef.current;
      const rect = track.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const minutes = minMinutes + (percent / 100) * totalMinutes;
      const snappedMinutes = snapToStep(minutes);

      if (isDragging === "start") {
        // Ensure start doesn't go past end (minus minimum gap)
        const maxStart = endMinutes - step;
        const newStart = Math.min(snappedMinutes, maxStart);
        if (newStart >= minMinutes && newStart <= maxMinutes) {
          onTimeChange(minutesToTime(newStart), endTime);
        }
      } else {
        // Ensure end doesn't go before start (plus minimum gap)
        const minEnd = startMinutes + step;
        const newEnd = Math.max(snappedMinutes, minEnd);
        if (newEnd >= minMinutes && newEnd <= maxMinutes) {
          onTimeChange(startTime, minutesToTime(newEnd));
        }
      }
    },
    [
      isDragging,
      endTime,
      startTime,
      minMinutes,
      maxMinutes,
      totalMinutes,
      step,
      onTimeChange,
      endMinutes,
      startMinutes,
      snapToStep,
    ],
  );

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  useEffect(() => {
    if (isDragging) {
      const handleMove = (e: MouseEvent | TouchEvent) => handleMouseMove(e);
      const handleUp = () => handleMouseUp();

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
      window.addEventListener("touchmove", handleMove);
      window.addEventListener("touchend", handleUp);

      return () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
        window.removeEventListener("touchmove", handleMove);
        window.removeEventListener("touchend", handleUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  // Generate time markers (every 2 hours)
  const markers: string[] = [];
  for (let m = minMinutes; m <= maxMinutes; m += 120) {
    markers.push(minutesToTime(m));
  }

  if (!isExpanded) {
    // Minimal view when not editing
    return (
      <div
        className={cn(
          "flex items-center justify-between text-xs cursor-pointer hover:bg-muted/30 p-1.5 rounded transition-colors select-none",
          className,
        )}
        onClick={() => setIsExpanded(true)}
      >
        <span className="text-muted-foreground">
          {startTime} - {endTime}
        </span>
        <span className="font-medium text-primary">{daycareType}</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4 select-none", className)}>
      {/* Time Display */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium">Check-in Time</p>
          <p className="text-lg font-semibold">{startTime}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Duration</p>
          <p className="text-sm font-medium">{durationText}</p>
          <p className="text-xs text-primary font-semibold">{daycareType}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium">Check-out Time</p>
          <p className="text-lg font-semibold">{endTime}</p>
        </div>
      </div>

      {/* Slider Track */}
      <div className="px-4 pb-6">
        <div
          ref={trackRef}
          className="relative h-2 bg-muted rounded-full cursor-pointer"
        >
          {/* Selected Range */}
          <div
            className="absolute h-full bg-primary rounded-full"
            style={{
              left: `${startPercent}%`,
              width: `${endPercent - startPercent}%`,
            }}
          />

          {/* Start Handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-primary border-2 border-background rounded-full cursor-grab active:cursor-grabbing shadow-lg hover:scale-110 transition-transform z-10"
            style={{ left: `${startPercent}%` }}
            onMouseDown={() => handleMouseDown("start")}
            onTouchStart={() => handleMouseDown("start")}
          />

          {/* End Handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-primary border-2 border-background rounded-full cursor-grab active:cursor-grabbing shadow-lg hover:scale-110 transition-transform z-10"
            style={{ left: `${endPercent}%` }}
            onMouseDown={() => handleMouseDown("end")}
            onTouchStart={() => handleMouseDown("end")}
          />
        </div>

        {/* Time Markers */}
        <div className="relative mt-2 overflow-visible">
          {markers.map((marker, index) => {
            const markerMinutes = timeToMinutes(marker);
            const markerPercent =
              ((markerMinutes - minMinutes) / totalMinutes) * 100;
            return (
              <div
                key={index}
                className="absolute -translate-x-1/2"
                style={{ left: `${markerPercent}%` }}
              >
                <div className="w-px h-1.5 bg-muted-foreground/30 mx-auto" />
                <p className="text-[9px] text-muted-foreground mt-0.5 whitespace-nowrap">
                  {marker}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Done button to collapse */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(false)}
        >
          Done
        </Button>
      </div>
    </div>
  );
}
