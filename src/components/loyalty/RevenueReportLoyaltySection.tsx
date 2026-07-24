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
  /** Incremental revenue attributed to loyalty members (from computeLoyaltyRoi). */
  incrementalRevenue: number;
  /** This-month loyalty ROI %, from computeLoyaltyRoi. */
  roiPercent: number;
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
  incrementalRevenue,
  roiPercent,
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
          <Gift className="text-primary size-5" />
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

        {/* ROI summary — incremental revenue vs cost of rewards */}
        <div className="bg-muted/50 mt-4 rounded-lg border p-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <div>
              <div className="text-muted-foreground text-xs">
                Incremental Revenue
              </div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(incrementalRevenue)}
              </div>
              <div className="text-muted-foreground text-xs">
                From members vs non-members
              </div>
            </div>
            <div className="text-muted-foreground self-center text-center text-lg">
              −
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                Cost of Rewards
              </div>
              <div className="text-xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(rewardsValue + referralRewardsValue)}
              </div>
              <div className="text-muted-foreground text-xs">
                Rewards + referrals issued
              </div>
            </div>
            <div className="text-muted-foreground self-center text-center text-lg">
              =
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                Net Impact · ROI
              </div>
              <div className="text-xl font-bold">
                {formatCurrency(
                  incrementalRevenue - (rewardsValue + referralRewardsValue),
                )}
              </div>
              <div className="text-muted-foreground text-xs">
                {roiPercent >= 0 ? "+" : ""}
                {roiPercent}% ROI this month
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
