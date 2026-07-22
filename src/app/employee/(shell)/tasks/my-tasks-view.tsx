"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Circle,
  Camera,
  StickyNote,
  Clock,
  AlertTriangle,
  CalendarDays,
  PawPrint,
  ListChecks,
} from "lucide-react";
import { staffTasks, getTaskCategoryLabel } from "@/data/staff-tasks";
import type { StaffTask, TaskStatus, TaskPriority } from "@/types/staff";
import { useFacilityViewer } from "@/hooks/use-facility-rbac";

// Per-task local edits layered over the static mock data.
// TODO: persist through a staff-tasks store / API when one exists.
interface TaskEdit {
  status?: TaskStatus;
  notes?: string;
  photoUrl?: string;
  completedAt?: string;
}

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  urgent:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300",
  high: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
  medium:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300",
  low: "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
};

const isOpen = (s: TaskStatus) => s !== "completed" && s !== "skipped";

export function MyTasksView() {
  // The signed-in employee — staff data is keyed by facility staff id (`fs-*`).
  const { viewer } = useFacilityViewer();
  const staffId = viewer.id;
  const [today] = useState(() => new Date().toISOString().split("T")[0]);
  const [edits, setEdits] = useState<Record<number, TaskEdit>>({});

  const myTasks = useMemo(
    () => staffTasks.filter((t) => t.assignedTo === staffId),
    [staffId],
  );

  const effective = (task: StaffTask): StaffTask => ({
    ...task,
    ...edits[task.id],
  });

  const groups = useMemo(() => {
    const overdue: StaffTask[] = [];
    const dueToday: StaffTask[] = [];
    const upcoming: StaffTask[] = [];
    const done: StaffTask[] = [];
    for (const raw of myTasks) {
      const t = { ...raw, ...edits[raw.id] };
      if (!isOpen(t.status)) {
        done.push(t);
      } else if (t.dueDate < today) {
        overdue.push(t);
      } else if (t.dueDate === today) {
        dueToday.push(t);
      } else {
        upcoming.push(t);
      }
    }
    const byDue = (a: StaffTask, b: StaffTask) =>
      (a.dueDate + (a.dueTime ?? "")).localeCompare(
        b.dueDate + (b.dueTime ?? ""),
      );
    return {
      overdue: overdue.sort(byDue),
      dueToday: dueToday.sort(byDue),
      upcoming: upcoming.sort(byDue),
      done: done.sort(byDue),
    };
  }, [myTasks, edits, today]);

  const update = (id: number, patch: TaskEdit) =>
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const markComplete = (task: StaffTask) => {
    const t = effective(task);
    if (task.requiresPhoto && !t.photoUrl) {
      toast.error("A photo is required to complete this task.");
      return;
    }
    update(task.id, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
    toast.success("Task marked complete");
  };

  const openCount = groups.overdue.length + groups.dueToday.length;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <ListChecks className="text-primary size-6" /> My Tasks
        </h1>
        <p className="text-muted-foreground text-sm">
          {openCount === 0
            ? "You're all caught up 🎉"
            : `${openCount} task${openCount === 1 ? "" : "s"} need attention today.`}
        </p>
      </div>

      <TaskGroup
        title="Overdue"
        icon={AlertTriangle}
        tone="text-rose-600 dark:text-rose-400"
        tasks={groups.overdue}
        edits={edits}
        onUpdate={update}
        onComplete={markComplete}
        emptyHint="Nothing overdue — nice."
      />
      <TaskGroup
        title="Due Today"
        icon={Clock}
        tone="text-amber-600 dark:text-amber-400"
        tasks={groups.dueToday}
        edits={edits}
        onUpdate={update}
        onComplete={markComplete}
        emptyHint="No tasks due today."
      />
      <TaskGroup
        title="Upcoming"
        icon={CalendarDays}
        tone="text-sky-600 dark:text-sky-400"
        tasks={groups.upcoming}
        edits={edits}
        onUpdate={update}
        onComplete={markComplete}
        emptyHint="No upcoming tasks."
      />
      {groups.done.length > 0 && (
        <TaskGroup
          title="Completed"
          icon={CheckCircle2}
          tone="text-emerald-600 dark:text-emerald-400"
          tasks={groups.done}
          edits={edits}
          onUpdate={update}
          onComplete={markComplete}
          emptyHint=""
        />
      )}
    </div>
  );
}

function TaskGroup({
  title,
  icon: Icon,
  tone,
  tasks,
  edits,
  onUpdate,
  onComplete,
  emptyHint,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  tasks: StaffTask[];
  edits: Record<number, TaskEdit>;
  onUpdate: (id: number, patch: TaskEdit) => void;
  onComplete: (task: StaffTask) => void;
  emptyHint: string;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={cn("size-4", tone)} />
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          {tasks.length}
        </Badge>
      </div>
      {tasks.length === 0
        ? emptyHint && (
            <p className="text-muted-foreground pl-6 text-xs">{emptyHint}</p>
          )
        : tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              edit={edits[task.id] ?? {}}
              onUpdate={onUpdate}
              onComplete={onComplete}
            />
          ))}
    </section>
  );
}

function TaskCard({
  task,
  edit,
  onUpdate,
  onComplete,
}: {
  task: StaffTask;
  edit: TaskEdit;
  onUpdate: (id: number, patch: TaskEdit) => void;
  onComplete: (task: StaffTask) => void;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(edit.notes ?? task.notes ?? "");
  const done = !isOpen(task.status);
  const photoUrl = edit.photoUrl ?? task.photoUrl;
  const notes = edit.notes ?? task.notes;

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUpdate(task.id, { photoUrl: URL.createObjectURL(file) });
    toast.success("Photo attached");
  };

  return (
    <Card className={cn(done && "opacity-70")}>
      <CardContent className="space-y-2.5 p-3.5">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => !done && onComplete(task)}
            className="mt-0.5 shrink-0"
            aria-label={done ? "Completed" : "Mark complete"}
            disabled={done}
          >
            {done ? (
              <CheckCircle2 className="size-5 text-emerald-500" />
            ) : (
              <Circle className="text-muted-foreground hover:text-primary size-5" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p
                className={cn(
                  "text-sm font-semibold",
                  done && "text-muted-foreground line-through",
                )}
              >
                {task.templateName}
              </p>
              <Badge
                variant="outline"
                className={cn(
                  "h-4 px-1 text-[9px]",
                  PRIORITY_STYLE[task.priority],
                )}
              >
                {task.priority}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs">{task.description}</p>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
              <span>{getTaskCategoryLabel(task.category)}</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                {task.dueDate}
                {task.dueTime ? ` · ${task.dueTime}` : ""}
              </span>
              {task.petName && (
                <span className="inline-flex items-center gap-1">
                  <PawPrint className="size-3" />
                  {task.petName}
                </span>
              )}
              {task.requiresPhoto && (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Camera className="size-3" /> Photo required
                </span>
              )}
            </div>
          </div>
        </div>

        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt="Task"
            className="h-24 w-full rounded-lg object-cover"
          />
        )}

        {notes && !noteOpen && (
          <p className="bg-muted/40 text-muted-foreground rounded-md px-2.5 py-1.5 text-xs">
            {notes}
          </p>
        )}

        {noteOpen && (
          <div className="space-y-2">
            <Textarea
              rows={2}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Add a note…"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNoteDraft(notes ?? "");
                  setNoteOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onUpdate(task.id, { notes: noteDraft.trim() });
                  setNoteOpen(false);
                  toast.success("Note saved");
                }}
              >
                Save note
              </Button>
            </div>
          </div>
        )}

        {!done && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onComplete(task)}>
              <CheckCircle2 className="size-3.5" /> Complete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNoteOpen((v) => !v)}
            >
              <StickyNote className="size-3.5" /> Note
            </Button>
            <Button variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                <Camera className="size-3.5" /> Photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPhoto}
                />
              </label>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
