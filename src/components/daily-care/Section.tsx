"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle } from "lucide-react";
import { metaFor } from "./task-type-meta";
import { format12h } from "@/lib/care-log-scheduler";
import { PetRow } from "./PetRow";
import type { DailyCareStep } from "@/types/boarding";
import type { ScheduledTask, TaskExecution } from "@/types/care-log";

type Props = {
  step: DailyCareStep;
  tasks: ScheduledTask[];
  executions: TaskExecution[];
  /** Minutes past scheduledTime after which an unlogged task is overdue. */
  overdueAfterMinutes: number;
  /** Wall-clock minutes elapsed past midnight today. Passed in so the
   *  parent controls "now" for testability. */
  nowMinutes: number;
  onLog: (task: ScheduledTask, existing?: TaskExecution) => void;
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

export function Section({
  step,
  tasks,
  executions,
  overdueAfterMinutes,
  nowMinutes,
  onLog,
}: Props) {
  const meta = metaFor(
    step.taskType === "potty"
      ? "potty"
      : step.taskType === "feeding"
        ? "feeding"
        : step.taskType === "medication"
          ? "medication"
          : step.taskType === "addon"
            ? "addon"
            : "care",
    step.taskType === "water_refill" ||
      step.taskType === "kennel_clean" ||
      step.taskType === "bedding_change"
      ? step.taskType
      : undefined,
  );
  const Icon = meta.Icon;

  const total = tasks.length;
  const done = tasks.filter((t) =>
    executions.some((e) => e.taskId === t.id),
  ).length;
  const remaining = total - done;

  const stepMinutes = timeToMinutes(step.time);
  const isOverdue =
    remaining > 0 && nowMinutes > stepMinutes + overdueAfterMinutes;
  const isCurrent =
    remaining > 0 &&
    nowMinutes >= stepMinutes &&
    nowMinutes <= stepMinutes + overdueAfterMinutes;

  return (
    <Card
      data-overdue={isOverdue}
      data-current={isCurrent}
      data-complete={total > 0 && done === total}
      className="data-[overdue=true]:border-red-300 data-[current=true]:border-amber-300 data-[complete=true]:opacity-75"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
          >
            <Icon className={`size-5 ${meta.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              {step.name}
              {isOverdue && (
                <Badge
                  variant="outline"
                  className="border-red-300 bg-red-50 text-red-700"
                >
                  <AlertCircle className="mr-1 size-3" />
                  Overdue
                </Badge>
              )}
              {isCurrent && (
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-amber-700"
                >
                  In progress
                </Badge>
              )}
            </CardTitle>
            <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
              <Clock className="size-3" />
              {format12h(step.time)}
              {step.description && (
                <span className="hidden sm:inline truncate">
                  · {step.description}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-[tabular-nums] text-sm font-semibold">
              {done} / {total}
            </div>
            <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
              done
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-muted-foreground py-2 text-center text-xs">
            No pets need this task right now.
          </p>
        ) : (
          <div className="space-y-1.5">
            {tasks.map((task) => {
              const execution = executions.find((e) => e.taskId === task.id);
              return (
                <PetRow
                  key={task.id}
                  task={task}
                  execution={execution}
                  onLog={() => onLog(task, execution)}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
