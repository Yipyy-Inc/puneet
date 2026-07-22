"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, Check, GripVertical, Clock, Pencil } from "lucide-react";
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
import { useDailyCareConfig } from "@/hooks/use-daily-care-config";
import { TASK_TYPE_META } from "@/components/daily-care/task-type-meta";
import { StepCreatorModal } from "./StepCreatorModal";
import { ScheduleTemplates } from "./ScheduleTemplates";
import type { FacilityDailyCareConfig, DailyCareStep } from "@/types/boarding";

function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const h_ = h ?? 0;
  return `${h_ % 12 || 12}:${String(m ?? 0).padStart(2, "0")} ${h_ < 12 ? "AM" : "PM"}`;
}

// ── Step row (view mode) ───────────────────────────────────────────────────

function StepRow({
  step,
  onToggle,
  onEdit,
  onDelete,
}: {
  step: DailyCareStep;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = TASK_TYPE_META[step.taskType];
  const Icon = meta.Icon;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-disabled={!step.enabled}
      data-dragging={isDragging}
      className="bg-card flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border p-3 transition-colors data-[disabled=true]:opacity-50 data-[dragging=true]:opacity-60 data-[dragging=true]:shadow-lg"
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground shrink-0 cursor-grab touch-none active:cursor-grabbing"
        aria-label={`Reorder ${step.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
      >
        <Icon className={`size-4 ${meta.color}`} />
      </div>

      <div className="min-w-0 flex-1">
        {/* flex-wrap + shrink-0 badge: on a phone the actions (switch + edit +
            delete) squeezed this column, so the name wrapped word-by-word and
            the badge collided with the toggle. Now the badge drops below the
            name instead. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">{step.name}</span>
          <Badge variant="outline" className="h-5 shrink-0 px-1.5 py-0 text-xs">
            {meta.label}
          </Badge>
        </div>
        <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
          <Clock className="size-3" />
          {fmt12(step.time)}
          {step.description && (
            <span className="hidden truncate sm:inline">
              · {step.description}
            </span>
          )}
        </div>
      </div>

      {/* Actions take their own row on phones so the step name gets the full
          card width instead of wrapping word-by-word in a ~78px column. */}
      <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
        <Switch
          checked={step.enabled}
          onCheckedChange={onToggle}
          className="scale-90"
          title={step.enabled ? "Disable step" : "Enable step"}
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onEdit}
          title="Edit step"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive size-7"
          onClick={onDelete}
          title="Delete step"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── DailyCareSettings ──────────────────────────────────────────────────────

export function DailyCareSettings() {
  const { config, setConfig: persistConfig, reset } = useDailyCareConfig();
  // Step Creator modal (spec 4.3) — null editingStep means "create new".
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<DailyCareStep | null>(null);

  // Subtle "saved" affordance — every change persists immediately (the store
  // re-renders the daily list live); this just flashes a brief confirmation.
  const [justSaved, setJustSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function markSaved() {
    setJustSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setJustSaved(false), 1500);
  }

  // Persist directly to the store on every edit — no draft, no Save button.
  function updateConfig(
    updater: (prev: FacilityDailyCareConfig) => FacilityDailyCareConfig,
  ) {
    persistConfig(updater(config));
    markSaved();
  }

  const sortedSteps = [...config.steps].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  function toggleStep(id: string) {
    updateConfig((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s,
      ),
    }));
  }

  function deleteStep(id: string) {
    updateConfig((prev) => ({
      ...prev,
      steps: prev.steps.filter((s) => s.id !== id),
    }));
  }

  // Drag-to-reorder (keyboard-accessible via dnd-kit's KeyboardSensor).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedSteps.findIndex((s) => s.id === active.id);
    const newIndex = sortedSteps.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    // Re-number sortOrder to the new positions and persist immediately.
    const reordered = arrayMove(sortedSteps, oldIndex, newIndex);
    const orderById = new Map(reordered.map((s, i) => [s.id, i]));
    updateConfig((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => ({
        ...s,
        sortOrder: orderById.get(s.id) ?? s.sortOrder,
      })),
    }));
  }

  function openCreate() {
    setEditingStep(null);
    setStepModalOpen(true);
  }

  function openEdit(step: DailyCareStep) {
    setEditingStep(step);
    setStepModalOpen(true);
  }

  // One handler for both create and edit (the modal is the single source).
  function handleStepSubmit(data: Omit<DailyCareStep, "id" | "sortOrder">) {
    if (editingStep) {
      const id = editingStep.id;
      updateConfig((prev) => ({
        ...prev,
        steps: prev.steps.map((s) => (s.id === id ? { ...s, ...data } : s)),
      }));
    } else {
      const maxSort = Math.max(0, ...config.steps.map((s) => s.sortOrder));
      updateConfig((prev) => ({
        ...prev,
        steps: [
          ...prev.steps,
          { id: `step-${Date.now()}`, sortOrder: maxSort + 1, ...data },
        ],
      }));
    }
    setStepModalOpen(false);
    setEditingStep(null);
  }

  // ── Schedule templates (F1: config.templates) ──────────────────────────
  function saveAsTemplate(name: string) {
    updateConfig((prev) => ({
      ...prev,
      templates: [
        ...(prev.templates ?? []),
        {
          id: `tpl-${Date.now()}`,
          name,
          steps: prev.steps.map((s) => structuredClone(s)),
        },
      ],
    }));
  }

  function applyTemplate(steps: DailyCareStep[], days: number[] | null) {
    // Restrict to specific weekdays when a subset is chosen (else run daily).
    const restrictDays =
      days && days.length > 0 && days.length < 7
        ? [...days].sort((a, b) => a - b)
        : null;
    updateConfig((prev) => {
      const now = Date.now();
      const newSteps: DailyCareStep[] = steps.map((s, i) => ({
        ...structuredClone(s),
        id: `step-${now}-${i}`,
        sortOrder: i,
        ...(restrictDays ? { activeDays: restrictDays } : {}),
      }));
      return { ...prev, steps: newSteps };
    });
  }

  function deleteTemplate(id: string) {
    updateConfig((prev) => ({
      ...prev,
      templates: (prev.templates ?? []).filter((t) => t.id !== id),
    }));
  }

  // Silence unused-binding warning for reset (exposed for future "reset to defaults" UI)
  void reset;

  const enabledCount = config.steps.filter((s) => s.enabled).length;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Daily Care Schedule</CardTitle>
          <CardDescription className="mt-1">
            Configure the steps staff follow each day. Every section in the
            Daily Care List comes from these settings — nothing is hard-coded.
            Changes save automatically and update the daily list live.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Badge variant="secondary">{sortedSteps.length} steps</Badge>
          <Badge
            variant={
              enabledCount === sortedSteps.length ? "default" : "outline"
            }
          >
            {enabledCount} enabled
          </Badge>
          <span
            data-saved={justSaved}
            className="text-muted-foreground ml-auto flex items-center gap-1 text-xs transition-colors data-[saved=true]:text-green-600 dark:data-[saved=true]:text-green-400"
          >
            <Check className="size-3.5" />
            {justSaved ? "Saved" : "Autosaves"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedSteps.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {sortedSteps.map((step) => (
                <StepRow
                  key={step.id}
                  step={step}
                  onToggle={() => toggleStep(step.id)}
                  onEdit={() => openEdit(step)}
                  onDelete={() => deleteStep(step.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Separator className="my-3" />
        <Button
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={openCreate}
        >
          <Plus className="mr-2 size-4" />
          Add Step
        </Button>

        <Separator className="my-3" />
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">
              Overdue Alert Threshold
            </Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Alert the manager if a step is not completed within this many
              minutes past its scheduled time.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={5}
              max={120}
              value={config.alertOverdueAfterMinutes}
              onChange={(e) =>
                updateConfig((prev) => ({
                  ...prev,
                  alertOverdueAfterMinutes: parseInt(e.target.value, 10) || 30,
                }))
              }
              className="w-20 text-right"
            />
            <span className="text-muted-foreground text-sm whitespace-nowrap">
              min
            </span>
          </div>
        </div>

        <Separator className="my-3" />
        <ScheduleTemplates
          savedTemplates={config.templates ?? []}
          hasSteps={config.steps.length > 0}
          onSave={saveAsTemplate}
          onApply={applyTemplate}
          onDelete={deleteTemplate}
        />
      </CardContent>

      {stepModalOpen && (
        <StepCreatorModal
          open
          onOpenChange={(o) => {
            setStepModalOpen(o);
            if (!o) setEditingStep(null);
          }}
          step={editingStep}
          existingSteps={config.steps}
          onSubmit={handleStepSubmit}
        />
      )}
    </Card>
  );
}
