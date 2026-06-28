"use client";

import { useState } from "react";

import { ShieldCheck } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adminUsers } from "@/data/admin-users";
import {
  approveRestoreRequest,
  rejectRestoreRequest,
  type RestoreRequest,
} from "@/lib/data-management-store";

const SYSTEM_ADMINS = adminUsers
  .filter((u) => u.role === "system_administrator")
  .map((u) => u.name);

export function RestoreApprovalModal({
  request,
  onOpenChange,
}: {
  request: RestoreRequest | null;
  onOpenChange: (open: boolean) => void;
}) {
  // A second System admin (must differ from the requester) makes the decision.
  const approvers = request
    ? SYSTEM_ADMINS.filter((n) => n !== request.requestedBy)
    : [];
  const [approver, setApprover] = useState(approvers[0] ?? "");
  const [reason, setReason] = useState("");

  const approve = () => {
    if (!request || !approver) return;
    approveRestoreRequest(request.id, approver);
    toast.success(`Restore approved by ${approver} — executing restore`);
    onOpenChange(false);
  };
  const reject = () => {
    if (!request || !approver) return;
    if (!reason.trim()) {
      toast.error("Add a reason to reject");
      return;
    }
    rejectRestoreRequest(request.id, approver, reason.trim());
    toast.success("Restore request rejected");
    onOpenChange(false);
  };

  return (
    <Dialog open={!!request} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-amber-600" />
            Approve Restore Request
          </DialogTitle>
          <DialogDescription>
            Two-person control: a System administrator other than the requester
            must approve before the restore executes.
          </DialogDescription>
        </DialogHeader>

        {request && (
          <div className="space-y-4">
            <div className="bg-muted/40 space-y-1 rounded-lg border p-3 text-sm">
              <div className="font-medium">{request.backupName}</div>
              <div className="text-muted-foreground text-xs">
                Scope: {request.scope} · Requested by {request.requestedBy} ·{" "}
                {new Date(request.requestedAt).toLocaleString()}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Approve as (second System admin)</Label>
              <Select value={approver} onValueChange={setApprover}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an approver" />
                </SelectTrigger>
                <SelectContent>
                  {approvers.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="reject-reason">Reason (required to reject)</Label>
              <Textarea
                id="reject-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this being rejected?…"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={!approver}
            onClick={reject}
          >
            Reject
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!approver}
            onClick={approve}
          >
            Approve &amp; Restore
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
