"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Plus,
  CheckCircle2,
  Clock,
  Camera,
  PenLine,
  Trash2,
  User,
  CalendarDays,
  Circle,
  Loader2,
  Ban,
} from "lucide-react";
import { standaloneTasks, type StandaloneTask, type WorkTaskCategory, type WorkTaskPriority, type WorkTaskStatus } from "@/data/work-tasks";
import { TaskWizard } from "./TaskWizard";
import { toast } from "sonner";
import { ClickableStatCard } from "@/components/ui/ClickableStatCard";

// ── Helpers ───────────────────────────────────────────────────────────────────

type ExtendedTask = StandaloneTask & Record<string, unknown>;

const PRIORITY_COLORS: Record<WorkTaskPriority, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const STATUS_COLORS: Record<WorkTaskStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-100 text-slate-600",
};

const STATUS_ICONS: Record<WorkTaskStatus, typeof Circle> = {
  pending: Circle,
  in_progress: Loader2,
  completed: CheckCircle2,
  cancelled: Ban,
};

const CATEGORY_COLORS: Record<WorkTaskCategory, string> = {
  opening: "bg-amber-100 text-amber-700",
  closing: "bg-indigo-100 text-indigo-700",
  operations: "bg-sky-100 text-sky-700",
  cleaning: "bg-emerald-100 text-emerald-700",
  "customer-service": "bg-pink-100 text-pink-700",
  admin: "bg-purple-100 text-purple-700",
  maintenance: "bg-orange-100 text-orange-700",
  safety: "bg-red-100 text-red-700",
  general: "bg-slate-100 text-slate-700",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isOverdue(task: StandaloneTask) {
  if (task.status === "completed" || task.status === "cancelled") return false;
  const due = new Date(`${task.dueDate}T${task.dueTime ?? "23:59"}`);
  return due < new Date();
}

// ── Complete Task Dialog ──────────────────────────────────────────────────────

function CompleteDialog({
  task,
  open,
  onClose,
}: {
  task: StandaloneTask | null;
  open: boolean;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState("");

  const handleConfirm = () => {
    toast.success(`"${task?.title}" marked as complete`);
    onClose();
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-500" />
            Complete Task
          </DialogTitle>
          <DialogDescription>
            Confirm completion and add any handoff notes.
          </DialogDescription>
        </DialogHeader>
        {task && (
          <div className="space-y-4 py-2">
            <div className="bg-muted/30 rounded-lg border p-3">
              <p className="text-sm font-semibold">{task.title}</p>
              {task.description && (
                <p className="text-muted-foreground mt-0.5 text-xs">{task.description}</p>
              )}
              <div className="text-muted-foreground mt-2 flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <User className="size-3" />
                  {task.assignedToName}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3" />
                  {fmtDate(task.dueDate)}
                  {task.dueTime && ` · ${task.dueTime}`}
                </span>
              </div>
            </div>
            {task.requiresPhoto && (
              <div className="rounded-lg border-2 border-dashed p-6 text-center">
                <Camera className="text-muted-foreground mx-auto mb-2 size-7" />
                <p className="text-muted-foreground text-sm">Photo proof required</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Upload Photo
                </Button>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium">Completion notes</p>
              <Textarea
                placeholder="Any observations or handoff context…"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            {task.requiresSignoff && (
              <p className="bg-amber-50 rounded-lg border border-amber-200 px-3 py-2 text-xs text-amber-700">
                This task requires manager sign-off. It will be marked pending review.
              </p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            <CheckCircle2 className="mr-2 size-4" />
            Mark Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function StandaloneTasksTab() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [completeTask, setCompleteTask] = useState<StandaloneTask | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const today = new Date().toISOString().slice(0, 10);

  const dueTodayCount = standaloneTasks.filter(
    (t) => t.dueDate === today && t.status !== "completed" && t.status !== "cancelled",
  ).length;
  const overdueCount = standaloneTasks.filter(isOverdue).length;
  const pendingCount = standaloneTasks.filter((t) => t.status === "pending").length;
  const completedCount = standaloneTasks.filter((t) => t.status === "completed").length;

  const data: ExtendedTask[] = standaloneTasks as ExtendedTask[];

  const columns: ColumnDef<ExtendedTask>[] = [
    {
      key: "title",
      label: "Task",
      defaultVisible: true,
      render: (t) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            {isOverdue(t as StandaloneTask) && (
              <span className="size-1.5 shrink-0 rounded-full bg-red-500" />
            )}
            <span className={cn("font-medium", t.status === "completed" && "line-through text-muted-foreground")}>
              {t.title}
            </span>
          </div>
          {t.description && (
            <p className="text-muted-foreground line-clamp-1 text-xs">{t.description as string}</p>
          )}
        </div>
      ),
    },
    {
      key: "assignedToName",
      label: "Assigned To",
      icon: User,
      defaultVisible: true,
      render: (t) => (
        <span className="flex items-center gap-1.5 text-sm">
          <span className="bg-primary/10 text-primary flex size-5 items-center justify-center rounded-full text-[9px] font-bold">
            {(t.assignedToName as string)
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .slice(0, 2)}
          </span>
          {t.assignedToName as string}
        </span>
      ),
    },
    {
      key: "category",
      label: "Category",
      defaultVisible: true,
      render: (t) => (
        <Badge
          className={cn("px-1.5 py-0 text-[10px]", CATEGORY_COLORS[t.category as WorkTaskCategory])}
          variant="secondary"
        >
          {(t.category as string).replace("-", " ")}
        </Badge>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      defaultVisible: true,
      render: (t) => (
        <Badge
          className={cn("px-1.5 py-0 text-[10px]", PRIORITY_COLORS[t.priority as WorkTaskPriority])}
          variant="secondary"
        >
          {t.priority as string}
        </Badge>
      ),
    },
    {
      key: "dueDate",
      label: "Due",
      icon: CalendarDays,
      defaultVisible: true,
      render: (t) => {
        const overdue = isOverdue(t as StandaloneTask);
        return (
          <span className={cn("text-sm", overdue && "font-semibold text-red-600")}>
            {fmtDate(t.dueDate as string)}
            {t.dueTime && (
              <span className="text-muted-foreground ml-1 text-[11px]">
                {t.dueTime as string}
              </span>
            )}
            {overdue && <span className="ml-1 text-[10px]">· Overdue</span>}
          </span>
        );
      },
    },
    {
      key: "estimatedMinutes",
      label: "Est.",
      icon: Clock,
      defaultVisible: false,
      render: (t) => `${t.estimatedMinutes as number}m`,
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (t) => {
        const status = t.status as WorkTaskStatus;
        const Icon = STATUS_ICONS[status];
        return (
          <Badge className={cn("gap-1 px-1.5 py-0 text-[10px]", STATUS_COLORS[status])} variant="secondary">
            <Icon className="size-3" />
            {status.replace("_", " ")}
          </Badge>
        );
      },
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "pending", label: "Pending" },
        { value: "in_progress", label: "In Progress" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
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
      key: "category",
      label: "Category",
      options: [
        { value: "all", label: "All Categories" },
        { value: "opening", label: "Opening" },
        { value: "closing", label: "Closing" },
        { value: "operations", label: "Operations" },
        { value: "cleaning", label: "Cleaning" },
        { value: "customer-service", label: "Customer Service" },
        { value: "admin", label: "Admin" },
        { value: "maintenance", label: "Maintenance" },
        { value: "safety", label: "Safety" },
        { value: "general", label: "General" },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          One-off tasks assigned directly to a specific staff member.
        </p>
        <Button onClick={() => setWizardOpen(true)} className="gap-2">
          <Plus className="size-4" />
          New Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ClickableStatCard
          title="Due Today"
          value={dueTodayCount}
          subtitle="Need attention"
          icon={CalendarDays}
          onClick={() => {}}
          isActive={false}
          valueClassName={dueTodayCount > 0 ? "text-amber-600" : undefined}
        />
        <ClickableStatCard
          title="Overdue"
          value={overdueCount}
          subtitle="Past due date"
          icon={Clock}
          onClick={() => {}}
          isActive={false}
          valueClassName={overdueCount > 0 ? "text-red-600" : undefined}
        />
        <ClickableStatCard
          title="Pending"
          value={pendingCount}
          subtitle="Not yet started"
          icon={Circle}
          onClick={() => {}}
          isActive={false}
        />
        <ClickableStatCard
          title="Completed"
          value={completedCount}
          subtitle="This period"
          icon={CheckCircle2}
          onClick={() => {}}
          isActive={false}
          valueClassName="text-emerald-600"
        />
      </div>

      {/* Table */}
      <DataTable
        data={data}
        columns={columns}
        filters={filters}
        searchKey="title"
        searchPlaceholder="Search tasks…"
        itemsPerPage={10}
        actions={(t) => {
          const task = t as StandaloneTask;
          return (
            <div className="flex gap-1.5">
              {(task.status === "pending" || task.status === "in_progress") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCompleteTask(task)}
                  title="Mark complete"
                >
                  <CheckCircle2 className="size-4 text-emerald-500" />
                </Button>
              )}
              <Button variant="outline" size="sm" title="Edit">
                <PenLine className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                title="Delete"
                onClick={() => toast.error("Task deleted")}
              >
                <Trash2 className="text-destructive size-4" />
              </Button>
            </div>
          );
        }}
      />

      <TaskWizard open={wizardOpen} onClose={() => setWizardOpen(false)} defaultType="standalone" />
      <CompleteDialog
        task={completeTask}
        open={!!completeTask}
        onClose={() => setCompleteTask(null)}
      />
    </div>
  );
}
