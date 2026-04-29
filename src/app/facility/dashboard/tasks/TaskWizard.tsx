"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CalendarClock,
  Users,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Search,
  Clock,
  Camera,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";
import {
  workTaskLibrary,
  type WorkTaskDefinition,
  type WorkTaskCategory,
  type WorkTaskPriority,
} from "@/data/work-tasks";
import { shifts } from "@/data/shifts";
import { departments } from "@/data/shifts";
import { staffSkills } from "@/data/shifts";

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

// ── Types ─────────────────────────────────────────────────────────────────────

type AssignmentType = "shift" | "position" | "standalone";

type WizardState = {
  step: 1 | 2 | 3 | 4;
  assignmentType: AssignmentType | null;
  selectedTasks: WorkTaskDefinition[];
  // inline task creation
  showNewTask: boolean;
  newTask: Omit<WorkTaskDefinition, "id" | "isActive" | "createdAt">;
  librarySearch: string;
  // Shift config
  shiftCfg: {
    name: string;
    description: string;
    shiftId: string;
    isRecurring: boolean;
    daysOfWeek: number[];
    specificDate: string;
    isActive: boolean;
  };
  // Position config
  positionCfg: {
    name: string;
    description: string;
    departmentId: string;
    isActive: boolean;
  };
  // Standalone config
  standaloneCfg: {
    assignedToId: string;
    assignedToName: string;
    dueDate: string;
    dueTime: string;
    priority: WorkTaskPriority;
    notes: string;
  };
};

const DEFAULT_NEW_TASK: WizardState["newTask"] = {
  title: "",
  description: "",
  category: "general",
  priority: "medium",
  estimatedMinutes: 15,
  requiresPhoto: false,
  requiresSignoff: false,
};

const DEFAULT_STATE: WizardState = {
  step: 1,
  assignmentType: null,
  selectedTasks: [],
  showNewTask: false,
  newTask: DEFAULT_NEW_TASK,
  librarySearch: "",
  shiftCfg: {
    name: "",
    description: "",
    shiftId: "morning",
    isRecurring: true,
    daysOfWeek: [],
    specificDate: new Date().toISOString().slice(0, 10),
    isActive: true,
  },
  positionCfg: {
    name: "",
    description: "",
    departmentId: "",
    isActive: true,
  },
  standaloneCfg: {
    assignedToId: "",
    assignedToName: "",
    dueDate: new Date().toISOString().slice(0, 10),
    dueTime: "09:00",
    priority: "medium",
    notes: "",
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const steps = ["Type", "Tasks", "Assignment", "Review"];
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground",
                )}
              >
                {done ? <CheckCircle2 className="size-3.5" /> : idx}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mb-4 h-px w-12 transition-all",
                  done ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TaskRow({
  task,
  onRemove,
}: {
  task: WorkTaskDefinition;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
      <ClipboardList className="text-muted-foreground size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{task.title}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <Badge className={cn("px-1.5 py-0 text-[10px]", CATEGORY_COLORS[task.category])} variant="secondary">
            {task.category}
          </Badge>
          <Badge className={cn("px-1.5 py-0 text-[10px]", PRIORITY_COLORS[task.priority])} variant="secondary">
            {task.priority}
          </Badge>
          <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
            <Clock className="size-3" />
            {task.estimatedMinutes}m
          </span>
          {task.requiresPhoto && <Camera className="text-muted-foreground size-3" />}
        </div>
      </div>
      <button
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive shrink-0 transition-colors"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

// ── Step 1: Assignment Type ───────────────────────────────────────────────────

function Step1({
  value,
  onChange,
}: {
  value: AssignmentType | null;
  onChange: (t: AssignmentType) => void;
}) {
  const options = [
    {
      type: "shift" as const,
      icon: CalendarClock,
      title: "Shift Task",
      desc: "Tasks auto-assigned to whoever covers a specific shift — morning, afternoon, or night.",
      example: "e.g. Morning Opening Checklist",
      color: "amber",
    },
    {
      type: "position" as const,
      icon: Users,
      title: "Position Task",
      desc: "Tasks assigned to all staff in a department or role, every time they work.",
      example: "e.g. All Front of House staff",
      color: "blue",
    },
    {
      type: "standalone" as const,
      icon: UserCheck,
      title: "Standalone Task",
      desc: "A one-off task assigned directly to a specific staff member with a due date.",
      example: "e.g. Mike Chen — due tomorrow 2pm",
      color: "emerald",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {options.map(({ type, icon: Icon, title, desc, example, color }) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={cn(
            "flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all",
            value === type
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-muted/30",
          )}
        >
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-lg",
              color === "amber" && "bg-amber-100 text-amber-700",
              color === "blue" && "bg-blue-100 text-blue-700",
              color === "emerald" && "bg-emerald-100 text-emerald-700",
            )}
          >
            <Icon className="size-5" />
          </div>
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{desc}</p>
            <p className="text-muted-foreground/60 mt-2 text-[10px] italic">{example}</p>
          </div>
          {value === type && (
            <CheckCircle2 className="text-primary absolute top-3 right-3 size-4" />
          )}
        </button>
      ))}
    </div>
  );
}

// ── Step 2: Build Task List ───────────────────────────────────────────────────

function Step2({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
}) {
  const filtered = workTaskLibrary.filter(
    (t) =>
      !state.selectedTasks.find((s) => s.id === t.id) &&
      (t.title.toLowerCase().includes(state.librarySearch.toLowerCase()) ||
        t.category.includes(state.librarySearch.toLowerCase())),
  );

  const addTask = (task: WorkTaskDefinition) => {
    onChange({ selectedTasks: [...state.selectedTasks, task] });
  };

  const removeTask = (id: string) => {
    onChange({ selectedTasks: state.selectedTasks.filter((t) => t.id !== id) });
  };

  const saveNewTask = () => {
    if (!state.newTask.title.trim()) return;
    const def: WorkTaskDefinition = {
      id: `inline-${Date.now()}`,
      ...state.newTask,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    onChange({
      selectedTasks: [...state.selectedTasks, def],
      showNewTask: false,
      newTask: DEFAULT_NEW_TASK,
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Library panel */}
      <div className="space-y-3">
        <p className="text-sm font-semibold">Task Library</p>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            className="pl-9"
            placeholder="Search tasks…"
            value={state.librarySearch}
            onChange={(e) => onChange({ librarySearch: e.target.value })}
          />
        </div>
        <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {filtered.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-sm">No matching tasks</p>
          )}
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => addTask(t)}
              className="border-border hover:border-primary/30 hover:bg-muted/40 flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all"
            >
              <Plus className="text-muted-foreground size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.title}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <Badge className={cn("px-1.5 py-0 text-[10px]", CATEGORY_COLORS[t.category])} variant="secondary">
                    {t.category}
                  </Badge>
                  <span className="text-muted-foreground text-[10px]">{t.estimatedMinutes}m</span>
                </div>
              </div>
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => onChange({ showNewTask: !state.showNewTask })}
        >
          <Plus className="size-4" />
          Create New Task
        </Button>

        {/* Inline new task form */}
        {state.showNewTask && (
          <div className="bg-muted/30 space-y-3 rounded-xl border p-4">
            <p className="text-xs font-semibold">New Task</p>
            <Input
              placeholder="Task title *"
              value={state.newTask.title}
              onChange={(e) =>
                onChange({ newTask: { ...state.newTask, title: e.target.value } })
              }
            />
            <Textarea
              placeholder="Description (optional)"
              rows={2}
              value={state.newTask.description ?? ""}
              onChange={(e) =>
                onChange({ newTask: { ...state.newTask, description: e.target.value } })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={state.newTask.category}
                onValueChange={(v: WorkTaskCategory) =>
                  onChange({ newTask: { ...state.newTask, category: v } })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={state.newTask.priority}
                onValueChange={(v: WorkTaskPriority) =>
                  onChange({ newTask: { ...state.newTask, priority: v } })
                }
              >
                <SelectTrigger className="h-8 text-xs">
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Est. min</Label>
                <Input
                  type="number"
                  min={1}
                  className="h-7 w-16 text-xs"
                  value={state.newTask.estimatedMinutes}
                  onChange={(e) =>
                    onChange({
                      newTask: {
                        ...state.newTask,
                        estimatedMinutes: parseInt(e.target.value) || 15,
                      },
                    })
                  }
                />
              </div>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                <Checkbox
                  checked={state.newTask.requiresPhoto}
                  onCheckedChange={(c) =>
                    onChange({ newTask: { ...state.newTask, requiresPhoto: !!c } })
                  }
                />
                Photo
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                <Checkbox
                  checked={state.newTask.requiresSignoff}
                  onCheckedChange={(c) =>
                    onChange({ newTask: { ...state.newTask, requiresSignoff: !!c } })
                  }
                />
                Sign-off
              </label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={saveNewTask} disabled={!state.newTask.title.trim()}>
                Add Task
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onChange({ showNewTask: false, newTask: DEFAULT_NEW_TASK })}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Selected tasks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Selected Tasks</p>
          <Badge variant="secondary" className="text-xs">
            {state.selectedTasks.length} task{state.selectedTasks.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        {state.selectedTasks.length === 0 ? (
          <div className="border-border flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed">
            <ClipboardList className="text-muted-foreground/30 size-8" />
            <p className="text-muted-foreground mt-2 text-sm">No tasks added yet</p>
            <p className="text-muted-foreground/60 text-xs">Pick from the library or create new</p>
          </div>
        ) : (
          <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
            {state.selectedTasks.map((t) => (
              <TaskRow key={t.id} task={t} onRemove={() => removeTask(t.id)} />
            ))}
          </div>
        )}
        {state.selectedTasks.length > 0 && (
          <div className="bg-muted/30 flex items-center gap-4 rounded-lg px-3 py-2 text-[11px] text-slate-600">
            <span>
              Total:{" "}
              <strong>
                {state.selectedTasks.reduce((s, t) => s + t.estimatedMinutes, 0)} min
              </strong>
            </span>
            <span>
              Photo required:{" "}
              <strong>{state.selectedTasks.filter((t) => t.requiresPhoto).length}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 3: Assignment Details ────────────────────────────────────────────────

function Step3({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
}) {
  if (state.assignmentType === "shift") {
    const cfg = state.shiftCfg;
    const toggleDay = (d: number) => {
      const days = cfg.daysOfWeek.includes(d)
        ? cfg.daysOfWeek.filter((x) => x !== d)
        : [...cfg.daysOfWeek, d];
      onChange({ shiftCfg: { ...cfg, daysOfWeek: days } });
    };
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <Label>Group Name *</Label>
          <Input
            placeholder="e.g. Morning Opening Checklist"
            value={cfg.name}
            onChange={(e) => onChange({ shiftCfg: { ...cfg, name: e.target.value } })}
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            rows={2}
            placeholder="What should staff expect from this task group?"
            value={cfg.description}
            onChange={(e) => onChange({ shiftCfg: { ...cfg, description: e.target.value } })}
          />
        </div>
        <div className="space-y-2">
          <Label>Shift Period *</Label>
          <div className="flex gap-2">
            {shifts.map((s) => (
              <button
                key={s.id}
                onClick={() => onChange({ shiftCfg: { ...cfg, shiftId: s.id } })}
                className={cn(
                  "flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-all",
                  cfg.shiftId === s.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/30",
                )}
              >
                {s.name}
                <span className="text-muted-foreground block text-[10px] font-normal">
                  {s.startTime}–{s.endTime}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Label>Schedule</Label>
          <div className="flex gap-2">
            {(["recurring", "one-time"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() =>
                  onChange({ shiftCfg: { ...cfg, isRecurring: opt === "recurring" } })
                }
                className={cn(
                  "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all capitalize",
                  (cfg.isRecurring ? "recurring" : "one-time") === opt
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/30",
                )}
              >
                {opt === "recurring" ? "Recurring" : "One-Time"}
              </button>
            ))}
          </div>
          {cfg.isRecurring ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs">
                Days of week (leave empty for every day)
              </p>
              <div className="flex gap-2">
                {DAYS.map((day, i) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(i)}
                    className={cn(
                      "size-9 rounded-lg border text-xs font-medium transition-all",
                      cfg.daysOfWeek.includes(i)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30",
                    )}
                  >
                    {day[0]}
                  </button>
                ))}
              </div>
              {cfg.daysOfWeek.length === 0 && (
                <p className="text-muted-foreground text-[11px]">Applies every day</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="specificDate">Date *</Label>
              <Input
                id="specificDate"
                type="date"
                value={cfg.specificDate}
                onChange={(e) =>
                  onChange({ shiftCfg: { ...cfg, specificDate: e.target.value } })
                }
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (state.assignmentType === "position") {
    const cfg = state.positionCfg;
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <Label>Group Name *</Label>
          <Input
            placeholder="e.g. Front of House Daily Tasks"
            value={cfg.name}
            onChange={(e) => onChange({ positionCfg: { ...cfg, name: e.target.value } })}
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            rows={2}
            placeholder="Describe when and why these tasks apply to this position."
            value={cfg.description}
            onChange={(e) => onChange({ positionCfg: { ...cfg, description: e.target.value } })}
          />
        </div>
        <div className="space-y-2">
          <Label>Department / Position *</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() =>
                  onChange({ positionCfg: { ...cfg, departmentId: dept.id } })
                }
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all",
                  cfg.departmentId === dept.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/30",
                )}
              >
                <span
                  className={cn(
                    "size-2.5 rounded-full",
                    `bg-${dept.color}-500`,
                  )}
                />
                <div>
                  <p className="text-sm font-medium">{dept.name}</p>
                  {dept.description && (
                    <p className="text-muted-foreground text-[10px]">{dept.description}</p>
                  )}
                </div>
                {cfg.departmentId === dept.id && (
                  <CheckCircle2 className="text-primary ml-auto size-4" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Standalone
  const cfg = state.standaloneCfg;
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Assign To *</Label>
        <Select
          value={cfg.assignedToId}
          onValueChange={(v) => {
            const staff = staffSkills.find((s) => s.staffId === v);
            onChange({
              standaloneCfg: {
                ...cfg,
                assignedToId: v,
                assignedToName: staff?.staffName ?? v,
              },
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select staff member" />
          </SelectTrigger>
          <SelectContent>
            {staffSkills.map((s) => (
              <SelectItem key={s.staffId} value={s.staffId}>
                {s.staffName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Due Date *</Label>
          <Input
            type="date"
            value={cfg.dueDate}
            onChange={(e) => onChange({ standaloneCfg: { ...cfg, dueDate: e.target.value } })}
          />
        </div>
        <div className="space-y-2">
          <Label>Due Time</Label>
          <Input
            type="time"
            value={cfg.dueTime}
            onChange={(e) => onChange({ standaloneCfg: { ...cfg, dueTime: e.target.value } })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Priority</Label>
        <Select
          value={cfg.priority}
          onValueChange={(v: WorkTaskPriority) =>
            onChange({ standaloneCfg: { ...cfg, priority: v } })
          }
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
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          rows={3}
          placeholder="Any context or special instructions…"
          value={cfg.notes}
          onChange={(e) => onChange({ standaloneCfg: { ...cfg, notes: e.target.value } })}
        />
      </div>
    </div>
  );
}

// ── Step 4: Review ────────────────────────────────────────────────────────────

function Step4({ state }: { state: WizardState }) {
  const type = state.assignmentType!;

  const summaryLines: { label: string; value: string }[] = [];
  if (type === "shift") {
    const s = state.shiftCfg;
    const shift = shifts.find((sh) => sh.id === s.shiftId);
    summaryLines.push({ label: "Name", value: s.name || "—" });
    summaryLines.push({ label: "Shift", value: shift?.name ?? s.shiftId });
    summaryLines.push({
      label: "Schedule",
      value: s.isRecurring
        ? s.daysOfWeek.length === 0
          ? "Every day"
          : s.daysOfWeek.map((d) => DAYS[d]).join(", ")
        : `One-time: ${s.specificDate}`,
    });
  } else if (type === "position") {
    const p = state.positionCfg;
    const dept = departments.find((d) => d.id === p.departmentId);
    summaryLines.push({ label: "Name", value: p.name || "—" });
    summaryLines.push({ label: "Department", value: dept?.name ?? "—" });
  } else {
    const st = state.standaloneCfg;
    summaryLines.push({ label: "Assigned to", value: st.assignedToName || "—" });
    summaryLines.push({ label: "Due", value: `${st.dueDate} ${st.dueTime}` });
    summaryLines.push({ label: "Priority", value: st.priority });
    if (st.notes) summaryLines.push({ label: "Notes", value: st.notes });
  }

  return (
    <div className="space-y-5">
      <div className="bg-muted/30 space-y-3 rounded-xl border p-4">
        <div className="flex items-center gap-2">
          {type === "shift" && <CalendarClock className="text-amber-600 size-5" />}
          {type === "position" && <Users className="size-5 text-blue-600" />}
          {type === "standalone" && <UserCheck className="size-5 text-emerald-600" />}
          <p className="font-semibold capitalize">{type} Task Group</p>
        </div>
        {summaryLines.map((l) => (
          <div key={l.label} className="flex items-start gap-2 text-sm">
            <span className="text-muted-foreground w-28 shrink-0">{l.label}</span>
            <span className="font-medium">{l.value}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">
          Tasks to assign ({state.selectedTasks.length})
        </p>
        <div className="max-h-52 space-y-1.5 overflow-y-auto">
          {state.selectedTasks.map((t, i) => (
            <div key={t.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <span className="text-muted-foreground w-5 text-center text-[11px]">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.title}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={cn("px-1.5 py-0 text-[10px]", PRIORITY_COLORS[t.priority])} variant="secondary">
                  {t.priority}
                </Badge>
                <span className="text-muted-foreground text-[10px]">{t.estimatedMinutes}m</span>
              </div>
            </div>
          ))}
        </div>
        <div className="text-muted-foreground flex items-center gap-4 text-xs">
          <span>
            Total time:{" "}
            <strong className="text-foreground">
              {state.selectedTasks.reduce((s, t) => s + t.estimatedMinutes, 0)} min
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

export function TaskWizard({
  open,
  onClose,
  defaultType,
}: {
  open: boolean;
  onClose: () => void;
  defaultType?: AssignmentType;
}) {
  const [state, setState] = useState<WizardState>({
    ...DEFAULT_STATE,
    assignmentType: defaultType ?? null,
    step: defaultType ? 2 : 1,
  });

  const patch = (p: Partial<WizardState>) => setState((prev) => ({ ...prev, ...p }));

  const canAdvance = () => {
    if (state.step === 1) return !!state.assignmentType;
    if (state.step === 2) return state.selectedTasks.length > 0;
    if (state.step === 3) {
      if (state.assignmentType === "shift") return !!state.shiftCfg.name;
      if (state.assignmentType === "position")
        return !!state.positionCfg.name && !!state.positionCfg.departmentId;
      return !!state.standaloneCfg.assignedToId && !!state.standaloneCfg.dueDate;
    }
    return true;
  };

  const handleCreate = () => {
    toast.success(
      state.assignmentType === "standalone"
        ? `Task assigned to ${state.standaloneCfg.assignedToName}`
        : `Task group "${state.assignmentType === "shift" ? state.shiftCfg.name : state.positionCfg.name}" created`,
    );
    onClose();
    setState({ ...DEFAULT_STATE });
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => setState({ ...DEFAULT_STATE }), 300);
  };

  const titles = ["Choose Assignment Type", "Build Task List", "Configure Assignment", "Review & Confirm"];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg">{titles[state.step - 1]}</DialogTitle>
          <div className="mt-3 flex justify-center">
            <StepIndicator current={state.step} />
          </div>
        </DialogHeader>

        <div className="py-4">
          {state.step === 1 && (
            <Step1 value={state.assignmentType} onChange={(t) => patch({ assignmentType: t })} />
          )}
          {state.step === 2 && <Step2 state={state} onChange={patch} />}
          {state.step === 3 && <Step3 state={state} onChange={patch} />}
          {state.step === 4 && <Step4 state={state} />}
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <Button
            variant="outline"
            onClick={() => (state.step === 1 ? handleClose() : patch({ step: (state.step - 1) as 1 | 2 | 3 | 4 }))}
            className="gap-2"
          >
            <ChevronLeft className="size-4" />
            {state.step === 1 ? "Cancel" : "Back"}
          </Button>

          {state.step < 4 ? (
            <Button
              disabled={!canAdvance()}
              onClick={() => patch({ step: (state.step + 1) as 1 | 2 | 3 | 4 })}
              className="gap-2"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={handleCreate} className="gap-2">
              <CheckCircle2 className="size-4" />
              Create{" "}
              {state.assignmentType === "standalone" ? "Task" : "Task Group"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
