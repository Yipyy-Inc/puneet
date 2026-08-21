"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  usePostLoyaltyTransaction,
  useRedeemLoyaltyPoints,
} from "@/lib/api/loyalty-ledger";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Gift } from "lucide-react";

// ============================================================================
// Granting a customer points or credit.
//
// `grantReward` pushed onto an in-memory array. Points now post to the LEDGER
// and credit goes through `redeem_loyalty_points`, which puts it on the account
// atomically — the two are different operations and were only ever one function
// because a fixture could pretend they were.
//
// Note that a granted reward costs the customer NOTHING: `points: 0`. It is a
// gift from the facility, not something they redeemed, and charging their
// balance for it would be the opposite of what the button says.
// ============================================================================
export function SendRewardModal({
  open,
  onOpenChange,
  accountId,
  customerName,
  onSent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accountId: string;
  customerName?: string;
  onSent: () => void;
}) {
  const post = usePostLoyaltyTransaction();
  const redeem = useRedeemLoyaltyPoints();
  const [rewardType, setRewardType] = useState<"points" | "credit">("points");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const amt = Number(amount);
  const valid = Number.isFinite(amt) && amt > 0;

  const reset = () => {
    setRewardType("points");
    setAmount("");
    setNote("");
  };

  const handleSend = async () => {
    if (!valid) return;
    try {
      if (rewardType === "points") {
        await post.mutateAsync({
          accountId,
          points: Math.round(amt),
          kind: "adjusted",
          source: "manual",
          description: note.trim() || "Reward from the facility",
          reason: note.trim() || undefined,
        });
      } else {
        // Credit is granted, not bought — `points: 0`, so the customer's
        // balance is untouched and the credit lands on the account.
        await redeem.mutateAsync({
          accountId,
          rewardType: "credit_balance",
          rewardValue: amt,
          points: 0,
          description: note.trim() || "Credit from the facility",
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The reward was not sent.",
      );
      return;
    }
    toast.success(
      rewardType === "points"
        ? `Sent ${amt} points${customerName ? ` to ${customerName}` : ""}`
        : `Sent $${amt.toFixed(2)} credit${customerName ? ` to ${customerName}` : ""}`,
    );
    onSent();
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="size-5 text-emerald-500" />
            Send Reward
          </DialogTitle>
          <DialogDescription>
            Grant a points bonus or account credit
            {customerName ? ` to ${customerName}` : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reward type</Label>
            <Select
              value={rewardType}
              onValueChange={(v) => setRewardType(v as "points" | "credit")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="points">Points bonus</SelectItem>
                <SelectItem value="credit">Account credit ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reward-amount">
              {rewardType === "points" ? "Points" : "Credit amount ($)"}
            </Label>
            <Input
              id="reward-amount"
              type="number"
              min={0}
              step={rewardType === "points" ? 1 : 0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="tabular-nums"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reward-note">Note (optional)</Label>
            <Textarea
              id="reward-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Thanks for being a loyal customer!"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid || post.isPending || redeem.isPending}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => void handleSend()}
          >
            Send reward
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
