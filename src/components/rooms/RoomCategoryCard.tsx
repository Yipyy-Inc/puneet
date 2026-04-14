"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Scale, Users, PawPrint, AlertCircle, Building2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoomCategory, FacilityRoom, RoomRule } from "@/types/rooms";

// ── Color config ───────────────────────────────────────────────────────────────

type ColorKey = RoomCategory["color"];

const COLOR_CONFIG: Record<ColorKey, { border: string; headerBg: string; badge: string; dot: string }> = {
  amber:   { border: "border-l-amber-400",   headerBg: "bg-gradient-to-r from-amber-50/80  to-orange-50/30  dark:from-amber-950/30  dark:to-orange-950/10",  badge: "bg-amber-100   text-amber-800   border-amber-200   dark:bg-amber-950/50   dark:text-amber-300   dark:border-amber-800",   dot: "bg-amber-400"   },
  violet:  { border: "border-l-violet-400",  headerBg: "bg-gradient-to-r from-violet-50/80 to-purple-50/30  dark:from-violet-950/30 dark:to-purple-950/10",  badge: "bg-violet-100  text-violet-800  border-violet-200  dark:bg-violet-950/50  dark:text-violet-300  dark:border-violet-800",  dot: "bg-violet-400"  },
  blue:    { border: "border-l-blue-400",    headerBg: "bg-gradient-to-r from-blue-50/80   to-sky-50/30     dark:from-blue-950/30   dark:to-sky-950/10",     badge: "bg-blue-100    text-blue-800    border-blue-200    dark:bg-blue-950/50    dark:text-blue-300    dark:border-blue-800",    dot: "bg-blue-400"    },
  emerald: { border: "border-l-emerald-400", headerBg: "bg-gradient-to-r from-emerald-50/80 to-green-50/30 dark:from-emerald-950/30 dark:to-green-950/10",  badge: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800", dot: "bg-emerald-400" },
  rose:    { border: "border-l-rose-400",    headerBg: "bg-gradient-to-r from-rose-50/80   to-pink-50/30    dark:from-rose-950/30   dark:to-pink-950/10",    badge: "bg-rose-100    text-rose-800    border-rose-200    dark:bg-rose-950/50    dark:text-rose-300    dark:border-rose-800",    dot: "bg-rose-400"    },
  orange:  { border: "border-l-orange-400",  headerBg: "bg-gradient-to-r from-orange-50/80 to-amber-50/30  dark:from-orange-950/30 dark:to-amber-950/10",   badge: "bg-orange-100  text-orange-800  border-orange-200  dark:bg-orange-950/50  dark:text-orange-300  dark:border-orange-800",  dot: "bg-orange-400"  },
  indigo:  { border: "border-l-indigo-400",  headerBg: "bg-gradient-to-r from-indigo-50/80 to-blue-50/30   dark:from-indigo-950/30 dark:to-blue-950/10",    badge: "bg-indigo-100  text-indigo-800  border-indigo-200  dark:bg-indigo-950/50  dark:text-indigo-300  dark:border-indigo-800",  dot: "bg-indigo-400"  },
  slate:   { border: "border-l-slate-400",   headerBg: "bg-gradient-to-r from-slate-50/80  to-gray-50/30   dark:from-slate-950/30  dark:to-gray-950/10",    badge: "bg-slate-100   text-slate-800   border-slate-200   dark:bg-slate-950/50   dark:text-slate-300   dark:border-slate-800",   dot: "bg-slate-400"   },
};

// ── Rule helpers ───────────────────────────────────────────────────────────────

function ruleIcon(type: RoomRule["type"]) {
  switch (type) {
    case "max_weight":
    case "min_weight":     return Scale;
    case "pet_type":       return PawPrint;
    case "max_pets":
    case "single_pet_only": return Users;
    default:               return AlertCircle;
  }
}

function ruleLabel(rule: RoomRule): string {
  switch (rule.type) {
    case "max_weight":     return `Max ${rule.value} lbs`;
    case "min_weight":     return `Min ${rule.value} lbs`;
    case "pet_type":       return `${rule.value} only`;
    case "max_pets":       return `Max ${rule.value} pets`;
    case "single_pet_only": return "Single pet";
    case "size_restriction": return `${rule.value} size`;
    default:               return "Rule";
  }
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  category: RoomCategory;
  rooms: FacilityRoom[];
  onEditCategory: () => void;
  onDeleteCategory: () => void;
  onAddUnit: () => void;
  onEditUnit: (room: FacilityRoom) => void;
  onToggleUnit: (id: string) => void;
  onDeleteUnit: (id: string) => void;
}

// ── Card ───────────────────────────────────────────────────────────────────────

export function RoomCategoryCard({
  category, rooms,
  onEditCategory, onDeleteCategory,
  onAddUnit, onEditUnit, onToggleUnit, onDeleteUnit,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const colors = COLOR_CONFIG[category.color];
  const activeRooms = rooms.filter((r) => r.active);
  const totalCapacity = activeRooms.reduce(
    (sum, r) => sum + (r.capacity ?? category.defaultCapacity), 0,
  );

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className={cn("px-5 py-4", colors.headerBg)}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
          >
            {expanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
          </button>

          {/* Category thumbnail */}
          {category.imageUrl ? (
            <div className="size-10 shrink-0 rounded-lg overflow-hidden border shadow-sm">
              <img src={category.imageUrl} alt={category.name} className="size-full object-cover" />
            </div>
          ) : (
            <div className={cn("size-3 rounded-full shrink-0", colors.dot)} />
          )}

          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base truncate">{category.name}</h3>
            {category.description && (
              <p className="text-muted-foreground text-xs truncate">{category.description}</p>
            )}
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-6 text-sm shrink-0 mr-2">
            {[
              { val: rooms.length,        label: "Units"    },
              { val: totalCapacity,        label: "Capacity" },
              { val: activeRooms.length,   label: "Active"   },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <p className="font-bold text-lg leading-none">{val}</p>
                <p className="text-muted-foreground text-[10px] uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" variant="outline"
              className="h-8 px-2.5 text-xs bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10"
              onClick={onAddUnit}
            >
              <Plus className="size-3 mr-1" />Add Unit
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-foreground" onClick={onEditCategory}>
              <Pencil className="size-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={onDeleteCategory}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Active rules chips */}
        {category.rules.filter((r) => r.enabled).length > 0 && (
          <div className="mt-3 ml-10 flex flex-wrap gap-1.5">
            {category.rules.filter((r) => r.enabled).map((rule) => {
              const Icon = ruleIcon(rule.type);
              return (
                <span key={rule.id}
                  className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium cursor-help", colors.badge)}
                  title={rule.clientMessage}
                >
                  <Icon className="size-3" />
                  {ruleLabel(rule)}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Expanded unit grid */}
      {expanded && (
        <div className="p-4 border-t border-border/40">
          {rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Building2 className="size-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground mb-3">No units yet</p>
              <Button size="sm" variant="outline" onClick={onAddUnit}>
                <Plus className="size-3 mr-1" />Add First Unit
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {rooms.map((room) => (
                <UnitTile
                  key={room.id}
                  room={room}
                  defaultCapacity={category.defaultCapacity}
                  categoryImageUrl={category.imageUrl}
                  onEdit={() => onEditUnit(room)}
                  onToggle={() => onToggleUnit(room.id)}
                  onDelete={() => onDeleteUnit(room.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Unit tile ──────────────────────────────────────────────────────────────────

function UnitTile({
  room, defaultCapacity, categoryImageUrl, onEdit, onToggle, onDelete,
}: {
  room: FacilityRoom;
  defaultCapacity: number;
  categoryImageUrl?: string;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const capacity = room.capacity ?? defaultCapacity;
  const displayImage = room.imageUrl ?? categoryImageUrl;
  return (
    <div className={cn(
      "group relative rounded-lg border overflow-hidden transition-all hover:border-foreground/20",
      room.active ? "bg-card" : "bg-muted/30 opacity-60",
    )}>
      {/* Room photo */}
      {displayImage ? (
        <div className="aspect-[4/3] relative">
          <img src={displayImage} alt={room.name} className="absolute inset-0 size-full object-cover" />
          <div className="absolute top-1.5 right-1.5">
            <Switch checked={room.active} onCheckedChange={onToggle} className="scale-[0.65]" />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center aspect-[4/3] bg-muted/40 relative">
          <ImageIcon className="size-5 text-muted-foreground/25" />
          <div className="absolute top-1.5 right-1.5">
            <Switch checked={room.active} onCheckedChange={onToggle} className="scale-[0.65]" />
          </div>
        </div>
      )}
      <div className="p-2.5">
        <p className="text-xs font-semibold truncate leading-tight">{room.name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className={cn("text-[10px] font-medium", room.active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
            {room.active ? "Active" : "Inactive"}
          </span>
          <span className="text-[10px] text-muted-foreground">Cap {capacity}</span>
        </div>
        {room.staffNotes && (
          <p className="mt-1 text-[10px] text-muted-foreground truncate" title={room.staffNotes}>
            {room.staffNotes}
          </p>
        )}
      </div>
      {/* Hover overlay */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2 pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-card via-card/80 to-transparent pt-6">
        <button onClick={onEdit} className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-1">Edit</button>
        <button onClick={onDelete} className="text-[10px] text-destructive/70 hover:text-destructive underline underline-offset-1">Remove</button>
      </div>
    </div>
  );
}
