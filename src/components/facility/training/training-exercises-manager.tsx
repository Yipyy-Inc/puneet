"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { useSaveTrainingCatalog } from "@/lib/api/training-catalog";
import {
  DIFFICULTY_BADGE_CLS,
  DIFFICULTY_LEVELS,
  difficultyRank,
  type DifficultyLevel,
  type TrainingExerciseDef,
} from "@/data/training-exercises";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { useTrainingLabels } from "@/lib/settings/use-training-labels";
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
  const { locale, section } = useSettingsText();
  const t = section("training");
  const labels = useTrainingLabels();
  // Intl picks the plural form, not `n === 1`: French counts 0 as singular.
  const rules = new Intl.PluralRules(locale === "fr" ? "fr-CA" : "en-CA");
  const plural = (n: number, one: string, other: string) =>
    t(rules.select(n) === "one" ? one : other).replace("{n}", String(n));

  const { save, saving } =
    useSaveTrainingCatalog<TrainingExerciseDef>("training_exercises");
  const { data: exercises = [] } = useQuery(trainingQueries.allExercises());
  const { data: disciplines = [] } = useQuery(trainingQueries.allDisciplines());

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
      const tierMap =
        out.get(key) ?? new Map<DifficultyLevel, TrainingExerciseDef[]>();
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

  /** Save the whole library to the facility's `training_exercises`
   *  setting — it went into the query cache and was gone on reload. Says so
   *  only once saved; false (with the reason) when refused. */
  async function pushExercises(next: TrainingExerciseDef[], saved?: string) {
    try {
      await save(next);
      if (saved) toast.success(saved);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(ex: TrainingExerciseDef) {
    setEditing(ex);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error(t("exNameRequired"));
      return;
    }
    if (!form.disciplineId) {
      toast.error(t("exDisciplineRequired"));
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
      const ok = await pushExercises(
        next,
        t("exUpdated").replace("{name}", form.name.trim()),
      );
      if (!ok) return;
    } else {
      const created: TrainingExerciseDef = {
        id: nextExerciseId(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        disciplineId: form.disciplineId,
        difficultyLevel: form.difficultyLevel,
        order: nextOrderFor(exercises, form.disciplineId, form.difficultyLevel),
        isHidden: form.isHidden,
        isCustom: true,
      };
      const ok = await pushExercises(
        [...exercises, created],
        t("exAdded").replace("{name}", created.name),
      );
      if (!ok) return;
    }
    setDialogOpen(false);
    setEditing(null);
  }

  function toggleHidden(id: string) {
    void pushExercises(
      exercises.map((ex) =>
        ex.id === id ? { ...ex, isHidden: !ex.isHidden } : ex,
      ),
    );
  }

  async function confirmDelete() {
    if (!deleting) return;
    const ok = await pushExercises(
      exercises.filter((ex) => ex.id !== deleting.id),
      t("exDeleted").replace("{name}", deleting.name),
    );
    if (ok) setDeleting(null);
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
      .filter(
        (ex) =>
          ex.disciplineId === disciplineId && ex.difficultyLevel === level,
      )
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
    void pushExercises(next);
  }

  const empty = exercises.length === 0;
  const filteredEmpty = !empty && sectionOrder.length === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="text-muted-foreground size-4" />
            {t("exTitle")}
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">{t("exIntro")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Eye className="size-3" />
              {plural(summary.visible, "exVisibleOne", "exVisibleOther")}
            </Badge>
            {summary.hidden > 0 && (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <EyeOff className="size-3" />
                {plural(summary.hidden, "exHiddenOne", "exHiddenOther")}
              </Badge>
            )}
            {summary.custom > 0 && (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Sparkles className="size-3" />
                {plural(summary.custom, "exCustomOne", "exCustomOther")}
              </Badge>
            )}
          </div>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="mr-1.5 size-4" />
          {t("exAdd")}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {!empty && (
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterPill
              active={filterDisciplineId === "all"}
              onClick={() => setFilterDisciplineId("all")}
              label={t("exFilterAll").replace("{n}", String(summary.total))}
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
                  label={t("exFilterOne")
                    .replace("{name}", d.name)
                    .replace("{n}", String(count))}
                  color={d.color}
                />
              );
            })}
          </div>
        )}

        {empty ? (
          <div className="text-muted-foreground rounded-xl border border-dashed py-10 text-center text-sm">
            <Sparkles className="text-muted-foreground/40 mx-auto mb-2 size-6" />
            {t("exEmpty")}
          </div>
        ) : filteredEmpty ? (
          <div className="text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm">
            {t("exFilteredEmpty")}
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
              // A discipline is named by the facility, so its name is a name and
              // never passes through the locale layer. Only the two FALLBACKS do.
              const name =
                discipline?.name ??
                (sectionId === UNCATEGORIZED
                  ? t("exUncategorized")
                  : t("exUnknownDiscipline"));
              const sectionCount = Array.from(tierMap.values()).reduce(
                (sum, list) => sum + list.length,
                0,
              );
              return (
                <Collapsible key={sectionId} defaultOpen>
                  <div
                    className="bg-card rounded-xl border shadow-sm"
                    style={{ borderColor: hexToRgba(color, 0.25) }}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="group flex min-h-10 w-full items-center justify-between gap-3 rounded-t-xl px-3 py-2 text-left hover:bg-slate-50 max-lg:min-h-12"
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
                            {plural(sectionCount, "exCountOne", "exCountOther")}
                          </Badge>
                          {discipline && !discipline.isActive && (
                            <Badge variant="outline" className="text-[10px]">
                              {t("exDisciplineHidden")}
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
              {editing ? t("exDialogEdit") : t("exDialogAdd")}
            </DialogTitle>
            <DialogDescription>{t("exDialogIntro")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">{t("name")}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("exNamePlaceholder")}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">
                  {t("exDiscipline")}
                </Label>
                <Select
                  value={form.disciplineId}
                  onValueChange={(v) => setForm({ ...form, disciplineId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("exPickDiscipline")} />
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
                <Label className="text-sm font-semibold">
                  {t("exDifficulty")}
                </Label>
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
                        {labels.difficulty(level)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                {t("descriptionOptional")}
              </Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder={t("exDescriptionPlaceholder")}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <p className="text-sm font-medium">{t("exVisibleInPicker")}</p>
                <p className="text-muted-foreground text-xs">
                  {t("exVisibleInPickerHelp")}
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
                  {/* One sentence with one hole. Assembled from three JSX children
                      it could not take French quotation marks (§5q). */}
                  {t("exWillMove").replace("{name}", editing.name)}
                </p>
              )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.disciplineId}
            >
              {editing ? t("saveChanges") : t("exAdd")}
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
              {t("exDeleteTitle").replace("{name}", deleting?.name ?? "")}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("exDeleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={saving}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {t("delete")}
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
  const t = useSettingsText().section("training");
  const labels = useTrainingLabels();
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
          className={cn("gap-1 text-[10px]", DIFFICULTY_BADGE_CLS[level])}
        >
          <span className="size-1 rounded-full bg-current opacity-70" />
          {labels.difficulty(level)}
        </Badge>
        <span className="text-muted-foreground text-[10px] font-medium">
          {/* One sentence, two holes. Split across JSX children it could not
                be reordered, and French puts the rank and the total in the
                same places but with a different word between them (§5q). */}
          {t("exTierOf")
            .replace("{rank}", String(difficultyRank(level) + 1))
            .replace("{total}", String(DIFFICULTY_LEVELS.length))}
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
  const t = useSettingsText().section("training");
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
        // The hidden state was `opacity-60` over the row, which §6 rule 4
        // bans — it takes the name and the description below the text floor
        // together. The "Hidden" chip beside the name already says it.
        "bg-card flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-shadow",
        isDragging && "ring-primary shadow-lg ring-2",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-muted-foreground hover:text-foreground -ml-1 flex size-8 cursor-grab touch-none items-center justify-center rounded-full active:cursor-grabbing max-lg:size-12"
        title={t("exDragTitle")}
        aria-label={t("exDragHandle").replace("{name}", exercise.name)}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-800">
            {exercise.name}
          </p>
          {exercise.isCustom && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Sparkles className="size-3" />
              {t("exCustomTag")}
            </Badge>
          )}
          {exercise.isHidden && (
            <Badge variant="outline" className="text-[10px]">
              {t("exHiddenTag")}
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
          aria-label={t("exToggle").replace("{name}", exercise.name)}
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onEdit}
          title={t("exEdit")}
        >
          <Edit className="size-4" />
        </Button>
        {exercise.isCustom ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive size-8"
            onClick={onDelete}
            title={t("exDelete")}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : (
          <span
            className="text-muted-foreground/30 inline-flex size-8 items-center justify-center"
            title={t("exPredefined")}
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
        "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium text-slate-700 transition-colors max-lg:min-h-12",
        "hover:bg-slate-100",
        "data-active:border-transparent data-active:text-white",
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
