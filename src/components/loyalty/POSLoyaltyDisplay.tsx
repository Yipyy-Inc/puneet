"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Gift, TrendingUp, Sparkles } from "lucide-react";

interface POSLoyaltyDisplayProps {
  customerPoints?: number;
  customerTier?: {
    name: string;
    displayName: string;
    color: string;
    discountPercentage?: number;
  } | null;
  pointsEarned?: number;
  rewardApplied?: {
    type: "discount" | "credit";
    value: number | string;
    code?: string;
  };
  onRedeemReward?: () => void;
}

export function POSLoyaltyDisplay({
  customerPoints,
  customerTier,
  pointsEarned,
  rewardApplied,
  onRedeemReward,
}: POSLoyaltyDisplayProps) {
  if (!customerPoints && !customerTier && !pointsEarned && !rewardApplied) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Customer Tier & Points */}
          {(customerTier || customerPoints !== undefined) && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Loyalty Status</span>
              </div>
              <div className="flex items-center gap-2">
                {customerTier && (
                  <Badge
                    style={{ backgroundColor: customerTier.color }}
                    className="text-white"
                  >
                    {customerTier.displayName}
                  </Badge>
                )}
                {customerPoints !== undefined && (
                  <span className="text-sm font-semibold">
                    {customerPoints.toLocaleString()} pts
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Points Earned This Transaction */}
          {pointsEarned && pointsEarned > 0 && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium">Points Earned</span>
              </div>
              <Badge className="bg-green-500">
                +{pointsEarned} pts
              </Badge>
            </div>
          )}

          {/* Reward Applied */}
          {rewardApplied && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium">Reward Applied</span>
              </div>
              <div className="text-right">
                {rewardApplied.type === "discount" && rewardApplied.code && (
                  <Badge variant="outline" className="font-mono">
                    {rewardApplied.code}
                  </Badge>
                )}
                {rewardApplied.type === "credit" && (
                  <Badge className="bg-blue-500">
                    ${typeof rewardApplied.value === "number" ? rewardApplied.value.toFixed(2) : rewardApplied.value}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Tier Discount */}
          {customerTier?.discountPercentage && customerTier.discountPercentage > 0 && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium">Tier Discount</span>
              </div>
              <Badge variant="outline" className="border-purple-500 text-purple-600 dark:text-purple-400">
                {customerTier.discountPercentage}% off
              </Badge>
            </div>
          )}

          {/* Redeem Reward Button */}
          {onRedeemReward && customerPoints && customerPoints > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onRedeemReward}
            >
              <Gift className="h-4 w-4 mr-2" />
              Redeem Rewards
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
