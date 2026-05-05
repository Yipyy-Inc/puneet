"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DISMISS_REASONS, type DismissReason } from "@/data/rebook-reminders";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  petName: string;
  onConfirm: (reason: DismissReason, note: string) => void;
}

export function DismissReminderDialog({
  open,
  onOpenChange,
  clientName,
  petName,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState<DismissReason | null>(null);
  const [note, setNote] = useState("");

  const handleConfirm = () => {
    if (!reason) return;
    onConfirm(reason, note.trim());
    setReason(null);
    setNote("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setReason(null);
    setNote("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : handleCancel())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="size-5" />
            Dismiss reminder for {clientName}
          </DialogTitle>
          <DialogDescription>
            This reminder for {petName} won&apos;t be sent. The cycle restarts
            the next time {clientName} completes a booking. Logged on the
            client profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-2 block text-xs font-medium">Reason</label>
            <div className="grid grid-cols-2 gap-2">
              {DISMISS_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={
                    reason === r
                      ? "border-primary bg-primary/10 text-primary rounded-lg border-2 px-3 py-2 text-left text-sm font-medium transition-colors"
                      : "hover:bg-muted/50 rounded-lg border px-3 py-2 text-left text-sm transition-colors"
                  }
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium">
              Note (optional)
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything else worth recording…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!reason}
            onClick={handleConfirm}
          >
            Dismiss reminder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
