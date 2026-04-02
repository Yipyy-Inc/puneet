"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Sunrise,
  Sun,
  Moon,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Pill,
  UtensilsCrossed,
  Sparkles,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { FacilityTask } from "@/data/facility-tasks";
import { shifts, getStaffOnShift } from "@/data/shifts";
import { facilityConfig } from "@/data/facility-config";
import { useFacilityRole } from "@/hooks/use-facility-role";
import { ClickableStatCard } from "@/components/ui/ClickableStatCard";
import { ListChecks, CheckCircle as CheckCircleIcon } from "lucide-react";
import { generateAllTasksForDate } from "@/lib/booking-task-generator";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtTimestamp(ts: string) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const shiftIcons: Record<string, typeof Sunrise> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
  night: Moon,
};

const categoryIcons: Record<string, typeof UtensilsCrossed> = {
  feeding: UtensilsCrossed,
  medication: Pill,
  activity: Sparkles,
  care: Sparkles,
  cleanup: Sparkles,
};

const FEEDBACK_OPTIONS = facilityConfig.careTaskFeedback.feeding;
const MED_FEEDBACK = facilityConfig.careTaskFeedback.medication;

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TaskManagementPage() {
  const { role } = useFacilityRole();
  const isManager = role === "owner" || role === "manager";

  const [dateOffset, setDateOffset] = useState(0);
  const [viewMode, setViewMode] = useState<"time" | "staff" | "pet">("time");
  const [statusFilter, setStatusFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState<"mine" | "all">(
    isManager ? "all" : "mine",
  );
  const [completeTask, setCompleteTask] = useState<FacilityTask | null>(null);
  const [feedback, setFeedback] = useState("");
  const [notes, setNotes] = useState("");

  // Mock: current logged-in staff (would come from auth in production)
  const currentStaffName = "Jessica M.";

  const today = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    return d;
  }, [dateOffset]);

  const dateStr = today.toISOString().slice(0, 10);

  // Generate tasks from booking care instructions for this date
  const dayTasks = useMemo(() => {
    let tasks = generateAllTasksForDate(dateStr);
    if (staffFilter === "mine") {
      tasks = tasks.filter((t) => t.assignedToName === currentStaffName);
    }
    if (statusFilter !== "all") {
      tasks = tasks.filter((t) => t.status === statusFilter);
    }
    return tasks;
  }, [dateStr, statusFilter, staffFilter, currentStaffName]);

  const totalTasks = dayTasks.length;
  const completedTasks = dayTasks.filter(
    (t) => t.status === "completed",
  ).length;
  const overdueTasks = dayTasks.filter((t) => t.isOverdue).length;
  const pendingTasks = totalTasks - completedTasks;

  // Group tasks
  const grouped = useMemo(() => {
    if (viewMode === "time") {
      const groups: Record<string, FacilityTask[]> = {
        morning: [],
        afternoon: [],
        evening: [],
      };
      for (const t of dayTasks)
        groups[t.shiftPeriod]?.push(t) ?? (groups[t.shiftPeriod] = [t]);
      return Object.entries(groups).filter(([, tasks]) => tasks.length > 0);
    }
    if (viewMode === "staff") {
      const groups = new Map<string, FacilityTask[]>();
      for (const t of dayTasks) {
        const key = t.assignedToName ?? "Unassigned";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(t);
      }
      return Array.from(groups.entries());
    }
    // by pet
    const groups = new Map<string, FacilityTask[]>();
    for (const t of dayTasks) {
      if (!groups.has(t.petName)) groups.set(t.petName, []);
      groups.get(t.petName)!.push(t);
    }
    return Array.from(groups.entries());
  }, [dayTasks, viewMode]);

  const handleComplete = () => {
    if (!completeTask) return;
    toast.success(`Task completed: ${completeTask.name}`);
    setCompleteTask(null);
    setFeedback("");
    setNotes("");
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Task Management</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Track and manage all care tasks across bookings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateOffset((p) => p - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant={dateOffset === 0 ? "default" : "outline"}
            size="sm"
            onClick={() => setDateOffset(0)}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateOffset((p) => p + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
          <span className="text-muted-foreground ml-2 text-sm font-medium">
            {fmtDate(today)}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <ClickableStatCard
          title="Total Tasks"
          value={totalTasks}
          subtitle="All tasks"
          icon={ListChecks}
          onClick={() =>
            setStatusFilter(statusFilter === "all" ? "all" : "all")
          }
          isActive={statusFilter === "all"}
        />
        <ClickableStatCard
          title="Completed"
          value={completedTasks}
          subtitle="Done"
          icon={CheckCircleIcon}
          onClick={() =>
            setStatusFilter(statusFilter === "completed" ? "all" : "completed")
          }
          isActive={statusFilter === "completed"}
          valueClassName="text-emerald-600"
        />
        <ClickableStatCard
          title="Pending"
          value={pendingTasks}
          subtitle="Awaiting action"
          icon={Clock}
          onClick={() =>
            setStatusFilter(statusFilter === "pending" ? "all" : "pending")
          }
          isActive={statusFilter === "pending"}
          valueClassName="text-amber-600"
        />
        <ClickableStatCard
          title="Overdue"
          value={overdueTasks}
          subtitle="Needs attention"
          icon={AlertTriangle}
          onClick={() =>
            setStatusFilter(statusFilter === "overdue" ? "all" : "overdue")
          }
          isActive={statusFilter === "overdue"}
          valueClassName="text-red-600"
        />
      </div>

      {/* Overdue alert banner */}
      {overdueTasks > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">
              {overdueTasks} overdue task{overdueTasks !== 1 ? "s" : ""} need
              attention
            </p>
            <div className="mt-1.5 space-y-1">
              {dayTasks
                .filter((t) => t.isOverdue)
                .map((t) => (
                  <p key={t.id} className="text-xs text-red-700">
                    {t.isCritical && "⚠ CRITICAL: "}
                    {t.name} — assigned to {t.assignedToName ?? "unassigned"},
                    was due at {fmtTime(t.scheduledTime)}
                  </p>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* My Tasks / All Tasks toggle */}
        <div className="flex rounded-lg border">
          <button
            onClick={() => setStaffFilter("mine")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              staffFilter === "mine"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            My Tasks
          </button>
          <button
            onClick={() => setStaffFilter("all")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              staffFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            All Tasks
          </button>
        </div>
        <span className="text-muted-foreground text-xs">
          {staffFilter === "mine"
            ? `Showing ${currentStaffName}'s tasks`
            : "Showing all staff"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border">
          {(["time", "staff", "pet"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                viewMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
            >
              By {mode}
            </button>
          ))}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task groups */}
      <div className="space-y-6">
        {grouped.map(([groupKey, tasks]) => {
          const shiftDef = shifts.find((s) => s.id === groupKey);
          const ShiftIcon = shiftIcons[groupKey] ?? Clock;
          const groupDone = tasks.filter(
            (t) => t.status === "completed",
          ).length;

          // Staff on shift (for time view)
          const onShift =
            viewMode === "time" && shiftDef
              ? getStaffOnShift(dateStr, shiftDef.id)
              : [];

          return (
            <Card key={groupKey} className="overflow-hidden">
              <CardHeader className="bg-muted/30 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {viewMode === "time" ? (
                      <ShiftIcon className="size-4" />
                    ) : viewMode === "staff" ? (
                      <User className="size-4" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    <span className="capitalize">
                      {viewMode === "time" && shiftDef
                        ? `${shiftDef.name} (${fmtTime(shiftDef.startTime)} – ${fmtTime(shiftDef.endTime)})`
                        : groupKey}
                    </span>
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    {onShift.length > 0 && (
                      <span className="text-muted-foreground text-xs">
                        Staff: {onShift.map((s) => s.staffName).join(", ")}
                      </span>
                    )}
                    <span className="text-muted-foreground text-xs">
                      {groupDone} of {tasks.length} done
                    </span>
                    <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{
                          width: `${tasks.length > 0 ? (groupDone / tasks.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="divide-y pt-0">
                {tasks.map((task) => {
                  const CatIcon = categoryIcons[task.category] ?? Sparkles;
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-start gap-3 py-3 first:pt-3",
                        task.status === "completed" && "opacity-50",
                        task.isOverdue &&
                          "rounded-lg border border-red-200 bg-red-50/50 px-3",
                      )}
                    >
                      {/* Status icon */}
                      {task.status === "completed" ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      ) : task.isOverdue ? (
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
                      ) : (
                        <Circle className="text-muted-foreground/30 mt-0.5 size-4 shrink-0" />
                      )}

                      {/* Task info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <CatIcon className="text-muted-foreground size-3.5" />
                          <span
                            className={cn(
                              "text-sm font-medium",
                              task.status === "completed" && "line-through",
                            )}
                          >
                            {task.name}
                          </span>
                          {task.isCritical && (
                            <Badge
                              variant="outline"
                              className="border-amber-200 bg-amber-50 px-1.5 py-0 text-[9px] text-amber-700"
                            >
                              Critical
                            </Badge>
                          )}
                          {task.isOverdue && (
                            <Badge
                              variant="outline"
                              className="border-red-200 bg-red-50 px-1.5 py-0 text-[9px] text-red-700"
                            >
                              Overdue
                            </Badge>
                          )}
                          {task.autoAssigned && (
                            <span className="text-muted-foreground/50 text-[9px]">
                              auto
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {task.description}
                          </p>
                        )}
                        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 text-[11px]">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {fmtTime(task.scheduledTime)}
                          </span>
                          <span>{task.petName}</span>
                          {task.assignedToName && (
                            <span>→ {task.assignedToName}</span>
                          )}
                          {task.requiredSkill && (
                            <span className="italic">
                              requires: {task.requiredSkill.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>

                        {/* Completion info */}
                        {task.status === "completed" && (
                          <div className="mt-1 flex items-center gap-2 text-[11px]">
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                              {task.feedback}
                            </span>
                            <span className="text-muted-foreground">
                              {task.completedByName} at{" "}
                              {task.completedAt
                                ? fmtTimestamp(task.completedAt)
                                : ""}
                            </span>
                          </div>
                        )}
                        {task.completionNotes && (
                          <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-[10px] text-amber-700">
                            ⚠ {task.completionNotes}
                          </p>
                        )}
                      </div>

                      {/* Action */}
                      {task.status === "pending" ||
                      task.status === "overdue" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 shrink-0 text-[11px]"
                          onClick={() => setCompleteTask(task)}
                        >
                          Complete
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Completion modal */}
      <Dialog
        open={!!completeTask}
        onOpenChange={(open) => {
          if (!open) {
            setCompleteTask(null);
            setFeedback("");
            setNotes("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-5 text-emerald-500" />
              Complete Task
            </DialogTitle>
          </DialogHeader>
          {completeTask && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/20 rounded-lg border p-3">
                <p className="text-sm font-semibold">{completeTask.name}</p>
                {completeTask.description && (
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {completeTask.description}
                  </p>
                )}
                <p className="text-muted-foreground mt-1 text-xs">
                  {completeTask.petName} · {fmtTime(completeTask.scheduledTime)}
                </p>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Result</p>
                <Select value={feedback} onValueChange={setFeedback}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select feedback..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(completeTask.category === "medication"
                      ? MED_FEEDBACK
                      : FEEDBACK_OPTIONS
                    ).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Notes (optional)</p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any observations or handoff notes..."
                  className="min-h-[80px] text-sm"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteTask(null)}>
              Cancel
            </Button>
            <Button onClick={handleComplete} disabled={!feedback}>
              Mark as Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
