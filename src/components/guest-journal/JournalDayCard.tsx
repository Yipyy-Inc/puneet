"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Pencil, Camera } from "lucide-react";
import { format12h } from "@/lib/care-log-scheduler";
import { metaFor } from "@/components/daily-care/task-type-meta";
import {
  outcomeBadgeClass,
  getOutcomeOption,
} from "@/components/daily-care/outcome-meta";
import type { ScheduledTask, TaskExecution } from "@/types/care-log";

type Props = {
  /** ISO "YYYY-MM-DD" */
  date: string;
  /** Day-of-stay label, e.g. "Day 3 of 7" */
  dayLabel: string;
  tasks: ScheduledTask[];
  executions: TaskExecution[];
  onLog: (task: ScheduledTask, existing?: TaskExecution) => void;
};

export function JournalDayCard({
  date,
  dayLabel,
  tasks,
  executions,
  onLog,
}: Props) {
  const sorted = [...tasks].sort((a, b) =>
    a.scheduledTime.localeCompare(b.scheduledTime),
  );

  const completedCount = sorted.filter((t) =>
    executions.some((e) => e.taskId === t.id),
  ).length;

  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">
              {dateLabel}
            </CardTitle>
            <p className="text-muted-foreground mt-0.5 text-xs">{dayLabel}</p>
          </div>
          <Badge
            variant={completedCount === sorted.length ? "default" : "secondary"}
            className="text-[10px]"
          >
            {completedCount} / {sorted.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {sorted.length === 0 ? (
          <p className="text-muted-foreground py-2 text-center text-xs">
            No tasks scheduled.
          </p>
        ) : (
          sorted.map((task) => {
            const exec = executions.find((e) => e.taskId === task.id);
            const meta = metaFor(task.taskType, task.subType);
            const Icon = meta.Icon;
            const outcomeOpt = exec
              ? getOutcomeOption(task.taskType, String(exec.outcome))
              : undefined;
            const isLogged = Boolean(exec);

            return (
              <div
                key={task.id}
                data-logged={isLogged}
                className="flex items-start gap-2.5 rounded-md border bg-card px-2.5 py-2 transition-colors data-[logged=true]:bg-muted/30"
              >
                <div
                  className={`flex size-7 shrink-0 items-center justify-center rounded-md ${meta.bg}`}
                >
                  <Icon className={`size-3.5 ${meta.color}`} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium">{task.details}</span>
                    <span className="text-muted-foreground text-[10px]">
                      {format12h(task.scheduledTime)}
                    </span>
                    {task.requiresPhotoProof && (
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50 px-1 py-0 text-[9px] text-amber-700"
                      >
                        <Camera className="mr-0.5 size-2.5" />
                        Photo
                      </Badge>
                    )}
                    {task.frequencyNote && (
                      <Badge variant="outline" className="px-1 py-0 text-[9px]">
                        {task.frequencyNote}
                      </Badge>
                    )}
                  </div>
                  {task.subDetails && task.subDetails.length > 0 && (
                    <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                      {task.subDetails.join(" · ")}
                    </p>
                  )}
                  {exec && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {outcomeOpt && (
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${outcomeBadgeClass(outcomeOpt.tone)}`}
                        >
                          {outcomeOpt.label}
                        </Badge>
                      )}
                      <span className="text-muted-foreground text-[10px]">
                        {format12h(exec.executedAt)} · {exec.staffInitials}
                      </span>
                      {exec.notes && (
                        <span className="text-muted-foreground italic text-[10px]">
                          &ldquo;{exec.notes}&rdquo;
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  {isLogged ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onLog(task, exec)}
                      className="h-6 gap-1 text-[10px] text-muted-foreground"
                    >
                      <Pencil className="size-3" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => onLog(task)}
                      className="h-6 gap-1 px-2 text-[10px]"
                    >
                      <Check className="size-3" />
                      Log
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
