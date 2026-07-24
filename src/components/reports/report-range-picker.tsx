"use client";

import { CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import {
  RANGE_PRESETS,
  presetRange,
  type ReportRange,
  type RangePreset,
} from "./report-range";

// Pure range helpers live in the server-safe ./report-range module. Re-export
// them here so existing client callers can keep importing from the picker;
// Server Components must import the pure helpers from ./report-range directly.
export {
  RANGE_PRESETS,
  presetRange,
  defaultReportRange,
  previousWindow,
  formatRangeLabel,
} from "./report-range";
export type { ReportRange, RangePreset } from "./report-range";

export interface ReportRangePickerProps {
  value: ReportRange;
  onChange: (range: ReportRange) => void;
}

/**
 * Preset-driven date-range control (Last 30/90/365 days, MTD, or Custom). On a
 * preset it resolves the window relative to today; on Custom it exposes two
 * date fields. Standard across every report so the active window is always
 * visible and changeable.
 */
export function ReportRangePicker({ value, onChange }: ReportRangePickerProps) {
  const setPreset = (preset: RangePreset) => {
    if (preset === "custom") {
      onChange({ ...value, preset });
      return;
    }
    onChange({ ...presetRange(preset), preset });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CalendarDays className="text-muted-foreground size-4" />
      <Select
        value={value.preset}
        onValueChange={(v) => setPreset(v as RangePreset)}
      >
        <SelectTrigger size="sm" className="h-8 w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGE_PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value.preset === "custom" && (
        <div className="flex items-center gap-1.5">
          <DatePicker
            value={value.from}
            max={value.to}
            onValueChange={(from) => from && onChange({ ...value, from })}
            showQuickPresets={false}
          />
          <span className="text-muted-foreground text-xs">to</span>
          <DatePicker
            value={value.to}
            min={value.from}
            onValueChange={(to) => to && onChange({ ...value, to })}
            showQuickPresets={false}
          />
        </div>
      )}
    </div>
  );
}
