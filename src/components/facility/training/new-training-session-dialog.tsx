"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { User2, Users } from "lucide-react";
import type { ClassType } from "@/types/training";
import { trainingQueries } from "@/lib/api/training";
import { clients } from "@/data/clients";

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  defaultDate?: string;
  defaultTime?: string;
  defaultTrainerId?: string;
}

export function NewTrainingSessionDialog({
  open,
  onOpenChange,
  defaultDate,
  defaultTime,
  defaultTrainerId,
}: Props) {
  const [mode, setMode] = useState<ClassType>("group");
  const [classId, setClassId] = useState<string>("");
  const [date, setDate] = useState<string>(
    defaultDate ?? new Date().toISOString().split("T")[0],
  );
  const [time, setTime] = useState<string>(defaultTime ?? "10:00");
  const [petKey, setPetKey] = useState<string>(""); // "<clientId>:<petId>"
  const [notes, setNotes] = useState<string>("");

  // Re-sync date/time on each open so slot clicks always reflect the latest
  // pre-filled values. We don't sync `mode` — that's a user choice once opened.
  useEffect(() => {
    if (!open) return;
    setDate(defaultDate ?? new Date().toISOString().split("T")[0]);
    setTime(defaultTime ?? "10:00");
  }, [open, defaultDate, defaultTime]);

  const { data: trainingClasses } = useQuery(trainingQueries.classes());

  const availableClasses = useMemo(() => {
    if (!trainingClasses) return [];
    return trainingClasses.filter(
      (c) =>
        c.classType === mode &&
        c.status === "active" &&
        (!defaultTrainerId || c.trainerId === defaultTrainerId),
    );
  }, [trainingClasses, mode, defaultTrainerId]);

  const selectedClass = useMemo(
    () => availableClasses.find((c) => c.id === classId),
    [availableClasses, classId],
  );

  // Flatten clients → pets so the private session can pick a single dog.
  const petOptions = useMemo(() => {
    const out: {
      key: string;
      petName: string;
      ownerName: string;
      breed?: string;
    }[] = [];
    for (const c of clients) {
      for (const p of c.pets) {
        if (p.type !== "Dog") continue;
        out.push({
          key: `${c.id}:${p.id}`,
          petName: p.name,
          ownerName: c.name,
          breed: p.breed,
        });
      }
    }
    return out.sort((a, b) => a.petName.localeCompare(b.petName));
  }, []);

  function handleSubmit() {
    if (!classId) {
      toast.error(
        mode === "group"
          ? "Pick a class to schedule the session."
          : "Pick a private offering to schedule.",
      );
      return;
    }
    if (mode === "private" && !petKey) {
      toast.error("Pick the dog for this private session.");
      return;
    }
    if (!selectedClass) return;

    // Mock create — no backend yet, so just toast and close.
    toast.success(
      mode === "group"
        ? `Group session for "${selectedClass.name}" scheduled on ${date} at ${time}.`
        : `Private session with ${
            petOptions.find((p) => p.key === petKey)?.petName ?? "the dog"
          } scheduled on ${date} at ${time}.`,
    );
    reset();
    onOpenChange(false);
  }

  function reset() {
    setClassId("");
    setPetKey("");
    setNotes("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New training session</DialogTitle>
          <DialogDescription>
            Schedule a group class session or a private 1-on-1 coaching session.
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          {(
            [
              { id: "group" as const, label: "Group class", Icon: Users },
              { id: "private" as const, label: "Private 1-on-1", Icon: User2 },
            ]
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setMode(id);
                setClassId("");
              }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                mode === id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              {mode === "group" ? "Class" : "Private offering"}
            </Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    mode === "group"
                      ? "Pick a group class"
                      : "Pick a private offering"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.length === 0 ? (
                  <div className="text-muted-foreground px-3 py-2 text-xs">
                    No {mode === "group" ? "group classes" : "private offerings"}{" "}
                    available.
                  </div>
                ) : (
                  availableClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {c.trainerName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {mode === "private" && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Dog</Label>
              <Select value={petKey} onValueChange={setPetKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick the dog" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {petOptions.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.petName} · {p.ownerName}
                      {p.breed ? ` (${p.breed})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Date</Label>
              <DatePicker
                value={date}
                onValueChange={(next) => setDate(next ?? date)}
                placeholder="Pick a date"
                displayMode="dialog"
                popoverClassName="w-[296px] rounded-xl border-slate-200/90 shadow-[0_28px_60px_-28px_rgba(15,23,42,0.55)]"
                calendarClassName="p-1"
                showQuickPresets={false}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Start time</Label>
              <TimePickerLux
                value={time}
                onValueChange={setTime}
                displayMode="dialog"
              />
            </div>
          </div>

          {selectedClass && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="font-semibold">{selectedClass.trainerName}</span>{" "}
              · {selectedClass.duration} min · {selectedClass.location}
              {mode === "group" && (
                <> · capacity {selectedClass.capacity}</>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                mode === "private"
                  ? "Goals or focus areas for this session…"
                  : "Anything the trainer should know…"
              }
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Schedule session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
