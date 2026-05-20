"use client";

import { useState, useId, useEffect, useMemo } from "react";
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
  AlertTriangle,
  Filter,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import {
  getTemplatesForModule,
  addTemplate,
  updateTemplate,
  removeTemplate,
} from "@/data/task-templates";
import type { TaskTemplate } from "@/types/task";
import {
  buildTodayTasks,
  isTaskPastDue,
  type TodayTask,
} from "@/lib/today-tasks";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";

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

// buildTodayTasks is now imported from @/lib/today-tasks so the Calendar
// sidebar's "Missed" tile can derive its count from the same source.

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

/**
 * Tasks tied to report-card photo capture get a dedicated camera flow instead
 * of the generic Done button. Detected by name so any future "Photo for…"
 * template is picked up automatically.
 */
function isPhotoTask(task: TodayTask): boolean {
  return /photo/i.test(task.name);
}

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
  missed: {
    label: "Missed",
    variant: "destructive" as const,
    icon: AlertTriangle,
    color: "text-red-600",
  },
};

function TodayTaskRow({
  task,
  onComplete,
  onEdit,
  onDelete,
  photoDataUrl,
  onRequestPhoto,
}: {
  task: TodayTask;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  photoDataUrl?: string;
  onRequestPhoto?: () => void;
}) {
  const meta = CATEGORY_META[task.category as Category] ?? CATEGORY_META.custom;
  const Icon = meta.icon;
  const statusCfg = STATUS_CFG[task.status];
  const StatusIcon = statusCfg.icon;
  const photoTask = isPhotoTask(task);

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
            {photoTask && photoDataUrl && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                title="Photo attached to report card"
              >
                <Camera className="size-3" />
                Added to report card
              </span>
            )}
          </div>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <span className="capitalize">{meta.label}</span>
            <span>·</span>
            <span>{task.assignedTo}</span>
            <span>·</span>
            <span>{task.scheduledAt}</span>
            {task.bookingLabel && (
              <>
                <span>·</span>
                <span className="truncate">{task.bookingLabel}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {photoTask && photoDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoDataUrl}
            alt="Report card photo"
            className="size-9 shrink-0 rounded-md object-cover ring-1 ring-border"
          />
        )}
        <div className={`flex items-center gap-1 text-xs ${statusCfg.color}`}>
          <StatusIcon className="size-3.5" />
          <span className="hidden sm:inline">{statusCfg.label}</span>
        </div>
        <Badge variant={statusCfg.variant} className="hidden sm:flex">
          {statusCfg.label}
        </Badge>
        {task.status !== "completed" &&
          (photoTask ? (
            <Button
              size="sm"
              className="bg-pink-600 text-white hover:bg-pink-700"
              onClick={onRequestPhoto}
            >
              <Camera className="mr-1.5 size-3.5" />
              Upload Photo
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onComplete}>
              <CheckCircle2 className="mr-1.5 size-3.5" />
              Done
            </Button>
          ))}
        {task.status === "completed" && photoTask && !photoDataUrl && (
          <Button size="sm" variant="outline" onClick={onRequestPhoto}>
            <Camera className="mr-1.5 size-3.5" />
            Add Photo
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          onClick={onEdit}
          aria-label="Edit task"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive hover:text-destructive size-8"
          onClick={onDelete}
          aria-label="Delete task"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Photo upload dialog — fires from photo tasks
// ─────────────────────────────────────────────

function PhotoUploadDialog({
  open,
  onOpenChange,
  task,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TodayTask | null;
  onSave: (dataUrl: string, caption: string) => void;
}) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [caption, setCaption] = useState("");

  useEffect(() => {
    if (open) {
      setDataUrl("");
      setCaption("");
    }
  }, [open]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDataUrl(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Camera className="size-4 text-pink-500" />
            Add Photo to Report Card
          </DialogTitle>
        </DialogHeader>
        {task && (
          <div className="space-y-3 py-2">
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs">
              <p className="font-medium">{task.name}</p>
              {task.bookingLabel && (
                <p className="text-muted-foreground mt-0.5">
                  {task.bookingLabel}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Photo</Label>
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFile}
                className="mt-1 cursor-pointer text-sm"
              />
              <p className="text-muted-foreground mt-1 text-[11px]">
                Photo will be attached to this booking&apos;s report card.
              </p>
            </div>
            {dataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dataUrl}
                alt="Preview"
                className="max-h-48 w-full rounded-lg border object-cover"
              />
            )}
            <div>
              <Label className="text-xs">Caption (optional)</Label>
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. After the trim"
                className="mt-1 text-sm"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!dataUrl}
            onClick={() => onSave(dataUrl, caption)}
            className="bg-pink-600 text-white hover:bg-pink-700"
          >
            <Camera className="mr-1.5 size-4" />
            Attach Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Today task form modal — ad-hoc tasks managers add from the Today's Tasks tab
// ─────────────────────────────────────────────

function emptyTodayTask(): TodayTask {
  return {
    id: "",
    templateId: "",
    name: "",
    category: "custom",
    assignedTo: "Any Staff",
    scheduledAt: "09:00 AM",
    status: "pending",
    isRequired: false,
  };
}

function TodayTaskFormModal({
  open,
  onOpenChange,
  initial,
  bookingOptions,
  groomerOptions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: TodayTask;
  bookingOptions: string[];
  groomerOptions: string[];
  onSave: (t: TodayTask) => void;
}) {
  const uid = useId();
  const isNew = !initial;
  const [form, setForm] = useState<TodayTask>(
    () => initial ?? emptyTodayTask(),
  );

  useEffect(() => {
    if (open) setForm(initial ?? emptyTodayTask());
  }, [open, initial]);

  function patch<K extends keyof TodayTask>(key: K, value: TodayTask[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!form.name.trim()) return;
    const id = isNew ? `today-adhoc-${Date.now()}` : form.id;
    onSave({ ...form, id });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add Task" : "Edit Task"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-name`}>Task name *</Label>
            <Input
              id={`${uid}-name`}
              value={form.name}
              onChange={(e) => patch("name", e.target.value)}
              placeholder="e.g. Sanitize grooming station"
            />
          </div>

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

          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-assigned`}>Assigned to</Label>
            <Input
              id={`${uid}-assigned`}
              value={form.assignedTo}
              onChange={(e) => patch("assignedTo", e.target.value)}
              list={`${uid}-assigned-list`}
              placeholder="Staff name"
            />
            {groomerOptions.length > 0 && (
              <datalist id={`${uid}-assigned-list`}>
                {groomerOptions.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-time`}>Scheduled time</Label>
            <Input
              id={`${uid}-time`}
              value={form.scheduledAt}
              onChange={(e) => patch("scheduledAt", e.target.value)}
              placeholder="e.g. 09:30 AM or All day"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-status`}>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) =>
                patch("status", v as TodayTask["status"])
              }
            >
              <SelectTrigger id={`${uid}-status`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-booking`}>Booking (optional)</Label>
            <Input
              id={`${uid}-booking`}
              value={form.bookingLabel ?? ""}
              onChange={(e) =>
                patch("bookingLabel", e.target.value || undefined)
              }
              list={`${uid}-booking-list`}
              placeholder="e.g. Booking #1042 — Luna"
            />
            {bookingOptions.length > 0 && (
              <datalist id={`${uid}-booking-list`}>
                {bookingOptions.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            )}
          </div>

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
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>(() =>
    buildTodayTasks(getTemplatesForModule(moduleId)),
  );
  const [groomerFilter, setGroomerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bookingFilter, setBookingFilter] = useState<string>("all");
  // taskId → captured photo data URL (mock; in production this writes to the
  // report card record for the booking and the data URL becomes an asset id).
  const [taskPhotos, setTaskPhotos] = useState<Record<string, string>>({});
  const [photoUploadFor, setPhotoUploadFor] = useState<TodayTask | null>(null);
  const [todayFormOpen, setTodayFormOpen] = useState(false);
  const [editingToday, setEditingToday] = useState<TodayTask | undefined>();

  // Auto-mark tasks as "missed" when their scheduled time passes without
  // being started or completed. Re-checks every minute while the page is
  // open so the board stays accurate without a manual refresh.
  useEffect(() => {
    function sweep() {
      setTodayTasks((prev) =>
        prev.map((t) =>
          t.status === "pending" && isTaskPastDue(t.scheduledAt)
            ? { ...t, status: "missed" }
            : t,
        ),
      );
    }
    sweep();
    const id = setInterval(sweep, 60_000);
    return () => clearInterval(id);
  }, []);

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

  function handleAddTodayTask() {
    setEditingToday(undefined);
    setTodayFormOpen(true);
  }

  function handleEditTodayTask(task: TodayTask) {
    setEditingToday(task);
    setTodayFormOpen(true);
  }

  function handleSaveTodayTask(task: TodayTask) {
    setTodayTasks((prev) => {
      const exists = prev.some((t) => t.id === task.id);
      if (exists) return prev.map((t) => (t.id === task.id ? task : t));
      return [task, ...prev];
    });
    toast.success(editingToday ? "Task updated" : `Added "${task.name}"`);
  }

  function handleDeleteTodayTask(taskId: string) {
    setTodayTasks((prev) => prev.filter((t) => t.id !== taskId));
    setTaskPhotos((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
    toast.success("Task removed");
  }

  function handlePhotoSave(dataUrl: string, caption: string) {
    const task = photoUploadFor;
    if (!task) return;
    setTaskPhotos((prev) => ({ ...prev, [task.id]: dataUrl }));
    setTodayTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: "completed" as const } : t,
      ),
    );
    toast.success(
      `Photo added to ${task.bookingLabel ?? "the booking"}'s report card`,
      caption ? { description: `“${caption}”` } : undefined,
    );
    setPhotoUploadFor(null);
  }

  const completedCount = todayTasks.filter((t) => t.status === "completed").length;
  const pendingCount = todayTasks.filter((t) => t.status === "pending").length;
  const inProgressCount = todayTasks.filter((t) => t.status === "in_progress").length;
  const missedCount = todayTasks.filter((t) => t.status === "missed").length;

  // Build filter options from the loaded task set so we never show stale
  // names that have been removed.
  const groomerOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of todayTasks) set.add(t.assignedTo);
    return Array.from(set).sort();
  }, [todayTasks]);

  const bookingOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of todayTasks) {
      if (t.bookingLabel) set.add(t.bookingLabel);
    }
    return Array.from(set).sort();
  }, [todayTasks]);

  const filteredTasks = useMemo(() => {
    return todayTasks.filter((t) => {
      if (groomerFilter !== "all" && t.assignedTo !== groomerFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (bookingFilter !== "all" && t.bookingLabel !== bookingFilter)
        return false;
      return true;
    });
  }, [todayTasks, groomerFilter, statusFilter, bookingFilter]);

  const activeFilterCount =
    (groomerFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (bookingFilter !== "all" ? 1 : 0);

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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              label="Completed"
              value={completedCount}
              hint="Done today"
              icon={CheckCircle2}
              tone="emerald"
            />
            <KpiTile
              label="In Progress"
              value={inProgressCount}
              hint="Currently active"
              icon={Play}
              tone="indigo"
            />
            <KpiTile
              label="Pending"
              value={pendingCount}
              hint="Not yet started"
              icon={Clock}
              tone="amber"
            />
            <KpiTile
              label="Missed"
              value={missedCount}
              hint={missedCount > 0 ? "Needs attention" : "All on track"}
              icon={AlertTriangle}
              tone="rose"
            />
          </div>

          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <ClipboardList className="size-5" />
                  Today&apos;s Tasks
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleAddTodayTask}>
                    <Plus className="mr-1.5 size-3.5" />
                    Add Task
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTodayTasks(buildTodayTasks(templates))}
                  >
                    <RotateCcw className="mr-1.5 size-3.5" />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Filter row */}
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Filter className="size-3.5" />
                  Filter
                </div>
                <Select
                  value={groomerFilter}
                  onValueChange={setGroomerFilter}
                >
                  <SelectTrigger className="h-8 min-w-[140px] text-xs">
                    <SelectValue placeholder="Groomer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All groomers</SelectItem>
                    {groomerOptions.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 min-w-[140px] text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={bookingFilter}
                  onValueChange={setBookingFilter}
                  disabled={bookingOptions.length === 0}
                >
                  <SelectTrigger className="h-8 min-w-[180px] text-xs">
                    <SelectValue placeholder="Booking" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All bookings</SelectItem>
                    {bookingOptions.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setGroomerFilter("all");
                      setStatusFilter("all");
                      setBookingFilter("all");
                    }}
                    className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Clear ({activeFilterCount})
                  </button>
                )}
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {filteredTasks.length} of {todayTasks.length}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {todayTasks.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <ClipboardList className="text-muted-foreground size-8" />
                  <p className="text-muted-foreground text-sm">
                    No tasks scheduled for today. Add task templates with
                    auto-create enabled, or add a one-off task below.
                  </p>
                  <Button size="sm" className="mt-2" onClick={handleAddTodayTask}>
                    <Plus className="mr-1.5 size-3.5" />
                    Add Task
                  </Button>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Filter className="text-muted-foreground size-8" />
                  <p className="text-muted-foreground text-sm">
                    No tasks match the current filters.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task) => (
                    <TodayTaskRow
                      key={task.id}
                      task={task}
                      onComplete={() => handleComplete(task.id)}
                      onEdit={() => handleEditTodayTask(task)}
                      onDelete={() => handleDeleteTodayTask(task.id)}
                      photoDataUrl={taskPhotos[task.id]}
                      onRequestPhoto={() => setPhotoUploadFor(task)}
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

      <PhotoUploadDialog
        open={!!photoUploadFor}
        onOpenChange={(o) => {
          if (!o) setPhotoUploadFor(null);
        }}
        task={photoUploadFor}
        onSave={handlePhotoSave}
      />

      <TodayTaskFormModal
        open={todayFormOpen}
        onOpenChange={setTodayFormOpen}
        initial={editingToday}
        bookingOptions={bookingOptions}
        groomerOptions={groomerOptions}
        onSave={handleSaveTodayTask}
      />
    </div>
  );
}
