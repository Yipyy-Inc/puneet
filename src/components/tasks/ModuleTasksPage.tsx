"use client";

import { useState, useId } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  RotateCcw,
  Settings2,
  Wrench,
  Play,
  Leaf,
  Truck,
  Star,
  AlertCircle,
  RefreshCcw,
} from "lucide-react";
import {
  getTemplatesForModule,
  addTemplate,
  updateTemplate,
  removeTemplate,
} from "@/data/task-templates";
import type { TaskTemplate } from "@/types/task";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Category = TaskTemplate["category"];
type TimingType = TaskTemplate["timing"]["type"];
type AssignTo = NonNullable<TaskTemplate["assignTo"]>;
type RecurringFrequency = NonNullable<TaskTemplate["recurring"]>["frequency"];

const CATEGORY_META: Record<
  Category,
  { label: string; icon: typeof Wrench; color: string }
> = {
  setup: { label: "Setup", icon: Wrench, color: "text-blue-500" },
  execution: { label: "Execution", icon: Play, color: "text-primary" },
  cleanup: { label: "Cleanup", icon: Trash2, color: "text-orange-500" },
  care: { label: "Care", icon: Leaf, color: "text-green-500" },
  transport: { label: "Transport", icon: Truck, color: "text-purple-500" },
  custom: { label: "Custom", icon: Star, color: "text-yellow-500" },
};

const TIMING_LABELS: Record<TimingType, string> = {
  before_start: "Before start",
  at_start: "At start",
  during: "During",
  at_end: "At end",
  after_end: "After end",
  custom_time: "Fixed time",
};

const ASSIGN_LABELS: Record<AssignTo, string> = {
  booking_staff: "Booking staff",
  any_available: "Any available",
  specific_role: "Specific role",
};

// Mock "today's tasks" from templates — in production these come from generated-tasks.ts
function buildTodayTasks(templates: TaskTemplate[]) {
  return templates
    .filter((t) => t.autoCreate)
    .map((t, i) => ({
      id: `today-${t.id}-${i}`,
      templateId: t.id,
      name: t.name,
      category: t.category,
      assignedTo: t.assignTo === "booking_staff" ? "Alex R." : "Any Staff",
      scheduledAt:
        t.timing.type === "custom_time" && t.timing.customTime
          ? t.timing.customTime
          : t.timing.type === "before_start"
            ? "08:45 AM"
            : t.timing.type === "at_start"
              ? "09:00 AM"
              : t.timing.type === "at_end"
                ? "05:00 PM"
                : t.timing.type === "after_end"
                  ? "05:30 PM"
                  : "All day",
      status: (["pending", "in_progress", "completed"] as const)[i % 3],
      isRequired: t.isRequired,
    }));
}

// ─────────────────────────────────────────────
// Empty template for the form
// ─────────────────────────────────────────────

function emptyTemplate(moduleId: string): TaskTemplate {
  return {
    id: "",
    moduleId,
    name: "",
    description: "",
    category: "custom",
    timing: { type: "at_start" },
    durationMinutes: 15,
    assignTo: "any_available",
    requiredRole: "",
    isRequired: false,
    autoCreate: true,
    recurring: undefined,
  };
}

// ─────────────────────────────────────────────
// Task form modal
// ─────────────────────────────────────────────

interface TaskFormModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  moduleId: string;
  initial?: TaskTemplate;
  onSave: (t: TaskTemplate) => void;
}

function TaskFormModal({
  open,
  onOpenChange,
  moduleId,
  initial,
  onSave,
}: TaskFormModalProps) {
  const uid = useId();
  const isNew = !initial;
  const [form, setForm] = useState<TaskTemplate>(
    () => initial ?? emptyTemplate(moduleId),
  );

  // Keep form in sync when initial changes (edit vs new)
  const resetForm = (next: TaskTemplate) => setForm(next);

  function patch<K extends keyof TaskTemplate>(key: K, value: TaskTemplate[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function patchTiming<K extends keyof TaskTemplate["timing"]>(
    key: K,
    value: TaskTemplate["timing"][K],
  ) {
    setForm((prev) => ({ ...prev, timing: { ...prev.timing, [key]: value } }));
  }

  function handleSave() {
    if (!form.name.trim()) return;
    const id = isNew
      ? `${moduleId}-custom-${Date.now()}`
      : form.id;
    onSave({ ...form, id, moduleId });
    onOpenChange(false);
  }

  // Reset when dialog opens fresh for new task
  function handleOpenChange(v: boolean) {
    if (v && isNew) resetForm(emptyTemplate(moduleId));
    onOpenChange(v);
  }

  const showOffset =
    form.timing.type === "before_start" || form.timing.type === "after_end";
  const showCustomTime = form.timing.type === "custom_time";
  const showRole = form.assignTo === "specific_role";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add Task Template" : "Edit Task Template"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-name`}>Task name *</Label>
            <Input
              id={`${uid}-name`}
              value={form.name}
              onChange={(e) => patch("name", e.target.value)}
              placeholder="e.g. Morning feeding"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-desc`}>Description</Label>
            <Textarea
              id={`${uid}-desc`}
              value={form.description ?? ""}
              onChange={(e) => patch("description", e.target.value)}
              rows={2}
              placeholder="Optional instructions or notes"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-cat`}>Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) => patch("category", v as Category)}
            >
              <SelectTrigger id={`${uid}-cat`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_META[c].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timing */}
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-timing`}>Timing</Label>
            <Select
              value={form.timing.type}
              onValueChange={(v) => patchTiming("type", v as TimingType)}
            >
              <SelectTrigger id={`${uid}-timing`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TIMING_LABELS) as TimingType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIMING_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showOffset && (
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-offset`}>
                Offset (minutes,{" "}
                {form.timing.type === "before_start" ? "negative = before" : "positive = after"})
              </Label>
              <Input
                id={`${uid}-offset`}
                type="number"
                value={form.timing.offsetMinutes ?? ""}
                onChange={(e) =>
                  patchTiming("offsetMinutes", parseInt(e.target.value) || undefined)
                }
                placeholder={form.timing.type === "before_start" ? "-15" : "15"}
              />
            </div>
          )}

          {showCustomTime && (
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-ctime`}>Fixed time</Label>
              <Input
                id={`${uid}-ctime`}
                type="time"
                value={form.timing.customTime ?? ""}
                onChange={(e) => patchTiming("customTime", e.target.value)}
              />
            </div>
          )}

          {/* Duration */}
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-dur`}>Duration (minutes)</Label>
            <Input
              id={`${uid}-dur`}
              type="number"
              min={1}
              value={form.durationMinutes ?? ""}
              onChange={(e) =>
                patch("durationMinutes", parseInt(e.target.value) || undefined)
              }
              placeholder="15"
            />
          </div>

          {/* Assign to */}
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-assign`}>Assign to</Label>
            <Select
              value={form.assignTo ?? "any_available"}
              onValueChange={(v) => patch("assignTo", v as AssignTo)}
            >
              <SelectTrigger id={`${uid}-assign`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ASSIGN_LABELS) as AssignTo[]).map((a) => (
                  <SelectItem key={a} value={a}>
                    {ASSIGN_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showRole && (
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-role`}>Required role</Label>
              <Input
                id={`${uid}-role`}
                value={form.requiredRole ?? ""}
                onChange={(e) => patch("requiredRole", e.target.value)}
                placeholder="e.g. groomer, vet-tech"
              />
            </div>
          )}

          {/* Recurring */}
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor={`${uid}-rec`} className="text-sm font-medium">
                Repeating task
              </Label>
              <Switch
                id={`${uid}-rec`}
                checked={!!form.recurring}
                onCheckedChange={(v) =>
                  patch(
                    "recurring",
                    v ? { frequency: "daily", times: [] } : undefined,
                  )
                }
              />
            </div>

            {form.recurring && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor={`${uid}-freq`}>Repeat frequency</Label>
                  <Select
                    value={form.recurring.frequency}
                    onValueChange={(v) =>
                      patch("recurring", {
                        ...form.recurring!,
                        frequency: v as RecurringFrequency,
                      })
                    }
                  >
                    <SelectTrigger id={`${uid}-freq`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="per_meal">Per meal</SelectItem>
                      <SelectItem value="per_medication">Per medication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`${uid}-times`}>
                    Times (comma-separated, e.g. 08:00, 18:00)
                  </Label>
                  <Input
                    id={`${uid}-times`}
                    value={(form.recurring.times ?? []).join(", ")}
                    onChange={(e) =>
                      patch("recurring", {
                        ...form.recurring!,
                        times: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="08:00, 12:00, 18:00"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Flags */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Required</p>
                <p className="text-muted-foreground text-xs">
                  Must be completed before checkout
                </p>
              </div>
              <Switch
                checked={form.isRequired}
                onCheckedChange={(v) => patch("isRequired", v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Auto-create</p>
                <p className="text-muted-foreground text-xs">
                  Automatically generate on booking confirmation
                </p>
              </div>
              <Switch
                checked={form.autoCreate}
                onCheckedChange={(v) => patch("autoCreate", v)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!form.name.trim()}>
            {isNew ? "Add Task" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Template row
// ─────────────────────────────────────────────

interface TemplateRowProps {
  template: TaskTemplate;
  isDefault: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function TemplateRow({ template, isDefault, onEdit, onDelete }: TemplateRowProps) {
  const meta = CATEGORY_META[template.category] ?? CATEGORY_META.custom;
  const Icon = meta.icon;

  function timingLabel(t: TaskTemplate["timing"]) {
    if (t.type === "custom_time") return t.customTime ?? "Fixed time";
    if (t.type === "before_start" && t.offsetMinutes)
      return `${Math.abs(t.offsetMinutes)}m before start`;
    if (t.type === "after_end" && t.offsetMinutes)
      return `${t.offsetMinutes}m after end`;
    return TIMING_LABELS[t.type];
  }

  return (
    <div className="hover:bg-muted/30 flex items-center justify-between rounded-lg border p-4 transition-colors">
      <div className="flex items-start gap-3">
        <div
          className={`bg-muted mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${meta.color}`}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{template.name}</p>
            {template.isRequired && (
              <Badge variant="destructive" className="text-xs">
                Required
              </Badge>
            )}
            {template.autoCreate && (
              <Badge variant="secondary" className="text-xs">
                Auto
              </Badge>
            )}
            {template.recurring && (
              <Badge variant="outline" className="gap-1 text-xs">
                <RefreshCcw className="size-3" />
                {template.recurring.frequency === "daily"
                  ? "Daily"
                  : template.recurring.frequency === "per_meal"
                    ? "Per meal"
                    : "Per medication"}
              </Badge>
            )}
            {isDefault && (
              <Badge variant="outline" className="text-muted-foreground text-xs">
                Default
              </Badge>
            )}
          </div>
          {template.description && (
            <p className="text-muted-foreground mt-0.5 text-xs">
              {template.description}
            </p>
          )}
          <div className="text-muted-foreground mt-1 flex flex-wrap gap-3 text-xs">
            <span>{meta.label}</span>
            <span>·</span>
            <span>{timingLabel(template.timing)}</span>
            {template.durationMinutes && (
              <>
                <span>·</span>
                <span>{template.durationMinutes}m</span>
              </>
            )}
            {template.assignTo && (
              <>
                <span>·</span>
                <span>{ASSIGN_LABELS[template.assignTo]}</span>
              </>
            )}
            {template.requiredRole && (
              <>
                <span>·</span>
                <span className="capitalize">{template.requiredRole}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="ml-4 flex shrink-0 items-center gap-2">
        <Button size="icon" variant="ghost" className="size-8" onClick={onEdit}>
          <Pencil className="size-3.5" />
        </Button>
        {!isDefault && (
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive hover:text-destructive size-8"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Today's task row (operational view)
// ─────────────────────────────────────────────

type TodayTask = ReturnType<typeof buildTodayTasks>[number];

const STATUS_CFG = {
  pending: {
    label: "Pending",
    variant: "secondary" as const,
    icon: Clock,
    color: "text-muted-foreground",
  },
  in_progress: {
    label: "In Progress",
    variant: "default" as const,
    icon: Play,
    color: "text-primary",
  },
  completed: {
    label: "Completed",
    variant: "outline" as const,
    icon: CheckCircle2,
    color: "text-green-500",
  },
};

function TodayTaskRow({
  task,
  onComplete,
}: {
  task: TodayTask;
  onComplete: () => void;
}) {
  const meta = CATEGORY_META[task.category as Category] ?? CATEGORY_META.custom;
  const Icon = meta.icon;
  const statusCfg = STATUS_CFG[task.status];
  const StatusIcon = statusCfg.icon;

  return (
    <div className="hover:bg-muted/30 flex items-center justify-between rounded-lg border p-4 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={`bg-muted flex size-9 shrink-0 items-center justify-center rounded-full ${meta.color}`}
        >
          <Icon className="size-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{task.name}</p>
            {task.isRequired && (
              <AlertCircle className="text-destructive size-3.5" />
            )}
          </div>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <span className="capitalize">{meta.label}</span>
            <span>·</span>
            <span>{task.assignedTo}</span>
            <span>·</span>
            <span>{task.scheduledAt}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1 text-xs ${statusCfg.color}`}>
          <StatusIcon className="size-3.5" />
          <span className="hidden sm:inline">{statusCfg.label}</span>
        </div>
        <Badge variant={statusCfg.variant} className="hidden sm:flex">
          {statusCfg.label}
        </Badge>
        {task.status !== "completed" && (
          <Button size="sm" variant="outline" onClick={onComplete}>
            <CheckCircle2 className="mr-1.5 size-3.5" />
            Done
          </Button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main exported component
// ─────────────────────────────────────────────

interface ModuleTasksPageProps {
  moduleId: string;
  moduleName: string;
}

export function ModuleTasksPage({ moduleId, moduleName }: ModuleTasksPageProps) {
  const [templates, setTemplates] = useState<TaskTemplate[]>(() =>
    getTemplatesForModule(moduleId),
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskTemplate | undefined>();
  const [todayTasks, setTodayTasks] = useState(() =>
    buildTodayTasks(getTemplatesForModule(moduleId)),
  );

  // Which templates are default (ship with the app)
  const defaultIds = new Set(
    templates
      .filter((t) => t.id.startsWith(moduleId + "-") && !t.id.includes("custom"))
      .map((t) => t.id),
  );

  function refreshTemplates() {
    const updated = getTemplatesForModule(moduleId);
    setTemplates(updated);
    setTodayTasks(buildTodayTasks(updated));
  }

  function handleAdd() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function handleEdit(t: TaskTemplate) {
    setEditing(t);
    setFormOpen(true);
  }

  function handleSave(t: TaskTemplate) {
    if (editing) {
      updateTemplate(t.id, t);
    } else {
      addTemplate(t);
    }
    refreshTemplates();
  }

  function handleDelete(id: string) {
    removeTemplate(id);
    refreshTemplates();
  }

  function handleComplete(taskId: string) {
    setTodayTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: "completed" as const } : t,
      ),
    );
  }

  const completedCount = todayTasks.filter((t) => t.status === "completed").length;
  const pendingCount = todayTasks.filter((t) => t.status === "pending").length;
  const inProgressCount = todayTasks.filter((t) => t.status === "in_progress").length;

  const byCategory = templates.reduce<Record<string, TaskTemplate[]>>(
    (acc, t) => {
      (acc[t.category] ??= []).push(t);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Tasks</h2>
        <p className="text-muted-foreground text-sm">
          Manage task templates and track daily operations for {moduleName}
        </p>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates" className="gap-2">
            <Settings2 className="size-4" />
            Task Templates
          </TabsTrigger>
          <TabsTrigger value="today" className="gap-2">
            <ClipboardList className="size-4" />
            Today&apos;s Tasks
          </TabsTrigger>
        </TabsList>

        {/* ── Templates tab ── */}
        <TabsContent value="templates" className="mt-4 space-y-4">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-5">
                <p className="text-muted-foreground text-sm">Total Templates</p>
                <p className="text-2xl font-bold">{templates.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-muted-foreground text-sm">Auto-create</p>
                <p className="text-2xl font-bold">
                  {templates.filter((t) => t.autoCreate).length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-muted-foreground text-sm">Required</p>
                <p className="text-2xl font-bold">
                  {templates.filter((t) => t.isRequired).length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* List per category */}
          {(Object.keys(CATEGORY_META) as Category[])
            .filter((cat) => byCategory[cat]?.length)
            .map((cat) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              return (
                <Card key={cat}>
                  <CardHeader className="pb-3">
                    <CardTitle className={`flex items-center gap-2 text-base ${meta.color}`}>
                      <Icon className="size-4" />
                      {meta.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {byCategory[cat].map((t) => (
                      <TemplateRow
                        key={t.id}
                        template={t}
                        isDefault={defaultIds.has(t.id)}
                        onEdit={() => handleEdit(t)}
                        onDelete={() => handleDelete(t.id)}
                      />
                    ))}
                  </CardContent>
                </Card>
              );
            })}

          {templates.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <ClipboardList className="text-muted-foreground size-10" />
                <div>
                  <p className="font-medium">No task templates yet</p>
                  <p className="text-muted-foreground text-sm">
                    Add your first task template to get started
                  </p>
                </div>
                <Button onClick={handleAdd}>
                  <Plus className="mr-2 size-4" />
                  Add Task Template
                </Button>
              </CardContent>
            </Card>
          )}

          {templates.length > 0 && (
            <div className="flex justify-end">
              <Button onClick={handleAdd}>
                <Plus className="mr-2 size-4" />
                Add Task Template
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── Today tab ── */}
        <TabsContent value="today" className="mt-4 space-y-4">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Completed</p>
                    <p className="text-2xl font-bold">{completedCount}</p>
                  </div>
                  <div className="bg-success/10 flex size-11 items-center justify-center rounded-full">
                    <CheckCircle2 className="text-success size-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">In Progress</p>
                    <p className="text-2xl font-bold">{inProgressCount}</p>
                  </div>
                  <div className="bg-primary/10 flex size-11 items-center justify-center rounded-full">
                    <Play className="text-primary size-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Pending</p>
                    <p className="text-2xl font-bold">{pendingCount}</p>
                  </div>
                  <div className="bg-muted flex size-11 items-center justify-center rounded-full">
                    <Clock className="text-muted-foreground size-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <ClipboardList className="size-5" />
                  Today&apos;s Tasks
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTodayTasks(buildTodayTasks(templates))}
                >
                  <RotateCcw className="mr-1.5 size-3.5" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {todayTasks.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <ClipboardList className="text-muted-foreground size-8" />
                  <p className="text-muted-foreground text-sm">
                    No tasks scheduled for today. Add task templates with
                    auto-create enabled.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayTasks.map((task) => (
                    <TodayTaskRow
                      key={task.id}
                      task={task}
                      onComplete={() => handleComplete(task.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TaskFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        moduleId={moduleId}
        initial={editing}
        onSave={handleSave}
      />
    </div>
  );
}
