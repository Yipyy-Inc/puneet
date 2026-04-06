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
import { departments, getStaffDepartment } from "@/data/shifts";
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
  const [deptFilter, setDeptFilter] = useState("all");
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
    if (deptFilter !== "all") {
      tasks = tasks.filter((t) => {
        if (!t.assignedToId) return false;
        const dept = getStaffDepartment(t.assignedToId);
        return dept?.id === deptFilter;
      });
    }
    return tasks;
  }, [dateStr, statusFilter, staffFilter, deptFilter, currentStaffName]);

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
    <div className="space-y-5 p-5 md:p-7">
      {/* Header + Date Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task Management</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {fmtDate(today)}
            {totalTasks > 0 && (
              <span className="ml-1.5">
                · {totalTasks} task{totalTasks !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-lg"
            onClick={() => setDateOffset((p) => p - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant={dateOffset === 0 ? "default" : "outline"}
            size="sm"
            className="h-8 rounded-lg px-3 text-xs"
            onClick={() => setDateOffset(0)}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-lg"
            onClick={() => setDateOffset((p) => p + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="ml-1 h-8 gap-1.5 rounded-lg text-xs"
              >
                <CalendarDays className="size-3.5" />
                Pick Date
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
                  </p>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
      <Card className="border-border/50">
        <CardContent className="flex flex-wrap items-center gap-4 px-4 py-3">
          {/* Staff filter */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-[11px] font-medium">
              Show:
            </span>
            <div className="flex gap-1">
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
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                    staffFilter === opt.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
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
            <span className="text-muted-foreground text-[11px] font-medium">
              View:
            </span>
            <div className="flex gap-1">
              {(["time", "staff", "pet"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-all",
                    viewMode === mode
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
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
            <span className="text-muted-foreground text-[11px] font-medium">
              Status:
            </span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[130px] rounded-lg text-xs">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-amber-500" />
                    Pending
                  </span>
                </SelectItem>
                <SelectItem value="completed">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    Completed
                  </span>
                </SelectItem>
                <SelectItem value="overdue">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-red-500" />
                    Overdue
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-border hidden h-5 w-px sm:block" />

          {/* Department filter */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-[11px] font-medium">
              Dept:
            </span>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="h-8 w-[160px] rounded-lg text-xs">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => {
                  const dotColor: Record<string, string> = {
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
                  return (
                    <SelectItem key={dept.id} value={dept.id}>
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            dotColor[dept.color] ?? "bg-slate-500",
                          )}
                        />
                        {dept.name}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Task groups */}
      {grouped.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16">
            <ListChecks className="text-muted-foreground/20 size-12" />
            <p className="text-muted-foreground mt-3 text-sm font-medium">
              No tasks for {fmtDate(today)}
            </p>
            <p className="text-muted-foreground/60 mt-1 text-xs">
              {dateOffset !== 0
                ? "Try navigating to today or another date with active bookings"
                : "Tasks are generated from bookings with care instructions"}
            </p>
            {dateOffset !== 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-1.5"
                onClick={() => setDateOffset(0)}
              >
                Go to Today
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      <div className="space-y-5">
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
            <Card key={groupKey} className="border-border/50 overflow-hidden">
              <CardHeader className="bg-muted/20 px-5 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                    {viewMode === "time" ? (
                      <ShiftIcon className="size-3.5" />
                    ) : viewMode === "staff" ? (
                      <User className="size-3.5" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    {viewMode === "time" && shiftDef
                      ? `${shiftDef.name} (${fmtTime(shiftDef.startTime)} – ${fmtTime(shiftDef.endTime)})`
                      : groupKey}
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    {onShift.length > 0 && (
                      <span className="text-muted-foreground text-[11px]">
                        {onShift.map((s) => s.staffName).join(", ")}
                      </span>
                    )}
                    <span className="text-muted-foreground text-[11px]">
                      {groupDone}/{tasks.length}
                    </span>
                    <div className="bg-muted h-1 w-14 overflow-hidden rounded-full">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          groupDone === tasks.length
                            ? "bg-emerald-500"
                            : "bg-primary",
                        )}
                        style={{
                          width: `${tasks.length > 0 ? (groupDone / tasks.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    {groupDone < tasks.length && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px]"
                        onClick={() =>
                          toast.success(
                            `${tasks.length - groupDone} tasks marked complete`,
                          )
                        }
                      >
                        Complete All
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="divide-y px-5 pt-0">
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
                          {!task.isOverdue &&
                            task.status === "pending" &&
                            (() => {
                              const [h, m] = task.scheduledTime
                                .split(":")
                                .map(Number);
                              const taskMin = h * 60 + m;
                              const now = new Date();
                              const nowMin =
                                now.getHours() * 60 + now.getMinutes();
                              return (
                                taskMin - nowMin > 0 && taskMin - nowMin <= 15
                              );
                            })() && (
                              <Badge
                                variant="outline"
                                className="border-orange-200 bg-orange-50 px-1.5 py-0 text-[9px] text-orange-700"
                              >
                                Due soon
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
                            <span className="flex items-center gap-1">
                              <span className="bg-primary/10 text-primary flex size-4 items-center justify-center rounded-full text-[7px] font-bold">
                                {task.assignedToName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)}
                              </span>
                              {task.assignedToName}
                              {task.assignedToId &&
                                (() => {
                                  const dept = getStaffDepartment(
                                    task.assignedToId,
                                  );
                                  if (!dept) return null;
                                  const dotColor: Record<string, string> = {
                                    blue: "bg-blue-500",
                                    emerald: "bg-emerald-500",
                                    purple: "bg-purple-500",
                                    amber: "bg-amber-500",
                                    orange: "bg-orange-500",
                                  };
                                  return (
                                    <span
                                      className={cn(
                                        "rounded-full px-1.5 py-0 text-[8px] font-medium",
                                        `bg-${dept.color}-50 text-${dept.color}-700 border border-${dept.color}-200`,
                                      )}
                                    >
                                      {dept.name}
                                    </span>
                                  );
                                })()}
                            </span>
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
                          <p className="mt-1 rounded-sm bg-amber-50 px-2 py-1 text-[10px] text-amber-700">
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
