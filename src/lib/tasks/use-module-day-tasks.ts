"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { bookingQueries } from "@/lib/api/booking";
import { useFacilityClientList } from "@/lib/api/facility-clients";
import {
  taskQueries,
  useCreateTask,
  useUpdateTask,
} from "@/lib/api/facility-tasks";
import { NO_ITEMS } from "@/lib/no-items";
import { generateTasksForBooking } from "@/lib/task-generator";
import type { Booking } from "@/types/booking";
import type { GeneratedTask, TaskTemplate } from "@/types/task";

// ============================================================================
// A module's tasks for one day: what its routine plans for the bookings that
// day, and what staff have done about them.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// `buildTodayTasks` turned each auto-create template into ONE task, assigned
// it to "Alex R.", labelled it with a booking from a four-name pool ("Booking
// #1042 — Luna"), and gave it a status by position — every third one
// "completed". Nothing was stored; completing a task changed a useState.
//
// ── THE SHAPE ─────────────────────────────────────────────────────────────
//
// The same one the booking page uses (components/bookings/use-booking-tasks):
// the plan comes from the facility's templates for each of the day's real
// bookings, and a task becomes a `facility_tasks` row the first time somebody
// starts or finishes it, with `source_ref = booking:<ref>:<task id>`. The
// prefix is shared on purpose — a task ticked on this board is ticked on the
// booking's page, because it is the same row.
//
// "Missed" is not stored (the table has no such status): it is a pending task
// whose time has passed, and it stops being missed the moment it is done.
// ============================================================================

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLOSED = new Set(["cancelled", "declined", "no_show", "completed"]);
const NO_BOOKINGS: Booking[] = [];

export type DayTaskStatus = "pending" | "in_progress" | "completed" | "missed";

export type DayTask = GeneratedTask & {
  /** The template's own name — the generator appends an English "(Day n)". */
  title: string;
  /** Shown beside the task and used to filter: "#57646 · Buddy". */
  bookingLabel: string;
  dayStatus: DayTaskStatus;
  rowId?: string;
};

/** YYYY-MM-DD in the browser's own day. */
export function localDay(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function useModuleDayTasks(
  moduleId: string,
  templates: TaskTemplate[],
  day: string = localDay(),
) {
  const { data: bookings = NO_BOOKINGS, isPending: bookingsPending } = useQuery(
    bookingQueries.all(),
  );
  const { clients } = useFacilityClientList();

  // The day's window, in local time, for the rows' due times.
  const since = new Date(`${day}T00:00:00`).toISOString();
  const until = new Date(`${day}T23:59:59.999`).toISOString();
  const { data: rowsData, isPending: rowsPending } = useQuery(
    taskQueries.all({
      source: "template",
      sourceRefPrefix: "booking:",
      status: "all",
      since,
      until,
    }),
  );
  const rows = rowsData?.tasks ?? NO_ITEMS;
  const create = useCreateTask();
  const update = useUpdateTask();

  const tasks: DayTask[] = useMemo(() => {
    const names = new Map(templates.map((t) => [t.id, t.name]));
    const byRef = new Map(rows.map((row) => [row.sourceRef, row] as const));
    const petName = (booking: Booking) => {
      const client = clients.find((c) => c.id === booking.clientId);
      const petId = Array.isArray(booking.petId)
        ? booking.petId[0]
        : booking.petId;
      return client?.pets.find((p) => p.id === petId)?.name ?? "";
    };
    const now = Date.now();

    return bookings
      .filter(
        (b) =>
          b.service?.toLowerCase() === moduleId &&
          !CLOSED.has(b.status) &&
          b.startDate <= day &&
          (b.endDate || b.startDate) >= day,
      )
      .flatMap((booking) => {
        const pet = petName(booking);
        return generateTasksForBooking(booking, templates)
          .filter((task) => localDay(new Date(task.scheduledAt)) === day)
          .map((task): DayTask => {
            const row = byRef.get(`booking:${booking.id}:${task.id}`);
            const stored = row?.status;
            const dayStatus: DayTaskStatus =
              stored === "completed" || stored === "in_progress"
                ? stored
                : new Date(task.scheduledAt).getTime() < now
                  ? "missed"
                  : "pending";
            return {
              ...task,
              petName: pet,
              title: names.get(task.templateId) ?? task.name,
              bookingLabel: pet ? `#${booking.id} · ${pet}` : `#${booking.id}`,
              dayStatus,
              rowId: row?.id,
              completedBy: row?.completedByName ?? undefined,
            };
          });
      })
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }, [bookings, clients, rows, templates, moduleId, day]);

  /** Start or finish a task, writing its row first if it has none yet. */
  const moveTo = async (task: DayTask, status: "in_progress" | "completed") => {
    let id = task.rowId;
    if (!id) {
      const row = await create.mutateAsync({
        title: task.petName ? `${task.title} — ${task.petName}` : task.title,
        description: task.description ?? null,
        category: task.category,
        priority: task.isRequired ? "high" : "medium",
        dueAt: task.scheduledAt,
        estimatedMinutes: task.durationMinutes || null,
        source: "template",
        sourceRef: `booking:${task.bookingId}:${task.id}`,
        templateId: UUID.test(task.templateId) ? task.templateId : null,
        metadata: { bookingRef: task.bookingId },
      });
      id = row.id;
    }
    await update.mutateAsync({ id, status });
  };

  return {
    tasks,
    pending: bookingsPending || rowsPending,
    saving: create.isPending || update.isPending,
    moveTo,
  };
}
