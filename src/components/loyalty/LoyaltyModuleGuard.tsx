"use client";

import { ReactNode } from "react";
import { useLoyaltyConfig } from "@/hooks/use-loyalty-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface LoyaltyModuleGuardProps {
  children: ReactNode;
  requireFeature?: "points" | "tiers" | "rewards" | "referrals";
  requirePermission?: "view" | "manage" | "reports";
  locationId?: number;
  fallback?: ReactNode;
}

/**
 * Guard component that conditionally renders children based on:
 * - Loyalty module enabled status
 * - Feature availability
 * - User permissions
 * - Location access
 */
export function LoyaltyModuleGuard({
  children,
  requireFeature,
  requirePermission = "view",
  locationId,
  fallback,
}: LoyaltyModuleGuardProps) {
  const {
    isEnabled,
    isEnabledForLocation,
    canViewLoyalty,
    canManageLoyalty,
    canViewReports,
    features,
  } = useLoyaltyConfig(locationId);

  // Check if module is enabled
  if (!isEnabled) {
    return (
      fallback || (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              Loyalty Program Disabled
            </CardTitle>
            <CardDescription>
              The loyalty program is not enabled for this facility.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Contact your facility administrator to enable the loyalty program.
            </p>
            <Button asChild variant="outline">
              <Link href="/facility/dashboard/settings">
                <Settings className="h-4 w-4 mr-2" />
                Go to Settings
              </Link>
            </Button>
          </CardContent>
        </Card>
      )
    );
  }

  // Check location access
  if (locationId && !isEnabledForLocation(locationId)) {
    return (
      fallback || (
        <Card>
          <CardHeader>
            <CardTitle>Loyalty Not Available</CardTitle>
            <CardDescription>
              The loyalty program is not enabled for this location.
            </CardDescription>
          </CardHeader>
        </Card>
      )
    );
  }

  // Check permissions
  if (requirePermission === "view" && !canViewLoyalty) {
    return (
      fallback || (
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to view loyalty features.
            </CardDescription>
          </CardHeader>
        </Card>
      )
    );
  }

  if (requirePermission === "manage" && !canManageLoyalty) {
    return (
      fallback || (
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to manage loyalty settings.
            </CardDescription>
          </CardHeader>
        </Card>
      )
    );
  }

  if (requirePermission === "reports" && !canViewReports) {
    return (
      fallback || (
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to view loyalty reports.
            </CardDescription>
          </CardHeader>
        </Card>
      )
    );
  }

  // Check feature availability
  if (requireFeature) {
    const featureMap: Record<string, boolean> = {
      points: features.pointsEnabled,
      tiers: features.tiersEnabled,
      rewards: features.rewardsEnabled,
      referrals: features.referralsEnabled,
    };

    if (!featureMap[requireFeature]) {
      return (
        fallback || (
          <Card>
            <CardHeader>
              <CardTitle>Feature Not Available</CardTitle>
              <CardDescription>
                The {requireFeature} feature is not enabled in your loyalty program configuration.
              </CardDescription>
            </CardHeader>
          </Card>
        )
      );
    }
  }

  // All checks passed, render children
  return <>{children}</>;
}
