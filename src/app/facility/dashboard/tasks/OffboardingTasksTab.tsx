"use client";

import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserX, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { staffQueries } from "@/lib/api/staff";
import type { OffboardingInstance } from "@/data/staff-onboarding";
import {
  useOffboardingInstances,
  useSetOffboardingTask,
} from "@/lib/api/offboarding-instances";
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

  // Mount sweep — overdue + due-today reminders. Waits for the instances to
  // arrive rather than firing on an empty list: this used to read a synchronous
  // store, and running it before the fetch lands would sweep nothing and then
  // never run again.
  useEffect(() => {
    if (instances.length > 0) runOffboardingNotificationSweep(instances, today);
  }, [instances, today]);

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
  // The roster, from Postgres. "Former employee" stays as the fallback and now
  // means something real: a terminated staff row the caller cannot read, or one
  // deleted since the offboarding began. The instance itself is still readable
  // and its checklist still has to be workable — that is the whole point of
  // keeping the record after the person is gone.
  const { data: staffList } = useQuery(staffQueries.profiles());
  const staff = staffList?.find((s) => s.id === instance.staffId);
  const name = staff
    ? `${staff.firstName} ${staff.lastName}`.trim()
    : "Former employee";

  const { mutate: setTask, isPending } = useSetOffboardingTask();
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
          const overdue = !complete && !!task.dueDate && task.dueDate < today;
          return (
            <li key={task.id} className="flex items-start gap-3 px-4 py-3">
              <Checkbox
                checked={complete}
                disabled={isPending}
                className="mt-0.5"
                onCheckedChange={(v) => {
                  setTask(
                    {
                      staffId: instance.staffId,
                      taskKey: task.id,
                      complete: v === true,
                    },
                    {
                      // The RESPONSE, not `instance` — the server decides
                      // whether that tick was the last one, and the prop in
                      // scope here is the state from before the write.
                      onSuccess: (updated) =>
                        maybeAnnounceOffboardingComplete(updated),
                      onError: (error) =>
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Could not update that task.",
                        ),
                    },
                  );
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
