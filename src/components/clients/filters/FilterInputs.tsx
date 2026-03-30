"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
      <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
        {label}
      </p>
      {comingSoon && (
        <Badge
          variant="outline"
          className="border-border/40 text-muted-foreground/60 h-4 px-1.5 text-[8px]"
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
      <div className="border-border/50 mt-1.5 inline-flex rounded-md border p-0.5">
        {(["any", "yes", "no"] as const).map((v) => (
          <button
            key={v}
            onClick={() => !comingSoon && onChange(v)}
            className={cn(
              "rounded-sm px-3 py-1 text-[11px] font-medium transition-all",
              value === v
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
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
                ? "border-foreground/30 bg-foreground/5 font-medium"
                : "border-border/50 text-muted-foreground hover:border-foreground/20 hover:text-foreground",
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
                ? "bg-foreground text-background border-transparent"
                : "border-border/50 text-muted-foreground hover:border-foreground/20 hover:text-foreground",
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
        className="mt-1.5 h-8 text-xs"
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
          className="h-8 w-20 text-xs"
          disabled={comingSoon}
        />
        <span className="text-muted-foreground self-center text-xs">—</span>
        <Input
          type="number"
          value={maxValue}
          onChange={(e) => !comingSoon && onMaxChange(e.target.value)}
          placeholder={maxPlaceholder ?? "Max"}
          className="h-8 w-20 text-xs"
          disabled={comingSoon}
        />
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
