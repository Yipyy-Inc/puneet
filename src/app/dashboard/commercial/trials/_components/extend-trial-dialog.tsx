"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Trial } from "@/types/trials";

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface ExtendTrialDialogProps {
  trial: Trial;
  onOpenChange: (open: boolean) => void;
  onConfirm: (trial: Trial, newEnd: string, reason: string) => void;
}

export function ExtendTrialDialog({
  trial,
  onOpenChange,
  onConfirm,
}: ExtendTrialDialogProps) {
  const [date, setDate] = useState(trial.trialEnd);
  const [reason, setReason] = useState("");

  const valid = date.length > 0 && reason.trim().length > 0;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extend trial</DialogTitle>
          <DialogDescription>
            Extend the trial for {trial.facilityName}. A reason is required and
            recorded on the audit log.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="extend-date">New trial end date</Label>
            <DatePicker
              id="extend-date"
              value={date}
              min={todayIso()}
              onValueChange={(next) => setDate(next)}
              placeholder="Select new end date"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="extend-reason">
              Reason <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="extend-reason"
              value={reason}
              placeholder="Why is this trial being extended?"
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!valid}
            onClick={() => onConfirm(trial, date, reason.trim())}
          >
            Extend trial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
