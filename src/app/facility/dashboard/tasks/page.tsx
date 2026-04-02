"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ListChecks,
  CheckCircle as CheckCircleIcon,
  CalendarDays,
} from "lucide-react";
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

  const searchParams = useSearchParams();
  const highlightTaskId = searchParams?.get("taskId") ?? null;
  const [highlightFade, setHighlightFade] = useState(!!highlightTaskId);

  // Auto-fade the highlight after 3 seconds
  useEffect(() => {
    if (highlightTaskId) {
      requestAnimationFrame(() => setHighlightFade(true));
      const timer = setTimeout(() => {
        requestAnimationFrame(() => setHighlightFade(false));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightTaskId]);

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

  // Compute dates with tasks for calendar dots
  const datesWithTasks = useMemo(() => {
    const dates = new Set<string>();
    // Check a range of dates around today for tasks
    for (let i = -15; i <= 15; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().slice(0, 10);
      const tasks = generateAllTasksForDate(ds);
      if (tasks.length > 0) dates.add(ds);
    }
    return dates;
  }, []);

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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-1 gap-1.5">
                <CalendarDays className="size-4" />
                {fmtDate(today)}
                {totalTasks > 0 && (
                  <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                    {totalTasks} task{totalTasks !== 1 ? "s" : ""}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarWidget
                mode="single"
                selected={today}
                onSelect={(date) => {
                  if (date) {
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    const sel = new Date(date);
                    sel.setHours(0, 0, 0, 0);
                    const diff = Math.round(
                      (sel.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                    );
                    setDateOffset(diff);
                  }
                }}
              />
              {datesWithTasks.size > 0 && (
                <div className="border-t px-3 py-2">
                  <p className="text-muted-foreground text-[10px]">
                    <span className="bg-primary mr-1 inline-block size-1.5 rounded-full" />
                    {datesWithTasks.size} day
                    {datesWithTasks.size !== 1 ? "s" : ""} with active tasks
                    this month
                  </p>
                </div>
              )}
            </PopoverContent>
          </Popover>
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
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-3">
          {/* Staff filter */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Show:</span>
            <div className="bg-muted flex rounded-full p-0.5">
              {(
                [
                  { key: "mine", label: "My Tasks" },
                  { key: "all", label: "All Tasks" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setStaffFilter(opt.key)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-all",
                    staffFilter === opt.key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-border hidden h-5 w-px sm:block" />

          {/* View mode */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">View:</span>
            <div className="bg-muted flex rounded-full p-0.5">
              {(["time", "staff", "pet"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium capitalize transition-all",
                    viewMode === mode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  By {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-border hidden h-5 w-px sm:block" />

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[130px] rounded-full text-xs">
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
        </CardContent>
      </Card>

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
                      id={`task-${task.id}`}
                      className={cn(
                        "flex items-start gap-3 py-3 first:pt-3",
                        task.status === "completed" && "opacity-50",
                        task.isOverdue &&
                          "rounded-lg border border-red-200 bg-red-50/50 px-3",
                        highlightTaskId === task.id &&
                          highlightFade &&
                          "border-primary bg-primary/5 animate-pulse rounded-lg border-2 px-3",
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

                      {/* Actions */}
                      {(task.status === "pending" ||
                        task.status === "overdue") && (
                        <div className="flex shrink-0 items-center gap-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 text-[10px]"
                              >
                                <CalendarDays className="size-3" />
                                Reschedule
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                              <CalendarWidget
                                mode="single"
                                onSelect={(date) => {
                                  if (date) {
                                    toast.success(
                                      `${task.name} rescheduled to ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
                                    );
                                  }
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px]"
                            onClick={() => setCompleteTask(task)}
                          >
                            Complete
                          </Button>
                        </div>
                      )}
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
