"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Settings, Printer } from "lucide-react";
import { getCurrentGuests } from "@/data/boarding";
import { useDailyCareConfig } from "@/hooks/use-daily-care-config";
import { useDateCareLog } from "@/hooks/use-care-log";
import {
  generateScheduledTasks,
  todayIso,
} from "@/lib/care-log-scheduler";
import { ProgressHeader } from "./ProgressHeader";
import { Section } from "./Section";
import { TaskLogModal } from "./TaskLogModal";
import { toast } from "sonner";
import type { ScheduledTask, TaskExecution } from "@/types/care-log";

export function DailyCareView() {
  const { config } = useDailyCareConfig();
  const date = todayIso();
  const { executions, log } = useDateCareLog(date);

  const guests = useMemo(() => getCurrentGuests(), []);
  const allTasks = useMemo(
    () => generateScheduledTasks(guests, config),
    [guests, config],
  );

  const [modalState, setModalState] = useState<{
    task: ScheduledTask | null;
    existing: TaskExecution | undefined;
  }>({ task: null, existing: undefined });

  // Group tasks under their source step (the step that produced them).
  // Tasks without a sourceStepId fall under a synthetic "Unscheduled" bucket
  // — keeps add-ons and feedings whose times don't match any step visible.
  const sortedSteps = useMemo(
    () =>
      [...config.steps]
        .filter((s) => s.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [config.steps],
  );

  const tasksByStep = useMemo(() => {
    const map = new Map<string, ScheduledTask[]>();
    for (const step of sortedSteps) map.set(step.id, []);

    for (const task of allTasks) {
      if (task.sourceStepId && map.has(task.sourceStepId)) {
        map.get(task.sourceStepId)!.push(task);
        continue;
      }
      // Match to nearest step by task type + time as fallback
      const fallback = sortedSteps.find(
        (s) =>
          (s.taskType === task.taskType ||
            (s.taskType === "addon" && task.taskType === "addon") ||
            (s.taskType === "medication" && task.taskType === "medication") ||
            (s.taskType === "feeding" && task.taskType === "feeding")) &&
          s.time === task.scheduledTime,
      );
      if (fallback) {
        map.get(fallback.id)!.push(task);
      } else {
        // Append to the closest step of the same type
        const sameType = sortedSteps.find((s) => s.taskType === task.taskType);
        if (sameType) map.get(sameType.id)!.push(task);
      }
    }
    return map;
  }, [allTasks, sortedSteps]);

  const totalTasks = allTasks.length;
  const completedTasks = useMemo(
    () =>
      allTasks.filter((t) => executions.some((e) => e.taskId === t.id)).length,
    [allTasks, executions],
  );

  const nowMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);

  const overdueTasks = useMemo(() => {
    return sortedSteps.reduce((acc, step) => {
      const stepTasks = tasksByStep.get(step.id) ?? [];
      const remaining = stepTasks.filter(
        (t) => !executions.some((e) => e.taskId === t.id),
      ).length;
      const [h, m] = step.time.split(":").map((n) => parseInt(n, 10));
      const stepMin = (h ?? 0) * 60 + (m ?? 0);
      if (remaining > 0 && nowMinutes > stepMin + config.alertOverdueAfterMinutes) {
        return acc + remaining;
      }
      return acc;
    }, 0);
  }, [sortedSteps, tasksByStep, executions, nowMinutes, config.alertOverdueAfterMinutes]);

  function handleLog(task: ScheduledTask, existing?: TaskExecution) {
    setModalState({ task, existing });
  }

  function handleSubmit(entry: {
    outcome: string;
    notes?: string;
    staffInitials: string;
    servedAt?: string;
    photoUrl?: string;
  }) {
    if (!modalState.task) return;
    const task = modalState.task;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");

    log({
      taskId: task.id,
      guestId: task.guestId,
      bookingId: task.bookingId,
      taskType: task.taskType,
      date,
      executedAt: `${hh}:${mm}`,
      outcome: entry.outcome,
      notes: entry.notes,
      staffInitials: entry.staffInitials,
      servedAt: entry.servedAt,
      photoUrl: entry.photoUrl,
    });

    toast.success(`Logged for ${task.petName}`);
    setModalState({ task: null, existing: undefined });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 size-4" />
          Print
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/facility/dashboard/daily-care/settings">
            <Settings className="mr-2 size-4" />
            Configure schedule
          </Link>
        </Button>
      </div>

      <ProgressHeader
        totalTasks={totalTasks}
        completedTasks={completedTasks}
        overdueTasks={overdueTasks}
        guestCount={guests.length}
        date={date}
      />

      {sortedSteps.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No daily care steps configured yet.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/facility/dashboard/daily-care/settings">
              Set up your daily routine
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedSteps.map((step) => (
            <Section
              key={step.id}
              step={step}
              tasks={tasksByStep.get(step.id) ?? []}
              executions={executions}
              overdueAfterMinutes={config.alertOverdueAfterMinutes}
              nowMinutes={nowMinutes}
              onLog={handleLog}
            />
          ))}
        </div>
      )}

      <TaskLogModal
        open={modalState.task !== null}
        task={modalState.task}
        onOpenChange={(open) => {
          if (!open) setModalState({ task: null, existing: undefined });
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
