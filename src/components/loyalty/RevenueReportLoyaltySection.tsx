"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp, TrendingDown, Gift, Users } from "lucide-react";

interface RevenueReportLoyaltySectionProps {
  loyaltyPointsEarned: number;
  rewardsRedeemed: number;
  rewardsValue: number;
  referralRewardsIssued: number;
  referralRewardsValue: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export function RevenueReportLoyaltySection({
  loyaltyPointsEarned,
  rewardsRedeemed,
  rewardsValue,
  referralRewardsIssued,
  referralRewardsValue,
  period: _period,
}: RevenueReportLoyaltySectionProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="text-primary h-5 w-5" />
          Loyalty & Referral Impact
        </CardTitle>
        <CardDescription>
          Impact of loyalty program and referrals on revenue for the selected
          period
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* Points Earned */}
          <div className="bg-card rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="size-4 text-green-600 dark:text-green-400" />
              <span className="text-muted-foreground text-sm font-medium">
                Points Earned
              </span>
            </div>
            <div className="text-2xl font-bold">
              {loyaltyPointsEarned.toLocaleString()}
            </div>
            <div className="text-muted-foreground mt-1 text-xs">
              Total points issued
            </div>
          </div>

          {/* Rewards Redeemed */}
          <div className="bg-card rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2">
              <Gift className="size-4 text-blue-600 dark:text-blue-400" />
              <span className="text-muted-foreground text-sm font-medium">
                Rewards Redeemed
              </span>
            </div>
            <div className="text-2xl font-bold">{rewardsRedeemed}</div>
            <div className="text-muted-foreground mt-1 text-xs">
              Total redemptions
            </div>
          </div>

          {/* Rewards Value */}
          <div className="bg-card rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2">
              <TrendingDown className="size-4 text-red-600 dark:text-red-400" />
              <span className="text-muted-foreground text-sm font-medium">
                Rewards Value
              </span>
            </div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(rewardsValue)}
            </div>
            <div className="text-muted-foreground mt-1 text-xs">
              Total value redeemed
            </div>
          </div>

          {/* Referral Rewards Issued */}
          <div className="bg-card rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2">
              <Users className="size-4 text-purple-600 dark:text-purple-400" />
              <span className="text-muted-foreground text-sm font-medium">
                Referral Rewards
              </span>
            </div>
            <div className="text-2xl font-bold">{referralRewardsIssued}</div>
            <div className="text-muted-foreground mt-1 text-xs">
              Rewards issued
            </div>
          </div>

          {/* Referral Rewards Value */}
          <div className="bg-card rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2">
              <TrendingDown className="size-4 text-orange-600 dark:text-orange-400" />
              <span className="text-muted-foreground text-sm font-medium">
                Referral Value
              </span>
            </div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(referralRewardsValue)}
            </div>
            <div className="text-muted-foreground mt-1 text-xs">
              Total referral value
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-muted/50 mt-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Total Loyalty Impact</div>
              <div className="text-muted-foreground text-xs">
                Combined value of all rewards and referrals
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(rewardsValue + referralRewardsValue)}
              </div>
              <div className="text-muted-foreground text-xs">
                Net impact on revenue
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
