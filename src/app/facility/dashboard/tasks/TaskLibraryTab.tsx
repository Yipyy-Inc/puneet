"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Plus,
  Clock,
  Camera,
  PenLine,
  Trash2,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import {
  workTaskLibrary,
  type WorkTaskDefinition,
  type WorkTaskCategory,
  type WorkTaskPriority,
} from "@/data/work-tasks";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────────

type ExtendedDef = WorkTaskDefinition & Record<string, unknown>;

const PRIORITY_COLORS: Record<WorkTaskPriority, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
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

const CATEGORY_OPTIONS: { value: WorkTaskCategory; label: string }[] = [
  { value: "opening", label: "Opening" },
  { value: "closing", label: "Closing" },
  { value: "operations", label: "Operations" },
  { value: "cleaning", label: "Cleaning" },
  { value: "customer-service", label: "Customer Service" },
  { value: "admin", label: "Admin" },
  { value: "maintenance", label: "Maintenance" },
  { value: "safety", label: "Safety" },
  { value: "general", label: "General" },
];

const EMPTY_FORM: Omit<WorkTaskDefinition, "id" | "createdAt"> = {
  title: "",
  description: "",
  category: "general",
  priority: "medium",
  estimatedMinutes: 15,
  requiresPhoto: false,
  requiresSignoff: false,
  isActive: true,
};

// ── Task Form Dialog ──────────────────────────────────────────────────────────

function TaskFormDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: WorkTaskDefinition;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<Omit<WorkTaskDefinition, "id" | "createdAt">>(
    initial
      ? {
          title: initial.title,
          description: initial.description ?? "",
          category: initial.category,
          priority: initial.priority,
          estimatedMinutes: initial.estimatedMinutes,
          requiresPhoto: initial.requiresPhoto,
          requiresSignoff: initial.requiresSignoff,
          isActive: initial.isActive,
        }
      : EMPTY_FORM,
  );

  const p = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.title.trim()) return;
    toast.success(isEdit ? "Task updated" : "Task added to library");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Task" : "New Library Task"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this reusable task definition."
              : "Create a reusable task that can be added to any group or assignment."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              placeholder="e.g. Morning Safety Walkthrough"
              value={form.title}
              onChange={(e) => p("title", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={2}
              placeholder="Step-by-step instructions or important context…"
              value={form.description ?? ""}
              onChange={(e) => p("description", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={form.category}
                onValueChange={(v: WorkTaskCategory) => p("category", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority *</Label>
              <Select
                value={form.priority}
                onValueChange={(v: WorkTaskPriority) => p("priority", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Estimated Time (minutes)</Label>
            <Input
              type="number"
              min={1}
              value={form.estimatedMinutes}
              onChange={(e) => p("estimatedMinutes", parseInt(e.target.value) || 15)}
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={form.requiresPhoto}
                onCheckedChange={(c) => p("requiresPhoto", !!c)}
              />
              Requires photo proof
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={form.requiresSignoff}
                onCheckedChange={(c) => p("requiresSignoff", !!c)}
              />
              Requires manager sign-off
            </label>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={form.isActive}
              onCheckedChange={(c) => p("isActive", c)}
              id="active-toggle"
            />
            <Label htmlFor="active-toggle" className="font-normal">
              Active (available for assignment)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!form.title.trim()}>
            <CheckCircle2 className="mr-2 size-4" />
            {isEdit ? "Save Changes" : "Add to Library"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TaskLibraryTab() {
  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<WorkTaskDefinition | undefined>();

  const openEdit = (t: WorkTaskDefinition) => {
    setEditTask(t);
    setFormOpen(true);
  };

  const openNew = () => {
    setEditTask(undefined);
    setFormOpen(true);
  };

  const data: ExtendedDef[] = workTaskLibrary as ExtendedDef[];

  const activeCount = workTaskLibrary.filter((t) => t.isActive).length;
  const photoCount = workTaskLibrary.filter((t) => t.requiresPhoto).length;
  const signoffCount = workTaskLibrary.filter((t) => t.requiresSignoff).length;

  const columns: ColumnDef<ExtendedDef>[] = [
    {
      key: "title",
      label: "Task Title",
      icon: BookOpen,
      defaultVisible: true,
      render: (t) => (
        <div className="space-y-0.5">
          <span className={cn("font-medium", !t.isActive && "text-muted-foreground line-through")}>
            {t.title as string}
          </span>
          {t.description && (
            <p className="text-muted-foreground line-clamp-1 text-xs">{t.description as string}</p>
          )}
        </div>
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
      key: "estimatedMinutes",
      label: "Est. Time",
      icon: Clock,
      defaultVisible: true,
      render: (t) => (
        <span className="flex items-center gap-1 text-sm">
          <Clock className="text-muted-foreground size-3.5" />
          {t.estimatedMinutes as number} min
        </span>
      ),
    },
    {
      key: "requiresPhoto",
      label: "Photo",
      icon: Camera,
      defaultVisible: true,
      render: (t) =>
        t.requiresPhoto ? (
          <span title="Photo required"><Camera className="text-muted-foreground size-4" /></span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      key: "requiresSignoff",
      label: "Sign-off",
      icon: PenLine,
      defaultVisible: true,
      render: (t) =>
        t.requiresSignoff ? (
          <span title="Sign-off required"><PenLine className="text-muted-foreground size-4" /></span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      key: "isActive",
      label: "Status",
      defaultVisible: true,
      render: (t) => (
        <Badge
          variant="secondary"
          className={cn(
            "px-1.5 py-0 text-[10px]",
            t.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600",
          )}
        >
          {t.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  const filters: FilterDef[] = [
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
      key: "isActive",
      label: "Status",
      options: [
        { value: "all", label: "All" },
        { value: "true", label: "Active" },
        { value: "false", label: "Inactive" },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Reusable task definitions. Add them to shift groups, position groups, or standalone
          assignments via the wizard.
        </p>
        <Button onClick={openNew} className="gap-2">
          <Plus className="size-4" />
          New Task
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card flex flex-col gap-1 rounded-xl border px-4 py-3">
          <span className="text-muted-foreground text-[11px]">Total tasks</span>
          <span className="text-2xl font-bold">{workTaskLibrary.length}</span>
          <span className="text-muted-foreground text-[11px]">{activeCount} active</span>
        </div>
        <div className="bg-card flex flex-col gap-1 rounded-xl border px-4 py-3">
          <span className="text-muted-foreground text-[11px]">Require photo</span>
          <span className="text-2xl font-bold">{photoCount}</span>
          <span className="text-muted-foreground text-[11px]">
            {Math.round((photoCount / workTaskLibrary.length) * 100)}% of library
          </span>
        </div>
        <div className="bg-card flex flex-col gap-1 rounded-xl border px-4 py-3">
          <span className="text-muted-foreground text-[11px]">Need sign-off</span>
          <span className="text-2xl font-bold">{signoffCount}</span>
          <span className="text-muted-foreground text-[11px]">Manager approval</span>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={data}
        columns={columns}
        filters={filters}
        searchKey="title"
        searchPlaceholder="Search library…"
        itemsPerPage={10}
        actions={(t) => (
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEdit(t as WorkTaskDefinition)}
              title="Edit"
            >
              <PenLine className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              title="Delete"
              onClick={() => toast.error("Task removed from library")}
            >
              <Trash2 className="text-destructive size-4" />
            </Button>
          </div>
        )}
      />

      <TaskFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditTask(undefined);
        }}
        initial={editTask}
      />
    </div>
  );
}
