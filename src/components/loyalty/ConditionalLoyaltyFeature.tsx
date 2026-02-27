"use client";

import { ReactNode } from "react";
import { useLoyaltyConfig } from "@/hooks/use-loyalty-config";

interface ConditionalLoyaltyFeatureProps {
  feature: "points" | "tiers" | "rewards" | "referrals" | "expiration";
  children: ReactNode;
  fallback?: ReactNode;
  locationId?: number;
}

/**
 * Conditionally renders children based on feature availability
 * Respects facility configuration and location settings
 */
export function ConditionalLoyaltyFeature({
  feature,
  children,
  fallback,
  locationId,
}: ConditionalLoyaltyFeatureProps) {
  const { isEnabled, features, isEnabledForLocation } = useLoyaltyConfig(locationId);

  // Check if module is enabled
  if (!isEnabled) {
    return fallback || null;
  }

  // Check location
  if (locationId && !isEnabledForLocation(locationId)) {
    return fallback || null;
  }

  // Check feature
  const featureMap: Record<string, boolean> = {
    points: features.pointsEnabled,
    tiers: features.tiersEnabled,
    rewards: features.rewardsEnabled,
    referrals: features.referralsEnabled,
    expiration: features.expirationEnabled,
  };

  if (!featureMap[feature]) {
    return fallback || null;
  }

  return <>{children}</>;
}
