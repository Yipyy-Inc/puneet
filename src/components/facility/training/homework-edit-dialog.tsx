"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { BookOpen, Clock } from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import { fanOutHomeworkUpsert } from "@/lib/training-homework";
import {
  getDisciplineIdForClassName,
  type TrainingExerciseDef,
} from "@/data/training-exercises";
import type {
  TrainingEnrollment,
  TrainingHomework,
} from "@/lib/training-enrollment";
import { ExercisePicker } from "./exercise-picker";

interface FormState {
  enrollmentId: string;
  exerciseId: string;
  title: string;
  description: string;
  /** Newline-separated bullets — split on save. */
  instructionsText: string;
  frequency: string;
  nextDueDate: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass `null` for add mode. */
  editing: TrainingHomework | null;
  /** When provided in add mode, the enrollment is preselected and locked.
   *  Used when launching the dialog from the per-pet Homework tab when a pet
   *  only has one active enrollment. */
  lockedEnrollmentId?: string;
  /** When provided, the enrollment picker is restricted to enrollments for
   *  this pet only — used by the per-pet Homework tab so trainers can&apos;t
   *  accidentally assign homework to a different dog. */
  restrictToPetId?: number;
  /** Today (`YYYY-MM-DD`) — used as the default for `nextDueDate` on
   *  freshly-added homework. */
  todayISO: string;
}

function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

let standaloneHomeworkSeed = 0;
function nextStandaloneHomeworkId(): string {
  standaloneHomeworkSeed += 1;
  return `homework-standalone-${standaloneHomeworkSeed}`;
}

const EMPTY_FORM: FormState = {
  enrollmentId: "",
  exerciseId: "",
  title: "",
  description: "",
  instructionsText: "",
  frequency: "",
  nextDueDate: "",
};

export function HomeworkEditDialog({
  open,
  onOpenChange,
  editing,
  lockedEnrollmentId,
  restrictToPetId,
  todayISO,
}: Props) {
  const queryClient = useQueryClient();
  const { data: enrollments = [] } = useQuery(
    trainingQueries.allSeriesEnrollments(),
  );

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Active enrollments only — staff shouldn't be assigning new homework to a
  // dropped or completed series. When restricted to a single pet, drop every
  // other pet's enrollments before showing the picker.
  const activeEnrollments = useMemo(() => {
    const list = enrollments.filter((e) => e.status === "enrolled");
    return restrictToPetId
      ? list.filter((e) => e.petId === restrictToPetId)
      : list;
  }, [enrollments, restrictToPetId]);
  const enrollmentById = useMemo(
    () => new Map(enrollments.map((e) => [e.id, e])),
    [enrollments],
  );

  // Group enrollments by pet for the Select — owners with multiple dogs read
  // cleaner with one section per pet.
  const enrollmentsByPet = useMemo(() => {
    const out = new Map<number, { petName: string; rows: TrainingEnrollment[] }>();
    for (const e of activeEnrollments) {
      const existing = out.get(e.petId);
      if (existing) existing.rows.push(e);
      else out.set(e.petId, { petName: e.petName, rows: [e] });
    }
    return Array.from(out.values()).sort((a, b) =>
      a.petName.localeCompare(b.petName),
    );
  }, [activeEnrollments]);

  // Resync the form against the latest target whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        enrollmentId: editing.enrollmentId,
        exerciseId: "",
        title: editing.title,
        description: editing.description,
        instructionsText: editing.instructions.join("\n"),
        frequency: editing.frequency ?? "",
        nextDueDate: editing.nextDueDate ?? "",
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        enrollmentId:
          lockedEnrollmentId ?? activeEnrollments[0]?.id ?? "",
        nextDueDate: nextDay(todayISO),
      });
    }
  }, [open, editing, lockedEnrollmentId, activeEnrollments, todayISO]);

  const activeEnrollment = form.enrollmentId
    ? enrollmentById.get(form.enrollmentId)
    : undefined;

  // The course's discipline drives the "Course" pill in the exercise picker.
  const preferredDisciplineId = useMemo(() => {
    if (!activeEnrollment) return undefined;
    return getDisciplineIdForClassName(activeEnrollment.courseTypeName);
  }, [activeEnrollment]);

  function handleExerciseSelect(exercise: TrainingExerciseDef | null) {
    if (!exercise) return;
    setForm((prev) => ({
      ...prev,
      exerciseId: exercise.id,
      // Only auto-fill the title when it's still empty so we don't clobber a
      // title the user already typed.
      title: prev.title.trim().length === 0 ? exercise.name : prev.title,
    }));
  }

  function handleSave() {
    if (!form.enrollmentId) {
      toast.error("Pick which dog this homework is for.");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Give the homework a title (or pick an exercise).");
      return;
    }
    const enrollment = enrollmentById.get(form.enrollmentId);
    if (!enrollment) {
      toast.error("That enrollment no longer exists.");
      return;
    }
    const instructions = form.instructionsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (editing) {
      const updated: TrainingHomework = {
        ...editing,
        title: form.title.trim(),
        description: form.description.trim(),
        instructions,
        frequency: form.frequency.trim() || undefined,
        nextDueDate: form.nextDueDate || null,
      };
      fanOutHomeworkUpsert(queryClient, updated);
      toast.success(`"${updated.title}" updated.`);
    } else {
      const created: TrainingHomework = {
        id: nextStandaloneHomeworkId(),
        enrollmentId: form.enrollmentId,
        sessionNumber: enrollment.currentSessionNumber,
        sessionDate: todayISO,
        title: form.title.trim(),
        description: form.description.trim(),
        instructions,
        frequency: form.frequency.trim() || undefined,
        nextDueDate: form.nextDueDate || null,
        unlocked: true,
        unlockedDate: todayISO,
        completed: false,
        completedDate: null,
      };
      fanOutHomeworkUpsert(queryClient, created);
      toast.success(`"${created.title}" assigned to ${enrollment.petName}.`);
    }
    onOpenChange(false);
  }

  const enrollmentLocked = !!(editing || lockedEnrollmentId);
  const lockedLabel = activeEnrollment
    ? `${activeEnrollment.petName} · ${activeEnrollment.seriesName}`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="text-muted-foreground size-4" />
            {editing ? "Edit homework" : "Assign homework"}
          </DialogTitle>
          <DialogDescription>
            Homework shows up on the owner&apos;s portal and on the dog&apos;s
            Training Profile. Set the cadence and when it&apos;s due next so
            instructors can see what every student should be working on.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">For</Label>
            {enrollmentLocked ? (
              <div className="text-muted-foreground rounded-md border bg-slate-50 px-3 py-2 text-sm">
                {lockedLabel}
              </div>
            ) : (
              <Select
                value={form.enrollmentId}
                onValueChange={(v) => setForm({ ...form, enrollmentId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a dog + series" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {enrollmentsByPet.length === 0 && (
                    <div className="text-muted-foreground px-3 py-2 text-xs">
                      No active enrollments — start a series first.
                    </div>
                  )}
                  {enrollmentsByPet.map((group) => (
                    <SelectGroup key={group.petName}>
                      <SelectLabel className="text-[10px] uppercase tracking-wider">
                        {group.petName}
                      </SelectLabel>
                      {group.rows.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.seriesName}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {!editing && (
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                Exercise (optional — autofills title)
              </Label>
              <ExercisePicker
                value={form.exerciseId}
                onSelect={handleExerciseSelect}
                preferredDisciplineId={preferredDisciplineId}
                placeholder="Pick an exercise…"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Drop-on-recall practice"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                <Clock className="mr-1 inline size-3 align-text-bottom" />
                Frequency
              </Label>
              <Input
                value={form.frequency}
                onChange={(e) =>
                  setForm({ ...form, frequency: e.target.value })
                }
                placeholder="Daily · 5 min, 3x per week…"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Next due</Label>
              <DatePicker
                value={form.nextDueDate}
                onValueChange={(v) =>
                  setForm({ ...form, nextDueDate: v || "" })
                }
                displayMode="dialog"
                min={todayISO}
                placeholder="Pick a date"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Description</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="One-line summary of the exercise and why it matters."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Instructions</Label>
            <Textarea
              rows={4}
              value={form.instructionsText}
              onChange={(e) =>
                setForm({ ...form, instructionsText: e.target.value })
              }
              placeholder={[
                "Reward within 1 second of the dog completing the cue.",
                "Use small, soft, high-value treats.",
                "End on a successful rep — quit while it's fun.",
              ].join("\n")}
            />
            <p className="text-muted-foreground text-[10px]">
              One bullet per line — these render as a checklist in the
              owner&apos;s portal.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.enrollmentId || !form.title.trim()}
          >
            {editing ? "Save changes" : "Assign homework"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
