"use client";

/**
 * Per-course homework template manager — opens as a Sheet from the Course
 * Catalog row. Lets the facility list, create, edit, reorder, and delete
 * homework templates scoped to a single course type.
 *
 * Templates persist via the shared TanStack Query cache (mock layer); when
 * a real backend lands the only change is swapping the cache writes for
 * mutations.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { ExercisePicker } from "@/components/facility/training/exercise-picker";
import { VideoLinksTextarea } from "./video-links-textarea";
import { trainingQueries } from "@/lib/api/training";
import { getDisciplineIdForClassName } from "@/data/training-exercises";
import type {
  HomeworkTemplate,
  HomeworkTemplateItem,
} from "@/data/training-homework-templates";
import {
  fanOutHomeworkTemplateDelete,
  fanOutHomeworkTemplateUpsert,
  nextHomeworkTemplateId,
  nextHomeworkTemplateItemId,
  normalizeCourseName,
} from "@/lib/training-homework-templates";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseTypeName: string;
}

const FREQUENCY_PRESETS = [
  "Daily · 5 min",
  "Daily · 10 min",
  "3x per week",
  "Every other day",
];

export function HomeworkTemplatesSheet({
  open,
  onOpenChange,
  courseTypeName,
}: Props) {
  const queryClient = useQueryClient();
  const { data: allTemplates = [] } = useQuery(
    trainingQueries.allHomeworkTemplates(),
  );

  const courseTemplates = useMemo(() => {
    const target = normalizeCourseName(courseTypeName);
    return allTemplates
      .filter((t) => normalizeCourseName(t.courseTypeName) === target)
      .sort((a, b) => {
        const aSess = a.sessionNumber ?? Number.POSITIVE_INFINITY;
        const bSess = b.sessionNumber ?? Number.POSITIVE_INFINITY;
        if (aSess !== bSess) return aSess - bSess;
        const aOrd = a.sortOrder ?? Number.POSITIVE_INFINITY;
        const bOrd = b.sortOrder ?? Number.POSITIVE_INFINITY;
        if (aOrd !== bOrd) return aOrd - bOrd;
        return a.name.localeCompare(b.name);
      });
  }, [allTemplates, courseTypeName]);

  const [editingTemplate, setEditingTemplate] =
    useState<HomeworkTemplate | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] =
    useState<HomeworkTemplate | null>(null);

  function openCreate() {
    setEditingTemplate(null);
    setEditorOpen(true);
  }

  function openEdit(template: HomeworkTemplate) {
    setEditingTemplate(template);
    setEditorOpen(true);
  }

  function reorder(template: HomeworkTemplate, delta: -1 | 1) {
    // Swap sort order with the neighbour in the current list. Cheaper than
    // reassigning the whole sequence — only two writes per move.
    const idx = courseTemplates.findIndex((t) => t.id === template.id);
    const target = idx + delta;
    if (idx < 0 || target < 0 || target >= courseTemplates.length) return;
    const neighbour = courseTemplates[target]!;
    const aOrd = template.sortOrder ?? idx;
    const bOrd = neighbour.sortOrder ?? target;
    const nowISO = new Date().toISOString();
    fanOutHomeworkTemplateUpsert(queryClient, {
      ...template,
      sortOrder: bOrd,
      updatedAt: nowISO,
    });
    fanOutHomeworkTemplateUpsert(queryClient, {
      ...neighbour,
      sortOrder: aOrd,
      updatedAt: nowISO,
    });
  }

  function confirmDelete() {
    if (!deletingTemplate) return;
    fanOutHomeworkTemplateDelete(queryClient, deletingTemplate.id);
    toast.success(`"${deletingTemplate.name}" deleted.`);
    setDeletingTemplate(null);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader className="space-y-1.5">
            <SheetTitle className="flex items-center gap-2 text-base">
              <BookOpen className="size-5 text-indigo-600" />
              Homework templates · {courseTypeName}
            </SheetTitle>
            <SheetDescription>
              Save once, reuse every cohort. Trainers load these in one tap
              after marking a session complete.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-3 px-4 pb-4">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-[12px]">
                {courseTemplates.length} template
                {courseTemplates.length === 1 ? "" : "s"} · ordered by week
              </p>
              <Button size="sm" onClick={openCreate} className="gap-1">
                <Plus className="size-4" />
                New template
              </Button>
            </div>

            {courseTemplates.length === 0 ? (
              <div className="text-muted-foreground rounded-xl border border-dashed py-12 text-center text-sm">
                <BookOpen className="text-muted-foreground/30 mx-auto mb-2 size-8" />
                No templates yet — create one or save from the homework prompt
                after a session.
              </div>
            ) : (
              <ul className="space-y-2">
                {courseTemplates.map((template, idx) => (
                  <li
                    key={template.id}
                    className={cn(
                      "bg-card rounded-xl border p-3 shadow-sm",
                      !template.isActive && "opacity-60",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col items-center gap-0.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => reorder(template, -1)}
                          disabled={idx === 0}
                          className={cn(
                            "rounded-sm p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                            idx === 0 && "cursor-not-allowed opacity-30",
                          )}
                          title="Move up"
                        >
                          <ChevronUp className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => reorder(template, 1)}
                          disabled={idx === courseTemplates.length - 1}
                          className={cn(
                            "rounded-sm p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                            idx === courseTemplates.length - 1 &&
                              "cursor-not-allowed opacity-30",
                          )}
                          title="Move down"
                        >
                          <ChevronDown className="size-4" />
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-semibold text-slate-800">
                            {template.name}
                          </p>
                          {template.sessionNumber !== undefined && (
                            <Badge
                              variant="outline"
                              className="border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700"
                            >
                              Week {template.sessionNumber}
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className="border-slate-200 bg-slate-50 text-[10px] text-slate-600"
                          >
                            {template.items.length} item
                            {template.items.length === 1 ? "" : "s"}
                          </Badge>
                          {!template.isActive && (
                            <Badge
                              variant="outline"
                              className="border-slate-200 bg-slate-50 text-[10px] text-slate-600"
                            >
                              Hidden
                            </Badge>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-muted-foreground mt-1 text-[11.5px]/relaxed">
                            {template.description}
                          </p>
                        )}
                        <ul className="mt-2 flex flex-wrap gap-1">
                          {template.items.slice(0, 4).map((it) => (
                            <li
                              key={it.id}
                              className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10.5px] text-slate-700"
                            >
                              {it.exerciseName}
                            </li>
                          ))}
                          {template.items.length > 4 && (
                            <li className="text-muted-foreground inline-flex items-center text-[10.5px]">
                              + {template.items.length - 4} more
                            </li>
                          )}
                        </ul>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEdit(template)}
                          title="Edit template"
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive size-8"
                          onClick={() => setDeletingTemplate(template)}
                          title="Delete template"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <TemplateEditorDialog
        open={editorOpen}
        onOpenChange={(o) => {
          setEditorOpen(o);
          if (!o) setEditingTemplate(null);
        }}
        editing={editingTemplate}
        courseTypeName={courseTypeName}
      />

      <AlertDialog
        open={!!deletingTemplate}
        onOpenChange={(o) => !o && setDeletingTemplate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;{deletingTemplate?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Trainers will no longer be able to load this template. Homework
              that&apos;s already been assigned to students stays untouched.
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
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Editor dialog
// ─────────────────────────────────────────────────────────────────────────

interface EditorState {
  name: string;
  sessionNumber: string;
  description: string;
  items: HomeworkTemplateItem[];
  isActive: boolean;
}

function emptyEditorState(): EditorState {
  return {
    name: "",
    sessionNumber: "",
    description: "",
    items: [makeNewItem()],
    isActive: true,
  };
}

function makeNewItem(): HomeworkTemplateItem {
  return {
    id: nextHomeworkTemplateItemId(),
    exerciseId: "",
    exerciseName: "",
    instructions: [],
    frequency: "Daily · 5 min",
    resources: [],
    dueDayOffset: 7,
  };
}

function TemplateEditorDialog({
  open,
  onOpenChange,
  editing,
  courseTypeName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: HomeworkTemplate | null;
  courseTypeName: string;
}) {
  const queryClient = useQueryClient();
  const preferredDisciplineId = useMemo(
    () => getDisciplineIdForClassName(courseTypeName),
    [courseTypeName],
  );
  const [state, setState] = useState<EditorState>(emptyEditorState());

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setState({
        name: editing.name,
        sessionNumber:
          editing.sessionNumber === undefined
            ? ""
            : String(editing.sessionNumber),
        description: editing.description ?? "",
        items: editing.items.map((it) => ({ ...it })),
        isActive: editing.isActive,
      });
    } else {
      setState(emptyEditorState());
    }
  }, [open, editing]);

  function patchItem(id: string, patch: Partial<HomeworkTemplateItem>) {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((it) =>
        it.id === id ? { ...it, ...patch } : it,
      ),
    }));
  }

  function addItem() {
    setState((prev) => ({ ...prev, items: [...prev.items, makeNewItem()] }));
  }

  function removeItem(id: string) {
    setState((prev) => ({
      ...prev,
      items:
        prev.items.length <= 1
          ? prev.items
          : prev.items.filter((it) => it.id !== id),
    }));
  }

  function handleSave() {
    const trimmed = state.name.trim();
    if (!trimmed) {
      toast.error("Template name is required.");
      return;
    }
    const validItems = state.items.filter((it) => it.exerciseId);
    if (validItems.length === 0) {
      toast.error("Add at least one item with an exercise.");
      return;
    }
    const sessionNumber =
      state.sessionNumber.trim() === ""
        ? undefined
        : Math.max(1, Math.min(52, Number(state.sessionNumber) || 1));
    const nowISO = new Date().toISOString();
    const record: HomeworkTemplate = {
      id: editing?.id ?? nextHomeworkTemplateId(),
      name: trimmed,
      courseTypeName,
      sessionNumber,
      description: state.description.trim() || undefined,
      items: validItems,
      sortOrder: editing?.sortOrder,
      isActive: state.isActive,
      createdAt: editing?.createdAt ?? nowISO,
      updatedAt: nowISO,
    };
    fanOutHomeworkTemplateUpsert(queryClient, record);
    toast.success(editing ? "Template updated." : "Template created.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-5 text-indigo-600" />
            {editing ? "Edit template" : "New template"}
          </DialogTitle>
          <DialogDescription>
            Scoped to <span className="font-medium">{courseTypeName}</span>.
            Tag a session number so it auto-loads when that week&apos;s
            session completes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Name</Label>
              <Input
                value={state.name}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Basic Obedience Week 3 Homework"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                Week (optional)
              </Label>
              <Input
                type="number"
                min={1}
                max={52}
                value={state.sessionNumber}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    sessionNumber: e.target.value,
                  }))
                }
                placeholder="3"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">
              Description (optional)
            </Label>
            <Textarea
              value={state.description}
              onChange={(e) =>
                setState((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Short summary shown in the picker — e.g. 'Add duration. Begin pairing the release cue.'"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Homework items</Label>
              <span className="text-muted-foreground text-[11px]">
                {state.items.length} item
                {state.items.length === 1 ? "" : "s"}
              </span>
            </div>

            <ol className="space-y-2">
              {state.items.map((item, idx) => (
                <li
                  key={item.id}
                  className="rounded-lg border bg-slate-50/40 p-2.5"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Item {idx + 1}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      disabled={state.items.length <= 1}
                      className="size-7 text-rose-600 hover:bg-rose-50"
                      title={
                        state.items.length <= 1
                          ? "Keep at least one item"
                          : "Remove this item"
                      }
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <ExercisePicker
                      value={item.exerciseId}
                      onSelect={(ex) =>
                        patchItem(item.id, {
                          exerciseId: ex?.id ?? "",
                          exerciseName: ex?.name ?? "",
                        })
                      }
                      preferredDisciplineId={preferredDisciplineId}
                      triggerClassName="h-9 text-sm"
                      placeholder="Pick the exercise…"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {FREQUENCY_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            patchItem(item.id, { frequency: preset })
                          }
                          className={cn(
                            "inline-flex h-8 items-center rounded-full border px-2.5 text-[11.5px] font-medium transition-colors",
                            item.frequency === preset
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                          )}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={item.frequency}
                      onChange={(e) =>
                        patchItem(item.id, { frequency: e.target.value })
                      }
                      placeholder="Or type a custom cadence…"
                      className="h-9 text-[12.5px]"
                    />
                    <Textarea
                      value={item.instructions.join("\n")}
                      onChange={(e) =>
                        patchItem(item.id, {
                          instructions: e.target.value
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="Instructions — one per line"
                      className="min-h-[60px] text-[12.5px] leading-relaxed"
                    />
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <VideoLinksTextarea
                        value={item.resources ?? []}
                        onChange={(next) =>
                          patchItem(item.id, { resources: next })
                        }
                        placeholder="Video / resource links — one per line"
                        className="min-h-[60px] text-[12px] leading-relaxed"
                      />
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Due in (days)
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={item.dueDayOffset ?? 7}
                          onChange={(e) =>
                            patchItem(item.id, {
                              dueDayOffset: Math.max(
                                1,
                                Math.min(30, Number(e.target.value) || 7),
                              ),
                            })
                          }
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="w-full gap-1.5"
            >
              <Plus className="size-4" />
              Add item
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Available to trainers</p>
              <p className="text-muted-foreground text-xs">
                Hidden templates stay in the catalog but don&apos;t appear in
                the homework prompt picker.
              </p>
            </div>
            <Switch
              checked={state.isActive}
              onCheckedChange={(v) =>
                setState((prev) => ({ ...prev, isActive: v }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!state.name.trim()}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {editing ? "Save changes" : "Create template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
