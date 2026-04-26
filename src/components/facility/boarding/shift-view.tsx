"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sun,
  Sunset,
  Moon,
  Droplets,
  Utensils,
  Pill,
  AlertTriangle,
  CheckCircle,
  Star,
  PawPrint,
  SprayCan,
  BedDouble,
  Settings2,
  Clock,
  Calendar,
} from "lucide-react";
import type {
  ShiftType,
  ScheduledTask,
  TaskExecution,
  GuestAlert,
} from "./guest-journal";
import type { BoardingGuest } from "@/data/boarding";
import type { FacilityDailyCareConfig, DailyCareStep, DailyCareTaskType } from "@/types/boarding";
import { facilityDailyCareConfig } from "@/data/boarding";
import {
  PottyTaskRow,
  FeedingTaskRow,
  MedicationTaskRow,
  AddonTaskRow,
  CareTaskRow,
  AlertRow,
} from "./task-rows";
export { OUTCOME_LABELS } from "./task-rows";

// ── Types ─────────────────────────────────────────────────────────────────────

type ShiftFilter = ShiftType | "all";

type Props = {
  guests: BoardingGuest[];
  tasks: ScheduledTask[];
  executions: TaskExecution[];
  alerts: GuestAlert[];
  activeShift: ShiftType;
  onShiftChange: (shift: ShiftType) => void;
  onLogTask: (task: ScheduledTask) => void;
  getExecForTask: (taskId: string) => TaskExecution | undefined;
  isFeedingServed: (taskId: string) => boolean;
  isFeedingComplete: (taskId: string) => boolean;
  dailyCareConfig?: FacilityDailyCareConfig;
};

// ── Shift filter config ──────────────────────────────────────────────────────

const SHIFT_CONFIG = {
  morning: {
    label: "Morning",
    hours: "6 AM – 2 PM",
    Icon: Sun,
    accent: "text-amber-500",
    activeBg: "bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700",
    range: [6, 14] as [number, number],
  },
  afternoon: {
    label: "Afternoon",
    hours: "2 PM – 9 PM",
    Icon: Sunset,
    accent: "text-orange-500",
    activeBg: "bg-orange-50 border-orange-300 dark:bg-orange-900/20 dark:border-orange-700",
    range: [14, 21] as [number, number],
  },
  evening: {
    label: "Evening",
    hours: "9 PM – 6 AM",
    Icon: Moon,
    accent: "text-indigo-500",
    activeBg: "bg-indigo-50 border-indigo-300 dark:bg-indigo-900/20 dark:border-indigo-700",
    range: [21, 30] as [number, number], // 30 represents 6AM next day
  },
} as const;

// ── Task type icon/color map ──────────────────────────────────────────────────

const TASK_TYPE_STYLE: Record<
  DailyCareTaskType,
  { Icon: React.ElementType; color: string; emptyIcon: React.ElementType }
> = {
  potty: { Icon: PawPrint, color: "text-green-500", emptyIcon: PawPrint },
  feeding: { Icon: Utensils, color: "text-amber-500", emptyIcon: Utensils },
  medication: { Icon: Pill, color: "text-red-500", emptyIcon: Pill },
  addon: { Icon: Star, color: "text-purple-500", emptyIcon: Star },
  water_refill: { Icon: Droplets, color: "text-blue-500", emptyIcon: Droplets },
  kennel_clean: { Icon: SprayCan, color: "text-cyan-500", emptyIcon: SprayCan },
  bedding_change: { Icon: BedDouble, color: "text-indigo-500", emptyIcon: BedDouble },
  custom: { Icon: Settings2, color: "text-slate-500", emptyIcon: Settings2 },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const h_ = h ?? 0;
  return `${h_ % 12 || 12}:${String(m ?? 0).padStart(2, "0")} ${h_ < 12 ? "AM" : "PM"}`;
}

function isStepInShift(time: string, shift: ShiftType): boolean {
  const h = parseInt(time.split(":")[0], 10);
  const [start, end] = SHIFT_CONFIG[shift].range;
  if (shift === "evening") return h >= 21 || h < 6;
  return h >= start && h < end;
}

function isOverdue(stepTime: string, overdueMinutes: number): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const stepMinutes = timeToMinutes(stepTime);
  return currentMinutes > stepMinutes + overdueMinutes;
}

// Match tasks to a config step (within ±60 min window for feeding/meds, exact subType for others)
const WINDOW_MINUTES = 60;

function getTasksForStep(step: DailyCareStep, tasks: ScheduledTask[]): ScheduledTask[] {
  const stepMin = timeToMinutes(step.time);

  switch (step.taskType) {
    case "potty":
      // Potty tasks are tagged with step.id as subType
      return tasks.filter(
        (t) => t.taskType === "potty" && t.subType === step.id,
      );
    case "feeding":
      return tasks.filter(
        (t) =>
          t.taskType === "feeding" &&
          Math.abs(timeToMinutes(t.scheduledTime) - stepMin) <= WINDOW_MINUTES,
      );
    case "medication":
      return tasks.filter(
        (t) =>
          t.taskType === "medication" &&
          Math.abs(timeToMinutes(t.scheduledTime) - stepMin) <= WINDOW_MINUTES,
      );
    case "addon":
      return tasks.filter(
        (t) =>
          t.taskType === "addon" &&
          Math.abs(timeToMinutes(t.scheduledTime) - stepMin) <= WINDOW_MINUTES,
      );
    case "water_refill":
      return tasks.filter((t) => t.taskType === "care" && t.subType === "water_refill");
    case "kennel_clean":
      return tasks.filter((t) => t.taskType === "care" && t.subType === "crate_clean");
    case "bedding_change":
      return tasks.filter((t) => t.taskType === "care" && t.subType === "bedding_change");
    case "custom":
      return tasks.filter((t) => t.subType === step.id);
    default:
      return [];
  }
}

// ── Section Card ─────────────────────────────────────────────────────────────

function DailyCareSection({
  step,
  tasks,
  overdueMinutes,
  onLogTask,
  getExecForTask,
  isFeedingServed,
  isFeedingComplete,
}: {
  step: DailyCareStep;
  tasks: ScheduledTask[];
  overdueMinutes: number;
  onLogTask: (task: ScheduledTask) => void;
  getExecForTask: (taskId: string) => TaskExecution | undefined;
  isFeedingServed: (taskId: string) => boolean;
  isFeedingComplete: (taskId: string) => boolean;
}) {
  const style = TASK_TYPE_STYLE[step.taskType];
  const Icon = style.Icon;

  const doneCount = tasks.filter((t) => {
    if (t.taskType === "feeding") return isFeedingComplete(t.id);
    return !!getExecForTask(t.id);
  }).length;

  const total = tasks.length;
  const allDone = total > 0 && doneCount === total;
  const overdue = !allDone && isOverdue(step.time, overdueMinutes);

  const progressBadgeVariant = allDone ? "default" : overdue ? "destructive" : "secondary";

  return (
    <Card
      data-overdue={overdue && !allDone}
      className="transition-colors data-[overdue=true]:border-amber-400 dark:data-[overdue=true]:border-amber-600"
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className={`size-4 shrink-0 ${style.color}`} />
            <span className="font-semibold truncate">{step.name}</span>
            <span className="text-muted-foreground flex items-center gap-1 text-xs font-normal whitespace-nowrap">
              <Clock className="size-3" />
              {fmt12(step.time)}
            </span>
            {overdue && !allDone && (
              <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-400 text-xs px-1.5 py-0 h-5 whitespace-nowrap">
                Overdue
              </Badge>
            )}
          </div>
          <Badge variant={progressBadgeVariant} className="shrink-0">
            {allDone ? (
              <span className="flex items-center gap-1">
                <CheckCircle className="size-3" />
                Done
              </span>
            ) : (
              `${doneCount} / ${total}`
            )}
          </Badge>
        </CardTitle>
        {step.description && (
          <p className="text-muted-foreground text-xs mt-0.5 pl-6">{step.description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        {tasks.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No tasks scheduled for this step
          </p>
        ) : (
          tasks.map((task) => {
            if (task.taskType === "potty") {
              return (
                <PottyTaskRow
                  key={task.id}
                  task={task}
                  execution={getExecForTask(task.id)}
                  onLog={onLogTask}
                />
              );
            }
            if (task.taskType === "feeding") {
              return (
                <FeedingTaskRow
                  key={task.id}
                  task={task}
                  served={isFeedingServed(task.id)}
                  complete={isFeedingComplete(task.id)}
                  execution={getExecForTask(task.id)}
                  onLog={onLogTask}
                />
              );
            }
            if (task.taskType === "medication") {
              return (
                <MedicationTaskRow
                  key={task.id}
                  task={task}
                  execution={getExecForTask(task.id)}
                  onLog={onLogTask}
                />
              );
            }
            if (task.taskType === "addon") {
              return (
                <AddonTaskRow
                  key={task.id}
                  task={task}
                  addonType={task.subType ?? "play_session"}
                  execution={getExecForTask(task.id)}
                  onLog={onLogTask}
                />
              );
            }
            // Care tasks (water_refill, kennel_clean, bedding_change, monitoring, heat_tracking)
            return (
              <CareTaskRow
                key={task.id}
                task={task}
                execution={getExecForTask(task.id)}
                onLog={onLogTask}
              />
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// ── ShiftView ─────────────────────────────────────────────────────────────────

export function ShiftView({
  tasks,
  executions: _executions,
  alerts,
  activeShift,
  onShiftChange,
  onLogTask,
  getExecForTask,
  isFeedingServed,
  isFeedingComplete,
  dailyCareConfig = facilityDailyCareConfig,
}: Props) {
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>(activeShift);
  const [showAlerts, setShowAlerts] = useState(false);

  const config = dailyCareConfig;
  const enabledSteps = config.steps
    .filter((s) => s.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Filter steps by shift selection
  const visibleSteps =
    shiftFilter === "all"
      ? enabledSteps
      : enabledSteps.filter((s) => isStepInShift(s.time, shiftFilter));

  // Compute tasks that don't match any enabled config step (fallback buckets)
  const coveredTaskIds = new Set(
    enabledSteps.flatMap((step) => getTasksForStep(step, tasks).map((t) => t.id)),
  );
  const uncoveredFeeding = tasks.filter(
    (t) => t.taskType === "feeding" && !coveredTaskIds.has(t.id),
  );
  const uncoveredMeds = tasks.filter(
    (t) => t.taskType === "medication" && !coveredTaskIds.has(t.id),
  );
  const uncoveredAddons = tasks.filter(
    (t) => t.taskType === "addon" && !coveredTaskIds.has(t.id),
  );

  // Overall progress for the day
  const allTasksDone = tasks.filter((t) => {
    if (t.taskType === "feeding") return isFeedingComplete(t.id);
    return !!getExecForTask(t.id);
  }).length;
  const totalTasks = tasks.length;

  // Sync legacy activeShift for external state (used by CareModulesPanel)
  const handleShiftFilter = (f: ShiftFilter) => {
    setShiftFilter(f);
    if (f !== "all") onShiftChange(f);
  };

  return (
    <div className="space-y-4">
      {/* Day summary strip */}
      <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="text-muted-foreground size-4" />
            <span className="text-sm font-medium">Today&apos;s Progress</span>
          </div>
          <Badge variant={allTasksDone === totalTasks && totalTasks > 0 ? "default" : "secondary"}>
            {allTasksDone} / {totalTasks} done
          </Badge>
        </div>
        {alerts.length > 0 && (
          <button
            onClick={() => setShowAlerts((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
          >
            <AlertTriangle className="size-3.5" />
            {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Alerts panel */}
      {showAlerts && alerts.length > 0 && (
        <Card className="border-red-300 dark:border-red-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-red-700 dark:text-red-400">
              <AlertTriangle className="size-4" />
              Active Alerts
              <Badge variant="destructive" className="ml-auto">{alerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Shift filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleShiftFilter("all")}
          data-active={shiftFilter === "all"}
          className="flex cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=false]:border-border data-[active=false]:text-muted-foreground data-[active=false]:hover:bg-muted/50"
        >
          <Calendar className="size-4" />
          All Day
        </button>
        {(["morning", "afternoon", "evening"] as ShiftType[]).map((shift) => {
          const s = SHIFT_CONFIG[shift];
          const Icon = s.Icon;
          return (
            <button
              key={shift}
              onClick={() => handleShiftFilter(shift)}
              data-active={shiftFilter === shift}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                shiftFilter === shift
                  ? s.activeBg + " " + s.accent + " shadow-sm"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="size-4" />
              {s.label}
              <span className="hidden text-xs opacity-70 sm:inline">· {s.hours}</span>
            </button>
          );
        })}
      </div>

      {/* Config-driven sections */}
      {visibleSteps.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="text-muted-foreground mx-auto mb-3 size-10 opacity-40" />
            <p className="text-muted-foreground font-medium">No steps scheduled for this shift</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Configure your daily care schedule in Boarding Settings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visibleSteps.map((step) => {
            const stepTasks = getTasksForStep(step, tasks);
            return (
              <DailyCareSection
                key={step.id}
                step={step}
                tasks={stepTasks}
                overdueMinutes={config.alertOverdueAfterMinutes}
                onLogTask={onLogTask}
                getExecForTask={getExecForTask}
                isFeedingServed={isFeedingServed}
                isFeedingComplete={isFeedingComplete}
              />
            );
          })}
          {/* Fallback sections — always shown when tasks exist outside any config step window */}
          {uncoveredFeeding.length > 0 && (
            <DailyCareSection
              key="__fallback-feeding"
              step={{ id: "__fallback-feeding", name: "Feedings", time: "12:00", taskType: "feeding", enabled: true, sortOrder: 9999 }}
              tasks={uncoveredFeeding}
              overdueMinutes={config.alertOverdueAfterMinutes}
              onLogTask={onLogTask}
              getExecForTask={getExecForTask}
              isFeedingServed={isFeedingServed}
              isFeedingComplete={isFeedingComplete}
            />
          )}
          {uncoveredMeds.length > 0 && (
            <DailyCareSection
              key="__fallback-meds"
              step={{ id: "__fallback-meds", name: "Medications", time: "12:00", taskType: "medication", enabled: true, sortOrder: 10000 }}
              tasks={uncoveredMeds}
              overdueMinutes={config.alertOverdueAfterMinutes}
              onLogTask={onLogTask}
              getExecForTask={getExecForTask}
              isFeedingServed={isFeedingServed}
              isFeedingComplete={isFeedingComplete}
            />
          )}
          {uncoveredAddons.length > 0 && (
            <DailyCareSection
              key="__fallback-addons"
              step={{ id: "__fallback-addons", name: "Add-Ons", time: "12:00", taskType: "addon", enabled: true, sortOrder: 10001 }}
              tasks={uncoveredAddons}
              overdueMinutes={config.alertOverdueAfterMinutes}
              onLogTask={onLogTask}
              getExecForTask={getExecForTask}
              isFeedingServed={isFeedingServed}
              isFeedingComplete={isFeedingComplete}
            />
          )}
        </div>
      )}
    </div>
  );
}
