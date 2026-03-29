"use client";

import { useState, useRef, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Braces, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ========================================
// Form-relevant variables only (~12)
// ========================================

const FORM_VARIABLES: {
  key: string;
  label: string;
  group: string;
  icon: string;
  color: string;
  chipBg: string;
}[] = [
  {
    key: "pet_name",
    label: "Pet Name",
    group: "Pet",
    icon: "🐾",
    color: "text-blue-700",
    chipBg: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    key: "pet_breed",
    label: "Pet Breed",
    group: "Pet",
    icon: "🐾",
    color: "text-blue-700",
    chipBg: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    key: "pet_age",
    label: "Pet Age",
    group: "Pet",
    icon: "🐾",
    color: "text-blue-700",
    chipBg: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    key: "pet_weight",
    label: "Pet Weight",
    group: "Pet",
    icon: "🐾",
    color: "text-blue-700",
    chipBg: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    key: "customer_first_name",
    label: "Customer Name",
    group: "Customer",
    icon: "👤",
    color: "text-emerald-700",
    chipBg: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    key: "customer_full_name",
    label: "Full Name",
    group: "Customer",
    icon: "👤",
    color: "text-emerald-700",
    chipBg: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    key: "facility_name",
    label: "Facility Name",
    group: "Facility",
    icon: "🏢",
    color: "text-violet-700",
    chipBg: "bg-violet-100 dark:bg-violet-900/30",
  },
  {
    key: "facility_phone",
    label: "Facility Phone",
    group: "Facility",
    icon: "🏢",
    color: "text-violet-700",
    chipBg: "bg-violet-100 dark:bg-violet-900/30",
  },
  {
    key: "service_name",
    label: "Service",
    group: "Booking",
    icon: "📅",
    color: "text-amber-700",
    chipBg: "bg-amber-100 dark:bg-amber-900/30",
  },
  {
    key: "booking_date",
    label: "Booking Date",
    group: "Booking",
    icon: "📅",
    color: "text-amber-700",
    chipBg: "bg-amber-100 dark:bg-amber-900/30",
  },
  {
    key: "checkin_date",
    label: "Check-in Date",
    group: "Booking",
    icon: "📅",
    color: "text-amber-700",
    chipBg: "bg-amber-100 dark:bg-amber-900/30",
  },
];

function getVarMeta(key: string) {
  return FORM_VARIABLES.find((v) => v.key === key);
}

// ========================================
// Parse value into segments (text + variable chips)
// ========================================

type Segment = { type: "text"; value: string } | { type: "var"; key: string };

function parseSegments(raw: string): Segment[] {
  const parts: Segment[] = [];
  const regex = /\{\{(\w+?)(?:\|[^}]*)?\}\}/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: raw.slice(lastIndex, match.index) });
    }
    parts.push({ type: "var", key: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < raw.length) {
    parts.push({ type: "text", value: raw.slice(lastIndex) });
  }
  return parts;
}

function segmentsToRaw(segments: Segment[]): string {
  return segments
    .map((s) => (s.type === "var" ? `{{${s.key}}}` : s.value))
    .join("");
}

// ========================================
// Component
// ========================================

interface VariableRichInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function VariableRichInput({
  value,
  onChange,
  placeholder,
}: VariableRichInputProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const segments = useMemo(() => parseSegments(value), [value]);

  const filteredVars = useMemo(() => {
    if (!search) return FORM_VARIABLES;
    const q = search.toLowerCase();
    return FORM_VARIABLES.filter(
      (v) =>
        v.label.toLowerCase().includes(q) ||
        v.key.toLowerCase().includes(q) ||
        v.group.toLowerCase().includes(q),
    );
  }, [search]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof FORM_VARIABLES>();
    for (const v of filteredVars) {
      const arr = map.get(v.group) ?? [];
      arr.push(v);
      map.set(v.group, arr);
    }
    return map;
  }, [filteredVars]);

  const insertVariable = (key: string) => {
    onChange(value + `{{${key}}}`);
    setPopoverOpen(false);
    setSearch("");
    inputRef.current?.focus();
  };

  const removeVariable = (index: number) => {
    const newSegments = segments.filter((_, i) => i !== index);
    onChange(segmentsToRaw(newSegments));
  };

  const handleTextChange = (segIndex: number, newText: string) => {
    const newSegments = segments.map((s, i) =>
      i === segIndex && s.type === "text" ? { ...s, value: newText } : s,
    );
    onChange(segmentsToRaw(newSegments));
  };

  // If value has no variables, show simple input
  const hasVars = segments.some((s) => s.type === "var");

  return (
    <div className="space-y-2">
      {/* Rich display with chips */}
      <div className="border-input bg-background flex min-h-[36px] flex-wrap items-center gap-1 rounded-md border px-3 py-1.5">
        {segments.length === 0 && !hasVars ? (
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        ) : (
          segments.map((seg, i) =>
            seg.type === "var" ? (
              <span
                key={i}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                  getVarMeta(seg.key)?.chipBg ?? "bg-muted",
                  getVarMeta(seg.key)?.color ?? "text-foreground",
                )}
              >
                {getVarMeta(seg.key)?.icon ?? "{}"}
                {getVarMeta(seg.key)?.label ?? seg.key}
                <button
                  type="button"
                  onClick={() => removeVariable(i)}
                  className="-mr-0.5 rounded-sm p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X className="size-2.5" />
                </button>
              </span>
            ) : (
              <input
                key={i}
                ref={i === segments.length - 1 ? inputRef : undefined}
                value={seg.value}
                onChange={(e) => handleTextChange(i, e.target.value)}
                placeholder={i === 0 && !seg.value ? placeholder : undefined}
                className="min-w-[20px] flex-1 bg-transparent text-sm outline-none"
                style={{ width: `${Math.max(seg.value.length, 2)}ch` }}
              />
            ),
          )
        )}

        {/* Insert button */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-6 shrink-0 items-center justify-center rounded transition-colors"
              title="Insert variable"
            >
              <Braces className="size-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-0">
            <div className="border-b px-3 py-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search variables..."
                className="w-full bg-transparent text-sm outline-none"
                autoFocus
              />
            </div>
            <div className="max-h-[240px] overflow-y-auto py-1">
              {[...grouped.entries()].map(([group, vars]) => (
                <div key={group}>
                  <p className="text-muted-foreground px-3 pt-2 pb-1 text-[10px] font-semibold tracking-widest uppercase">
                    {vars[0].icon} {group}
                  </p>
                  {vars.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="hover:bg-muted flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors"
                    >
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium",
                          v.chipBg,
                          v.color,
                        )}
                      >
                        {v.label}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
              {filteredVars.length === 0 && (
                <p className="text-muted-foreground px-3 py-4 text-center text-xs">
                  No matching variables
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Quick-insert pills */}
      <div className="flex flex-wrap gap-1">
        {FORM_VARIABLES.slice(0, 4).map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => insertVariable(v.key)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors hover:opacity-80",
              v.chipBg,
              v.color,
            )}
          >
            {v.icon} {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Export the form variables list for the preview toggle */
export { FORM_VARIABLES };
