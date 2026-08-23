"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ClickableStatCard } from "@/components/ui/ClickableStatCard";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CalendarDays,
  Camera,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  Loader2,
  PenLine,
  Phone,
  Play,
  Plus,
  User,
} from "lucide-react";
import { taskQueries, useUpdateTask } from "@/lib/api/facility-tasks";
import type {
  TaskPriority,
  TaskRow,
  TaskStatus,
} from "@/lib/api/mappers/facility-task";
import { NewTaskDialog } from "./NewTaskDialog";

// ============================================================================
// The task board, from Postgres.
//
// ── WHAT THE FIXTURE VERSION CLAIMED ──────────────────────────────────────
//
// Its Delete button called `toast.error("Task deleted")` and deleted nothing;
// its Edit button had no handler at all; and its four stat cards were
// `ClickableStatCard`s with `onClick={() => {}}`. Three controls that looked
// like controls.
//
// Delete is gone rather than wired — `facility_tasks` has no delete policy and
// `authenticated` holds no DELETE privilege, because a task somebody created
// and abandoned is a fact about how that week ran. **Cancel** is the operation
// and it is real. The stat cards now filter, which is what a clickable card is
// for.
//
// Edit is not here yet. That is a form over eight fields and it is its own
// change; a button that opens nothing is worse than no button, so there is no
// button.
//
// ── `overdue` COMES FROM THE SERVER ───────────────────────────────────────
//
// It used to be recomputed in the browser from `new Date()`, so whether a task
// was late depended on which machine was asking. The route derives it from one
// clock.
// ============================================================================

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-100 text-slate-600",
};

const STATUS_ICONS: Record<TaskStatus, typeof Circle> = {
  pending: Circle,
  in_progress: Loader2,
  completed: CheckCircle2,
  cancelled: Ban,
};

/** Formatted without a locale so server and client agree. */
function fmtDue(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type Row = TaskRow & Record<string, unknown>;

function CompleteDialog({
  task,
  open,
  onClose,
}: {
  task: TaskRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const update = useUpdateTask();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!task) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !update.isPending) {
          setNotes("");
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark complete</DialogTitle>
          <DialogDescription>{task.title}</DialogDescription>
        </DialogHeader>

        {(task.requiresPhoto || task.requiresSignoff) && (
          <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {/* Said plainly rather than enforced, because nothing here can
                enforce it: there is no photo upload on this screen and no
                second signature. Pretending otherwise would be the same lie
                the Delete button used to tell. */}
            This task was set up to need{" "}
            {task.requiresPhoto && task.requiresSignoff
              ? "a photo and a sign-off"
              : task.requiresPhoto
                ? "a photo"
                : "a sign-off"}
            . Neither is captured here yet — record it in the notes.
          </p>
        )}

        <div className="space-y-2">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth recording (optional)"
            rows={3}
          />
          {error && (
            <p className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={update.isPending}
          >
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={update.isPending}
            onClick={() =>
              update.mutate(
                {
                  id: task.id,
                  status: "completed",
                  ...(notes.trim() ? { notes: notes.trim() } : {}),
                },
                {
                  onSuccess: () => {
                    toast.success("Marked complete");
                    setNotes("");
                    setError(null);
                    onClose();
                  },
                  onError: (err) =>
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Could not save that.",
                    ),
                },
              )
            }
          >
            {update.isPending ? "Saving…" : "Mark complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StandaloneTasksTab() {
  const [newOpen, setNewOpen] = useState(false);
  const [completing, setCompleting] = useState<TaskRow | null>(null);
  // OPEN WORK BY DEFAULT, not everything ever. `cancelled` and `completed`
  // accumulate forever by design — a task somebody abandoned is a record — so a
  // board that shows all of them buries today's work behind months of history.
  // The stat cards below reach the closed states.
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all" | "open">(
    "open",
  );

  const { data, isPending, isError, error } = useQuery(taskQueries.all());
  const update = useUpdateTask();

  const tasks = useMemo<TaskRow[]>(() => data?.tasks ?? [], [data?.tasks]);

  const overdueCount = tasks.filter((t) => t.overdue).length;
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const inProgressCount = tasks.filter(
    (t) => t.status === "in_progress",
  ).length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  const visible = useMemo(() => {
    if (statusFilter === "all") return tasks;
    if (statusFilter === "open") {
      return tasks.filter(
        (t) => t.status === "pending" || t.status === "in_progress",
      );
    }
    return tasks.filter((t) => t.status === statusFilter);
  }, [tasks, statusFilter]);

  const move = (task: TaskRow, status: TaskStatus, said: string) =>
    update.mutate(
      { id: task.id, status },
      {
        onSuccess: () => toast.success(said),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not save that.",
          ),
      },
    );

  const columns: ColumnDef<Row>[] = [
    {
      key: "title",
      label: "Task",
      defaultVisible: true,
      render: (t) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            {t.source === "call_follow_up" && (
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-600"
                title="Created from a call"
              >
                <Phone className="size-3" />
              </span>
            )}
            {t.source === "reputation_escalation" && (
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-md bg-rose-100 text-rose-600"
                title="Created from a negative review"
              >
                <AlertTriangle className="size-3" />
              </span>
            )}
            {t.overdue && (
              <span className="size-1.5 shrink-0 rounded-full bg-red-500" />
            )}
            <span
              className={cn(
                "font-medium",
                t.status === "completed" &&
                  "text-muted-foreground line-through",
              )}
            >
              {t.title}
            </span>
            {t.requiresPhoto && (
              <Camera className="text-muted-foreground size-3" />
            )}
            {t.requiresSignoff && (
              <PenLine className="text-muted-foreground size-3" />
            )}
          </div>
          {t.description && (
            <p className="text-muted-foreground line-clamp-1 text-xs">
              {t.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "assignedToName",
      label: "Assigned To",
      icon: User,
      defaultVisible: true,
      render: (t) =>
        t.assignedToName ? (
          <span className="flex items-center gap-1.5 text-sm">
            <span className="bg-primary/10 text-primary flex size-5 items-center justify-center rounded-full text-[9px] font-bold">
              {initialsOf(t.assignedToName)}
            </span>
            {t.assignedToName}
          </span>
        ) : (
          // A real state, not a gap in the data: work the shift picks up. It
          // also appears when somebody leaves — their tasks are unassigned
          // rather than deleted.
          <span className="text-muted-foreground text-sm italic">
            Unassigned
          </span>
        ),
    },
    {
      key: "category",
      label: "Category",
      defaultVisible: true,
      render: (t) => (
        <Badge className="px-1.5 py-0 text-[10px]" variant="secondary">
          {t.category.replace("-", " ")}
        </Badge>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      defaultVisible: true,
      render: (t) => (
        <Badge
          className={cn("px-1.5 py-0 text-[10px]", PRIORITY_COLORS[t.priority])}
          variant="secondary"
        >
          {t.priority}
        </Badge>
      ),
    },
    {
      key: "dueAt",
      label: "Due",
      icon: CalendarDays,
      defaultVisible: true,
      render: (t) => (
        <span
          className={cn("text-sm", t.overdue && "font-semibold text-red-600")}
        >
          {fmtDue(t.dueAt)}
          {t.overdue && <span className="ml-1 text-[10px]">· Overdue</span>}
        </span>
      ),
    },
    {
      key: "estimatedMinutes",
      label: "Est.",
      icon: Clock,
      defaultVisible: false,
      render: (t) => (t.estimatedMinutes ? `${t.estimatedMinutes}m` : "—"),
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (t) => {
        const Icon = STATUS_ICONS[t.status];
        return (
          <Badge
            className={cn(
              "gap-1 px-1.5 py-0 text-[10px]",
              STATUS_COLORS[t.status],
            )}
            variant="secondary"
          >
            <Icon className="size-3" />
            {t.status.replace("_", " ")}
          </Badge>
        );
      },
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "priority",
      label: "Priority",
      options: [
        { value: "all", label: "All Priorities" },
        { value: "urgent", label: "Urgent" },
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
      ],
    },
    {
      key: "source",
      label: "Origin",
      options: [
        { value: "all", label: "Any origin" },
        { value: "manual", label: "Written by hand" },
        { value: "call_follow_up", label: "From a call" },
        { value: "reputation_escalation", label: "From a review" },
        { value: "template", label: "From a template" },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          One-off work, assigned to somebody or left for the shift to pick up.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() =>
              setStatusFilter((s) => (s === "all" ? "open" : "all"))
            }
          >
            {statusFilter === "all" ? "Open work only" : "Show everything"}
          </Button>
          <Button onClick={() => setNewOpen(true)} className="gap-2">
            <Plus className="size-4" />
            New Task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ClickableStatCard
          title="Overdue"
          value={overdueCount}
          subtitle="Past their due time"
          icon={Clock}
          onClick={() => setStatusFilter("open")}
          isActive={statusFilter === "open"}
          valueClassName={overdueCount > 0 ? "text-red-600" : undefined}
        />
        <ClickableStatCard
          title="Pending"
          value={pendingCount}
          subtitle="Not yet started"
          icon={Circle}
          onClick={() =>
            setStatusFilter((s) => (s === "pending" ? "open" : "pending"))
          }
          isActive={statusFilter === "pending"}
        />
        <ClickableStatCard
          title="In progress"
          value={inProgressCount}
          subtitle="Being worked on"
          icon={Loader2}
          onClick={() =>
            setStatusFilter((s) =>
              s === "in_progress" ? "all" : "in_progress",
            )
          }
          isActive={statusFilter === "in_progress"}
        />
        <ClickableStatCard
          title="Completed"
          value={completedCount}
          subtitle="Finished"
          icon={CheckCircle2}
          onClick={() =>
            setStatusFilter((s) => (s === "completed" ? "open" : "completed"))
          }
          isActive={statusFilter === "completed"}
          valueClassName="text-emerald-600"
        />
      </div>

      {data?.truncated && (
        <p className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertCircle className="size-4 shrink-0" />
          Showing the {tasks.length} soonest. There are more.
        </p>
      )}

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-muted-foreground flex flex-col items-center justify-center rounded-md border py-12 text-center">
          <AlertTriangle className="mb-4 size-10 text-red-500 opacity-70" />
          <p>Could not load the task board.</p>
          <p className="mt-1 text-sm">
            {error instanceof Error ? error.message : "Please try again."}
          </p>
        </div>
      ) : (
        <DataTable
          data={visible as Row[]}
          columns={columns}
          filters={filters}
          searchKey="title"
          searchPlaceholder="Search tasks…"
          itemsPerPage={10}
          emptyState={{
            icon: ClipboardList,
            title: "No tasks here",
            description:
              statusFilter === "open"
                ? "No open work. Everything written down has been finished or cancelled."
                : statusFilter === "all"
                  ? "Nothing has been written down yet."
                  : "Nothing in that state right now.",
          }}
          actions={(row) => {
            const task = row as TaskRow;
            const open =
              task.status === "pending" || task.status === "in_progress";
            return (
              <div className="flex gap-1.5">
                {task.status === "pending" && (
                  <Button
                    variant="outline"
                    size="sm"
                    title="Start"
                    disabled={update.isPending}
                    onClick={() => move(task, "in_progress", "Started")}
                  >
                    <Play className="size-4 text-blue-500" />
                  </Button>
                )}
                {open && (
                  <Button
                    variant="outline"
                    size="sm"
                    title="Mark complete"
                    onClick={() => setCompleting(task)}
                  >
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  </Button>
                )}
                {open && (
                  <Button
                    variant="outline"
                    size="sm"
                    title="Cancel this task"
                    disabled={update.isPending}
                    onClick={() => move(task, "cancelled", "Task cancelled")}
                  >
                    <Ban className="text-destructive size-4" />
                  </Button>
                )}
              </div>
            );
          }}
        />
      )}

      <NewTaskDialog open={newOpen} onClose={() => setNewOpen(false)} />
      <CompleteDialog
        task={completing}
        open={Boolean(completing)}
        onClose={() => setCompleting(null)}
      />
    </div>
  );
}
