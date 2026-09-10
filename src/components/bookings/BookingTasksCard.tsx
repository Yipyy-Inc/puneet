"use client";

import {
  AlertCircle,
  CheckCircle2,
  Circle,
  CircleDot,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDateShort, formatTimeOfDay } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { useBookingTasks, type BookingTask } from "./use-booking-tasks";
import type { Booking } from "@/types/booking";
import type { TaskTemplate } from "@/types/task";

/** A template category's words, by catalogue key. */
const CATEGORY_KEY: Record<string, string> = {
  setup: "taskCatSetup",
  execution: "taskCatExecution",
  cleanup: "taskCatCleanup",
  transport: "taskCatTransport",
  care: "taskCatCare",
  custom: "taskCatCustom",
};

const SHOWN = 10;

/**
 * The booking's tasks from the facility's own routine, started and finished
 * through the task board (see `use-booking-tasks.ts`). Renders nothing when
 * the routine plans nothing for this service — an empty card here would say
 * "no tasks" about a facility that simply has not set any up.
 */
export function BookingTasksCard({
  booking,
  templates,
  petName,
}: {
  booking: Booking;
  templates: TaskTemplate[];
  petName: string;
}) {
  const { t, fill, locale } = useStaffText("bookingDetail");
  const { tasks, saving, moveTo } = useBookingTasks(
    booking,
    templates,
    petName,
  );
  if (tasks.length === 0) return null;

  const done = tasks.filter((task) => task.status === "completed").length;
  const multiDay = booking.endDate && booking.endDate !== booking.startDate;

  const advance = async (
    task: BookingTask,
    status: "in_progress" | "completed",
  ) => {
    try {
      await moveTo(task, status);
      toast.success(
        fill(status === "completed" ? "taskDoneToast" : "taskStartedToast", {
          task: task.title,
        }),
      );
    } catch (error) {
      toast.error(t("taskNotSaved"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <ListChecks className="size-4" />
            {t("tasksTitle")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-ink-tertiary text-xs tabular-nums">
              {fill("tasksProgress", { done, total: tasks.length })}
            </span>
            <div className="bg-primary-tint-2 h-1.5 w-16 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${(done / tasks.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-1">
          {tasks.slice(0, SHOWN).map((task) => {
            const finished =
              task.status === "completed" || task.status === "skipped";
            const when = new Date(task.scheduledAt);
            // The generator builds these in local time; read them back the same way.
            const pad = (n: number) => String(n).padStart(2, "0");
            const day = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`;
            const at = `${pad(when.getHours())}:${pad(when.getMinutes())}`;
            return (
              <li
                key={task.id}
                className="flex min-h-12 items-center gap-3 rounded-lg px-2 py-1.5"
              >
                <button
                  type="button"
                  onClick={() =>
                    advance(
                      task,
                      task.status === "pending" ? "in_progress" : "completed",
                    )
                  }
                  disabled={finished || saving}
                  aria-label={fill(
                    task.status === "pending"
                      ? "taskStartLabel"
                      : "taskMarkDoneLabel",
                    { task: task.title },
                  )}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full max-lg:size-12"
                >
                  {task.status === "completed" ? (
                    <CheckCircle2 className="text-success size-5" />
                  ) : task.status === "in_progress" ? (
                    <CircleDot className="text-primary size-5" />
                  ) : (
                    <Circle className="text-ink-disabled size-5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      finished && "text-ink-tertiary line-through",
                    )}
                  >
                    {task.title}
                  </p>
                  <p className="text-ink-tertiary text-xs tabular-nums">
                    {multiDay ? `${formatDateShort(day, locale)} · ` : ""}
                    {formatTimeOfDay(at, locale)}
                    {task.completedBy
                      ? ` · ${fill("taskDoneBy", { name: task.completedBy })}`
                      : ""}
                  </p>
                </div>
                {task.isRequired && !finished && (
                  <Badge variant="overdue" className="gap-1 text-xs">
                    <AlertCircle className="size-3" />
                    {t("taskRequired")}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs max-sm:hidden">
                  {t(CATEGORY_KEY[task.category] ?? "taskCatCustom")}
                </Badge>
                {!finished && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={() => advance(task, "completed")}
                    aria-label={fill("taskMarkDoneLabel", { task: task.title })}
                  >
                    {t("taskMarkDone")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {tasks.length > SHOWN && (
          <p className="text-ink-tertiary mt-2 text-xs">
            {fill("tasksMore", { n: tasks.length - SHOWN })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
