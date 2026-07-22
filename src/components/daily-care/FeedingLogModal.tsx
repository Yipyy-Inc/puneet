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
  UtensilsCrossed,
} from "lucide-react";
import {
  OUTCOME_OPTIONS,
  outcomeBadgeClass,
  FEEDING_SERVED,
} from "./outcome-meta";
import { metaFor } from "./task-type-meta";
import { format12h } from "@/lib/care-log-scheduler";
import { LogMeta } from "./LogMeta";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { ScheduledTask, TaskExecution } from "@/types/care-log";

type Props = {
  open: boolean;
  task: ScheduledTask | null;
  /** When present, the modal opens pre-filled to edit this existing log. */
  existing?: TaskExecution;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: {
    outcome: string;
    notes?: string;
    staffName: string;
    staffInitials: string;
    /** Override log time as "HH:MM"; omitted means stamp the current time. */
    executedAt?: string;
    /** Time the food was served — set on the serve step, preserved on outcome. */
    servedAt?: string;
    photoUrls?: string[];
  }) => void;
};

/**
 * Dedicated Feeding log modal with two zones:
 *  • TOP — read-only care instructions pulled from the booking (A4.4): the
 *    allergy "Avoid" banner sits above everything, then food/amount/frequency.
 *    Daily Care never asks staff to re-enter this.
 *  • BOTTOM — the log itself: the facility's Feeding Feedback outcome chips,
 *    optional notes, and the shared Logged-by / timestamp / photo pieces.
 * When the booking carries no feeding plan a warning banner shows, but logging
 * is still allowed.
 */
export function FeedingLogModal({
  open,
  task,
  existing,
  onOpenChange,
  onSubmit,
}: Props) {
  const { user } = useCurrentUser();
  const [outcome, setOutcome] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  // Log time: "" = stamp the current time on submit; a value backdates it.
  const [nowValue, setNowValue] = useState("");
  const [logTime, setLogTime] = useState("");

  // On open: seed from the existing execution when editing, otherwise clear.
  useEffect(() => {
    if (!open) return;
    const now = new Date();
    // Capturing the wall clock at open time is a legitimate on-open reset, not
    // a cascading-render smell — the modal stays mounted between opens, so the
    // "Logging at" default must refresh each time it opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowValue(
      `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes(),
      ).padStart(2, "0")}`,
    );
    if (existing) {
      // A just-served item carries the "served" sentinel — the consumption
      // outcome hasn't been chosen yet, so start the chips unselected.
      setOutcome(
        existing.outcome === FEEDING_SERVED ? null : String(existing.outcome),
      );
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
  }, [open, task?.id, existing]);

  if (!task) return null;

  // Two-step feeding: serve the food first, then log how much was eaten a few
  // hours later. The step is derived from whether the food has been served yet.
  const served = Boolean(existing?.servedAt);
  const step: "serve" | "outcome" = served ? "outcome" : "serve";

  const meta = metaFor(task.taskType, task.subType);
  const Icon = meta.Icon;
  const options = OUTCOME_OPTIONS.feeding;
  const requiresPhoto = task.requiresPhotoProof === true;
  const MAX_PHOTOS = 3;

  // Plan instructions come from the task's subDetails (A4.4). A booking with no
  // feeding details yields only a blank "amount brand" line, which trims away —
  // that empty result is what flags "no feeding plan on file".
  const planLines = (task.subDetails ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
  const hasPlan = planLines.length > 0;
  const avoid = task.avoidList ?? [];

  const addPhoto = () => {
    // TODO: open the real camera / library picker; mock URL for now.
    setPhotos((prev) =>
      prev.length >= MAX_PHOTOS
        ? prev
        : [...prev, `mock://photo-${prev.length + 1}`],
    );
  };
  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const photoOk = !requiresPhoto || photos.length > 0;
  // Serve step needs no outcome; consumption step needs an eaten-amount choice.
  const canSubmit = (step === "serve" ? true : outcome !== null) && photoOk;

  function handleSubmit() {
    if (step === "serve") {
      // Mark the food served now; consumption is recorded on the next visit.
      const serveTime = logTime || nowValue;
      onSubmit({
        outcome: FEEDING_SERVED,
        servedAt: serveTime,
        executedAt: logTime || undefined,
        notes: notes.trim() || undefined,
        staffName: user.name,
        staffInitials: user.initials,
        photoUrls: photos.length > 0 ? photos : undefined,
      });
      onOpenChange(false);
      return;
    }
    // Consumption step: record how much was eaten, keep the original serve time.
    if (!outcome) return;
    onSubmit({
      outcome,
      servedAt: existing?.servedAt,
      notes: notes.trim() || undefined,
      staffName: user.name,
      staffInitials: user.initials,
      executedAt: logTime || undefined,
      photoUrls: photos.length > 0 ? photos : undefined,
    });
    onOpenChange(false);
  }

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
                {step === "serve" ? "Serve" : "Log consumption"} ·{" "}
                {task.details}
              </DialogTitle>
              <DialogDescription className="mt-0.5 truncate">
                {task.petName} · {task.kennelName} ·{" "}
                {format12h(task.scheduledTime)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto py-2">
          {/* ── TOP: read-only plan from the booking (A4.4) ───────────────── */}
          {/* Allergy banner first — staff must pass over it before the chips. */}
          {avoid.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
              <div className="min-w-0 text-xs">
                <p className="font-semibold text-red-700 dark:text-red-400">
                  ⚠ Avoid: {avoid.join(", ")}
                </p>
                <p className="mt-0.5 text-red-600/90 dark:text-red-400/80">
                  Do not feed anything containing these. Check the label before
                  serving.
                </p>
              </div>
            </div>
          )}

          {!hasPlan && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>
                No feeding plan on file for this pet. Ask the owner or check the
                booking.
              </p>
            </div>
          )}

          {hasPlan && (
            <div className="bg-muted/40 space-y-2 rounded-md border p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <UtensilsCrossed className="size-3.5" />
                Feeding plan
                <span className="text-muted-foreground font-normal">
                  · from booking
                </span>
              </p>
              <dl className="space-y-1 text-xs">
                <div className="flex gap-2">
                  <dt className="text-muted-foreground w-20 shrink-0">
                    Food &amp; amount
                  </dt>
                  <dd className="min-w-0 flex-1 font-medium">{planLines[0]}</dd>
                </div>
                {planLines.slice(1).map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <dt className="text-muted-foreground w-20 shrink-0">
                      {i === 0 ? "Instructions" : ""}
                    </dt>
                    <dd className="min-w-0 flex-1">{line}</dd>
                  </div>
                ))}
                {task.frequencyNote && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-20 shrink-0">
                      Frequency
                    </dt>
                    <dd className="min-w-0 flex-1 font-medium">
                      {task.frequencyNote}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          <div className="border-t" />

          {/* ── BOTTOM: the log ───────────────────────────────────────────── */}
          {step === "serve" ? (
            // Step 1 — serving. No "how much eaten" yet; that's logged later.
            <div className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50/70 p-3 text-xs dark:border-sky-900/50 dark:bg-sky-950/30">
              <UtensilsCrossed className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
              <div>
                <p className="font-semibold text-sky-800 dark:text-sky-300">
                  Mark the food as served
                </p>
                <p className="mt-0.5 text-sky-700/90 dark:text-sky-400/80">
                  Put the food down now. You&apos;ll come back after the meal to
                  record how much they ate.
                </p>
              </div>
            </div>
          ) : (
            // Step 2 — consumption. Show when it was served, then the chips.
            <div className="space-y-2">
              {existing?.servedAt && (
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <UtensilsCrossed className="size-3.5" />
                  Served at{" "}
                  <span className="text-foreground font-medium">
                    {existing.servedAt}
                  </span>
                </p>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">How much did they eat?</Label>
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
            </div>
          )}

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
            <Label htmlFor="notes" className="text-xs">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Appetite, behavior, anything worth recording..."
              className="resize-none"
            />
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
            {step === "serve"
              ? "Mark as served"
              : existing?.outcome === FEEDING_SERVED
                ? "Save consumption"
                : "Update log"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
