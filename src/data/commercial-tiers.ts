// Commercial tier management — derives real per-tier facility counts from the
// facility subscriptions so the Tiers admin can warn how many facilities a
// permission change will affect. No hardcoded counts.

import { facilitySubscriptions } from "@/data/facility-subscriptions";
import { subscriptionTiers } from "@/data/subscription-tiers";
import type { TierWithUsage } from "@/types/commercial-tiers";

/** How many facilities are currently subscribed to the given tier. */
export function getTierFacilityCount(tierId: string): number {
  return facilitySubscriptions.filter((sub) => sub.tierId === tierId).length;
}

/** All tiers with their live facility-assignment counts attached. */
export function buildTiersWithUsage(): TierWithUsage[] {
  return subscriptionTiers.map((tier) => ({
    ...tier,
    facilityCount: getTierFacilityCount(tier.id),
  }));
}
