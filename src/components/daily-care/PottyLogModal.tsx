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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, X, Image as ImageIcon, HeartPulse } from "lucide-react";
import { OUTCOME_OPTIONS, outcomeBadgeClass } from "./outcome-meta";
import { metaFor } from "./task-type-meta";
import { format12h } from "@/lib/care-log-scheduler";
import { LogMeta } from "./LogMeta";
import { useCurrentUser } from "@/hooks/use-current-user";
import type {
  ScheduledTask,
  TaskExecution,
  HealthObservation,
  HealthObservationType,
  HealthObservationSeverity,
} from "@/types/care-log";

// The nine observation categories a concern can fall under (A4.3).
const OBSERVATION_TYPES: { value: HealthObservationType; label: string }[] = [
  { value: "limping", label: "Limping" },
  { value: "lethargy", label: "Lethargy" },
  { value: "abnormal_stool", label: "Abnormal stool" },
  { value: "vomiting", label: "Vomiting" },
  { value: "coughing", label: "Coughing" },
  { value: "eye", label: "Eye" },
  { value: "ear", label: "Ear" },
  { value: "skin", label: "Skin" },
  { value: "other", label: "Other" },
];

const SEVERITIES: {
  value: HealthObservationSeverity;
  label: string;
  tone: "neutral" | "warning" | "danger";
}[] = [
  { value: "monitoring", label: "Monitoring", tone: "neutral" },
  { value: "needs_attention", label: "Needs attention", tone: "warning" },
  { value: "urgent", label: "Urgent", tone: "danger" },
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
    /** Present when a health concern was noted — raises a pet flag upstream. */
    healthObservation?: HealthObservation;
  }) => void;
};

/**
 * Dedicated Potty log modal — the potty outcome chips plus a "Note health
 * concern" path. The shared Logged-by / timestamp / photo pieces are reused
 * from the generic TaskLogModal (via LogMeta + local sections). When a concern
 * is noted the parent persists it on the execution, raises the pet flag, and
 * notifies the manager.
 */
export function PottyLogModal({
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
  // Health concern (A4.3) — collapsed until the checkbox is ticked.
  const [healthConcern, setHealthConcern] = useState(false);
  const [obsType, setObsType] = useState<HealthObservationType | "">("");
  const [severity, setSeverity] =
    useState<HealthObservationSeverity>("monitoring");
  const [obsNotes, setObsNotes] = useState("");

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
      setOutcome(String(existing.outcome));
      setNotes(existing.notes ?? "");
      setPhotos(
        existing.photoUrls ?? (existing.photoUrl ? [existing.photoUrl] : []),
      );
      setLogTime(existing.executedAt);
      const obs = existing.healthObservation;
      setHealthConcern(Boolean(obs));
      setObsType(obs?.type ?? "");
      setSeverity(obs?.severity ?? "monitoring");
      setObsNotes(obs?.notes ?? "");
    } else {
      setOutcome(null);
      setNotes("");
      setPhotos([]);
      setLogTime("");
      setHealthConcern(false);
      setObsType("");
      setSeverity("monitoring");
      setObsNotes("");
    }
  }, [open, task?.id, existing]);

  if (!task) return null;

  const meta = metaFor(task.taskType, task.subType);
  const Icon = meta.Icon;
  const options = OUTCOME_OPTIONS.potty;
  const requiresPhoto = task.requiresPhotoProof === true;
  const MAX_PHOTOS = 3;

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

  const canSubmit =
    outcome !== null &&
    (!requiresPhoto || photos.length > 0) &&
    (!healthConcern || obsType !== "");

  function handleSubmit() {
    if (!outcome) return;
    const healthObservation: HealthObservation | undefined =
      healthConcern && obsType
        ? { type: obsType, severity, notes: obsNotes.trim() || undefined }
        : undefined;
    onSubmit({
      outcome,
      notes: notes.trim() || undefined,
      staffName: user.name,
      staffInitials: user.initials,
      executedAt: logTime || undefined,
      photoUrls: photos.length > 0 ? photos : undefined,
      healthObservation,
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
                {existing ? "Edit" : "Log"} potty
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
            <Label htmlFor="notes" className="text-xs">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Anything worth recording..."
              className="resize-none"
            />
          </div>

          {/* Health concern (A4.3) — checkbox reveals the observation fields. */}
          <div className="space-y-3 rounded-md border p-3">
            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox
                checked={healthConcern}
                onCheckedChange={(v) => setHealthConcern(v === true)}
                className="mt-0.5"
              />
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <HeartPulse className="size-4 text-red-500" />
                Note health concern
              </span>
            </label>

            {healthConcern && (
              <div className="space-y-3 pl-6">
                <div className="space-y-1.5">
                  <Label className="text-xs">Observation type</Label>
                  <Select
                    value={obsType}
                    onValueChange={(v) =>
                      setObsType(v as HealthObservationType)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select what you noticed" />
                    </SelectTrigger>
                    <SelectContent>
                      {OBSERVATION_TYPES.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Severity</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SEVERITIES.map((s) => {
                      const selected = severity === s.value;
                      return (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setSeverity(s.value)}
                          data-selected={selected}
                          className="rounded-md border px-2.5 py-1 text-xs font-medium transition-all data-[selected=false]:opacity-60 data-[selected=true]:ring-2 data-[selected=true]:ring-offset-1"
                        >
                          <Badge
                            variant="outline"
                            className={outcomeBadgeClass(s.tone)}
                          >
                            {s.label}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="obs-notes" className="text-xs">
                    Concern notes
                  </Label>
                  <Textarea
                    id="obs-notes"
                    value={obsNotes}
                    onChange={(e) => setObsNotes(e.target.value)}
                    rows={2}
                    placeholder="Describe the concern for the manager..."
                    className="resize-none"
                  />
                </div>

                <p className="text-muted-foreground text-[11px]">
                  Logging a concern flags {task.petName} for attention and
                  notifies the on-shift manager.
                </p>
              </div>
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
            {existing ? "Update log" : "Save log"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
