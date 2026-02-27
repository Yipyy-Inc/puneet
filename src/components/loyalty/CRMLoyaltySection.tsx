"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, TrendingUp, Gift, Award, Users } from "lucide-react";
import Link from "next/link";

interface CRMLoyaltySectionProps {
  customerId: number;
  currentPoints: number;
  lifetimePoints: number;
  currentTier: {
    id: string;
    name: string;
    displayName: string;
    minPoints: number;
    color: string;
  } | null;
  nextTier: {
    id: string;
    name: string;
    minPoints: number;
  } | null;
  totalRewardsRedeemed: number;
  totalReferrals: number;
  lastActivityDate: string;
}

export function CRMLoyaltySection({
  customerId,
  currentPoints,
  lifetimePoints,
  currentTier,
  nextTier,
  totalRewardsRedeemed,
  totalReferrals,
  lastActivityDate,
}: CRMLoyaltySectionProps) {
  const pointsToNextTier = nextTier ? nextTier.minPoints - currentPoints : 0;
  const currentTierMinPoints = currentTier?.minPoints || 0;
  const currentTierMaxPoints = nextTier ? nextTier.minPoints : Infinity;
  const progressInTier = currentPoints - currentTierMinPoints;
  const tierRange = currentTierMaxPoints - currentTierMinPoints;
  const progressPercentage = tierRange > 0 ? (progressInTier / tierRange) * 100 : 100;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Loyalty Program
            </CardTitle>
            <CardDescription>
              Customer loyalty status and activity
            </CardDescription>
          </div>
          <Link href={`/facility/dashboard/marketing`}>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted">
              View Details
            </Badge>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Tier & Points */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Current Tier</div>
              {currentTier ? (
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    style={{ backgroundColor: currentTier.color }}
                    className="text-white"
                  >
                    <Award className="h-3 w-3 mr-1" />
                    {currentTier.displayName}
                  </Badge>
                </div>
              ) : (
                <div className="text-lg font-semibold mt-1">No Tier</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-muted-foreground">Points Balance</div>
              <div className="text-2xl font-bold">{currentPoints.toLocaleString()}</div>
            </div>
          </div>

          {/* Progress to Next Tier */}
          {nextTier && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Progress to {nextTier.name}
                </span>
                <span className="font-medium">
                  {pointsToNextTier > 0 ? `${pointsToNextTier.toLocaleString()} points needed` : "Max tier reached"}
                </span>
              </div>
              <Progress value={Math.min(100, Math.max(0, progressPercentage))} className="h-2" />
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-muted-foreground">
                Lifetime Points
              </span>
            </div>
            <div className="text-xl font-bold">{lifetimePoints.toLocaleString()}</div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Gift className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-muted-foreground">
                Rewards Redeemed
              </span>
            </div>
            <div className="text-xl font-bold">{totalRewardsRedeemed}</div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-muted-foreground">
                Referrals Made
              </span>
            </div>
            <div className="text-xl font-bold">{totalReferrals}</div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                Last Activity
              </span>
            </div>
            <div className="text-sm font-semibold">{formatDate(lastActivityDate)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
