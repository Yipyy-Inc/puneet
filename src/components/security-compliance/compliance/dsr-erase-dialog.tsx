"use client";

import { useState } from "react";

import { AlertTriangle, ShieldOff, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DataSubjectRequest } from "@/data/security-compliance";
import { eraseRequest } from "@/lib/dsr-store";
import { cn } from "@/lib/utils";

export function DsrEraseDialog({
  request,
  onOpenChange,
}: {
  request: DataSubjectRequest | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [method, setMethod] = useState<"Anonymize" | "Delete">("Anonymize");
  const [confirmText, setConfirmText] = useState("");
  const canConfirm = confirmText === "DELETE";

  const run = () => {
    if (!request || !canConfirm) return;
    eraseRequest(request.id, method);
    toast.success(
      method === "Delete"
        ? `Records permanently deleted for ${request.requesterName}`
        : `Records anonymized for ${request.requesterName}`,
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={!!request} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 text-red-600" />
            Erase Personal Data (Article 17)
          </DialogTitle>
          <DialogDescription>
            Right to erasure for {request?.requesterName} &lt;
            {request?.requesterEmail}&gt;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1 — choose method */}
          <div className="grid gap-1.5">
            <Label>1. Choose erasure method</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod("Anonymize")}
                className={cn(
                  "rounded-lg border p-3 text-left text-sm",
                  method === "Anonymize"
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40"
                    : "hover:bg-muted",
                )}
              >
                <div className="flex items-center gap-2 font-medium">
                  <ShieldOff className="size-4" />
                  Anonymize
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Strip identifiers; keep de-identified records.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMethod("Delete")}
                className={cn(
                  "rounded-lg border p-3 text-left text-sm",
                  method === "Delete"
                    ? "border-red-500 bg-red-50 dark:bg-red-950/40"
                    : "hover:bg-muted",
                )}
              >
                <div className="flex items-center gap-2 font-medium">
                  <Trash2 className="size-4" />
                  Permanently Delete
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Erase all personal records.
                </p>
              </button>
            </div>
          </div>

          {/* Step 2 — type DELETE */}
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              This action is irreversible and is recorded in the audit log.
            </span>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="erase-confirm">
              2. Type <span className="font-mono font-semibold">DELETE</span> to
              confirm
            </Label>
            <Input
              id="erase-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            disabled={!canConfirm}
            onClick={run}
          >
            {method === "Delete" ? "Delete Records" : "Anonymize Records"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
