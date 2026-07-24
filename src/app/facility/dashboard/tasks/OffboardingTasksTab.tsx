"use client";

import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserX, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { facilityStaff } from "@/data/facility-staff";
import {
  useOffboardingInstances,
  setOffboardingTaskComplete,
  type OffboardingInstance,
} from "@/data/staff-onboarding";
import {
  runOffboardingNotificationSweep,
  maybeAnnounceOffboardingComplete,
} from "@/lib/staff-notifications";

const DUE_LABEL: Record<string, string> = {
  on_termination: "On termination",
  within_days: "Within N days",
  before_last_day: "Before last day",
};
const ASSIGNEE_LABEL: Record<string, string> = {
  manager: "Manager",
  owner: "Owner",
  hr: "HR",
};

/**
 * Manager task list — offboarding groups, one "Offboarding: [name]" card per
 * departing employee, kept apart from regular tasks. Tasks live on the
 * terminated employee's record (the OffboardingInstance) AND surface here.
 * Overdue required tasks fire a once-per-day reminder notification.
 */
export function OffboardingTasksTab() {
  const instances = useOffboardingInstances();
  const today = new Date().toISOString().slice(0, 10);
  const [todayOnly, setTodayOnly] = useState(false);

  // Mount sweep — overdue (daily) + due-today reminders, deduped in the store.
  useEffect(() => {
    runOffboardingNotificationSweep(today);
  }, [today]);

  const withTasks = instances.filter((i) => i.tasks.length > 0);
  const isDueToday = (i: OffboardingInstance) =>
    i.tasks.some((t) => t.required && !t.completedAt && t.dueDate === today);
  const visible = todayOnly ? withTasks.filter(isDueToday) : withTasks;

  if (withTasks.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-14 text-center text-sm">
        <UserX className="size-8" />
        No active offboarding. Offboarding starts when a staff member is
        terminated.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">
          {visible.length} offboarding{visible.length === 1 ? "" : "s"}
        </span>
        <Button
          variant={todayOnly ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setTodayOnly((v) => !v)}
        >
          <CalendarDays className="size-3.5" />
          {todayOnly ? "Showing due today" : "Due today"}
        </Button>
      </div>

      {visible.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed py-10 text-center text-sm">
          No offboarding tasks due today.
        </div>
      ) : (
        visible.map((inst) => (
          <OffboardingGroup key={inst.staffId} instance={inst} today={today} />
        ))
      )}
    </div>
  );
}

function OffboardingGroup({
  instance,
  today,
}: {
  instance: OffboardingInstance;
  today: string;
}) {
  const staff = facilityStaff.find((s) => s.id === instance.staffId);
  const name = staff
    ? `${staff.firstName} ${staff.lastName}`.trim()
    : "Former employee";
  const done = instance.tasks.filter((t) => t.completedAt).length;

  return (
    <div className="overflow-hidden rounded-xl border border-rose-200 dark:border-rose-900/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-rose-50 px-4 py-2.5 dark:bg-rose-950/20">
        <div className="flex items-center gap-2">
          <UserX className="size-4 text-rose-600" />
          <span className="text-sm font-semibold">Offboarding: {name}</span>
          <Badge variant="outline" className="text-[11px] capitalize">
            {instance.reason}
          </Badge>
        </div>
        <span className="text-muted-foreground text-xs">
          {done} of {instance.tasks.length} done
        </span>
      </div>

      <ul className="divide-y">
        {instance.tasks.map((task) => {
          const complete = Boolean(task.completedAt);
          const overdue =
            !complete && !!task.dueDate && task.dueDate < today;
          return (
            <li key={task.id} className="flex items-start gap-3 px-4 py-3">
              <Checkbox
                checked={complete}
                className="mt-0.5"
                onCheckedChange={(v) => {
                  setOffboardingTaskComplete(
                    instance.staffId,
                    task.id,
                    v === true,
                    "Manager",
                  );
                  maybeAnnounceOffboardingComplete(instance.staffId);
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      complete && "text-muted-foreground line-through",
                    )}
                  >
                    {task.name}
                  </span>
                  {task.required && !complete && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        overdue &&
                          "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400",
                      )}
                    >
                      {overdue ? "Overdue" : "Required"}
                    </Badge>
                  )}
                </div>
                {task.description && (
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {task.description}
                  </p>
                )}
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  {ASSIGNEE_LABEL[task.assignedTo] ?? task.assignedTo}
                  {" · "}
                  {DUE_LABEL[task.due] ?? task.due}
                  {task.dueDate ? ` · due ${task.dueDate}` : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
