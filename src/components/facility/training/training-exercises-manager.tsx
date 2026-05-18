"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronDown,
  Dumbbell,
  Edit,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hexToRgba } from "@/lib/color-utils";
import { trainingQueries } from "@/lib/api/training";
import {
  DIFFICULTY_BADGE_CLS,
  DIFFICULTY_LABELS,
  DIFFICULTY_LEVELS,
  difficultyRank,
  type DifficultyLevel,
  type TrainingExerciseDef,
} from "@/data/training-exercises";
import type { TrainingDiscipline } from "@/types/training";

interface FormState {
  name: string;
  description: string;
  disciplineId: string;
  difficultyLevel: DifficultyLevel;
  isHidden: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  disciplineId: "",
  difficultyLevel: "foundation",
  isHidden: false,
};

// Module-level seed so custom exercises get a stable id without invoking
// impure helpers (Date.now / Math.random) from render scope.
let newExerciseSeed = 0;
function nextExerciseId(): string {
  newExerciseSeed += 1;
  return `ex-custom-${newExerciseSeed}`;
}

const UNCATEGORIZED = "__uncategorized__";

export function TrainingExercisesManager() {
  const queryClient = useQueryClient();
  const { data: exercises = [] } = useQuery(trainingQueries.allExercises());
  const { data: disciplines = [] } = useQuery(
    trainingQueries.allDisciplines(),
  );

  const activeDisciplines = useMemo(
    () => disciplines.filter((d) => d.isActive),
    [disciplines],
  );
  const disciplineById = useMemo(() => {
    const m = new Map<string, TrainingDiscipline>();
    for (const d of disciplines) m.set(d.id, d);
    return m;
  }, [disciplines]);

  const [filterDisciplineId, setFilterDisciplineId] = useState<string>("all");

  // Dialog state.
  const [editing, setEditing] = useState<TrainingExerciseDef | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Delete confirmation — only ever set for custom exercises.
  const [deleting, setDeleting] = useState<TrainingExerciseDef | null>(null);

  useEffect(() => {
    if (!dialogOpen) return;
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description ?? "",
        disciplineId: editing.disciplineId,
        difficultyLevel: editing.difficultyLevel,
        isHidden: !!editing.isHidden,
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        disciplineId:
          filterDisciplineId !== "all"
            ? filterDisciplineId
            : (activeDisciplines[0]?.id ?? ""),
      });
    }
  }, [dialogOpen, editing, filterDisciplineId, activeDisciplines]);

  const summary = useMemo(() => {
    let visible = 0;
    let hidden = 0;
    let custom = 0;
    for (const ex of exercises) {
      if (ex.isHidden) hidden++;
      else visible++;
      if (ex.isCustom) custom++;
    }
    return { total: exercises.length, visible, hidden, custom };
  }, [exercises]);

  // Group exercises by discipline → tier, each tier sorted by `order`. Honors
  // the active discipline filter so unselected disciplines fall away.
  const groupedByTier = useMemo(() => {
    const out = new Map<string, Map<DifficultyLevel, TrainingExerciseDef[]>>();
    for (const ex of exercises) {
      if (
        filterDisciplineId !== "all" &&
        ex.disciplineId !== filterDisciplineId
      ) {
        continue;
      }
      const key = ex.disciplineId || UNCATEGORIZED;
      const tierMap = out.get(key) ?? new Map<DifficultyLevel, TrainingExerciseDef[]>();
      const tier = tierMap.get(ex.difficultyLevel) ?? [];
      tier.push(ex);
      tierMap.set(ex.difficultyLevel, tier);
      out.set(key, tierMap);
    }
    for (const tierMap of out.values()) {
      for (const list of tierMap.values()) {
        list.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
      }
    }
    return out;
  }, [exercises, filterDisciplineId]);

  const sectionOrder = useMemo(() => {
    const ids: string[] = [];
    for (const d of disciplines) {
      if (groupedByTier.has(d.id)) ids.push(d.id);
    }
    if (groupedByTier.has(UNCATEGORIZED)) ids.push(UNCATEGORIZED);
    return ids;
  }, [disciplines, groupedByTier]);

  function pushExercises(next: TrainingExerciseDef[]) {
    queryClient.setQueryData<TrainingExerciseDef[]>(
      trainingQueries.allExercises().queryKey,
      next,
    );
    queryClient.setQueryData<TrainingExerciseDef[]>(
      trainingQueries.exercises().queryKey,
      next.filter((e) => !e.isHidden),
    );
  }

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(ex: TrainingExerciseDef) {
    setEditing(ex);
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast.error("Exercise name is required.");
      return;
    }
    if (!form.disciplineId) {
      toast.error("Pick a discipline for this exercise.");
      return;
    }
    if (editing) {
      const tierChanged =
        editing.disciplineId !== form.disciplineId ||
        editing.difficultyLevel !== form.difficultyLevel;
      // When the exercise moves to a different (discipline, tier) bucket, drop
      // it at the bottom of the target bucket so existing order is preserved.
      const targetOrder = tierChanged
        ? nextOrderFor(exercises, form.disciplineId, form.difficultyLevel)
        : editing.order;
      const next = exercises.map((ex) =>
        ex.id === editing.id
          ? {
              ...ex,
              name: form.name.trim(),
              description: form.description.trim() || undefined,
              disciplineId: form.disciplineId,
              difficultyLevel: form.difficultyLevel,
              order: targetOrder,
              isHidden: form.isHidden,
            }
          : ex,
      );
      pushExercises(next);
      toast.success(`"${form.name.trim()}" updated`);
    } else {
      const created: TrainingExerciseDef = {
        id: nextExerciseId(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        disciplineId: form.disciplineId,
        difficultyLevel: form.difficultyLevel,
        order: nextOrderFor(
          exercises,
          form.disciplineId,
          form.difficultyLevel,
        ),
        isHidden: form.isHidden,
        isCustom: true,
      };
      pushExercises([...exercises, created]);
      toast.success(`"${created.name}" added`);
    }
    setDialogOpen(false);
    setEditing(null);
  }

  function toggleHidden(id: string) {
    pushExercises(
      exercises.map((ex) =>
        ex.id === id ? { ...ex, isHidden: !ex.isHidden } : ex,
      ),
    );
  }

  function confirmDelete() {
    if (!deleting) return;
    pushExercises(exercises.filter((ex) => ex.id !== deleting.id));
    toast.success(`"${deleting.name}" deleted`);
    setDeleting(null);
  }

  /** Reorder within a single (discipline, tier) bucket. The renumber bumps
   *  every exercise in that bucket to 1..N so the resulting `order` matches
   *  the visible list exactly. */
  function reorderTier(
    disciplineId: string,
    level: DifficultyLevel,
    fromId: string,
    toId: string,
  ) {
    const sorted = exercises
      .filter((ex) => ex.disciplineId === disciplineId && ex.difficultyLevel === level)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    const oldIndex = sorted.findIndex((ex) => ex.id === fromId);
    const newIndex = sorted.findIndex((ex) => ex.id === toId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    const reordered = arrayMove(sorted, oldIndex, newIndex);
    const orderById = new Map<string, number>();
    reordered.forEach((ex, idx) => orderById.set(ex.id, idx + 1));
    const next = exercises.map((ex) =>
      orderById.has(ex.id) ? { ...ex, order: orderById.get(ex.id)! } : ex,
    );
    pushExercises(next);
  }

  const empty = exercises.length === 0;
  const filteredEmpty = !empty && sectionOrder.length === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="text-muted-foreground size-4" />
            Training Exercises
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            The exercise library powers the Session Completion picker.
            Exercises are grouped by difficulty so the picker mirrors how a
            real training program progresses — Foundation first, then up to
            Competition. Drag rows within a tier to reorder; predefined
            exercises can be hidden but not deleted so historical session logs
            keep their names.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
            >
              <Eye className="size-3" />
              {summary.visible} visible
            </Badge>
            {summary.hidden > 0 && (
              <Badge
                variant="outline"
                className="gap-1 border-slate-200 bg-slate-50 text-[10px] text-slate-600"
              >
                <EyeOff className="size-3" />
                {summary.hidden} hidden
              </Badge>
            )}
            {summary.custom > 0 && (
              <Badge
                variant="outline"
                className="gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-700"
              >
                <Sparkles className="size-3" />
                {summary.custom} custom
              </Badge>
            )}
          </div>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="mr-1.5 size-4" />
          Add exercise
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {!empty && (
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterPill
              active={filterDisciplineId === "all"}
              onClick={() => setFilterDisciplineId("all")}
              label={`All (${summary.total})`}
            />
            {activeDisciplines.map((d) => {
              const count = exercises.filter(
                (ex) => ex.disciplineId === d.id,
              ).length;
              if (count === 0) return null;
              return (
                <FilterPill
                  key={d.id}
                  active={filterDisciplineId === d.id}
                  onClick={() => setFilterDisciplineId(d.id)}
                  label={`${d.name} (${count})`}
                  color={d.color}
                />
              );
            })}
          </div>
        )}

        {empty ? (
          <div className="text-muted-foreground rounded-xl border border-dashed py-10 text-center text-sm">
            <Sparkles className="text-muted-foreground/40 mx-auto mb-2 size-6" />
            No exercises yet — add your first to start logging session work.
          </div>
        ) : filteredEmpty ? (
          <div className="text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm">
            No exercises tagged with this discipline yet.
          </div>
        ) : (
          <div className="space-y-2">
            {sectionOrder.map((sectionId) => {
              const tierMap = groupedByTier.get(sectionId);
              if (!tierMap) return null;
              const discipline =
                sectionId === UNCATEGORIZED
                  ? undefined
                  : disciplineById.get(sectionId);
              const color = discipline?.color ?? "#94a3b8";
              const name =
                discipline?.name ??
                (sectionId === UNCATEGORIZED
                  ? "Uncategorized"
                  : "Unknown discipline");
              const sectionCount = Array.from(tierMap.values()).reduce(
                (sum, list) => sum + list.length,
                0,
              );
              return (
                <Collapsible key={sectionId} defaultOpen>
                  <div
                    className="rounded-xl border bg-card shadow-sm"
                    style={{ borderColor: hexToRgba(color, 0.25) }}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="group flex w-full items-center justify-between gap-3 rounded-t-xl px-3 py-2 text-left hover:bg-slate-50"
                        style={{ backgroundColor: hexToRgba(color, 0.06) }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <p className="text-sm font-semibold text-slate-800">
                            {name}
                          </p>
                          <Badge
                            variant="outline"
                            className="border-transparent text-[10px]"
                            style={{
                              backgroundColor: hexToRgba(color, 0.12),
                              color,
                            }}
                          >
                            {sectionCount} exercise
                            {sectionCount === 1 ? "" : "s"}
                          </Badge>
                          {discipline && !discipline.isActive && (
                            <Badge
                              variant="outline"
                              className="border-slate-200 bg-slate-50 text-[10px] text-slate-600"
                            >
                              Discipline hidden
                            </Badge>
                          )}
                        </div>
                        <ChevronDown className="text-muted-foreground size-4 transition-transform group-data-[state=closed]:-rotate-90" />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="divide-y">
                        {DIFFICULTY_LEVELS.map((level) => {
                          const tierList = tierMap.get(level);
                          if (!tierList || tierList.length === 0) return null;
                          return (
                            <TierBlock
                              key={level}
                              level={level}
                              exercises={tierList}
                              onEdit={openEdit}
                              onToggleHidden={toggleHidden}
                              onDelete={(ex) => setDeleting(ex)}
                              onReorder={(fromId, toId) =>
                                reorderTier(sectionId, level, fromId, toId)
                              }
                            />
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add/Edit dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit exercise" : "Add exercise"}
            </DialogTitle>
            <DialogDescription>
              Exercises feed the Session Completion picker so trainers can log
              what they worked on and rate the dog&apos;s performance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Heel, Recall, Weave poles"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Discipline</Label>
                <Select
                  value={form.disciplineId}
                  onValueChange={(v) => setForm({ ...form, disciplineId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a discipline" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDisciplines.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: d.color ?? "#94a3b8" }}
                          />
                          {d.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Difficulty</Label>
                <Select
                  value={form.difficultyLevel}
                  onValueChange={(v) =>
                    setForm({ ...form, difficultyLevel: v as DifficultyLevel })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {DIFFICULTY_LABELS[level]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                Description (optional)
              </Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Cue, criteria, or anything trainers should remember."
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Visible in picker</p>
                <p className="text-muted-foreground text-xs">
                  Hidden exercises stay on file so historical session logs keep
                  their names, but drop out of the Session Completion picker.
                </p>
              </div>
              <Switch
                checked={!form.isHidden}
                onCheckedChange={(v) => setForm({ ...form, isHidden: !v })}
              />
            </div>
            {editing &&
              (editing.disciplineId !== form.disciplineId ||
                editing.difficultyLevel !== form.difficultyLevel) && (
                <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
                  Saving will move &quot;{editing.name}&quot; to the bottom of
                  its new tier.
                </p>
              )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.name.trim() || !form.disciplineId}
            >
              {editing ? "Save changes" : "Add exercise"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;{deleting?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This exercise will be removed from the library. Any historical
              session logs that reference it will keep the recorded name but
              you won&apos;t be able to pick it again. Consider hiding instead
              if you might want it back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/** Compute the next `order` value for inserting at the bottom of a
 *  (discipline, difficulty) bucket. */
function nextOrderFor(
  exercises: TrainingExerciseDef[],
  disciplineId: string,
  level: DifficultyLevel,
): number {
  let max = 0;
  for (const ex of exercises) {
    if (ex.disciplineId === disciplineId && ex.difficultyLevel === level) {
      if (ex.order > max) max = ex.order;
    }
  }
  return max + 1;
}

function TierBlock({
  level,
  exercises,
  onEdit,
  onToggleHidden,
  onDelete,
  onReorder,
}: {
  level: DifficultyLevel;
  exercises: TrainingExerciseDef[];
  onEdit: (ex: TrainingExerciseDef) => void;
  onToggleHidden: (id: string) => void;
  onDelete: (ex: TrainingExerciseDef) => void;
  onReorder: (fromId: string, toId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Slight activation distance so an accidental nudge while clicking
      // toggles or buttons doesn't kick off a drag.
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  }

  return (
    <div className="px-2.5 py-2">
      <div className="mb-1 flex items-center gap-2 px-1">
        <Badge
          variant="outline"
          className={cn(
            "gap-1 text-[10px]",
            DIFFICULTY_BADGE_CLS[level],
          )}
        >
          <span className="size-1 rounded-full bg-current opacity-70" />
          {DIFFICULTY_LABELS[level]}
        </Badge>
        <span className="text-muted-foreground text-[10px] font-medium">
          Tier {difficultyRank(level) + 1} of {DIFFICULTY_LEVELS.length} · drag
          to reorder
        </span>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={exercises.map((e) => e.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-1">
            {exercises.map((ex) => (
              <SortableExerciseRow
                key={ex.id}
                exercise={ex}
                onEdit={() => onEdit(ex)}
                onToggleHidden={() => onToggleHidden(ex.id)}
                onDelete={() => onDelete(ex)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableExerciseRow({
  exercise,
  onEdit,
  onToggleHidden,
  onDelete,
}: {
  exercise: TrainingExerciseDef;
  onEdit: () => void;
  onToggleHidden: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-card px-2 py-1.5 transition-shadow",
        exercise.isHidden && "opacity-60",
        isDragging && "shadow-lg ring-2 ring-indigo-200",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-muted-foreground hover:text-foreground -ml-1 cursor-grab touch-none rounded p-1 active:cursor-grabbing"
        title="Drag to reorder within this tier"
        aria-label={`Drag handle for ${exercise.name}`}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-800">
            {exercise.name}
          </p>
          {exercise.isCustom && (
            <Badge
              variant="outline"
              className="gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-700"
            >
              <Sparkles className="size-3" />
              Custom
            </Badge>
          )}
          {exercise.isHidden && (
            <Badge
              variant="outline"
              className="border-slate-200 bg-slate-50 text-[10px] text-slate-600"
            >
              Hidden
            </Badge>
          )}
        </div>
        {exercise.description && (
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
            {exercise.description}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Switch
          checked={!exercise.isHidden}
          onCheckedChange={onToggleHidden}
          aria-label={`Toggle ${exercise.name}`}
          className="scale-90"
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onEdit}
          title="Edit exercise"
        >
          <Edit className="size-4" />
        </Button>
        {exercise.isCustom ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive size-8"
            onClick={onDelete}
            title="Delete exercise"
          >
            <Trash2 className="size-4" />
          </Button>
        ) : (
          <span
            className="text-muted-foreground/30 inline-flex size-8 items-center justify-center"
            title="Predefined exercises can be hidden but not deleted."
          >
            <Trash2 className="size-4" />
          </span>
        )}
      </div>
    </li>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  const tint = color ?? "#64748b";
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active || undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors",
        "hover:bg-slate-100",
        "data-[active]:border-transparent data-[active]:text-white",
      )}
      style={
        active
          ? { backgroundColor: tint, borderColor: tint }
          : { backgroundColor: hexToRgba(tint, 0.06) }
      }
    >
      {color && (
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: active ? "#fff" : tint }}
        />
      )}
      {label}
    </button>
  );
}
