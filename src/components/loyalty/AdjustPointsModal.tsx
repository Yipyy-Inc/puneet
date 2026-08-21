"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { usePostLoyaltyTransaction } from "@/lib/api/loyalty-ledger";

// ============================================================================
// Moving a customer's points by hand.
//
// It used to call `addManualAdjustment`, which pushed onto an in-memory array
// and could not fail — then toasted success. Now it posts a row to the LEDGER,
// which is the only thing that moves a balance, and the database refuses an
// adjustment that would overdraw the account.
//
// The staff member who posted it is stamped server-side from the session, so
// this no longer sends a name it was handed.
// ============================================================================
export function AdjustPointsModal({
  open,
  onOpenChange,
  accountId,
  currentBalance,
  onAdjusted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accountId: string;
  currentBalance: number;
  onAdjusted: () => void;
}) {
  const post = usePostLoyaltyTransaction();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const points = Number(amount);
  const valid =
    amount.trim() !== "" &&
    !Number.isNaN(points) &&
    points !== 0 &&
    reason.trim().length > 0;
  const resulting = Math.max(
    0,
    currentBalance + (Number.isNaN(points) ? 0 : points),
  );

  const reset = () => {
    setAmount("");
    setReason("");
  };

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleApply = async () => {
    if (!valid) return;
    // Awaited, and the failure reported. An adjustment that would take the
    // balance below zero is refused by the database with a sentence naming what
    // the account actually holds — better than anything invented here.
    try {
      await post.mutateAsync({
        accountId,
        points,
        kind: "adjusted",
        source: "manual",
        description: `Staff adjustment: ${reason.trim()}`,
        reason: reason.trim(),
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The points were not changed.",
      );
      return;
    }
    onAdjusted();
    toast.success(
      `${points > 0 ? "Added" : "Removed"} ${Math.abs(points).toLocaleString()} points`,
    );
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Points</DialogTitle>
          <DialogDescription>
            Add or remove points from this customer&apos;s balance. This appears
            in their history as a staff adjustment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adj-amount">
              Points{" "}
              <span className="text-muted-foreground">
                (use a minus sign to remove)
              </span>
            </Label>
            <Input
              id="adj-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., 50 or -25"
            />
            <p className="text-muted-foreground text-xs">
              Balance: {currentBalance.toLocaleString()} →{" "}
              <span className="text-foreground font-medium tabular-nums">
                {resulting.toLocaleString()}
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adj-reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="adj-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you adjusting these points?"
              rows={3}
            />
          </div>

          <p className="text-muted-foreground text-xs">
            Recorded against your account, and visible in the customer&apos;s
            points history.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleApply()}
            disabled={!valid || post.isPending}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Apply adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
