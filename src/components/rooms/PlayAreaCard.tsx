"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Scale,
  PawPrint,
  AlertCircle,
  TreePine,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DaycarePlayArea, DaycareSection, RoomRule, RoomCategoryColor } from "@/types/rooms";

// ── Color config ───────────────────────────────────────────────────────────────

const COLOR_CONFIG: Record<
  RoomCategoryColor,
  { bg: string; text: string; bar: string; badge: string; border: string }
> = {
  amber:   { bg: "bg-amber-100",   text: "text-amber-700",   bar: "bg-amber-400",   badge: "bg-amber-100 text-amber-800 border-amber-200",   border: "border-l-amber-400"   },
  violet:  { bg: "bg-violet-100",  text: "text-violet-700",  bar: "bg-violet-500",  badge: "bg-violet-100 text-violet-800 border-violet-200",  border: "border-l-violet-400"  },
  blue:    { bg: "bg-blue-100",    text: "text-blue-700",    bar: "bg-blue-500",    badge: "bg-blue-100 text-blue-800 border-blue-200",        border: "border-l-blue-400"    },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-700", bar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800 border-emerald-200", border: "border-l-emerald-400" },
  rose:    { bg: "bg-rose-100",    text: "text-rose-700",    bar: "bg-rose-500",    badge: "bg-rose-100 text-rose-800 border-rose-200",        border: "border-l-rose-400"    },
  orange:  { bg: "bg-orange-100",  text: "text-orange-700",  bar: "bg-orange-400",  badge: "bg-orange-100 text-orange-800 border-orange-200",  border: "border-l-orange-400"  },
  indigo:  { bg: "bg-indigo-100",  text: "text-indigo-700",  bar: "bg-indigo-500",  badge: "bg-indigo-100 text-indigo-800 border-indigo-200",  border: "border-l-indigo-400"  },
  slate:   { bg: "bg-slate-100",   text: "text-slate-700",   bar: "bg-slate-400",   badge: "bg-slate-100 text-slate-800 border-slate-200",     border: "border-l-slate-400"   },
};

// ── Rule helpers ───────────────────────────────────────────────────────────────

function ruleLabel(rule: RoomRule): string {
  switch (rule.type) {
    case "max_weight":      return `Max ${rule.value} lbs`;
    case "min_weight":      return `Min ${rule.value} lbs`;
    case "pet_type":        return `${String(rule.value)} only`;
    case "max_pets":        return `Max ${rule.value} pets`;
    case "single_pet_only": return "Single pet";
    default:                return "Rule";
  }
}

function ruleIcon(type: RoomRule["type"]) {
  if (type === "max_weight" || type === "min_weight") return Scale;
  if (type === "pet_type") return PawPrint;
  return AlertCircle;
}

// ── Capacity bar ───────────────────────────────────────────────────────────────

function CapacityBar({
  used,
  capacity,
  barColor,
}: {
  used: number;
  capacity: number;
  barColor: string;
}) {
  const pct = capacity > 0 ? Math.min((used / capacity) * 100, 100) : 0;
  const remaining = capacity - used;
  const urgency =
    pct >= 90 ? "text-red-600" : pct >= 70 ? "text-orange-500" : "text-emerald-600";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{used} used</span>
        <span className={cn("font-semibold tabular-nums", urgency)}>
          {remaining} / {capacity} available
        </span>
      </div>
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface PlayAreaCardProps {
  area: DaycarePlayArea;
  sections: DaycareSection[];
  /** Simulated usage per section for the demo (sectionId → used count) */
  mockUsage?: Record<string, number>;
  onEditArea: () => void;
  onDeleteArea: () => void;
  onToggleArea: () => void;
  onAddSection: () => void;
  onEditSection: (section: DaycareSection) => void;
  onToggleSection: (id: string) => void;
  onDeleteSection: (id: string) => void;
}

// ── Card ───────────────────────────────────────────────────────────────────────

export function PlayAreaCard({
  area,
  sections,
  mockUsage = {},
  onEditArea,
  onDeleteArea,
  onToggleArea,
  onAddSection,
  onEditSection,
  onToggleSection,
  onDeleteSection,
}: PlayAreaCardProps) {
  const [expanded, setExpanded] = useState(true);

  const activeSections = sections.filter((s) => s.isActive);
  const totalCapacity = activeSections.reduce((sum, s) => sum + s.capacity, 0);
  const totalUsed = activeSections.reduce(
    (sum, s) => sum + (mockUsage[s.id] ?? 0),
    0,
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        !area.isActive && "opacity-60",
      )}
    >
      {/* Play area header */}
      <div className="bg-muted/30 border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="hover:bg-white/60 flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors"
          >
            {expanded ? (
              <ChevronDown className="text-muted-foreground size-4" />
            ) : (
              <ChevronRight className="text-muted-foreground size-4" />
            )}
          </button>

          {area.imageUrl ? (
            <div className="size-10 shrink-0 overflow-hidden rounded-lg border shadow-sm">
              <img
                src={area.imageUrl}
                alt={area.name}
                className="size-full object-cover"
              />
            </div>
          ) : (
            <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
              <TreePine className="text-primary size-5" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold">{area.name}</h3>
            {area.description && (
              <p className="text-muted-foreground truncate text-xs">
                {area.description}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="mr-2 hidden shrink-0 items-center gap-6 text-sm sm:flex">
            {[
              { val: sections.length,        label: "Sections"  },
              { val: totalCapacity,           label: "Capacity"  },
              { val: activeSections.length,   label: "Active"    },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <p className="text-lg font-bold leading-none">{val}</p>
                <p className="text-muted-foreground mt-0.5 text-[10px] uppercase tracking-wide">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1.5">
            <Switch
              checked={area.isActive}
              onCheckedChange={onToggleArea}
              className="scale-90"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 bg-white/60 px-2.5 text-xs hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
              onClick={onAddSection}
            >
              <Plus className="mr-1 size-3" />
              Add Section
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground h-8 px-2"
              onClick={onEditArea}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive h-8 px-2"
              onClick={onDeleteArea}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Overall capacity bar */}
        {activeSections.length > 0 && (
          <div className="mt-3 ml-10">
            <CapacityBar
              used={totalUsed}
              capacity={totalCapacity}
              barColor="bg-primary"
            />
          </div>
        )}
      </div>

      {/* Sections grid */}
      {expanded && (
        <div className="p-4">
          {sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <TreePine className="text-muted-foreground/30 mb-2 size-8" />
              <p className="text-muted-foreground mb-3 text-sm">No sections yet</p>
              <Button size="sm" variant="outline" onClick={onAddSection}>
                <Plus className="mr-1 size-3" />
                Add First Section
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sections
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((section) => (
                  <SectionTile
                    key={section.id}
                    section={section}
                    used={mockUsage[section.id] ?? 0}
                    onEdit={() => onEditSection(section)}
                    onToggle={() => onToggleSection(section.id)}
                    onDelete={() => onDeleteSection(section.id)}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section tile ───────────────────────────────────────────────────────────────

function SectionTile({
  section,
  used,
  onEdit,
  onToggle,
  onDelete,
}: {
  section: DaycareSection;
  used: number;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const colors = COLOR_CONFIG[section.color];
  const pct = section.capacity > 0 ? (used / section.capacity) * 100 : 0;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border-2 transition-all",
        colors.border,
        !section.isActive && "opacity-50",
      )}
    >
      {/* Photo or color band */}
      {section.imageUrl ? (
        <div className="relative h-28 w-full overflow-hidden">
          <img
            src={section.imageUrl}
            alt={section.name}
            className="size-full object-cover"
          />
          <div className="from-background/80 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent px-3 pb-2 pt-6">
            <p className="text-sm font-semibold">{section.name}</p>
          </div>
        </div>
      ) : (
        <div className={cn("flex h-10 items-center gap-2 px-3", colors.bg)}>
          <div className={cn("size-2.5 rounded-full", colors.bar)} />
          <p className={cn("text-sm font-semibold", colors.text)}>
            {section.name}
          </p>
          <div className="ml-auto flex items-center gap-1">
            <Switch
              checked={section.isActive}
              onCheckedChange={onToggle}
              className="scale-75"
            />
          </div>
        </div>
      )}

      <div className="p-3 space-y-2.5">
        {section.description && (
          <p className="text-muted-foreground line-clamp-1 text-xs">
            {section.description}
          </p>
        )}

        {/* Rules */}
        {section.rules.filter((r) => r.enabled).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {section.rules
              .filter((r) => r.enabled)
              .map((rule) => {
                const Icon = ruleIcon(rule.type);
                return (
                  <span
                    key={rule.id}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      colors.badge,
                    )}
                    title={rule.clientMessage}
                  >
                    <Icon className="size-2.5" />
                    {ruleLabel(rule)}
                  </span>
                );
              })}
          </div>
        )}

        {/* Capacity bar */}
        <CapacityBar
          used={used}
          capacity={section.capacity}
          barColor={colors.bar}
        />

        {/* Capacity label */}
        <p className="text-muted-foreground text-[10px]">
          Max {section.capacity} pets/day
          {pct >= 90 && (
            <span className="ml-1.5 font-semibold text-red-500">· Near full</span>
          )}
        </p>
      </div>

      {/* Hover actions */}
      <div className="from-card via-card/90 absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t to-transparent px-3 pb-2 pt-5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={onEdit}
          className="text-muted-foreground hover:text-foreground text-[10px] underline underline-offset-2"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="text-destructive/70 hover:text-destructive text-[10px] underline underline-offset-2"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
