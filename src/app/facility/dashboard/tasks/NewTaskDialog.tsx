"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import { AlertCircle } from "lucide-react";
import { staffQueries } from "@/lib/api/staff";
import { useCreateTask } from "@/lib/api/facility-tasks";

// ============================================================================
// Writing a task down.
//
// ── THE ASSIGNEE IS A `rowId`, NEVER AN `id` ──────────────────────────────
//
// `StaffProfile.id` is the legacy string ("fs-003") and `rowId` is the database
// uuid. `facility_tasks.assigned_to` is a FOREIGN KEY, so only the uuid will
// do — the type's own comment says as much, and this is the trap it warns
// about. A staff member read from a fixture has no `rowId` at all and so cannot
// be assigned work, which is the correct outcome: they do not exist in Postgres
// to assign it to.
//
// ── UNASSIGNED IS A REAL CHOICE ───────────────────────────────────────────
//
// Work the shift picks up. The Select needs a sentinel for it rather than an
// empty string, because a Radix `SelectItem` with `value=""` throws and the
// dialog would simply appear to do nothing.
// ============================================================================

/** Radix refuses an empty `SelectItem` value; this stands in for "nobody yet". */
const UNASSIGNED = "__unassigned__";

const CATEGORIES = [
  "general",
  "opening",
  "closing",
  "operations",
  "cleaning",
  "customer-service",
  "admin",
  "maintenance",
  "safety",
];

export function NewTaskDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateTask();
  const { data: staff } = useQuery({
    ...staffQueries.profiles(),
    enabled: open,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState(UNASSIGNED);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("17:00");
  const [estimated, setEstimated] = useState("30");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Only people who exist in Postgres can hold a foreign key.
  const assignable = (staff ?? []).filter((s) => Boolean(s.rowId));

  const reset = () => {
    setTitle("");
    setDescription("");
    setCategory("general");
    setPriority("medium");
    setAssignedTo(UNASSIGNED);
    setDueDate("");
    setDueTime("17:00");
    setEstimated("30");
    setSubmitError(null);
  };

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setSubmitError("A task needs a title.");
      return;
    }
    setSubmitError(null);

    // One instant, assembled once. The fixture kept a date and a time apart and
    // every reader re-joined them against the browser's offset.
    let dueAt: string | null = null;
    if (dueDate) {
      const [h, m] = dueTime.split(":").map(Number);
      const at = new Date(`${dueDate}T00:00:00`);
      at.setHours(h ?? 17, m ?? 0, 0, 0);
      dueAt = at.toISOString();
    }

    const minutes = Number(estimated);

    create.mutate(
      {
        title: trimmed,
        description: description.trim() || null,
        category,
        priority: priority as "low" | "medium" | "high" | "urgent",
        assignedTo: assignedTo === UNASSIGNED ? null : assignedTo,
        dueAt,
        estimatedMinutes:
          Number.isFinite(minutes) && minutes > 0 ? minutes : null,
      },
      {
        onSuccess: () => {
          toast.success("Task created");
          reset();
          onClose();
        },
        // The dialog STAYS OPEN on failure, holding what was typed. Closing it
        // and showing an error toast loses the work and tells somebody their
        // task exists when it does not.
        onError: (err) =>
          setSubmitError(
            err instanceof Error ? err.message : "Could not create the task.",
          ),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !create.isPending) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>
            One piece of work, assigned to somebody or left for the shift.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Task</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Deep-clean run 3"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Details (optional)</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>
                    Nobody yet — the shift picks it up
                  </SelectItem>
                  {assignable.map((s) => (
                    <SelectItem key={s.rowId} value={s.rowId as string}>
                      {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full">
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
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-estimate">Estimated minutes</Label>
              <Input
                id="task-estimate"
                type="number"
                min={1}
                value={estimated}
                onChange={(e) => setEstimated(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Due date</Label>
              <DatePicker value={dueDate} onValueChange={setDueDate} />
            </div>

            <div className="space-y-2">
              <Label>Due time</Label>
              <TimePickerLux value={dueTime} onValueChange={setDueTime} />
            </div>
          </div>

          {submitError && (
            <p className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {submitError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={create.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={create.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {create.isPending ? "Creating…" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
