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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Moon, Plus, Trash2 } from "lucide-react";
import { schedulingQueries } from "@/lib/api/scheduling";
import { staffQueries } from "@/lib/api/staff";
import {
  useCreateScheduleTemplate,
  type NewTemplateShift,
} from "@/lib/api/schedule-templates";

// ============================================================================
// Building a week.
//
// ── AN END BEFORE THE START IS A NIGHT SHIFT, NOT A MISTAKE ───────────────
//
// 22:00 to 06:00 is the most ordinary thing a kennel does. The form does not
// refuse it and does not silently swap the times — it labels the line as
// finishing the next morning, so the person filling it in can see the form
// understood them.
//
// ── AND THE TIMES ARE THE FACILITY'S ──────────────────────────────────────
//
// "08:00" is eight where the kennels are. Nothing here turns it into a Date;
// the conversion happens once, in the database, using the facility's own
// timezone. A browser in another zone would otherwise write somebody else's
// morning.
//
// ── UNASSIGNED IS A REAL CHOICE ───────────────────────────────────────────
//
// An open line is a slot the roster still has to fill, which is how most weeks
// actually start. The Select needs a sentinel for it rather than an empty
// string, because a Radix `SelectItem` with `value=""` throws and the dialog
// would appear to do nothing at all.
// ============================================================================

/** Radix refuses an empty `SelectItem` value; this stands in for "nobody yet". */
const OPEN_SHIFT = "__open__";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

interface DraftLine {
  key: string;
  dayOfWeek: number;
  staffId: string;
  positionId: string;
  startTime: string;
  endTime: string;
  slots: string;
  breakMinutes: string;
}

function blankLine(index: number): DraftLine {
  return {
    key: `line-${index}`,
    dayOfWeek: 1,
    staffId: OPEN_SHIFT,
    positionId: "",
    startTime: "08:00",
    endTime: "16:00",
    slots: "1",
    breakMinutes: "30",
  };
}

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function NewScheduleTemplateDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateScheduleTemplate();
  const { data: structure } = useQuery({
    ...schedulingQueries.structure(),
    enabled: open,
  });
  const { data: staff } = useQuery({
    ...staffQueries.profiles(),
    enabled: open,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([blankLine(0)]);
  const [error, setError] = useState<string | null>(null);
  const [nextKey, setNextKey] = useState(1);

  const positions = structure?.positions ?? [];
  // Only staff who exist in Postgres can hold a foreign key.
  const assignable = (staff ?? []).filter((s) => Boolean(s.rowId));

  const reset = () => {
    setName("");
    setDescription("");
    setLines([blankLine(0)]);
    setError(null);
    setNextKey(1);
  };

  const close = () => {
    reset();
    onClose();
  };

  const patchLine = (key: string, patch: Partial<DraftLine>) =>
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("A template needs a name.");
      return;
    }

    const filled = lines.filter((line) => line.positionId);
    if (filled.length === 0) {
      setError(
        "Add at least one shift — a template with none would generate nothing.",
      );
      return;
    }
    setError(null);

    const shifts: NewTemplateShift[] = filled.map((line) => {
      const position = positions.find((p) => p.id === line.positionId);
      return {
        dayOfWeek: line.dayOfWeek,
        staffId: line.staffId === OPEN_SHIFT ? null : line.staffId,
        // The position knows its department, so the person filling this in
        // does not pick the same fact twice and cannot make them disagree.
        departmentId: position?.departmentId ?? "",
        positionId: line.positionId,
        startTime: line.startTime,
        endTime: line.endTime,
        breakMinutes: Number(line.breakMinutes) || 0,
        slots: Number(line.slots) || 1,
      };
    });

    create.mutate(
      {
        name: trimmed,
        description: description.trim() || null,
        shifts,
      },
      {
        onSuccess: () => {
          toast.success("Template created");
          close();
        },
        // Stays open on failure, holding the week somebody just typed in.
        onError: (err) =>
          setError(
            err instanceof Error ? err.message : "Could not save the template.",
          ),
      },
    );
  };

  const noPositions = positions.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && !create.isPending && close()}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>New schedule template</DialogTitle>
          <DialogDescription>
            The shape of a week. Applying it later creates draft shifts you can
            review before anyone is told they are working.
          </DialogDescription>
        </DialogHeader>

        {noPositions ? (
          <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {/* An empty picker that produces a 400 on save is worse than
                saying this. */}
            This facility has no positions yet. Build the org chart first — a
            shift has to say what somebody is rostered as.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template name</Label>
                <Input
                  id="template-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Regular week"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description">
                  Description (optional)
                </Label>
                <Input
                  id="template-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Standard weekday cover"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Shifts</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setLines((prev) => [...prev, blankLine(nextKey)]);
                    setNextKey((k) => k + 1);
                  }}
                >
                  <Plus className="size-3.5" />
                  Add shift
                </Button>
              </div>

              <div className="space-y-2">
                {lines.map((line) => {
                  const overnight =
                    minutesOf(line.endTime) <= minutesOf(line.startTime);
                  return (
                    <div
                      key={line.key}
                      className="grid items-end gap-2 rounded-md border px-3 py-2.5 sm:grid-cols-[1fr_1fr_1fr_auto_auto_auto]"
                    >
                      <div className="space-y-1">
                        <Label className="text-[11px] font-normal">Day</Label>
                        <Select
                          value={String(line.dayOfWeek)}
                          onValueChange={(v) =>
                            patchLine(line.key, { dayOfWeek: Number(v) })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS.map((d) => (
                              <SelectItem key={d.value} value={String(d.value)}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-normal">
                          Position
                        </Label>
                        <Select
                          value={line.positionId}
                          onValueChange={(v) =>
                            patchLine(line.key, { positionId: v })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose" />
                          </SelectTrigger>
                          <SelectContent>
                            {positions.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-normal">Who</Label>
                        <Select
                          value={line.staffId}
                          onValueChange={(v) =>
                            patchLine(line.key, { staffId: v })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={OPEN_SHIFT}>
                              Open shift
                            </SelectItem>
                            {assignable.map((s) => (
                              <SelectItem
                                key={s.rowId}
                                value={s.rowId as string}
                              >
                                {s.firstName} {s.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-normal">Start</Label>
                        <Input
                          type="time"
                          className="w-[110px]"
                          value={line.startTime}
                          onChange={(e) =>
                            patchLine(line.key, { startTime: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="flex items-center gap-1 text-[11px] font-normal">
                          End
                          {overnight && (
                            <span
                              className="inline-flex items-center gap-0.5 text-indigo-600"
                              title="Finishes the next morning"
                            >
                              <Moon className="size-3" />
                              +1
                            </span>
                          )}
                        </Label>
                        <Input
                          type="time"
                          className="w-[110px]"
                          value={line.endTime}
                          onChange={(e) =>
                            patchLine(line.key, { endTime: e.target.value })
                          }
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Remove this shift"
                        disabled={lines.length === 1}
                        onClick={() =>
                          setLines((prev) =>
                            prev.filter((l) => l.key !== line.key),
                          )
                        }
                      >
                        <Trash2 className="text-destructive size-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <p className="text-muted-foreground text-xs">
                An end time at or before the start means the shift finishes the
                next morning. Times are this facility&apos;s own clock.
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
            {noPositions ? "Close" : "Cancel"}
          </Button>
          {!noPositions && (
            <Button
              onClick={submit}
              disabled={create.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {create.isPending ? "Saving…" : "Create template"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
