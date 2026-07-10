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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, X, Image as ImageIcon, Clock } from "lucide-react";
import { metaFor } from "./task-type-meta";
import { format12h } from "@/lib/care-log-scheduler";
import { LogMeta } from "./LogMeta";
import { useCurrentUser } from "@/hooks/use-current-user";
import type {
  ScheduledTask,
  TaskExecution,
  EngagementLevel,
  EnrichmentDetail,
} from "@/types/care-log";

// Suggested activities — free text is still allowed via the datalist.
const ACTIVITY_SUGGESTIONS = [
  "Puzzle feeder",
  "Snuffle mat",
  "Lick mat",
  "Sniff walk",
  "Kong / stuffed toy",
  "Training games",
  "Bubble play",
];

const ENGAGEMENT_LEVELS: { value: EngagementLevel; label: string }[] = [
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
];

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
    photoUrls?: string[];
    enrichment?: EnrichmentDetail;
  }) => void;
};

/**
 * Dedicated Enrichment log modal — no booking data needed. Captures the
 * activity type, duration, the dog's engagement level, and notes, plus the
 * shared Logged-by / timestamp / photo pieces. Handles the free-form custom
 * care steps (enrichment) that have no fixed subtype modal of their own.
 */
export function EnrichmentLogModal({
  open,
  task,
  existing,
  onOpenChange,
  onSubmit,
}: Props) {
  const { user } = useCurrentUser();
  const [activityType, setActivityType] = useState("");
  const [duration, setDuration] = useState("");
  const [engagement, setEngagement] = useState<EngagementLevel | "">("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [nowValue, setNowValue] = useState("");
  const [logTime, setLogTime] = useState("");

  const stepName = task?.details ?? "";

  // On open: seed from the existing execution when editing, otherwise clear —
  // pre-filling the activity from the configured step name as a starting point.
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
    if (existing) {
      const e = existing.enrichment;
      setActivityType(e?.activityType ?? stepName);
      setDuration(e?.durationMinutes != null ? String(e.durationMinutes) : "");
      setEngagement(e?.engagement ?? "");
      setNotes(existing.notes ?? "");
      setPhotos(
        existing.photoUrls ?? (existing.photoUrl ? [existing.photoUrl] : []),
      );
      setLogTime(existing.executedAt);
    } else {
      setActivityType(stepName);
      setDuration("");
      setEngagement("");
      setNotes("");
      setPhotos([]);
      setLogTime("");
    }
  }, [open, task?.id, existing, stepName]);

  if (!task) return null;

  const meta = metaFor(task.taskType, task.subType);
  const Icon = meta.Icon;
  const requiresPhoto = task.requiresPhotoProof === true;
  const MAX_PHOTOS = 3;

  const durationValue = Number(duration);
  const durationOk =
    duration === "" || (Number.isFinite(durationValue) && durationValue > 0);

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
    activityType.trim().length > 0 &&
    durationOk &&
    (!requiresPhoto || photos.length > 0);

  function handleSubmit() {
    if (activityType.trim().length === 0) return;
    const enrichment: EnrichmentDetail = {
      activityType: activityType.trim(),
      durationMinutes:
        duration !== "" && durationOk ? durationValue : undefined,
      engagement: engagement || undefined,
    };
    onSubmit({
      outcome: "completed",
      notes: notes.trim() || undefined,
      staffName: user.name,
      staffInitials: user.initials,
      executedAt: logTime || undefined,
      photoUrls: photos.length > 0 ? photos : undefined,
      enrichment,
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
                {existing ? "Edit" : "Log"} enrichment
              </DialogTitle>
              <DialogDescription className="mt-0.5 truncate">
                {task.petName} · {task.kennelName} ·{" "}
                {format12h(task.scheduledTime)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto py-2">
          <div className="space-y-1.5">
            <Label htmlFor="activity-type" className="text-xs">
              Activity type
            </Label>
            <Input
              id="activity-type"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              list="enrichment-activities"
              placeholder="Type or pick an activity..."
              aria-invalid={activityType.trim().length === 0}
            />
            <datalist id="enrichment-activities">
              {ACTIVITY_SUGGESTIONS.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="enrichment-duration" className="text-xs">
              Duration (minutes){" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <div className="relative">
              <Clock className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <Input
                id="enrichment-duration"
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="pl-8"
                placeholder="e.g. 15"
                aria-invalid={!durationOk}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Dog engagement level</Label>
            <div className="flex flex-wrap gap-1.5">
              {ENGAGEMENT_LEVELS.map((e) => {
                const selected = engagement === e.value;
                return (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setEngagement(selected ? "" : e.value)}
                    data-selected={selected}
                    className="data-[selected=true]:border-primary data-[selected=true]:bg-primary/5 data-[selected=false]:text-muted-foreground rounded-md border px-3 py-1.5 text-xs font-medium transition-all data-[selected=true]:ring-1"
                  >
                    {e.label}
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
            <Label htmlFor="enrichment-notes" className="text-xs">
              Notes (optional)
            </Label>
            <Textarea
              id="enrichment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="How did the dog respond?"
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
            {existing ? "Update log" : "Save log"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
