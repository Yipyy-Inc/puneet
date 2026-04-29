"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Plus,
  ChevronDown,
  Clock,
  Camera,
  PenLine,
  Trash2,
  Users,
  ClipboardList,
} from "lucide-react";
import {
  positionTaskGroups,
  workTaskLibrary,
  type PositionTaskGroup,
} from "@/data/work-tasks";
import { departments } from "@/data/shifts";
import { TaskWizard } from "./TaskWizard";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEPT_COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  red: "bg-red-50 text-red-700 border-red-200",
  teal: "bg-teal-50 text-teal-700 border-teal-200",
  pink: "bg-pink-50 text-pink-700 border-pink-200",
  slate: "bg-slate-50 text-slate-700 border-slate-200",
};

const DEPT_DOT_MAP: Record<string, string> = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  purple: "bg-purple-500",
  amber: "bg-amber-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  teal: "bg-teal-500",
  pink: "bg-pink-500",
  slate: "bg-slate-500",
};

const PRIORITY_COLORS = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

// ── Position Group Card ───────────────────────────────────────────────────────

function PositionGroupCard({ group }: { group: PositionTaskGroup }) {
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(group.isActive);

  const dept = departments.find((d) => d.id === group.departmentId);
  const deptColor = dept?.color ?? "slate";

  const tasks = group.taskIds
    .map((id) => workTaskLibrary.find((t) => t.id === id))
    .filter(Boolean) as (typeof workTaskLibrary)[0][];

  const totalMinutes = tasks.reduce((s, t) => s + t.estimatedMinutes, 0);

  return (
    <Card className={cn("overflow-hidden transition-all", !active && "opacity-60")}>
      <CardHeader className="px-5 pb-0 pt-4">
        <div className="flex items-start gap-4">
          {/* Dept icon */}
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg border",
              DEPT_COLOR_MAP[deptColor],
            )}
          >
            <Users className="size-5" />
          </div>

          {/* Title + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
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
              {dept && (
                <span
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium",
                    DEPT_COLOR_MAP[deptColor],
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", DEPT_DOT_MAP[deptColor])} />
                  {dept.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <ClipboardList className="text-muted-foreground size-3" />
                {tasks.length} task{tasks.length !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="text-muted-foreground size-3" />
                ~{totalMinutes} min per shift
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex shrink-0 items-center gap-3">
            <Switch checked={active} onCheckedChange={setActive} />
            <Button variant="ghost" size="icon" className="size-8">
              <PenLine className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive/70 hover:text-destructive size-8"
            >
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
        <CardContent className="px-5 pb-4 pt-4">
          <div className="border-t pt-4">
            <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
              Tasks assigned to this position
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
                      className={cn("px-1.5 py-0 text-[10px]", PRIORITY_COLORS[task.priority])}
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

// ── Unassigned Dept Card ──────────────────────────────────────────────────────

function UnassignedDeptCard({
  dept,
  onAdd,
}: {
  dept: (typeof departments)[0];
  onAdd: () => void;
}) {
  const deptColor = dept.color;
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border-2 border-dashed px-5 py-4",
        "border-border bg-muted/10",
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg border",
          DEPT_COLOR_MAP[deptColor],
        )}
      >
        <Users className="size-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{dept.name}</p>
        <p className="text-muted-foreground text-xs">{dept.description}</p>
      </div>
      <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={onAdd}>
        <Plus className="size-4" />
        Assign Tasks
      </Button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function PositionTasksTab() {
  const [wizardOpen, setWizardOpen] = useState(false);

  const assignedDeptIds = new Set(positionTaskGroups.map((g) => g.departmentId));
  const unassignedDepts = departments.filter((d) => !assignedDeptIds.has(d.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Tasks tied to a department — every staff member in that role sees them each shift.
        </p>
        <Button onClick={() => setWizardOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Assign Tasks to Position
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
        <div className="bg-card flex flex-col gap-1 rounded-xl border px-4 py-3">
          <span className="text-muted-foreground text-[11px]">Positions with tasks</span>
          <span className="text-2xl font-bold">{positionTaskGroups.filter((g) => g.isActive).length}</span>
        </div>
        <div className="bg-card flex flex-col gap-1 rounded-xl border px-4 py-3">
          <span className="text-muted-foreground text-[11px]">Total tasks assigned</span>
          <span className="text-2xl font-bold">
            {positionTaskGroups.reduce((s, g) => s + g.taskIds.length, 0)}
          </span>
        </div>
        <div className="bg-card flex flex-col gap-1 rounded-xl border px-4 py-3">
          <span className="text-muted-foreground text-[11px]">Unassigned positions</span>
          <span className="text-2xl font-bold">{unassignedDepts.length}</span>
        </div>
      </div>

      {/* Active position groups */}
      {positionTaskGroups.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">Configured Positions</p>
          {positionTaskGroups.map((g) => (
            <PositionGroupCard key={g.id} group={g} />
          ))}
        </div>
      )}

      {/* Unassigned positions */}
      {unassignedDepts.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-500">Positions without tasks</p>
          <div className="space-y-2">
            {unassignedDepts.map((dept) => (
              <UnassignedDeptCard
                key={dept.id}
                dept={dept}
                onAdd={() => setWizardOpen(true)}
              />
            ))}
          </div>
        </div>
      )}

      <TaskWizard open={wizardOpen} onClose={() => setWizardOpen(false)} defaultType="position" />
    </div>
  );
}
