"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Ban } from "lucide-react";

interface BlockRoomDialogProps {
  open: boolean;
  roomName: string;
  initialDate: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (start: string, end: string, reason: string) => void;
}

export function BlockRoomDialog({
  open,
  roomName,
  initialDate,
  onOpenChange,
  onConfirm,
}: BlockRoomDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Re-mount on open so internal state resets without an effect. */}
        {open && (
          <BlockRoomDialogBody
            key={initialDate}
            roomName={roomName}
            initialDate={initialDate}
            onCancel={() => onOpenChange(false)}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BlockRoomDialogBody({
  roomName,
  initialDate,
  onCancel,
  onConfirm,
}: {
  roomName: string;
  initialDate: string;
  onCancel: () => void;
  onConfirm: (start: string, end: string, reason: string) => void;
}) {
  const [start, setStart] = useState(initialDate);
  const [end, setEnd] = useState(initialDate);
  const [reason, setReason] = useState("");

  const canSubmit = start && end && start <= end;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Ban className="size-4 text-red-500" />
          Block {roomName}
        </DialogTitle>
        <DialogDescription>
          Mark this room unavailable for a date range — maintenance, deep
          clean, or temporary hold. Blocked dates are excluded from occupancy
          calculations.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>From</Label>
            <DatePicker
              value={start}
              onValueChange={(v) => {
                setStart(v);
                if (end < v) setEnd(v);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <DatePicker
              value={end}
              min={start || undefined}
              onValueChange={(v) => setEnd(v)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="block-reason">Reason</Label>
          <Textarea
            id="block-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Deep clean after illness, awaiting kennel repair…"
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={!canSubmit}
          onClick={() => onConfirm(start, end, reason.trim())}
          className="gap-1.5"
        >
          <Ban className="size-3.5" />
          Block room
        </Button>
      </DialogFooter>
    </>
  );
}
