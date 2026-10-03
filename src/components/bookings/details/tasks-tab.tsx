"use client";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useBookingTasks } from "@/components/bookings/use-booking-tasks";
import { Chip } from "@/components/ui/chip";
import { taskTemplateQueries } from "@/lib/api/task-templates";
import { formatDateShort, formatTimeOfDay } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

import {
  DetailsCard,
  DetailsCardHeader,
  DetailsCardNote,
} from "./details-card";
import type { BookingDetails } from "./use-booking-details";

// ============================================================================
// Tasks, as the mock draws them: a box to tick each one done, struck through
// once it is, when it is due, "Required" in red, and its kind. The plan is the
// facility's own routine for the service; a task becomes a row on the task
// board the moment somebody ticks it (use-booking-tasks.ts), so the board and
// this tab are one list.
// ============================================================================

const CATEGORY_KEY: Record<string, string> = {
  setup: "taskCatSetup",
  execution: "taskCatExecution",
  cleanup: "taskCatCleanup",
  transport: "taskCatTransport",
  care: "taskCatCare",
  custom: "taskCatCustom",
};

export function TasksTab({ d }: { d: BookingDetails }) {
  const { t, fill, locale } = d.text;
  const { data: templates = [] } = useQuery(taskTemplateQueries.all());
  const { tasks, pending, saving, moveTo } = useBookingTasks(
    d.booking,
    templates,
    d.pet?.name ?? "",
  );
  const booking = d.booking;
  if (!booking) return null;
  const done = tasks.filter((task) => task.status === "completed").length;
  const multiDay = booking.endDate && booking.endDate !== booking.startDate;

  const toggle = async (task: (typeof tasks)[number]) => {
    try {
      await moveTo(
        task,
        task.status === "completed" ? "in_progress" : "completed",
      );
      if (task.status !== "completed") {
        toast.success(fill("taskDoneToast", { task: task.title }));
      }
    } catch (error) {
      toast.error(t("taskNotSaved"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <DetailsCard>
      <DetailsCardHeader title={t("tasksTitle")}>
        <DetailsCardNote>
          {fill("tasksProgress", { done, total: tasks.length })}
        </DetailsCardNote>
      </DetailsCardHeader>
      {tasks.length === 0 ? (
        <p className="text-ink-disabled px-5 py-4 text-[14px]">
          {pending ? t("loading") : t("tasksNone")}
        </p>
      ) : (
        <ul className="flex flex-col">
          {tasks.map((task) => {
            const finished = task.status === "completed";
            const when = new Date(task.scheduledAt);
            // The generator builds these in local time; read them back the same way.
            const pad = (n: number) => String(n).padStart(2, "0");
            const day = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`;
            const at = `${pad(when.getHours())}:${pad(when.getMinutes())}`;
            return (
              <li
                key={task.id}
                className="border-line-soft flex items-center gap-3 border-b px-5 py-3"
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={finished}
                  aria-label={fill(
                    finished ? "taskMarkNotDoneLabel" : "taskMarkDoneLabel",
                    { task: task.title },
                  )}
                  disabled={saving || task.status === "skipped"}
                  onClick={() => void toggle(task)}
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-[8px] text-[13px] font-bold text-white",
                    finished
                      ? "bg-success"
                      : "bg-card border-[1.5px] border-(--check-off)",
                  )}
                >
                  {finished ? "✓" : ""}
                </button>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span
                    className={cn(
                      "text-[14px] font-medium",
                      finished ? "text-ink-disabled line-through" : "",
                    )}
                  >
                    {task.title}
                  </span>
                  <span className="text-ink-tertiary text-[12px]">
                    {[
                      multiDay
                        ? formatDateShort(`${day}T12:00:00`, locale)
                        : null,
                      formatTimeOfDay(at, locale),
                      task.completedBy
                        ? fill("taskDoneBy", { name: task.completedBy })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                {task.isRequired && !finished ? (
                  <Chip tone="bd-danger" size="bd-tag">
                    {t("taskRequired")}
                  </Chip>
                ) : null}
                <Chip tone="neutral" size="bd-tag">
                  {t(CATEGORY_KEY[task.category] ?? "taskCatCustom")}
                </Chip>
              </li>
            );
          })}
        </ul>
      )}
    </DetailsCard>
  );
}
