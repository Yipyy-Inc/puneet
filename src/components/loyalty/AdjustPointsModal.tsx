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
import { useCurrentUser } from "@/hooks/use-current-user";
import { addManualAdjustment } from "@/data/loyalty-transactions";

export function AdjustPointsModal({
  open,
  onOpenChange,
  facilityId,
  customerId,
  currentBalance,
  onAdjusted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  facilityId: number;
  customerId: number;
  currentBalance: number;
  onAdjusted: () => void;
}) {
  const { user } = useCurrentUser();
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

  const handleApply = () => {
    if (!valid) return;
    addManualAdjustment({
      facilityId,
      customerId,
      points,
      reason: reason.trim(),
      staffId: user.id,
      staffName: user.name,
    });
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
              Points <span className="text-muted-foreground">(use a minus sign to remove)</span>
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
            Recorded by {user.name}.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!valid}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Apply adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
