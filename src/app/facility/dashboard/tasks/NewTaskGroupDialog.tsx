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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  chorelistQueries,
  useCreateGroup,
  type ShiftKey,
  type TaskGroupScope,
} from "@/lib/api/task-groups";
import { schedulingQueries } from "@/lib/api/scheduling";

// ============================================================================
// Building a chore group.
//
// ── A POSITION GROUP NEEDS A DEPARTMENT THAT EXISTS ───────────────────────
//
// Departments are real rows, created in the org chart. A facility that has not
// built one yet cannot make a position group, and the dialog says so instead of
// offering an empty picker that produces a 400 on save.
//
// ── DAYS: NONE TICKED MEANS EVERY DAY ─────────────────────────────────────
//
// That is what the generator reads and what the fixture meant. The label says
// it out loud, because an empty set of checkboxes otherwise reads as "never".
// ============================================================================

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export function NewTaskGroupDialog({
  scope,
  open,
  onClose,
}: {
  scope: TaskGroupScope;
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateGroup();
  const { data: chores } = useQuery({
    ...chorelistQueries.definitions(),
    enabled: open,
  });
  // The org chart's own source, not a second one. Departments are created
  // there and a separate list would drift from it the first time somebody
  // renamed one.
  const { data: structure } = useQuery({
    ...schedulingQueries.structure(),
    enabled: open && scope === "position",
  });
  const departments = structure?.departments;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shiftKey, setShiftKey] = useState<ShiftKey>("morning");
  const [departmentId, setDepartmentId] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setDescription("");
    setShiftKey("morning");
    setDepartmentId("");
    setDays([]);
    setPicked([]);
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("A group needs a name.");
      return;
    }
    if (scope === "position" && !departmentId) {
      setError("Choose the department this group belongs to.");
      return;
    }
    setError(null);

    create.mutate(
      {
        name: trimmed,
        description: description.trim() || null,
        scope,
        shiftKey: scope === "shift" ? shiftKey : null,
        departmentId: scope === "position" ? departmentId : null,
        daysOfWeek: days,
        definitionIds: picked,
      },
      {
        onSuccess: () => {
          toast.success("Group created");
          close();
        },
        // Stays open on failure, holding what was typed.
        onError: (err) =>
          setError(
            err instanceof Error ? err.message : "Could not create the group.",
          ),
      },
    );
  };

  const noDepartments =
    scope === "position" && (departments ?? []).length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && !create.isPending && close()}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {scope === "shift" ? "New shift group" : "New position group"}
          </DialogTitle>
          <DialogDescription>
            {scope === "shift"
              ? "Chores owed on a given shift, on the days you choose."
              : "Chores owed by everyone in a department."}
          </DialogDescription>
        </DialogHeader>

        {noDepartments ? (
          <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {/* An empty picker that produces a 400 on save is worse than
                saying this. */}
            This facility has no departments yet. Build one in the org chart
            first, then a position group can belong to it.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group name</Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  scope === "shift"
                    ? "Morning opening checklist"
                    : "Sanitation daily duties"
                }
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-description">Details (optional)</Label>
              <Textarea
                id="group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {scope === "shift" ? (
              <div className="space-y-2">
                <Label>Shift</Label>
                <Select
                  value={shiftKey}
                  onValueChange={(v) => setShiftKey(v as ShiftKey)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {(departments ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {scope === "shift" && (
              <div className="space-y-2">
                <Label>Days</Label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((day) => {
                    const on = days.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() =>
                          setDays((prev) =>
                            prev.includes(day.value)
                              ? prev.filter((d) => d !== day.value)
                              : [...prev, day.value].sort(),
                          )
                        }
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-xs font-medium",
                          on
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-muted-foreground text-xs">
                  {days.length === 0
                    ? "None ticked means every day."
                    : `Runs on ${days.length} day${days.length === 1 ? "" : "s"} a week.`}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Chores</Label>
              {(chores ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  The library is empty. Add chores first, then build a group
                  from them.
                </p>
              ) : (
                <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border px-3 py-2">
                  {(chores ?? []).map((chore) => (
                    <label
                      key={chore.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={picked.includes(chore.id)}
                        onCheckedChange={(next) =>
                          setPicked((prev) =>
                            next
                              ? [...prev, chore.id]
                              : prev.filter((id) => id !== chore.id),
                          )
                        }
                      />
                      <span>{chore.title}</span>
                      {chore.estimatedMinutes && (
                        <span className="text-muted-foreground text-xs">
                          {chore.estimatedMinutes}m
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
              <p className="text-muted-foreground text-xs">
                {picked.length} chosen. A group with none generates nothing.
              </p>
            </div>

            {error && (
              <p className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={create.isPending}>
            {noDepartments ? "Close" : "Cancel"}
          </Button>
          {!noDepartments && (
            <Button
              onClick={submit}
              disabled={create.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {create.isPending ? "Creating…" : "Create group"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
