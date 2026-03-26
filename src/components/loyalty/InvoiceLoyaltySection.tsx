"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Gift, TrendingUp } from "lucide-react";

interface InvoiceLoyaltySectionProps {
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
  rewardRedemptionId?: string;
  discountCode?: string;
  creditApplied?: number;
  tierDiscount?: number;
}

export function InvoiceLoyaltySection({
  loyaltyPointsEarned,
  loyaltyPointsRedeemed,
  rewardRedemptionId,
  discountCode,
  creditApplied,
  tierDiscount,
}: InvoiceLoyaltySectionProps) {
  if (
    !loyaltyPointsEarned &&
    !loyaltyPointsRedeemed &&
    !creditApplied &&
    !discountCode &&
    !tierDiscount
  ) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Star className="text-primary size-4" />
          Loyalty & Rewards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loyaltyPointsEarned && loyaltyPointsEarned > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-3.5 text-green-600 dark:text-green-400" />
              <span className="text-muted-foreground">Points Earned</span>
            </div>
            <Badge className="bg-green-500">+{loyaltyPointsEarned} pts</Badge>
          </div>
        )}

        {loyaltyPointsRedeemed && loyaltyPointsRedeemed > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Gift className="size-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-muted-foreground">Points Redeemed</span>
            </div>
            <Badge className="bg-blue-500">-{loyaltyPointsRedeemed} pts</Badge>
          </div>
        )}

        {tierDiscount && tierDiscount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Star className="text-primary size-3.5" />
              <span className="text-muted-foreground">Tier Discount</span>
            </div>
            <Badge variant="outline" className="border-primary text-primary">
              {tierDiscount}% off
            </Badge>
          </div>
        )}

        {discountCode && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Gift className="size-3.5 text-purple-600 dark:text-purple-400" />
              <span className="text-muted-foreground">Discount Code</span>
            </div>
            <Badge variant="outline" className="font-mono">
              {discountCode}
            </Badge>
          </div>
        )}

        {creditApplied && creditApplied > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Gift className="size-3.5 text-green-600 dark:text-green-400" />
              <span className="text-muted-foreground">Credit Applied</span>
            </div>
            <Badge className="bg-green-500">${creditApplied.toFixed(2)}</Badge>
          </div>
        )}

        {rewardRedemptionId && (
          <div className="text-muted-foreground mt-2 border-t pt-2 text-xs">
            Reward ID: <span className="font-mono">{rewardRedemptionId}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
