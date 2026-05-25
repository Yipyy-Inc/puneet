"use client";

/**
 * Dialog for marking a calendar slot as unavailable. Opens from the empty-
 * slot right-click context menu — prefilled with the trainer + time the
 * trainer right-clicked on. Persists via the shared time-blocks cache so
 * the striped overlay shows up on the calendar immediately.
 */

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Ban, Hammer, Lock, PartyPopper, UserX } from "lucide-react";
import {
  BLOCK_TIME_REASON_LABELS,
  fanOutTimeBlockUpsert,
  minutesToTime,
  nextTimeBlockId,
  snapToHalfHour,
  timeToMinutes,
  type BlockTimeReasonKind,
} from "@/lib/training-time-blocks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** YYYY-MM-DD the empty slot belongs to. */
  date: string;
  /** HH:MM start time the trainer right-clicked on. */
  startTime: string;
  /** Trainer column the right-click landed on — when set, the block scopes
   *  to that trainer only. The dialog also offers a switch to widen the
   *  block to the whole facility. */
  trainerId?: string;
  trainerName?: string;
}

const REASON_ORDER: BlockTimeReasonKind[] = [
  "trainer-unavailable",
  "equipment-maintenance",
  "facility-closed",
  "private-event",
  "other",
];

const REASON_ICON: Record<BlockTimeReasonKind, typeof Ban> = {
  "trainer-unavailable": UserX,
  "equipment-maintenance": Hammer,
  "facility-closed": Lock,
  "private-event": PartyPopper,
  other: Ban,
};

export function BlockTimeDialog({
  open,
  onOpenChange,
  date,
  startTime,
  trainerId,
  trainerName,
}: Props) {
  const queryClient = useQueryClient();
  // Default end-time = start + 60min, snapped to half-hour.
  const defaultEndTime = () =>
    minutesToTime(snapToHalfHour(timeToMinutes(startTime) + 60));

  const [end, setEnd] = useState(defaultEndTime);
  const [reason, setReason] = useState<BlockTimeReasonKind>(
    trainerId ? "trainer-unavailable" : "facility-closed",
  );
  const [note, setNote] = useState("");
  const [scopeToTrainer, setScopeToTrainer] = useState(!!trainerId);

  useEffect(() => {
    if (!open) return;
    setEnd(defaultEndTime());
    setReason(trainerId ? "trainer-unavailable" : "facility-closed");
    setNote("");
    setScopeToTrainer(!!trainerId);
    // defaultEndTime closes over startTime; intentional dep list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startTime, trainerId]);

  function handleSave() {
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(end);
    if (endMin <= startMin) {
      toast.error("End time has to be after the start time.");
      return;
    }
    fanOutTimeBlockUpsert(queryClient, {
      id: nextTimeBlockId(),
      date,
      startTime,
      endTime: end,
      trainerId: scopeToTrainer && trainerId ? trainerId : undefined,
      reasonKind: reason,
      reasonNote: note.trim() || undefined,
      createdByName: "Staff",
      createdAt: new Date().toISOString(),
    });
    toast.success(
      scopeToTrainer && trainerName
        ? `Time blocked on ${trainerName}'s schedule.`
        : "Time blocked across all trainers.",
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Ban className="text-rose-600 size-5" />
            Block this time
          </DialogTitle>
          <DialogDescription>
            Marks the slot unavailable on the training calendar — new
            sessions can&apos;t be scheduled into it. Shows as a striped gray
            block.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="rounded-lg border bg-slate-50/40 px-3 py-2 text-[12.5px]">
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
              When
            </p>
            <p className="mt-0.5 font-semibold text-slate-800">
              {new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}{" "}
              · starts at {startTime}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">End time</Label>
            <Input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Reason</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {REASON_ORDER.map((kind) => {
                const Icon = REASON_ICON[kind];
                const active = reason === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setReason(kind)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-left text-[12.5px] transition-colors",
                      active
                        ? "border-rose-400 bg-rose-50 text-rose-800"
                        : "hover:bg-slate-50",
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    {BLOCK_TIME_REASON_LABELS[kind]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">
              Note <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Surfaced as the tooltip on the striped block."
            />
          </div>

          {trainerId && (
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <p className="text-sm font-medium">
                  Scope to {trainerName ?? "this trainer"}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Off: blocks the slot across every trainer column on the
                  day view (facility-wide closure).
                </p>
              </div>
              <Switch
                checked={scopeToTrainer}
                onCheckedChange={setScopeToTrainer}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-rose-600 text-white hover:bg-rose-700"
          >
            <Ban className="mr-1.5 size-4" />
            Block time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
