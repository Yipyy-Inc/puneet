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
} from "lucide-react";
import type {
  ShiftType,
  TaskBucket,
  ScheduledTask,
  TaskExecution,
  GuestAlert,
} from "./guest-journal";
import type { BoardingGuest } from "@/data/boarding";
import {
  PottyTaskRow,
  FeedingTaskRow,
  MedicationTaskRow,
  AddonTaskRow,
  AlertRow,
} from "./task-rows";
export { OUTCOME_LABELS } from "./task-rows";

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
};

// ── Shift config ─────────────────────────────────────────────────────────────

const SHIFT_CONFIG = {
  morning: {
    label: "Morning Shift",
    hours: "6:00 AM – 2:00 PM",
    Icon: Sun,
    accent: "text-amber-500",
    activeBg:
      "bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700",
  },
  afternoon: {
    label: "Afternoon Shift",
    hours: "2:00 PM – 9:00 PM",
    Icon: Sunset,
    accent: "text-orange-500",
    activeBg:
      "bg-orange-50 border-orange-300 dark:bg-orange-900/20 dark:border-orange-700",
  },
  evening: {
    label: "Evening Shift",
    hours: "9:00 PM – 6:00 AM",
    Icon: Moon,
    accent: "text-indigo-500",
    activeBg:
      "bg-indigo-50 border-indigo-300 dark:bg-indigo-900/20 dark:border-indigo-700",
  },
} as const;

// ── ShiftView ─────────────────────────────────────────────────────────────────

export function ShiftView({
  tasks,
  executions,
  alerts,
  activeShift,
  onShiftChange,
  onLogTask,
  getExecForTask,
  isFeedingServed,
  isFeedingComplete,
}: Props) {
  const [activeTab, setActiveTab] = useState<TaskBucket>("potty");

  const shiftTasks = tasks.filter((t) => t.shift === activeShift);
  const pottyTasks = shiftTasks.filter((t) => t.taskType === "potty");
  const feedingTasks = shiftTasks.filter((t) => t.taskType === "feeding");
  const medTasks = shiftTasks.filter((t) => t.taskType === "medication");
  const addonTasks = shiftTasks.filter((t) => t.taskType === "addon");

  const doneCount = (arr: ScheduledTask[]) =>
    arr.filter((t) => {
      if (t.taskType === "feeding") return isFeedingComplete(t.id);
      return !!getExecForTask(t.id);
    }).length;

  const pottyDone = doneCount(pottyTasks);
  const feedingDone = doneCount(feedingTasks);
  const medDone = doneCount(medTasks);
  const addonDone = doneCount(addonTasks);

  // Group potty tasks by round time
  const pottyRounds = pottyTasks.reduce<Record<string, ScheduledTask[]>>(
    (acc, task) => {
      const key = `${task.scheduledTime}::${task.details}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    },
    {},
  );

  // Group med tasks by scheduled time
  const medRounds = medTasks.reduce<Record<string, ScheduledTask[]>>(
    (acc, task) => {
      if (!acc[task.scheduledTime]) acc[task.scheduledTime] = [];
      acc[task.scheduledTime].push(task);
      return acc;
    },
    {},
  );

  const cfg = SHIFT_CONFIG[activeShift];
  const ShiftIcon = cfg.Icon;

  const buckets = [
    {
      id: "potty" as const,
      label: "Potty",
      Icon: Droplets,
      total: pottyTasks.length,
      done: pottyDone,
      color: "text-blue-600",
    },
    {
      id: "feeding" as const,
      label: "Feeding",
      Icon: Utensils,
      total: feedingTasks.length,
      done: feedingDone,
      color: "text-green-600",
    },
    {
      id: "medication" as const,
      label: "Meds",
      Icon: Pill,
      total: medTasks.length,
      done: medDone,
      color: "text-purple-600",
    },
    {
      id: "addons" as const,
      label: "Add-ons",
      Icon: Star,
      total: addonTasks.length,
      done: addonDone,
      color: "text-emerald-600",
    },
    {
      id: "alerts" as const,
      label: "Alerts",
      Icon: AlertTriangle,
      total: alerts.length,
      done: 0,
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Shift selector */}
      <div className="grid grid-cols-3 gap-2">
        {(["morning", "afternoon", "evening"] as ShiftType[]).map((shift) => {
          const s = SHIFT_CONFIG[shift];
          const Icon = s.Icon;
          return (
            <button
              key={shift}
              onClick={() => onShiftChange(shift)}
              data-active={activeShift === shift}
              className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-center transition-all ${
                activeShift === shift
                  ? s.activeBg + " shadow-sm"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <Icon
                className={`size-5 ${activeShift === shift ? s.accent : "text-muted-foreground"}`}
              />
              <span
                className={`text-sm font-semibold ${activeShift === shift ? s.accent : "text-muted-foreground"}`}
              >
                {s.label}
              </span>
              <span className="text-muted-foreground text-xs">{s.hours}</span>
            </button>
          );
        })}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-5 gap-2">
        {buckets.map((b) => (
          <button
            key={b.id}
            onClick={() => setActiveTab(b.id)}
            data-active={activeTab === b.id}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-center transition-all data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=false]:border-border data-[active=false]:hover:bg-muted/50"
          >
            <b.Icon
              className={`size-5 ${activeTab === b.id ? "text-primary" : b.color}`}
            />
            <span className="text-lg font-bold leading-none">
              {b.id === "alerts" ? b.total : `${b.done}/${b.total}`}
            </span>
            <span className="text-muted-foreground text-xs font-medium">
              {b.label}
            </span>
          </button>
        ))}
      </div>

      {/* Task lists */}
      {activeTab === "potty" && (
        <div className="space-y-4">
          {Object.entries(pottyRounds).length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Droplets className="text-muted-foreground mx-auto mb-3 size-10 opacity-40" />
                <p className="text-muted-foreground">
                  No potty rounds scheduled for this shift
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(pottyRounds).map(([key, roundTasks]) => {
              const [time, label] = key.split("::");
              const doneInRound = roundTasks.filter(
                (t) => !!getExecForTask(t.id),
              ).length;
              return (
                <Card key={key}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <Droplets className="size-4 text-blue-500" />
                        <span>{label}</span>
                        <span className="text-muted-foreground font-normal">
                          · {time}
                        </span>
                      </div>
                      <Badge
                        variant={
                          doneInRound === roundTasks.length
                            ? "default"
                            : "secondary"
                        }
                      >
                        {doneInRound}/{roundTasks.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {roundTasks.map((task) => (
                      <PottyTaskRow
                        key={task.id}
                        task={task}
                        execution={getExecForTask(task.id)}
                        onLog={onLogTask}
                      />
                    ))}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {activeTab === "feeding" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Utensils className="size-4 text-green-500" />
                <span>
                  {activeShift === "morning"
                    ? "Breakfast"
                    : activeShift === "afternoon"
                      ? "Dinner"
                      : "Late Meal"}{" "}
                  · {cfg.label}
                </span>
              </div>
              <Badge
                variant={
                  feedingDone === feedingTasks.length ? "default" : "secondary"
                }
              >
                {feedingDone}/{feedingTasks.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {feedingTasks.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No feedings scheduled for this shift
              </p>
            ) : (
              feedingTasks.map((task) => (
                <FeedingTaskRow
                  key={task.id}
                  task={task}
                  served={isFeedingServed(task.id)}
                  complete={isFeedingComplete(task.id)}
                  execution={getExecForTask(task.id)}
                  onLog={onLogTask}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "medication" && (
        <div className="space-y-4">
          {medTasks.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Pill className="text-muted-foreground mx-auto mb-3 size-10 opacity-40" />
                <p className="text-muted-foreground">
                  No medications scheduled for this shift
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(medRounds).map(([time, roundTasks]) => {
              const doneInRound = roundTasks.filter(
                (t) => !!getExecForTask(t.id),
              ).length;
              return (
                <Card key={time}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <Pill className="size-4 text-purple-500" />
                        <span>Medications</span>
                        <span className="text-muted-foreground font-normal">
                          · {time}
                        </span>
                      </div>
                      <Badge
                        variant={
                          doneInRound === roundTasks.length
                            ? "default"
                            : "secondary"
                        }
                      >
                        {doneInRound}/{roundTasks.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {roundTasks.map((task) => (
                      <MedicationTaskRow
                        key={task.id}
                        task={task}
                        execution={getExecForTask(task.id)}
                        onLog={onLogTask}
                      />
                    ))}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {activeTab === "addons" && (
        <div className="space-y-4">
          {addonTasks.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Star className="text-muted-foreground mx-auto mb-3 size-10 opacity-40" />
                <p className="text-muted-foreground">
                  No add-ons scheduled for this shift
                </p>
              </CardContent>
            </Card>
          ) : (
            addonTasks.map((task) => {
              const addonType = task.subType ?? "play_session";

              return (
                <AddonTaskRow
                  key={task.id}
                  task={task}
                  addonType={addonType}
                  execution={getExecForTask(task.id)}
                  onLog={onLogTask}
                />
              );
            })
          )}
        </div>
      )}

      {activeTab === "alerts" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-red-500" />
                <span>Active Alerts</span>
              </div>
              {alerts.length > 0 && (
                <Badge variant="destructive">{alerts.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {alerts.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle className="mx-auto mb-3 size-10 text-green-500 opacity-60" />
                <p className="text-muted-foreground text-sm font-medium">
                  No alerts — all clear!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <AlertRow key={alert.id} alert={alert} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
