"use client";

import { useState } from "react";

import { XCircle } from "lucide-react";
import { toast } from "sonner";

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
import type { DataSubjectRequest } from "@/data/security-compliance";
import { rejectRequest } from "@/lib/dsr-store";

export function DsrRejectDialog({
  request,
  onOpenChange,
}: {
  request: DataSubjectRequest | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState("");

  const run = () => {
    if (!request) return;
    if (!reason.trim()) {
      toast.error("Enter a rejection reason");
      return;
    }
    rejectRequest(request.id, reason.trim());
    toast.success("Request rejected");
    onOpenChange(false);
  };

  return (
    <Dialog open={!!request} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="size-5 text-rose-600" />
            Reject Request
          </DialogTitle>
          <DialogDescription>
            Reject the {request?.requestType.toLowerCase()} request from{" "}
            {request?.requesterName}. The reason is recorded with the request.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="reject-reason">Reason</Label>
          <Textarea
            id="reject-reason"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this request being rejected?…"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-rose-600 text-white hover:bg-rose-700"
            disabled={!reason.trim()}
            onClick={run}
          >
            Reject Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
