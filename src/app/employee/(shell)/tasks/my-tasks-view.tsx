"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  ListChecks,
  StickyNote,
} from "lucide-react";
import { useFacilityViewer } from "@/hooks/use-facility-rbac";
import { staffQueries } from "@/lib/api/staff";
import {
  taskQueries,
  useUpdateTask,
  type TaskRow,
} from "@/lib/api/facility-tasks";
import { formatDateShort } from "@/lib/i18n/format";
import { localDay } from "@/lib/tasks/use-module-day-tasks";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// The signed-in employee's own tasks.
//
// This listed `staffTasks` from `src/data/staff-tasks` and kept every change
// in component state: Complete, a note and a photo all toasted and were gone on
// reload, and a real task assigned to this person never appeared. It now reads
// `facility_tasks` through `/api/tasks` — RLS gives a caretaker their own tasks
// and a manager the board, so the list is narrowed to this person's staff row —
// and Complete and a note are saved through `PATCH /api/tasks/[id]`, which is
// what `private.task_owner_moves_status_only` lets an assignee change.
//
// There is no photo on a task row, so there is no photo button: "Photo
// required" is shown as what the task asks for, not as something this screen
// can collect.
// ============================================================================

type Group = "overdue" | "dueToday" | "upcoming" | "completed";

const PRIORITY_KEY: Record<TaskRow["priority"], string> = {
  urgent: "priorityUrgent",
  high: "priorityHigh",
  medium: "priorityMedium",
  low: "priorityLow",
};

const isOpen = (task: TaskRow) =>
  task.status !== "completed" && task.status !== "cancelled";

function groupOf(task: TaskRow, today: string): Group {
  if (!isOpen(task)) return "completed";
  if (!task.dueAt) return "upcoming";
  const due = localDay(new Date(task.dueAt));
  if (due < today) return "overdue";
  if (due === today) return "dueToday";
  return "upcoming";
}

export function MyTasksView() {
  const { t, fill } = useStaffText("myTasks");
  const { viewer } = useFacilityViewer();
  const [today] = useState(() => localDay());

  const roster = useQuery(staffQueries.profiles());
  const tasks = useQuery(taskQueries.all());

  // Tasks name the assignee by staff row; the viewer is known by legacy id.
  const myRowId = roster.data?.find((member) => member.id === viewer.id)?.rowId;

  const groups = useMemo(() => {
    const out: Record<Group, TaskRow[]> = {
      overdue: [],
      dueToday: [],
      upcoming: [],
      completed: [],
    };
    if (!myRowId) return out;
    for (const task of tasks.data?.tasks ?? []) {
      if (task.assignedToId !== myRowId || task.status === "cancelled") {
        continue;
      }
      out[groupOf(task, today)].push(task);
    }
    const byDue = (a: TaskRow, b: TaskRow) =>
      (a.dueAt ?? "~").localeCompare(b.dueAt ?? "~");
    for (const list of Object.values(out)) list.sort(byDue);
    return out;
  }, [tasks.data, myRowId, today]);

  if (roster.isPending || tasks.isPending) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6"
        aria-busy="true"
        aria-label={t("loading")}
      >
        <Skeleton className="h-10 w-48 rounded-[12px]" />
        <Skeleton className="h-28 rounded-[16px]" />
        <Skeleton className="h-28 rounded-[16px]" />
      </div>
    );
  }

  if (roster.isError || tasks.isError) {
    return (
      <p className="text-muted-foreground mx-auto max-w-3xl p-6 text-sm">
        {t("loadFailed")}
      </p>
    );
  }

  if (!myRowId) {
    return (
      <p className="text-muted-foreground mx-auto max-w-3xl p-6 text-sm">
        {t("noStaffRow")}
      </p>
    );
  }

  const openCount = groups.overdue.length + groups.dueToday.length;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ListChecks className="text-primary size-6" /> {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {openCount === 0
            ? t("openNone")
            : fill("openSome", { count: openCount })}
        </p>
      </div>

      <TaskGroup
        title={t("overdue")}
        icon={AlertTriangle}
        urgent
        tasks={groups.overdue}
        emptyHint={t("emptyOverdue")}
      />
      <TaskGroup
        title={t("dueToday")}
        icon={Clock}
        tasks={groups.dueToday}
        emptyHint={t("emptyToday")}
      />
      <TaskGroup
        title={t("upcoming")}
        icon={CalendarDays}
        tasks={groups.upcoming}
        emptyHint={t("emptyUpcoming")}
      />
      {groups.completed.length > 0 && (
        <TaskGroup
          title={t("completed")}
          icon={CheckCircle2}
          tasks={groups.completed}
          emptyHint=""
        />
      )}
    </div>
  );
}

function TaskGroup({
  title,
  icon: Icon,
  urgent = false,
  tasks,
  emptyHint,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  urgent?: boolean;
  tasks: TaskRow[];
  emptyHint: string;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon
          className={urgent ? "text-destructive size-4" : "size-4"}
          aria-hidden="true"
        />
        <h2 className="text-sm font-bold">{title}</h2>
        <span className="text-muted-foreground text-xs tabular-nums">
          {tasks.length}
        </span>
      </div>
      {tasks.length === 0
        ? emptyHint && (
            <p className="text-muted-foreground pl-6 text-sm">{emptyHint}</p>
          )
        : tasks.map((task) => <TaskCard key={task.id} task={task} />)}
    </section>
  );
}

function TaskCard({ task }: { task: TaskRow }) {
  const { t, fill, locale } = useStaffText("myTasks");
  const { mutateAsync: updateTask, isPending } = useUpdateTask();
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(task.notes ?? "");
  const done = !isOpen(task);

  const complete = async () => {
    if (done || isPending) return;
    try {
      await updateTask({ id: task.id, status: "completed" });
      toast.success(fill("markedComplete", { title: task.title }));
    } catch (error) {
      toast.error(t("completeFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const saveNote = async () => {
    if (isPending) return;
    try {
      await updateTask({ id: task.id, notes: noteDraft.trim() || null });
      setNoteOpen(false);
      toast.success(t("noteSaved"));
    } catch (error) {
      toast.error(t("noteFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <Card>
      <CardContent className="space-y-2.5 p-4">
        <div className="flex items-start gap-3">
          {done ? (
            <CheckCircle2
              className="text-muted-foreground mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
          ) : (
            <Clock
              className="text-muted-foreground mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p
                className={
                  done
                    ? "text-muted-foreground text-[15px] font-semibold line-through"
                    : "text-[15px] font-semibold"
                }
              >
                {task.title}
              </p>
              <span className="text-muted-foreground text-xs font-bold tracking-[.06em] uppercase">
                {t(PRIORITY_KEY[task.priority])}
              </span>
            </div>
            {task.description && (
              <p className="text-muted-foreground text-sm">
                {task.description}
              </p>
            )}
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-4" aria-hidden="true" />
                {task.dueAt ? formatDateShort(task.dueAt, locale) : t("noDate")}
              </span>
              {task.requiresPhoto && (
                <span className="inline-flex items-center gap-1">
                  <Camera className="size-4" aria-hidden="true" />
                  {t("photoRequired")}
                </span>
              )}
            </div>
          </div>
        </div>

        {task.notes && !noteOpen && (
          <p className="text-muted-foreground rounded-[12px] border px-3 py-2 text-sm">
            {task.notes}
          </p>
        )}

        {noteOpen && (
          <div className="space-y-2">
            <Textarea
              rows={2}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder={t("notePlaceholder")}
              aria-label={t("addNote")}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setNoteDraft(task.notes ?? "");
                  setNoteOpen(false);
                }}
                disabled={isPending}
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={() => void saveNote()}
                disabled={isPending}
                aria-busy={isPending}
              >
                {isPending ? t("saving") : t("saveNote")}
              </Button>
            </div>
          </div>
        )}

        {!done && !noteOpen && (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => void complete()}
              disabled={isPending}
              aria-busy={isPending}
              aria-label={fill("completeNamed", { title: task.title })}
            >
              <CheckCircle2 className="size-4" />
              {isPending ? t("saving") : t("completeTask")}
            </Button>
            <Button variant="outline" onClick={() => setNoteOpen(true)}>
              <StickyNote className="size-4" /> {t("addNote")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
