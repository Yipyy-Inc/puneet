"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CANCEL_REASONS = [
  "Switching to a competitor",
  "Too expensive",
  "Closing the business",
  "Missing features",
  "Non-payment",
  "Other",
];

export interface CancellationResult {
  reason: string;
  effective: "immediately" | "end_of_period";
  notes: string;
}

export function CancelSubscriptionDialog({
  facilityName,
  onConfirm,
  onClose,
}: {
  facilityName: string;
  onConfirm: (result: CancellationResult) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [effective, setEffective] = useState<"immediately" | "end_of_period">(
    "end_of_period",
  );
  const [notes, setNotes] = useState("");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel subscription</DialogTitle>
          <DialogDescription>
            {facilityName} will be marked Cancelled and lose access when the
            cancellation takes effect.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="cancel-reason" className="w-full">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {CANCEL_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Effective date</Label>
            <RadioGroup
              value={effective}
              onValueChange={(v) =>
                setEffective(v as "immediately" | "end_of_period")
              }
              className="flex flex-col gap-2 sm:flex-row"
            >
              <label className="flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <RadioGroupItem value="immediately" />
                Immediately
              </label>
              <label className="flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <RadioGroupItem value="end_of_period" />
                End of billing period
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancel-notes">Internal notes (optional)</Label>
            <Textarea
              id="cancel-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context for the team — not shown to the facility…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Keep subscription
          </Button>
          <Button
            variant="destructive"
            disabled={!reason}
            onClick={() => {
              onConfirm({ reason, effective, notes });
              onClose();
            }}
          >
            Confirm Cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
