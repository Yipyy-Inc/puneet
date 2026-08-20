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
import { CheckCircle2 } from "lucide-react";
import { OUTCOME_OPTIONS, outcomeBadgeClass } from "./outcome-meta";
import { metaFor } from "./task-type-meta";
import { format12h } from "@/lib/care-log-scheduler";
import { LogMeta } from "./LogMeta";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { ScheduledTask, TaskExecution } from "@/types/care-log";
import type { CustomLogType } from "@/types/boarding";
import { PhotoProofNotice } from "./PhotoProofNotice";

type Props = {
  open: boolean;
  task: ScheduledTask | null;
  /** The step's declared Log Type (A7.5) — drives which minimal UI renders. */
  logType: CustomLogType;
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
  }) => void;
};

/**
 * Custom log modal — renders only the field the step's Log Type declares
 * (A7.5): Simple Confirm (nothing but the confirm), Outcome Chips (the care
 * chips), Notes Only (a required note), or Photo Required (a required photo).
 * The shared Logged-by / timestamp row is always present.
 */
export function CustomLogModal({
  open,
  task,
  logType,
  existing,
  onOpenChange,
  onSubmit,
}: Props) {
  const { user } = useCurrentUser();
  const [outcome, setOutcome] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [nowValue, setNowValue] = useState("");
  const [logTime, setLogTime] = useState("");

  // On open: seed from the existing execution when editing, otherwise clear.
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
      setOutcome(String(existing.outcome));
      setNotes(existing.notes ?? "");
      setLogTime(existing.executedAt);
    } else {
      setOutcome(null);
      setNotes("");
      setLogTime("");
    }
  }, [open, task?.id, existing]);

  if (!task) return null;

  const meta = metaFor(task.taskType, task.subType);
  const Icon = meta.Icon;
  const chipOptions = OUTCOME_OPTIONS.care;

  const canSubmit =
    logType === "chips"
      ? outcome !== null
      : logType === "notes"
        ? notes.trim().length > 0
        : // A photo log can no longer be gated on a photo, because there is no
          // longer anything that pretends to attach one. See PhotoProofNotice.
          true;

  function handleSubmit() {
    // Chips carry the chosen outcome; the other log types are a completion.
    const finalOutcome = logType === "chips" ? outcome : "completed";
    if (!finalOutcome) return;
    onSubmit({
      outcome: finalOutcome,
      notes: notes.trim() || undefined,
      staffName: user.name,
      staffInitials: user.initials,
      executedAt: logTime || undefined,
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
                {existing ? "Edit" : "Log"} {task.details.toLowerCase()}
              </DialogTitle>
              <DialogDescription className="mt-0.5 truncate">
                {task.petName} · {task.kennelName} ·{" "}
                {format12h(task.scheduledTime)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {task.subDetails && task.subDetails.length > 0 && (
            <div className="bg-muted/40 rounded-md border px-3 py-2 text-xs">
              {task.subDetails.map((d, i) => (
                <p key={i} className="leading-relaxed">
                  {d}
                </p>
              ))}
            </div>
          )}

          {/* Simple Confirm — nothing to fill in but the confirmation. */}
          {logType === "confirm" && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0" />
              Confirm {task.details} was completed.
            </div>
          )}

          {/* Outcome Chips — the shared care outcomes. */}
          {logType === "chips" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Outcome</Label>
              <div className="flex flex-wrap gap-1.5">
                {chipOptions.map((opt) => {
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
          )}

          {/* Notes Only — a single required note. */}
          {logType === "notes" && (
            <div className="space-y-1.5">
              <Label htmlFor="custom-notes" className="text-xs">
                Notes
              </Label>
              <Textarea
                id="custom-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Record what happened..."
                className="resize-none"
                aria-invalid={notes.trim().length === 0}
              />
            </div>
          )}

          {/* Photo Required — at least one photo. */}
          {/* A custom task whose whole point WAS the photograph. The capture
              was `mock://photo-1`, so this log type has never produced one; it
              can still record that the task was done, by whom and when. */}
          {logType === "photo" && <PhotoProofNotice required />}

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
            {existing
              ? "Update log"
              : logType === "confirm"
                ? "Mark done"
                : "Save log"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
