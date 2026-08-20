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
import { Badge } from "@/components/ui/badge";
import { OUTCOME_OPTIONS, outcomeBadgeClass } from "./outcome-meta";
import { metaFor } from "./task-type-meta";
import { format12h } from "@/lib/care-log-scheduler";
import { LogMeta } from "./LogMeta";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { ScheduledTask, TaskExecution } from "@/types/care-log";
import { PhotoProofNotice } from "./PhotoProofNotice";

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
    servedAt?: string;
    photoUrls?: string[];
  }) => void;
};

export function TaskLogModal({
  open,
  task,
  existing,
  onOpenChange,
  onSubmit,
}: Props) {
  // Single source for the logged-in staff member (replaces free-text initials).
  const { user } = useCurrentUser();
  const [outcome, setOutcome] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [servedAt, setServedAt] = useState("");
  // Log time: "" = stamp the current time on submit; a value backdates it.
  const [nowValue, setNowValue] = useState("");
  const [logTime, setLogTime] = useState("");

  // On open: seed from the existing execution when editing, otherwise clear.
  useEffect(() => {
    if (!open) return;
    const now = new Date();
    setNowValue(
      `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes(),
      ).padStart(2, "0")}`,
    );
    if (existing) {
      setOutcome(String(existing.outcome));
      setNotes(existing.notes ?? "");
      setServedAt(existing.servedAt ?? "");
      // Preserve the original log time (still editable via the override input).
      setLogTime(existing.executedAt);
    } else {
      setOutcome(null);
      setNotes("");
      setServedAt("");
      setLogTime("");
    }
  }, [open, task?.id, existing]);

  if (!task) return null;

  const meta = metaFor(task.taskType, task.subType);
  const Icon = meta.Icon;
  const options = OUTCOME_OPTIONS[task.taskType];
  const isFeeding = task.taskType === "feeding";
  const requiresPhoto = task.requiresPhotoProof === true;

  const canSubmit = outcome !== null;

  function handleSubmit() {
    if (!outcome) return;
    onSubmit({
      outcome,
      notes: notes.trim() || undefined,
      staffName: user.name,
      staffInitials: user.initials,
      executedAt: logTime || undefined,
      servedAt: isFeeding && servedAt ? servedAt : undefined,
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
                {existing ? "Edit" : "Log"} {meta.label.toLowerCase()}
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

          {isFeeding && (
            <div className="space-y-1.5">
              <Label htmlFor="served-at" className="text-xs">
                Time food was served
              </Label>
              <Input
                id="served-at"
                type="time"
                value={servedAt}
                onChange={(e) => setServedAt(e.target.value)}
                placeholder={task.scheduledTime}
              />
            </div>
          )}

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

          <PhotoProofNotice required={requiresPhoto} />

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
