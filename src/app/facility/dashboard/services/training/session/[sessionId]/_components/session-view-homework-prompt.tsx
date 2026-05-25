"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronRight,
  ChevronsUpDown,
  FileText,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ExercisePicker } from "@/components/facility/training/exercise-picker";
import { trainingQueries } from "@/lib/api/training";
import { getDisciplineIdForClassName } from "@/data/training-exercises";
import { toast } from "sonner";
import {
  fanOutHomeworkUpsert,
  type PresentStudentSummary,
} from "./session-view-save";
import type { TrainingHomework } from "@/lib/training-enrollment";
import type {
  HomeworkTemplate,
  HomeworkTemplateItem,
} from "@/data/training-homework-templates";
import {
  fanOutHomeworkTemplateUpsert,
  filterTemplatesForCourse,
  findTemplateForSession,
  nextHomeworkTemplateId,
  nextHomeworkTemplateItemId,
} from "@/lib/training-homework-templates";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presentStudents: PresentStudentSummary[];
  sessionDate: string;
  className: string;
  /** Session number within the series — drives auto-load of the matching
   *  template ("Week N homework") when the prompt opens. */
  sessionNumber?: number;
  /** Called after the dialog closes (whether they saved or skipped) so the
   *  caller can navigate away from the session view. */
  onDone: () => void;
}

const FREQUENCY_PRESETS = [
  "Daily · 5 min",
  "Daily · 10 min",
  "3x per week",
  "Every other day",
];

interface FormItem {
  /** Local id for React keys + remove handlers. Doesn't persist. */
  localId: string;
  exerciseId: string;
  exerciseName: string;
  frequency: string;
  instructions: string;
  resources: string;
  dueDayOffset: number;
}

function emptyItem(): FormItem {
  return {
    localId: `local-${Math.random().toString(36).slice(2, 9)}`,
    exerciseId: "",
    exerciseName: "",
    frequency: "Daily · 5 min",
    instructions: "",
    resources: "",
    dueDayOffset: 7,
  };
}

function itemFromTemplate(item: HomeworkTemplateItem): FormItem {
  return {
    localId: `local-${item.id}`,
    exerciseId: item.exerciseId,
    exerciseName: item.exerciseName,
    frequency: item.frequency,
    instructions: item.instructions.join("\n"),
    resources: (item.resources ?? []).join("\n"),
    dueDayOffset: item.dueDayOffset ?? 7,
  };
}

export function SessionHomeworkPromptDialog({
  open,
  onOpenChange,
  presentStudents,
  sessionDate,
  className,
  sessionNumber,
  onDone,
}: Props) {
  const queryClient = useQueryClient();
  const { data: exercises = [] } = useQuery(trainingQueries.exercises());
  const { data: templates = [] } = useQuery(
    trainingQueries.homeworkTemplates(),
  );

  const preferredDisciplineId = useMemo(
    () => getDisciplineIdForClassName(className),
    [className],
  );

  // Filtered template list for this course — fed to the Load picker and
  // used to auto-load the matching "Week N" template when the prompt opens.
  const courseTemplates = useMemo(
    () => filterTemplatesForCourse(templates, className),
    [templates, className],
  );

  const [items, setItems] = useState<FormItem[]>([emptyItem()]);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [loadedTemplateName, setLoadedTemplateName] = useState<string | null>(
    null,
  );
  // Distinguishes an auto-loaded template (drives the one-tap "Send to all"
  // banner) from a manually-loaded one (no banner — trainer already picked
  // it, just let them edit + send normally).
  const [autoLoaded, setAutoLoaded] = useState(false);
  // Set the moment the trainer taps Review or edits any field — flips off
  // the one-tap banner so the trainer sees the regular field-level UI.
  const [reviewing, setReviewing] = useState(false);
  const [loadPickerOpen, setLoadPickerOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");

  // Auto-load the matching "Week N" template when the dialog first opens for
  // a session that has one. The trainer can swap it out via Load Template if
  // they want a different one, or just review-and-send.
  useEffect(() => {
    if (!open) return;
    if (sessionNumber === undefined) return;
    const match = findTemplateForSession(templates, className, sessionNumber);
    if (!match) return;
    setItems(match.items.map(itemFromTemplate));
    setLoadedTemplateName(match.name);
    setAutoLoaded(true);
    setReviewing(false);
  }, [open, sessionNumber, templates, className]);

  // Reset on close so the next session-completion run starts clean.
  useEffect(() => {
    if (open) return;
    setItems([emptyItem()]);
    setSkipped(new Set());
    setLoadedTemplateName(null);
    setAutoLoaded(false);
    setReviewing(false);
    setLoadPickerOpen(false);
    setSaveTemplateOpen(false);
    setSaveTemplateName("");
  }, [open]);

  const recipients = presentStudents.filter(
    (s) => s.seriesEnrollment && !skipped.has(s.classEnrollmentId),
  );

  function toggleSkip(classEnrollmentId: string) {
    setSkipped((curr) => {
      const next = new Set(curr);
      if (next.has(classEnrollmentId)) next.delete(classEnrollmentId);
      else next.add(classEnrollmentId);
      return next;
    });
  }

  function patchItem(localId: string, patch: Partial<FormItem>) {
    setReviewing(true);
    setItems((prev) =>
      prev.map((it) => (it.localId === localId ? { ...it, ...patch } : it)),
    );
  }

  function addItem() {
    setReviewing(true);
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(localId: string) {
    setReviewing(true);
    setItems((prev) =>
      prev.length <= 1 ? prev : prev.filter((it) => it.localId !== localId),
    );
  }

  function applyTemplate(template: HomeworkTemplate) {
    setItems(template.items.map(itemFromTemplate));
    setLoadedTemplateName(template.name);
    setLoadPickerOpen(false);
    // Manual load — trainer already picked, so drop the one-tap banner
    // and show the regular editable layout.
    setAutoLoaded(false);
    setReviewing(true);
    toast.success(`Loaded "${template.name}" — ${template.items.length} item${template.items.length === 1 ? "" : "s"} pre-filled.`);
  }

  function handleSaveTemplate() {
    const trimmed = saveTemplateName.trim();
    if (!trimmed) {
      toast.error("Give the template a name first.");
      return;
    }
    const validItems = items.filter((it) => it.exerciseId);
    if (validItems.length === 0) {
      toast.error("Add at least one item with an exercise before saving.");
      return;
    }
    const nowISO = new Date().toISOString();
    const record: HomeworkTemplate = {
      id: nextHomeworkTemplateId(),
      name: trimmed,
      courseTypeName: className,
      sessionNumber,
      items: validItems.map((it) => ({
        id: nextHomeworkTemplateItemId(),
        exerciseId: it.exerciseId,
        exerciseName: it.exerciseName,
        instructions: it.instructions
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        frequency: it.frequency,
        resources: it.resources
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        dueDayOffset: it.dueDayOffset,
      })),
      isActive: true,
      createdAt: nowISO,
      updatedAt: nowISO,
    };
    fanOutHomeworkTemplateUpsert(queryClient, record);
    toast.success(`Saved as "${trimmed}".`);
    setSaveTemplateOpen(false);
    setSaveTemplateName("");
    setLoadedTemplateName(trimmed);
  }

  function handleSkipAll() {
    onOpenChange(false);
    onDone();
  }

  function handleAssign() {
    const validItems = items.filter((it) => it.exerciseId);
    if (validItems.length === 0 || recipients.length === 0) {
      onOpenChange(false);
      onDone();
      return;
    }
    const nowISO = new Date().toISOString();
    let assignedCount = 0;
    for (const student of recipients) {
      if (!student.seriesEnrollment) continue;
      for (const item of validItems) {
        const instructionBullets = item.instructions
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        const resourceLinks = item.resources
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        const record: TrainingHomework = {
          id: `hw-${student.seriesEnrollment.id}-${item.localId}-${nowISO}`,
          enrollmentId: student.seriesEnrollment.id,
          sessionNumber: student.seriesEnrollment.currentSessionNumber || 1,
          sessionDate,
          title: item.exerciseName,
          description: "",
          instructions: instructionBullets,
          resources: resourceLinks.length > 0 ? resourceLinks : undefined,
          frequency: item.frequency,
          nextDueDate: computeDueDate(sessionDate, item.dueDayOffset),
          unlocked: true,
          unlockedDate: nowISO,
          completed: false,
          completedDate: null,
        };
        fanOutHomeworkUpsert(queryClient, record);
      }
      assignedCount++;
    }
    onOpenChange(false);
    onDone();
    toast.success(
      `Assigned ${validItems.length} item${validItems.length === 1 ? "" : "s"} to ${assignedCount} student${assignedCount === 1 ? "" : "s"}.`,
    );
    void exercises;
  }

  const hasAnyExercise = items.some((it) => it.exerciseId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="space-y-2 border-b p-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-5 text-indigo-600" />
            Assign homework for the week
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            One or more exercises go out to every present student in{" "}
            <span className="font-medium">{className}</span>. Owners see them
            on their portal Homework tab. You can skip any student below.
          </DialogDescription>
        </DialogHeader>

        {/* Template toolbar — Load template + active-template chip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50/60 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Popover open={loadPickerOpen} onOpenChange={setLoadPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                  disabled={courseTemplates.length === 0}
                  title={
                    courseTemplates.length === 0
                      ? "No saved templates for this course yet."
                      : "Load a saved template"
                  }
                >
                  <FileText className="size-4" />
                  Load template
                  <ChevronsUpDown className="size-3.5 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 p-0">
                <div className="border-b p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Saved templates · {className}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    Ordered by week so you can pick the right one fast.
                  </p>
                </div>
                {courseTemplates.length === 0 ? (
                  <p className="text-muted-foreground p-4 text-center text-[12px]">
                    No templates yet — assign homework once and tap{" "}
                    <span className="font-medium">Save as template</span> to
                    start a library.
                  </p>
                ) : (
                  <ul className="max-h-[280px] overflow-y-auto">
                    {courseTemplates.map((tpl) => (
                      <li key={tpl.id}>
                        <button
                          type="button"
                          onClick={() => applyTemplate(tpl)}
                          className="flex w-full items-start gap-2 border-b px-3 py-2 text-left hover:bg-indigo-50/50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {tpl.name}
                            </p>
                            <p className="text-muted-foreground mt-0.5 text-[11px]">
                              {tpl.items.length} item
                              {tpl.items.length === 1 ? "" : "s"}
                              {tpl.sessionNumber !== undefined &&
                                ` · Week ${tpl.sessionNumber}`}
                            </p>
                          </div>
                          {tpl.sessionNumber === sessionNumber &&
                            sessionNumber !== undefined && (
                              <Badge
                                variant="outline"
                                className="ml-2 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                              >
                                Matches Week {sessionNumber}
                              </Badge>
                            )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </PopoverContent>
            </Popover>
            {loadedTemplateName && (
              <Badge
                variant="outline"
                className="gap-1 border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700"
                title="Loaded from a saved template — edits are local until you save again."
              >
                <FileText className="size-3" />
                {loadedTemplateName}
              </Badge>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSaveTemplateOpen(true)}
            disabled={!hasAnyExercise}
            className="h-9 gap-1.5"
          >
            <Save className="size-4" />
            Save as template
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {autoLoaded && !reviewing && (
            <section className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 p-3 shadow-sm">
              <div className="flex items-start gap-2.5">
                <div className="bg-emerald-600 text-white flex size-9 shrink-0 items-center justify-center rounded-xl">
                  <Sparkles className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-emerald-900 text-[11px] font-bold uppercase tracking-wider">
                    Template loaded · ready to send
                  </p>
                  <p className="text-emerald-900 mt-0.5 text-[13px]/relaxed">
                    <span className="font-semibold">
                      {loadedTemplateName}
                    </span>{" "}
                    will assign{" "}
                    <span className="font-semibold">
                      {items.filter((it) => it.exerciseId).length} item
                      {items.filter((it) => it.exerciseId).length === 1
                        ? ""
                        : "s"}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold">
                      {recipients.length} student
                      {recipients.length === 1 ? "" : "s"}
                    </span>
                    .
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {items
                      .filter((it) => it.exerciseId)
                      .map((it) => (
                        <li
                          key={it.localId}
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[11px] text-emerald-800"
                        >
                          <BookOpen className="size-3" />
                          {it.exerciseName}
                          <span className="text-muted-foreground ml-0.5 text-[10px]">
                            · {it.frequency}
                          </span>
                        </li>
                      ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleAssign}
                      disabled={!hasAnyExercise || recipients.length === 0}
                      className="h-11 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <Sparkles className="size-4" />
                      Send to all {recipients.length} student
                      {recipients.length === 1 ? "" : "s"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setReviewing(true)}
                      className="h-11"
                    >
                      Review first
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          )}
          {(!autoLoaded || reviewing) && (
          <>
          <ol className="space-y-3">
            {items.map((item, idx) => (
              <li
                key={item.localId}
                className="rounded-xl border bg-slate-50/40 p-3 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Item {idx + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.localId)}
                    disabled={items.length <= 1}
                    className="size-7 text-rose-600 hover:bg-rose-50"
                    title={
                      items.length <= 1
                        ? "Keep at least one item"
                        : "Remove this item"
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Exercise
                    </Label>
                    <ExercisePicker
                      value={item.exerciseId}
                      onSelect={(ex) =>
                        patchItem(item.localId, {
                          exerciseId: ex?.id ?? "",
                          exerciseName: ex?.name ?? "",
                        })
                      }
                      preferredDisciplineId={preferredDisciplineId}
                      triggerClassName="h-11 text-sm"
                      placeholder="Pick the exercise to practice…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Frequency
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {FREQUENCY_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            patchItem(item.localId, { frequency: preset })
                          }
                          className={cn(
                            "inline-flex h-9 items-center rounded-full border px-3 text-[12.5px] font-medium transition-colors",
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
                        patchItem(item.localId, { frequency: e.target.value })
                      }
                      placeholder="Or type a custom cadence…"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Instructions{" "}
                      <span className="font-normal">(one per line)</span>
                    </Label>
                    <Textarea
                      value={item.instructions}
                      onChange={(e) =>
                        patchItem(item.localId, {
                          instructions: e.target.value,
                        })
                      }
                      placeholder={`Start with a 30-second sit\nReward eye contact`}
                      className="min-h-[72px] text-sm leading-relaxed"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Video / resource links{" "}
                        <span className="font-normal">(one per line)</span>
                      </Label>
                      <Textarea
                        value={item.resources}
                        onChange={(e) =>
                          patchItem(item.localId, { resources: e.target.value })
                        }
                        placeholder="https://…"
                        className="min-h-[56px] text-[12.5px] leading-relaxed"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Due in (days)
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={item.dueDayOffset}
                        onChange={(e) =>
                          patchItem(item.localId, {
                            dueDayOffset: Math.max(
                              1,
                              Math.min(30, Number(e.target.value) || 7),
                            ),
                          })
                        }
                        className="h-9 max-w-32"
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
            Add another exercise
          </Button>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Sends to {recipients.length} of {presentStudents.length} present
              student{presentStudents.length === 1 ? "" : "s"}
            </Label>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {presentStudents.map((student) => {
                const isSkipped = skipped.has(student.classEnrollmentId);
                const noSeries = !student.seriesEnrollment;
                return (
                  <li key={student.classEnrollmentId}>
                    <button
                      type="button"
                      onClick={() => toggleSkip(student.classEnrollmentId)}
                      disabled={noSeries}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                        isSkipped || noSeries
                          ? "border-slate-200 bg-slate-50 text-slate-400 line-through"
                          : "border-indigo-200 bg-indigo-50/50 text-indigo-800",
                      )}
                    >
                      <span className="truncate font-medium">
                        {student.petName}
                      </span>
                      {noSeries ? (
                        <span className="text-[10px] uppercase tracking-wide">
                          No series
                        </span>
                      ) : isSkipped ? (
                        <span className="text-[10px] uppercase tracking-wide">
                          Skipped
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wide">
                          Will receive
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          </>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 border-t p-4 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkipAll}
            className="h-11 w-full text-muted-foreground sm:w-auto"
          >
            Skip for now
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={!hasAnyExercise || recipients.length === 0}
            className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
          >
            <Sparkles className="mr-1.5 size-4" />
            Assign to {recipients.length} student
            {recipients.length === 1 ? "" : "s"}
            <ChevronRight className="ml-1 size-4" />
          </Button>
        </DialogFooter>

        {/* Save-as-template dialog ───────────────────────────────────── */}
        <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Save className="size-4 text-indigo-600" />
                Save homework as template
              </DialogTitle>
              <DialogDescription className="text-sm">
                Saves to the {className} template library so future cohorts can
                load it in one tap.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Template name</Label>
                <Input
                  value={saveTemplateName}
                  onChange={(e) => setSaveTemplateName(e.target.value)}
                  placeholder="e.g. Basic Obedience Week 3 Homework"
                  autoFocus
                />
                {sessionNumber !== undefined && (
                  <p className="text-muted-foreground text-[11px]">
                    Tagged as <span className="font-medium">Week {sessionNumber}</span>{" "}
                    automatically — future Week {sessionNumber} sessions will
                    auto-load this template.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSaveTemplateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={!saveTemplateName.trim()}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Save template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function computeDueDate(sessionDate: string, dayOffset: number): string {
  const d = new Date(sessionDate + "T00:00:00");
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().split("T")[0]!;
}
