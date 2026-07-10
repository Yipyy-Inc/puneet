"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  X,
  Image as ImageIcon,
  AlertTriangle,
  Pill,
} from "lucide-react";
import { OUTCOME_OPTIONS, outcomeBadgeClass } from "./outcome-meta";
import { metaFor } from "./task-type-meta";
import { format12h } from "@/lib/care-log-scheduler";
import { LogMeta } from "./LogMeta";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { ScheduledTask, TaskExecution } from "@/types/care-log";
import type { MedAdminMethod } from "@/types/boarding";

const METHOD_LABEL: Record<MedAdminMethod, string> = {
  oral: "Oral",
  topical: "Topical",
  injection: "Injection",
  eye_drops: "Eye drops",
  ear_drops: "Ear drops",
};

// Outcomes that demand an explanation (rule b): Save stays disabled until the
// staff member writes a substantive (≥10 char) note.
const NOTE_REQUIRED_OUTCOMES = new Set(["skipped", "refused"]);
const MIN_NOTE_LENGTH = 10;

type MedLogEntry = {
  outcome: string;
  notes?: string;
  staffName: string;
  staffInitials: string;
  executedAt?: string;
  photoUrls?: string[];
};

type Props = {
  open: boolean;
  /** The queue of medications to step through (1+ for the same pet + time). */
  tasks: ScheduledTask[];
  /** When editing a single logged med, its execution for pre-fill (queue = 1). */
  existing?: TaskExecution;
  onOpenChange: (open: boolean) => void;
  /** Log one medication as its own TaskExecution, then advance to the next. */
  onLogOne: (task: ScheduledTask, entry: MedLogEntry) => void;
  /** Rule (c): re-derive tasks from the booking when the data looks stale. */
  onReload: () => void;
};

/**
 * Dedicated Medication log modal.
 *  • TOP — read-only med detail from the booking: name, dosage, method, timing.
 *  • BOTTOM — outcome chips (Given / Skipped / Refused / Vomited after), an
 *    override-able timestamp, notes, and Logged-by.
 * For a pet with several meds at the same time it steps through them one at a
 * time ("Medication 1 of 2…"), logging each before advancing (rule a). Skipped
 * / Refused require a ≥10-char note (rule b). A med task with no booking data
 * shows a "reload from booking" banner (rule c).
 */
export function MedicationLogModal({
  open,
  tasks,
  existing,
  onOpenChange,
  onLogOne,
  onReload,
}: Props) {
  const { user } = useCurrentUser();
  const [index, setIndex] = useState(0);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [nowValue, setNowValue] = useState("");
  const [logTime, setLogTime] = useState("");

  // On open: start at the first med and seed from the existing execution when
  // editing, otherwise clear.
  useEffect(() => {
    if (!open) return;
    const now = new Date();
    // Capturing the wall clock at open time is a legitimate on-open reset, not
    // a cascading-render smell — the modal stays mounted between opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowValue(
      `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes(),
      ).padStart(2, "0")}`,
    );
    setIndex(0);
    if (existing) {
      setOutcome(String(existing.outcome));
      setNotes(existing.notes ?? "");
      setPhotos(
        existing.photoUrls ?? (existing.photoUrl ? [existing.photoUrl] : []),
      );
      setLogTime(existing.executedAt);
    } else {
      setOutcome(null);
      setNotes("");
      setPhotos([]);
      setLogTime("");
    }
  }, [open, existing]);

  const current = tasks[index] ?? null;
  if (!current) return null;

  const meta = metaFor(current.taskType, current.subType);
  const Icon = meta.Icon;
  const options = OUTCOME_OPTIONS.medication;
  const total = tasks.length;
  const isLast = index >= total - 1;
  const requiresPhoto = current.requiresPhotoProof === true;
  const MAX_PHOTOS = 3;

  // Rule (c): a med task with no structured booking detail is stale.
  const med = current.medDetail;
  const stale = !med;

  const noteRequired = outcome !== null && NOTE_REQUIRED_OUTCOMES.has(outcome);
  const noteOk = !noteRequired || notes.trim().length >= MIN_NOTE_LENGTH;

  const addPhoto = () => {
    // TODO: open the real camera / library picker; mock URL for now.
    setPhotos((prev) =>
      prev.length >= MAX_PHOTOS
        ? prev
        : [...prev, `mock://photo-${prev.length + 1}`],
    );
  };
  const removePhoto = (i: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  };

  const canSubmit =
    outcome !== null && (!requiresPhoto || photos.length > 0) && noteOk;

  // Clear the log fields for the next med in the queue and refresh the clock.
  const resetForNext = () => {
    const now = new Date();
    setNowValue(
      `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes(),
      ).padStart(2, "0")}`,
    );
    setOutcome(null);
    setNotes("");
    setPhotos([]);
    setLogTime("");
  };

  function handleSubmit() {
    if (!outcome || !current) return;
    onLogOne(current, {
      outcome,
      notes: notes.trim() || undefined,
      staffName: user.name,
      staffInitials: user.initials,
      executedAt: logTime || undefined,
      photoUrls: photos.length > 0 ? photos : undefined,
    });
    if (isLast) {
      onOpenChange(false);
    } else {
      setIndex((i) => i + 1);
      resetForNext();
    }
  }

  const saveLabel = existing
    ? "Update log"
    : isLast
      ? "Save log"
      : "Save & next";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
            >
              <Icon className={`size-5 ${meta.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base">
                {existing ? "Edit" : "Log"} medication
              </DialogTitle>
              <DialogDescription className="mt-0.5 truncate">
                {current.petName} · {current.kennelName} ·{" "}
                {format12h(current.scheduledTime)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto py-2">
          {total > 1 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[11px]">
                Medication {index + 1} of {total}
              </Badge>
              <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${((index + 1) / total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* ── TOP: read-only med detail from the booking ────────────────── */}
          {stale ? (
            <button
              type="button"
              onClick={onReload}
              className="flex w-full items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-left text-xs text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Medication data may have changed.{" "}
                <span className="font-semibold underline">
                  Tap to reload from booking.
                </span>
              </span>
            </button>
          ) : (
            <div className="bg-muted/40 space-y-2 rounded-md border p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Pill className="size-4" />
                {med.name} {med.dosage}
              </p>
              <dl className="space-y-1 text-xs">
                <div className="flex gap-2">
                  <dt className="text-muted-foreground w-16 shrink-0">
                    Method
                  </dt>
                  <dd className="min-w-0 flex-1 font-medium">
                    {METHOD_LABEL[med.method]}
                  </dd>
                </div>
                {med.timingNote && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-16 shrink-0">
                      Timing
                    </dt>
                    <dd className="min-w-0 flex-1">{med.timingNote}</dd>
                  </div>
                )}
                {current.frequencyNote && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-16 shrink-0">
                      Frequency
                    </dt>
                    <dd className="min-w-0 flex-1">{current.frequencyNote}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          <div className="border-t" />

          {/* ── BOTTOM: the log ───────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label className="text-xs">Outcome</Label>
            <div className="flex flex-wrap gap-1.5">
              {options.map((opt) => {
                const selected = outcome === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setOutcome(opt.value)}
                    data-selected={selected}
                    className="rounded-md border px-2.5 py-1 text-xs font-medium transition-all data-[selected=false]:opacity-60 data-[selected=true]:ring-2 data-[selected=true]:ring-offset-1"
                  >
                    <Badge
                      variant="outline"
                      className={outcomeBadgeClass(opt.tone)}
                    >
                      {opt.label}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Photos{" "}
              <span className="text-muted-foreground font-normal">
                {requiresPhoto ? "(required)" : "(optional)"}
              </span>
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className="bg-muted relative flex size-12 items-center justify-center rounded-md border"
                >
                  <ImageIcon className="text-muted-foreground size-5" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label={`Remove photo ${i + 1}`}
                    className="bg-destructive absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full text-white"
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPhoto}
                  className="h-12 gap-1.5"
                >
                  <Camera className="size-4" />
                  Add photo
                </Button>
              )}
            </div>
            <p className="text-muted-foreground text-[11px]">
              {photos.length}/{MAX_PHOTOS} · camera or library
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="med-notes" className="text-xs">
              Notes{" "}
              <span className="text-muted-foreground font-normal">
                {noteRequired ? "(required — explain why)" : "(optional)"}
              </span>
            </Label>
            <Textarea
              id="med-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={
                noteRequired
                  ? "Why was it skipped / refused? (min 10 characters)"
                  : "Anything worth recording..."
              }
              className="resize-none"
              aria-invalid={noteRequired && !noteOk}
            />
            {noteRequired && !noteOk && (
              <p className="text-[11px] text-red-600 dark:text-red-400">
                Add at least {MIN_NOTE_LENGTH} characters explaining why.
              </p>
            )}
          </div>

          <LogMeta nowValue={nowValue} value={logTime} onChange={setLogTime} />

          <p className="text-muted-foreground text-xs">
            Logged by:{" "}
            <span className="text-foreground font-medium">{user.name}</span>
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
