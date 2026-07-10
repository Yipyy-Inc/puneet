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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Droplets } from "lucide-react";
import { metaFor } from "./task-type-meta";
import { format12h } from "@/lib/care-log-scheduler";
import { LogMeta } from "./LogMeta";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { ScheduledTask, TaskExecution } from "@/types/care-log";

// Suggested volumes — free text is still allowed via the datalist.
const VOLUME_SUGGESTIONS = [
  "Full bowl",
  "Topped up",
  "Half bowl",
  "1 L",
  "2 L",
];

type Props = {
  open: boolean;
  task: ScheduledTask | null;
  /** When present, the modal opens pre-filled to edit this existing log. */
  existing?: TaskExecution;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: {
    outcome: string;
    staffName: string;
    staffInitials: string;
    /** Override log time as "HH:MM"; omitted means stamp the current time. */
    executedAt?: string;
    waterVolume?: string;
  }) => void;
};

/**
 * Dedicated Water Refill log modal — minimal by design. A one-tap "Refilled"
 * confirm, an optional volume, and the shared Logged-by / timestamp pieces.
 * Batch "Log All" across all pets (A3.5) is handled by the Section header, not
 * here — this is the per-bowl path.
 */
export function WaterRefillLogModal({
  open,
  task,
  existing,
  onOpenChange,
  onSubmit,
}: Props) {
  const { user } = useCurrentUser();
  const [volume, setVolume] = useState("");
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
      setVolume(existing.waterVolume ?? "");
      setLogTime(existing.executedAt);
    } else {
      setVolume("");
      setLogTime("");
    }
  }, [open, task?.id, existing]);

  if (!task) return null;

  const meta = metaFor(task.taskType, task.subType);
  const Icon = meta.Icon;

  function handleSubmit() {
    onSubmit({
      outcome: "completed",
      staffName: user.name,
      staffInitials: user.initials,
      executedAt: logTime || undefined,
      waterVolume: volume.trim() || undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
            >
              <Icon className={`size-5 ${meta.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base">
                {existing ? "Edit" : "Log"} water refill
              </DialogTitle>
              <DialogDescription className="mt-0.5 truncate">
                {task.kennelName} · {task.petName} ·{" "}
                {format12h(task.scheduledTime)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm font-medium text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300">
            <Droplets className="size-4 shrink-0" />
            Confirm the water bowl was refilled.
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="water-volume" className="text-xs">
              Volume{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="water-volume"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              list="water-volume-suggestions"
              placeholder="e.g. Full bowl, 1 L..."
            />
            <datalist id="water-volume-suggestions">
              {VOLUME_SUGGESTIONS.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
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
          <Button onClick={handleSubmit}>
            {existing ? "Update log" : "Refilled"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
