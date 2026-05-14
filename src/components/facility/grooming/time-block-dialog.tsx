"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ban, Calendar as CalendarIcon, Clock, User } from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export const TIME_BLOCK_REASONS = [
  { value: "lunch", label: "Lunch" },
  { value: "break", label: "Break" },
  { value: "training", label: "Training" },
  { value: "maintenance", label: "Maintenance" },
  { value: "personal", label: "Personal" },
] as const;

export type TimeBlockReason = (typeof TIME_BLOCK_REASONS)[number]["value"];

export type TimeBlock = {
  id: string;
  stylistId: string;
  stylistName: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: TimeBlockReason;
  notes?: string;
};

const DURATION_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function formatDateLong(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TimeBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stylistId: string;
  stylistName: string;
  date: string;
  startTime: string;
  onSave: (block: TimeBlock) => void;
}

export function TimeBlockDialog({
  open,
  onOpenChange,
  stylistId,
  stylistName,
  date,
  startTime,
  onSave,
}: TimeBlockDialogProps) {
  const [reason, setReason] = useState<TimeBlockReason | "">("");
  const [durationMin, setDurationMin] = useState<string>("60");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setDurationMin("60");
      setNotes("");
    }
  }, [open]);

  function handleSave() {
    if (!reason) {
      toast.error("Pick a reason for the time block");
      return;
    }
    const endTime = addMinutes(startTime, Number(durationMin));
    const block: TimeBlock = {
      id: `tb-${Date.now()}`,
      stylistId,
      stylistName,
      date,
      startTime,
      endTime,
      reason,
      notes: notes.trim() || undefined,
    };
    onSave(block);
    toast.success(`Blocked ${stylistName}'s ${reason} (${startTime}–${endTime})`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Ban className="size-4 text-slate-500" />
            Block Time
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Slot summary */}
          <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center gap-2">
                <User className="size-3.5 text-muted-foreground" />
                <span className="font-medium">{stylistName}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarIcon className="size-3.5" />
                <span>{formatDateLong(date)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-3.5" />
                <span>
                  Starts at <strong className="text-foreground">{startTime}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <Label className="text-xs">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as TimeBlockReason)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Why is this time blocked?" />
              </SelectTrigger>
              <SelectContent>
                {TIME_BLOCK_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div>
            <Label className="text-xs">Duration</Label>
            <Select value={durationMin} onValueChange={setDurationMin}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Ends at {addMinutes(startTime, Number(durationMin))}
            </p>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the team should know…"
              rows={2}
              className="mt-1 text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-slate-700 text-white hover:bg-slate-800"
          >
            <Ban className="mr-1.5 size-4" />
            Block Time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
