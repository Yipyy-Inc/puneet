"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Sunrise,
  Sun,
  Moon,
  Plus,
  ChevronDown,
  Clock,
  Camera,
  PenLine,
  Trash2,
  RepeatIcon,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import {
  shiftTaskGroups,
  workTaskLibrary,
  type ShiftTaskGroup,
} from "@/data/work-tasks";
import { shifts } from "@/data/shifts";
import { TaskWizard } from "./TaskWizard";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SHIFT_ICONS: Record<string, typeof Sunrise> = {
  morning: Sunrise,
  afternoon: Sun,
  night: Moon,
};

const SHIFT_COLORS: Record<string, string> = {
  morning: "text-amber-600 bg-amber-50 border-amber-200",
  afternoon: "text-orange-600 bg-orange-50 border-orange-200",
  night: "text-blue-600 bg-blue-50 border-blue-200",
};

const PRIORITY_COLORS = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function dayPattern(group: ShiftTaskGroup) {
  if (!group.isRecurring) return group.specificDate ?? "One-time";
  if (group.daysOfWeek.length === 0) return "Every day";
  if (group.daysOfWeek.length === 7) return "Every day";
  const weekdays = [1, 2, 3, 4, 5];
  const weekend = [0, 6];
  if (weekdays.every((d) => group.daysOfWeek.includes(d)) && group.daysOfWeek.length === 5)
    return "Weekdays";
  if (weekend.every((d) => group.daysOfWeek.includes(d)) && group.daysOfWeek.length === 2)
    return "Weekends";
  return group.daysOfWeek.map((d) => DAYS_SHORT[d]).join(", ");
}

// ── Group Card ────────────────────────────────────────────────────────────────

function ShiftGroupCard({ group }: { group: ShiftTaskGroup }) {
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(group.isActive);

  const shift = shifts.find((s) => s.id === group.shiftId);
  const ShiftIcon = SHIFT_ICONS[group.shiftId] ?? Clock;
  const tasks = group.taskIds
    .map((id) => workTaskLibrary.find((t) => t.id === id))
    .filter(Boolean) as (typeof workTaskLibrary)[0][];

  const totalMinutes = tasks.reduce((s, t) => s + t.estimatedMinutes, 0);

  return (
    <Card className={cn("overflow-hidden transition-all", !active && "opacity-60")}>
      <CardHeader className="px-5 pb-0 pt-4">
        <div className="flex items-start gap-4">
          {/* Shift badge */}
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg border",
              SHIFT_COLORS[group.shiftId] ?? "bg-slate-50 text-slate-600 border-slate-200",
            )}
          >
            <ShiftIcon className="size-5" />
          </div>

          {/* Title + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold">{group.name}</p>
              {!active && (
                <Badge variant="secondary" className="text-[10px]">
                  Inactive
                </Badge>
              )}
            </div>
            {group.description && (
              <p className="text-muted-foreground mt-0.5 text-xs">{group.description}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium",
                  SHIFT_COLORS[group.shiftId],
                )}
              >
                <ShiftIcon className="size-3" />
                {shift?.name ?? group.shiftId} · {shift?.startTime}–{shift?.endTime}
              </span>
              <span className="flex items-center gap-1">
                {group.isRecurring ? (
                  <RepeatIcon className="text-muted-foreground size-3" />
                ) : (
                  <CalendarDays className="text-muted-foreground size-3" />
                )}
                {dayPattern(group)}
              </span>
              <span className="flex items-center gap-1">
                <ClipboardList className="text-muted-foreground size-3" />
                {tasks.length} task{tasks.length !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="text-muted-foreground size-3" />
                {totalMinutes} min total
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex shrink-0 items-center gap-3">
            <Switch checked={active} onCheckedChange={setActive} />
            <Button variant="ghost" size="icon" className="size-8">
              <PenLine className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive size-8">
              <Trash2 className="size-4" />
            </Button>
            <button
              onClick={() => setExpanded((p) => !p)}
              className={cn(
                "text-muted-foreground hover:text-foreground transition-transform",
                expanded && "rotate-180",
              )}
            >
              <ChevronDown className="size-5" />
            </button>
          </div>
        </div>
      </CardHeader>

      {/* Expanded task list */}
      {expanded && (
        <CardContent className="px-5 pt-4 pb-4">
          <div className="border-t pt-4">
            <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
              Tasks in this group
            </p>
            <div className="space-y-2">
              {tasks.map((task, i) => (
                <div
                  key={task.id}
                  className="bg-muted/20 flex items-center gap-3 rounded-lg px-3 py-2.5"
                >
                  <span className="text-muted-foreground w-5 shrink-0 text-center text-[11px]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.description && (
                      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      className={cn(
                        "px-1.5 py-0 text-[10px]",
                        PRIORITY_COLORS[task.priority],
                      )}
                      variant="secondary"
                    >
                      {task.priority}
                    </Badge>
                    <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
                      <Clock className="size-3" />
                      {task.estimatedMinutes}m
                    </span>
                    {task.requiresPhoto && (
                      <span title="Photo required">
                        <Camera className="text-muted-foreground size-3.5" />
                      </span>
                    )}
                    {task.requiresSignoff && (
                      <span title="Sign-off required">
                        <PenLine className="text-muted-foreground size-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ShiftTasksTab() {
  const [wizardOpen, setWizardOpen] = useState(false);

  // Group task groups by shift
  const byShift = shifts.map((shift) => ({
    shift,
    groups: shiftTaskGroups.filter((g) => g.shiftId === shift.id),
  }));

  const totalActive = shiftTaskGroups.filter((g) => g.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            Task groups automatically assigned to whoever covers each shift.
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="gap-2">
          <Plus className="size-4" />
          New Shift Task Group
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {shifts.map((shift) => {
          const groups = shiftTaskGroups.filter((g) => g.shiftId === shift.id);
          const ShiftIcon = SHIFT_ICONS[shift.id] ?? Clock;
          const taskCount = groups.reduce((s, g) => s + g.taskIds.length, 0);
          return (
            <div
              key={shift.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3",
                SHIFT_COLORS[shift.id],
              )}
            >
              <ShiftIcon className="size-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{shift.name}</p>
                <p className="text-[11px] opacity-80">
                  {groups.length} group{groups.length !== 1 ? "s" : ""} · {taskCount} task
                  {taskCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Groups by shift */}
      {byShift.map(({ shift, groups }) => {
        const ShiftIcon = SHIFT_ICONS[shift.id] ?? Clock;
        return (
          <div key={shift.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <ShiftIcon
                className={cn(
                  "size-4",
                  shift.id === "morning" && "text-amber-600",
                  shift.id === "afternoon" && "text-orange-600",
                  shift.id === "night" && "text-blue-600",
                )}
              />
              <h3 className="text-sm font-semibold">
                {shift.name} Shift{" "}
                <span className="text-muted-foreground font-normal">
                  · {shift.startTime}–{shift.endTime}
                </span>
              </h3>
              <Badge variant="secondary" className="text-[10px]">
                {groups.length}
              </Badge>
            </div>

            {groups.length === 0 ? (
              <button
                onClick={() => setWizardOpen(true)}
                className="border-border hover:border-primary/30 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition-colors"
              >
                <Plus className="text-muted-foreground size-5" />
                <span className="text-muted-foreground text-sm">
                  Add task group for {shift.name.toLowerCase()} shift
                </span>
              </button>
            ) : (
              <div className="space-y-3">
                {groups.map((g) => (
                  <ShiftGroupCard key={g.id} group={g} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      <TaskWizard open={wizardOpen} onClose={() => setWizardOpen(false)} defaultType="shift" />
    </div>
  );
}
