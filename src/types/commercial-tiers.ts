import type { SubscriptionTier } from "@/data/subscription-tiers";

/** A subscription tier enriched with how many facilities are assigned to it. */
export interface TierWithUsage extends SubscriptionTier {
  /** Number of facilities currently subscribed to this tier. */
  facilityCount: number;
}
