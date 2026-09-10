"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  taskQueries,
  useCreateTask,
  useUpdateTask,
} from "@/lib/api/facility-tasks";
import { generateTasksForBooking } from "@/lib/task-generator";
import type { Booking } from "@/types/booking";
import type { GeneratedTask, TaskTemplate } from "@/types/task";

// ============================================================================
// A booking's tasks: what the facility's routine plans, and what staff did.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// The booking page read `getTasksForBooking` from `@/data/generated-tasks`,
// which looked the booking up in the BOOKINGS FIXTURE (so a real booking had
// no tasks at all, or a fixture booking's with the same number) and kept
// progress in localStorage. "Task completed" was true in one browser.
//
// ── THE SHAPE ─────────────────────────────────────────────────────────────
//
// The plan is still generated from the facility's real task templates for the
// booking's service — deterministic ids, nothing stored — and a task becomes a
// `facility_tasks` row the first time somebody starts or finishes it, with
// `source = 'template'` and `source_ref = booking:<ref>:<task id>`. The row is
// then on the task board with everything else, and its status is what this
// panel shows. `source_ref` is unique per facility and source, so a second
// click cannot write a second row.
// ============================================================================

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BookingTask = GeneratedTask & {
  /** The template's own name — the generator appends an English "(Day n)". */
  title: string;
  rowId?: string;
};

export function useBookingTasks(
  booking: Booking | undefined,
  templates: TaskTemplate[],
  petName: string,
) {
  const prefix = booking ? `booking:${booking.id}:` : "";
  const { data, isPending } = useQuery({
    ...taskQueries.all({
      source: "template",
      sourceRefPrefix: prefix,
      status: "all",
    }),
    enabled: Boolean(booking),
  });
  const create = useCreateTask();
  const update = useUpdateTask();

  const tasks: BookingTask[] = useMemo(() => {
    if (!booking || booking.status === "cancelled") return [];
    const names = new Map(templates.map((t) => [t.id, t.name]));
    const rows = new Map(
      (data?.tasks ?? []).map((row) => [row.sourceRef, row] as const),
    );
    return generateTasksForBooking(booking, templates).map((task) => {
      const row = rows.get(prefix + task.id);
      const planned: BookingTask = {
        ...task,
        petName,
        title: names.get(task.templateId) ?? task.name,
      };
      if (!row) return planned;
      return {
        ...planned,
        rowId: row.id,
        status: row.status === "cancelled" ? "skipped" : row.status,
        completedAt: row.completedAt ?? undefined,
        completedBy: row.completedByName ?? undefined,
      };
    });
  }, [booking, templates, data, prefix, petName]);

  /** Start or finish a task, writing its row first if it has none yet. */
  const moveTo = async (
    task: BookingTask,
    status: "in_progress" | "completed",
  ) => {
    let id = task.rowId;
    if (!id) {
      const row = await create.mutateAsync({
        title: petName ? `${task.title} — ${petName}` : task.title,
        description: task.description ?? null,
        category: task.category,
        priority: task.isRequired ? "high" : "medium",
        dueAt: task.scheduledAt,
        estimatedMinutes: task.durationMinutes || null,
        source: "template",
        sourceRef: prefix + task.id,
        templateId: UUID.test(task.templateId) ? task.templateId : null,
        metadata: { bookingRef: task.bookingId },
      });
      id = row.id;
    }
    await update.mutateAsync({ id, status });
  };

  return {
    tasks,
    pending: Boolean(booking) && isPending,
    saving: create.isPending || update.isPending,
    moveTo,
  };
}
