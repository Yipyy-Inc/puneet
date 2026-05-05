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
import { Camera } from "lucide-react";
import { OUTCOME_OPTIONS, outcomeBadgeClass } from "./outcome-meta";
import { metaFor } from "./task-type-meta";
import { format12h } from "@/lib/care-log-scheduler";
import type { ScheduledTask } from "@/types/care-log";

type Props = {
  open: boolean;
  task: ScheduledTask | null;
  /** Default staff initials (the logged-in user). */
  defaultStaffInitials?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: {
    outcome: string;
    notes?: string;
    staffInitials: string;
    servedAt?: string;
    photoUrl?: string;
  }) => void;
};

export function TaskLogModal({
  open,
  task,
  defaultStaffInitials = "ME",
  onOpenChange,
  onSubmit,
}: Props) {
  const [outcome, setOutcome] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [staff, setStaff] = useState(defaultStaffInitials);
  const [servedAt, setServedAt] = useState("");
  const [photoCaptured, setPhotoCaptured] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setOutcome(null);
      setNotes("");
      setStaff(defaultStaffInitials);
      setServedAt("");
      setPhotoCaptured(false);
    }
  }, [open, task?.id, defaultStaffInitials]);

  if (!task) return null;

  const meta = metaFor(task.taskType, task.subType);
  const Icon = meta.Icon;
  const options = OUTCOME_OPTIONS[task.taskType];
  const isFeeding = task.taskType === "feeding";
  const requiresPhoto = task.requiresPhotoProof === true;

  const canSubmit =
    outcome !== null &&
    staff.trim().length > 0 &&
    (!requiresPhoto || photoCaptured);

  function handleSubmit() {
    if (!outcome) return;
    onSubmit({
      outcome,
      notes: notes.trim() || undefined,
      staffInitials: staff.trim().toUpperCase(),
      servedAt: isFeeding && servedAt ? servedAt : undefined,
      photoUrl: photoCaptured ? "mock://photo-proof" : undefined,
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
                Log {meta.label.toLowerCase()}
              </DialogTitle>
              <DialogDescription className="mt-0.5 truncate">
                {task.petName} · {task.kennelName} · {format12h(task.scheduledTime)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {task.subDetails && task.subDetails.length > 0 && (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
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

          {requiresPhoto && (
            <div className="space-y-1.5">
              <Label className="text-xs">Photo proof (required)</Label>
              <Button
                type="button"
                variant={photoCaptured ? "secondary" : "outline"}
                size="sm"
                onClick={() => setPhotoCaptured(true)}
                className="w-full gap-2"
              >
                <Camera className="size-4" />
                {photoCaptured ? "Photo captured ✓" : "Take photo"}
              </Button>
            </div>
          )}

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

          <div className="space-y-1.5">
            <Label htmlFor="staff" className="text-xs">
              Your initials
            </Label>
            <Input
              id="staff"
              value={staff}
              onChange={(e) => setStaff(e.target.value.slice(0, 4))}
              maxLength={4}
              className="w-24 uppercase"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Save log
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
