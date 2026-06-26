"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const REJECTION_REASONS = [
  "Incomplete application",
  "Outside our service area",
  "Duplicate application",
  "Does not meet requirements",
  "Suspected fraudulent activity",
  "Other",
];

export interface RejectionDetails {
  reason: string;
  message: string;
  sendEmail: boolean;
}

export function RejectRequestDialog({
  facilityName,
  open,
  onOpenChange,
  onConfirm,
}: {
  facilityName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (details: RejectionDetails) => void;
}) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  const handleConfirm = () => {
    if (!reason) return;
    onConfirm({ reason, message, sendEmail });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject application</DialogTitle>
          <DialogDescription>
            {facilityName
              ? `Reject the application from ${facilityName}.`
              : "Reject this application."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reject-reason" className="w-full">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reject-message">Message (optional)</Label>
            <Textarea
              id="reject-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note for the applicant or your records…"
              rows={3}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={sendEmail}
              onCheckedChange={(c) => setSendEmail(!!c)}
            />
            Send rejection email to the applicant
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!reason}
            onClick={handleConfirm}
          >
            Reject application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
