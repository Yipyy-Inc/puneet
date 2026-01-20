"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function timeToMinutes(value: string) {
  if (!isValidTime(value)) return null;
  const [h, m] = value.split(":").map((n) => Number(n));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function minutesToTime(minutes: number) {
  const safe = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface TimePickerProps {
  value?: string; // HH:mm
  onValueChange: (next: string) => void;
  stepMinutes?: number; // default 30
  min?: string; // HH:mm (inclusive)
  max?: string; // HH:mm (inclusive)
  disabled?: boolean;
  placeholder?: string;
  className?: string; // applied to trigger
}

export function TimePicker({
  value,
  onValueChange,
  stepMinutes = 30,
  min = "00:00",
  max = "23:59",
  disabled,
  placeholder = "Select time",
  className,
}: TimePickerProps) {
  const options = React.useMemo(() => {
    const minM = timeToMinutes(min) ?? 0;
    const maxM = timeToMinutes(max) ?? 24 * 60 - 1;
    const step = Math.max(1, Math.round(stepMinutes));

    if (maxM < minM) return [];

    const out: string[] = [];
    // Align to step boundary at/after min
    const start = Math.ceil(minM / step) * step;
    for (let m = start; m <= maxM; m += step) {
      out.push(minutesToTime(m));
    }
    // If min itself is a step boundary, include it exactly
    if (minM % step === 0 && minM <= maxM) {
      const t = minutesToTime(minM);
      if (!out.includes(t)) out.unshift(t);
    }
    // If max itself is a step boundary, include it exactly (rare for 23:59)
    if (maxM % step === 0 && maxM >= minM) {
      const t = minutesToTime(maxM);
      if (!out.includes(t)) out.push(t);
    }
    return out;
  }, [min, max, stepMinutes]);

  const isValueAllowed = React.useMemo(() => {
    if (!value) return true;
    if (!isValidTime(value)) return false;
    const v = timeToMinutes(value);
    const minM = timeToMinutes(min);
    const maxM = timeToMinutes(max);
    if (v === null || minM === null || maxM === null) return false;
    return v >= minM && v <= maxM;
  }, [value, min, max]);

  const selectValue = value && isValueAllowed ? value : undefined;

  return (
    <Select
      value={selectValue}
      onValueChange={(next) => onValueChange(next)}
      disabled={disabled || options.length === 0}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={options.length === 0 ? "No times" : placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((t) => (
          <SelectItem key={t} value={t}>
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

