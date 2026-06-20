"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { Coins, DollarSign } from "lucide-react";
import { loyaltyQueries } from "@/lib/api/loyalty";
import { redeemPointsForCredit } from "@/data/loyalty-redeem";

export function RedeemPointsDialog({
  open,
  onOpenChange,
  facilityId,
  customerId,
  redemptionRate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: number;
  customerId: number;
  /** Points per $1 of credit (default 100). */
  redemptionRate: number;
}) {
  const queryClient = useQueryClient();
  const { data: account } = useQuery(
    loyaltyQueries.account(facilityId, customerId),
  );
  const [pointsInput, setPointsInput] = useState("");

  const balance = account?.pointsBalance ?? 0;
  const rate = redemptionRate > 0 ? redemptionRate : 100;
  const points = Math.floor(Number(pointsInput) || 0);
  const creditPreview = useMemo(
    () => (points > 0 ? Math.round((points / rate) * 100) / 100 : 0),
    [points, rate],
  );

  const presets = [rate, rate * 5, rate * 10].filter((p) => p <= balance);
  const error =
    points > balance
      ? "Not enough points"
      : points > 0 && creditPreview <= 0
        ? `Redeem at least ${rate} points`
        : null;
  const canRedeem = points > 0 && !error;

  const handleRedeem = () => {
    const result = redeemPointsForCredit({
      facilityId,
      customerId,
      points,
      redemptionRate: rate,
    });
    if (!result.ok) {
      toast.error(result.error ?? "Could not redeem points.");
      return;
    }
    // Refresh the account/transactions so the balance updates immediately.
    queryClient.invalidateQueries({ queryKey: ["loyalty"] });
    toast.success(
      `Redeemed ${result.pointsRedeemed} points for $${result.creditAdded?.toFixed(2)} credit`,
    );
    setPointsInput("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="size-5 text-amber-500" />
            Redeem Points for Credit
          </DialogTitle>
          <DialogDescription>
            {rate.toLocaleString()} points = $1.00 account credit. Credit
            applies automatically to your next booking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/40 flex items-center justify-between rounded-lg border p-3 text-sm">
            <span className="text-muted-foreground">Available</span>
            <span className="font-semibold tabular-nums">
              {balance.toLocaleString()} points
              {account && account.creditBalance > 0 && (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  · ${account.creditBalance.toFixed(2)} credit
                </span>
              )}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="redeem-points">Points to redeem</Label>
            <Input
              id="redeem-points"
              type="number"
              min={0}
              max={balance}
              step={1}
              value={pointsInput}
              onChange={(e) => setPointsInput(e.target.value)}
              placeholder="0"
              className="tabular-nums"
            />
            {presets.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {presets.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setPointsInput(String(p))}
                  >
                    {p.toLocaleString()}
                  </Button>
                ))}
                {balance > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setPointsInput(String(balance))}
                  >
                    All ({balance.toLocaleString()})
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <span className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-200">
              <DollarSign className="size-4" />
              Credit you&apos;ll receive
            </span>
            <span className="font-bold text-emerald-700 tabular-nums dark:text-emerald-300">
              ${creditPreview.toFixed(2)}
            </span>
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canRedeem}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={handleRedeem}
          >
            Redeem for ${creditPreview.toFixed(2)} credit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
