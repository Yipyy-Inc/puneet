"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Save,
  Edit,
  X,
  ChevronUp,
  ChevronDown,
  PawPrint,
  Utensils,
  Pill,
  Star,
  Droplets,
  SprayCan,
  BedDouble,
  Settings2,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { facilityDailyCareConfig } from "@/data/boarding";
import type { FacilityDailyCareConfig, DailyCareStep, DailyCareTaskType } from "@/types/boarding";

// ── Task type metadata ──────────────────────────────────────────────────────

const TASK_TYPE_META: Record<
  DailyCareTaskType,
  { label: string; Icon: React.ElementType; color: string; bg: string }
> = {
  potty: {
    label: "Potty Round",
    Icon: PawPrint,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  feeding: {
    label: "Feeding",
    Icon: Utensils,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  medication: {
    label: "Medications",
    Icon: Pill,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
  addon: {
    label: "Add-Ons",
    Icon: Star,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  water_refill: {
    label: "Water Refill",
    Icon: Droplets,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  kennel_clean: {
    label: "Kennel Cleaning",
    Icon: SprayCan,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  bedding_change: {
    label: "Bedding Change",
    Icon: BedDouble,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
  },
  custom: {
    label: "Custom Task",
    Icon: Settings2,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-900/30",
  },
};

function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const h_ = h ?? 0;
  return `${h_ % 12 || 12}:${String(m ?? 0).padStart(2, "0")} ${h_ < 12 ? "AM" : "PM"}`;
}

// ── Step row (view mode) ───────────────────────────────────────────────────

function StepRow({
  step,
  isFirst,
  isLast,
  onToggle,
  onDelete,
  onMoveUp,
  onMoveDown,
  isEditing,
}: {
  step: DailyCareStep;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isEditing: boolean;
}) {
  const meta = TASK_TYPE_META[step.taskType];
  const Icon = meta.Icon;

  return (
    <div
      data-disabled={!step.enabled}
      className="flex items-center gap-3 rounded-lg border p-3 transition-colors data-[disabled=true]:opacity-50"
    >
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
      >
        <Icon className={`size-4 ${meta.color}`} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium leading-none">{step.name}</span>
          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
            {meta.label}
          </Badge>
        </div>
        <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
          <Clock className="size-3" />
          {fmt12(step.time)}
          {step.description && (
            <span className="hidden sm:inline truncate">· {step.description}</span>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={isFirst}
            onClick={onMoveUp}
            title="Move up"
          >
            <ChevronUp className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={isLast}
            onClick={onMoveDown}
            title="Move down"
          >
            <ChevronDown className="size-3.5" />
          </Button>
          <Switch
            checked={step.enabled}
            onCheckedChange={onToggle}
            className="scale-90"
            title={step.enabled ? "Disable step" : "Enable step"}
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Delete step"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Add Step Form ──────────────────────────────────────────────────────────

function AddStepForm({
  onAdd,
  onCancel,
}: {
  onAdd: (step: Omit<DailyCareStep, "id" | "sortOrder">) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [time, setTime] = useState("");
  const [taskType, setTaskType] = useState<DailyCareTaskType>("potty");
  const [description, setDescription] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !time) return;
    onAdd({ name: name.trim(), time, taskType, description: description.trim() || undefined, enabled: true });
    setName("");
    setTime("");
    setTaskType("potty");
    setDescription("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-dashed p-4 space-y-3"
    >
      <p className="text-sm font-medium">New Step</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Step Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Morning Potty Round"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Time</Label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Task Type</Label>
          <Select
            value={taskType}
            onValueChange={(v) => setTaskType(v as DailyCareTaskType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TASK_TYPE_META) as DailyCareTaskType[]).map((type) => {
                const m = TASK_TYPE_META[type];
                const MIcon = m.Icon;
                return (
                  <SelectItem key={type} value={type}>
                    <span className="flex items-center gap-2">
                      <MIcon className={`size-3.5 ${m.color}`} />
                      {m.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description (optional)</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Staff instructions for this step..."
          rows={2}
          className="resize-none"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!name.trim() || !time}>
          <Plus className="mr-1.5 size-3.5" />
          Add Step
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ── DailyCareSettings ──────────────────────────────────────────────────────

export function DailyCareSettings() {
  const [config, setConfig] = useState<FacilityDailyCareConfig>(facilityDailyCareConfig);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const sortedSteps = [...config.steps].sort((a, b) => a.sortOrder - b.sortOrder);

  function toggleStep(id: string) {
    setConfig((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    }));
  }

  function deleteStep(id: string) {
    setConfig((prev) => ({
      ...prev,
      steps: prev.steps.filter((s) => s.id !== id),
    }));
  }

  function moveStep(id: string, direction: "up" | "down") {
    const sorted = [...config.steps].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[swapIdx];
    if (!a || !b) return;

    const aOrder = a.sortOrder;
    const bOrder = b.sortOrder;

    setConfig((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => {
        if (s.id === a.id) return { ...s, sortOrder: bOrder };
        if (s.id === b.id) return { ...s, sortOrder: aOrder };
        return s;
      }),
    }));
  }

  function addStep(partial: Omit<DailyCareStep, "id" | "sortOrder">) {
    const maxSort = Math.max(0, ...config.steps.map((s) => s.sortOrder));
    setConfig((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          id: `step-${Date.now()}`,
          sortOrder: maxSort + 1,
          ...partial,
        },
      ],
    }));
    setShowAddForm(false);
  }

  function handleSave() {
    toast.success("Daily care schedule saved");
    setIsEditing(false);
    setShowAddForm(false);
  }

  function handleCancel() {
    setConfig(facilityDailyCareConfig);
    setIsEditing(false);
    setShowAddForm(false);
  }

  const enabledCount = config.steps.filter((s) => s.enabled).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Daily Care Schedule</CardTitle>
            <CardDescription className="mt-1">
              Configure the steps staff follow each day. Every section in the Daily Care List comes
              from these settings — nothing is hard-coded. Add, reorder, or disable steps to match
              how your facility actually runs.
            </CardDescription>
          </div>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 size-4" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Save className="mr-2 size-4" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="mr-2 size-4" />
                Cancel
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Badge variant="secondary">
            {sortedSteps.length} steps
          </Badge>
          <Badge variant={enabledCount === sortedSteps.length ? "default" : "outline"}>
            {enabledCount} enabled
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {sortedSteps.map((step, idx) => (
          <StepRow
            key={step.id}
            step={step}
            isFirst={idx === 0}
            isLast={idx === sortedSteps.length - 1}
            isEditing={isEditing}
            onToggle={() => toggleStep(step.id)}
            onDelete={() => deleteStep(step.id)}
            onMoveUp={() => moveStep(step.id, "up")}
            onMoveDown={() => moveStep(step.id, "down")}
          />
        ))}

        {isEditing && (
          <>
            <Separator className="my-3" />
            {showAddForm ? (
              <AddStepForm onAdd={addStep} onCancel={() => setShowAddForm(false)} />
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="mr-2 size-4" />
                Add Step
              </Button>
            )}
          </>
        )}

        {isEditing && (
          <>
            <Separator className="my-3" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Overdue Alert Threshold</Label>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Alert the manager if a step is not completed within this many minutes past its scheduled time.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={5}
                  max={120}
                  value={config.alertOverdueAfterMinutes}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      alertOverdueAfterMinutes: parseInt(e.target.value, 10) || 30,
                    }))
                  }
                  className="w-20 text-right"
                />
                <span className="text-muted-foreground text-sm whitespace-nowrap">min</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
