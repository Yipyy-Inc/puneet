"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DayRange } from "@/hooks/use-client-filters";

// ========================================
// Section label
// ========================================

export function FilterLabel({
  label,
  comingSoon,
}: {
  label: string;
  comingSoon?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
        {label}
      </p>
      {comingSoon && (
        <Badge
          variant="outline"
          className="h-4 border-slate-200/80 bg-slate-50 px-1.5 text-[8px] text-slate-500"
        >
          Soon
        </Badge>
      )}
    </div>
  );
}

// ========================================
// Yes / No / Any toggle
// ========================================

export function TriToggle({
  label,
  value,
  onChange,
  comingSoon,
}: {
  label: string;
  value: "any" | "yes" | "no";
  onChange: (v: "any" | "yes" | "no") => void;
  comingSoon?: boolean;
}) {
  return (
    <div>
      <FilterLabel label={label} comingSoon={comingSoon} />
      <div className="mt-1.5 inline-flex rounded-md border border-slate-200 bg-white/90 p-0.5">
        {(["any", "yes", "no"] as const).map((v) => (
          <button
            key={v}
            onClick={() => !comingSoon && onChange(v)}
            className={cn(
              "rounded-sm px-3 py-1 text-[11px] font-medium transition-all",
              value === v
                ? "bg-sky-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-sky-50 hover:text-slate-900",
              comingSoon && "cursor-not-allowed opacity-50",
            )}
          >
            {v === "any" ? "Any" : v === "yes" ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ========================================
// Checkbox group (multi-select)
// ========================================

export function CheckGroup({
  label,
  options,
  selected,
  onToggle,
  comingSoon,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
  comingSoon?: boolean;
}) {
  return (
    <div>
      <FilterLabel label={label} comingSoon={comingSoon} />
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-all",
              selected.includes(opt.value)
                ? "border-sky-300 bg-sky-50 font-medium text-sky-700"
                : "border-slate-200 text-slate-600 hover:border-sky-200 hover:bg-sky-50/60 hover:text-slate-900",
              comingSoon && "cursor-not-allowed opacity-50",
            )}
          >
            <Checkbox
              checked={selected.includes(opt.value)}
              onCheckedChange={() => !comingSoon && onToggle(opt.value)}
              className="size-3"
              disabled={comingSoon}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

// ========================================
// Preset pill buttons
// ========================================

export function PresetPills({
  label,
  options,
  value,
  onChange,
  comingSoon,
}: {
  label: string;
  options: { value: number | null; label: string }[];
  value: number | null;
  onChange: (v: number | null) => void;
  comingSoon?: boolean;
}) {
  return (
    <div>
      <FilterLabel label={label} comingSoon={comingSoon} />
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() =>
              !comingSoon && onChange(value === opt.value ? null : opt.value)
            }
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-medium transition-all",
              value === opt.value
                ? "border-sky-600 bg-sky-600 text-white"
                : "border-slate-200 text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-slate-900",
              comingSoon && "cursor-not-allowed opacity-50",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ========================================
// Text search input
// ========================================

export function TextFilter({
  label,
  value,
  onChange,
  placeholder,
  comingSoon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  comingSoon?: boolean;
}) {
  return (
    <div>
      <FilterLabel label={label} comingSoon={comingSoon} />
      <Input
        value={value}
        onChange={(e) => !comingSoon && onChange(e.target.value)}
        placeholder={placeholder ?? "Type to filter..."}
        className="mt-1.5 h-8 border-slate-200 bg-white/90 text-xs"
        disabled={comingSoon}
      />
    </div>
  );
}

// ========================================
// Range filter (min/max)
// ========================================

export function RangeFilter({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minPlaceholder,
  maxPlaceholder,
  comingSoon,
}: {
  label: string;
  minValue: string;
  maxValue: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  comingSoon?: boolean;
}) {
  return (
    <div>
      <FilterLabel label={label} comingSoon={comingSoon} />
      <div className="mt-1.5 flex gap-2">
        <Input
          type="number"
          value={minValue}
          onChange={(e) => !comingSoon && onMinChange(e.target.value)}
          placeholder={minPlaceholder ?? "Min"}
          className="h-8 w-20 border-slate-200 bg-white/90 text-xs"
          disabled={comingSoon}
        />
        <span className="self-center text-xs text-slate-400">—</span>
        <Input
          type="number"
          value={maxValue}
          onChange={(e) => !comingSoon && onMaxChange(e.target.value)}
          placeholder={maxPlaceholder ?? "Max"}
          className="h-8 w-20 border-slate-200 bg-white/90 text-xs"
          disabled={comingSoon}
        />
      </div>
    </div>
  );
}

// ========================================
// Day range with presets + custom popover
// ========================================

export function DayRangePreset({
  label,
  presets,
  value,
  onChange,
  comingSoon,
}: {
  label: string;
  presets: { value: number; label: string }[];
  value: DayRange | null;
  onChange: (v: DayRange | null) => void;
  comingSoon?: boolean;
}) {
  const [customMin, setCustomMin] = useState("");
  const [customMax, setCustomMax] = useState("");
  const [open, setOpen] = useState(false);

  const isCustom = value != null && value.preset == null;
  const activePreset = value?.preset ?? null;

  const handlePreset = (p: number) => {
    if (comingSoon) return;
    onChange(activePreset === p ? null : { preset: p, max: p });
  };

  const handleApply = () => {
    const min = customMin ? parseInt(customMin, 10) : undefined;
    const max = customMax ? parseInt(customMax, 10) : undefined;
    if (min == null && max == null) {
      onChange(null);
    } else {
      onChange({ min, max });
    }
    setOpen(false);
  };

  const customLabel = isCustom
    ? value.min != null && value.max != null
      ? `${value.min}-${value.max}d`
      : value.min != null
        ? `>${value.min}d`
        : `<${value.max}d`
    : null;

  return (
    <div>
      <FilterLabel label={label} comingSoon={comingSoon} />
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.value}
            onClick={() => handlePreset(p.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-medium transition-all",
              activePreset === p.value
                ? "border-sky-600 bg-sky-600 text-white"
                : "border-slate-200 text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-slate-900",
              comingSoon && "cursor-not-allowed opacity-50",
            )}
          >
            {p.label}
          </button>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              disabled={comingSoon}
              className={cn(
                "flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium transition-all",
                isCustom
                  ? "border-sky-600 bg-sky-600 text-white"
                  : "border-slate-200 text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-slate-900",
                comingSoon && "cursor-not-allowed opacity-50",
              )}
            >
              {customLabel ?? "Custom"}
              <ChevronDown className="size-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-52 border-slate-200 bg-white/95 p-3"
          >
            <p className="mb-2.5 text-xs font-medium text-slate-700">
              Custom Range (days)
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-10 text-[11px] text-slate-500">
                  From
                </span>
                <Input
                  type="number"
                  min={0}
                  value={customMin}
                  onChange={(e) => setCustomMin(e.target.value)}
                  placeholder="0"
                  className="h-7 border-slate-200 bg-white/90 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-10 text-[11px] text-slate-500">
                  To
                </span>
                <Input
                  type="number"
                  min={0}
                  value={customMax}
                  onChange={(e) => setCustomMax(e.target.value)}
                  placeholder="∞"
                  className="h-7 border-slate-200 bg-white/90 text-xs"
                />
              </div>
            </div>
            <Button
              size="sm"
              className="mt-3 h-7 w-full text-xs"
              onClick={handleApply}
            >
              Apply
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

// ========================================
// Coming soon placeholder for entire section
// ========================================

export function ComingSoonSection() {
  return (
    <p className="text-muted-foreground py-2 text-xs italic">
      Filters in this category will be available when the data is connected.
    </p>
  );
}
