"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Edit,
  GripVertical,
  ImageOff,
  Lock,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import {
  SKILL_LEVEL_LABELS,
  type TrainingDiscipline,
  type TrainingPackage,
} from "@/types/training";

const CLASS_TYPE_LABELS: Record<TrainingPackage["classType"], string> = {
  group: "Group",
  private: "Private",
};

const CLASS_TYPE_CLS: Record<TrainingPackage["classType"], string> = {
  group: "bg-indigo-100 text-indigo-700 border-indigo-200",
  private: "bg-orange-100 text-orange-700 border-orange-200",
};

interface Props {
  program: TrainingPackage;
  discipline?: TrainingDiscipline;
  /** Number of TrainingSeries that have been run as an instance of this
   *  program — shown as the "X series run" stat on the card. */
  seriesRunCount: number;
  prerequisiteNames: string[];
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProgramCard({
  program,
  discipline,
  seriesRunCount,
  prerequisiteNames,
  onToggleActive,
  onEdit,
  onDelete,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: program.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow",
        "hover:shadow-md",
        isDragging && "z-30 shadow-lg ring-2 ring-indigo-300",
        !program.isActive && "opacity-75",
      )}
    >
      {/* Cover ────────────────────────────────────────────────────────── */}
      <div className="relative h-28 w-full overflow-hidden bg-slate-100">
        {program.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={program.imageUrl}
            alt=""
            className="size-full object-cover"
            onError={(ev) => {
              (ev.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-slate-300">
            <ImageOff className="size-6" />
          </div>
        )}

        {/* Drag handle — top-left, on the cover. Listeners are scoped here
            so clicks elsewhere on the card don't accidentally start a drag. */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className={cn(
            "absolute left-2 top-2 flex size-7 items-center justify-center rounded-md bg-white/85 text-slate-500 shadow-sm backdrop-blur-sm transition-colors",
            "hover:bg-white hover:text-slate-800 cursor-grab active:cursor-grabbing",
            isDragging && "cursor-grabbing",
          )}
          aria-label={`Drag to reorder ${program.name}`}
          title="Drag to reorder"
        >
          <GripVertical className="size-4" />
        </button>

        {/* Top-right badges — popular + active state */}
        <div className="absolute right-2 top-2 flex flex-wrap items-center gap-1.5">
          {program.popular && (
            <Badge className="border-0 bg-amber-500 text-[10px] text-white shadow-sm">
              <Star className="mr-1 size-2.5" />
              Popular
            </Badge>
          )}
          {!program.isActive && (
            <Badge
              variant="outline"
              className="border-slate-200 bg-white/85 text-[10px] text-slate-600 backdrop-blur-sm"
            >
              Inactive
            </Badge>
          )}
        </div>
      </div>

      {/* Body ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm/snug font-bold text-slate-900">
            {program.name}
          </p>
          <p className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
            ${program.price}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {discipline && (
            <Badge
              variant="outline"
              className="gap-1 border-transparent text-[10px]"
              style={{
                backgroundColor: `${discipline.color}1a`,
                color: discipline.color,
              }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: discipline.color }}
              />
              {discipline.name}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={cn(
              "border text-[10px]",
              CLASS_TYPE_CLS[program.classType],
            )}
          >
            {CLASS_TYPE_LABELS[program.classType]}
          </Badge>
          <Badge
            variant="outline"
            className="border-slate-200 bg-slate-50 text-[10px] text-slate-600"
          >
            {SKILL_LEVEL_LABELS[program.skillLevel]}
          </Badge>
          {prerequisiteNames.length > 0 && (
            <Badge
              variant="outline"
              className="gap-1 border-slate-200 bg-slate-50 text-[10px] text-slate-600"
              title={`Requires: ${prerequisiteNames.join(", ")}`}
            >
              <Lock className="size-2.5" />
              {prerequisiteNames.length} prereq
              {prerequisiteNames.length === 1 ? "" : "s"}
            </Badge>
          )}
        </div>

        {program.description && (
          <p className="text-muted-foreground line-clamp-2 text-xs">
            {program.description}
          </p>
        )}

        <div className="text-muted-foreground mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <span>
            {program.sessions}{" "}
            {program.sessions === 1 ? "session" : "sessions"}
          </span>
          {program.classType === "group" && program.maxGroupSize && (
            <span>Max {program.maxGroupSize} dogs</span>
          )}
          <span>Valid {program.validityDays}d</span>
        </div>

        {/* Footer — series run count + actions */}
        <div className="-mx-3.5 -mb-3.5 mt-2 flex items-center justify-between gap-2 border-t bg-slate-50/60 px-3.5 py-2">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 tabular-nums"
            title="Series that have been scheduled as this program"
          >
            <Users className="size-3.5 text-slate-400" />
            {seriesRunCount}{" "}
            <span className="text-muted-foreground font-normal">
              series run
            </span>
          </span>
          <div className="flex items-center gap-1">
            <Switch
              checked={program.isActive}
              onCheckedChange={onToggleActive}
              aria-label={`Toggle ${program.name} active`}
              className="scale-90"
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onEdit}
              title="Edit program"
            >
              <Edit className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive size-8"
              onClick={onDelete}
              title="Delete program"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
