import { availableModules } from "@/data/feature-toggles";
import { facilities } from "@/data/facilities";
import { facilitySubscriptions } from "@/data/facility-subscriptions";
import { subscriptionTiers } from "@/data/subscription-tiers";

// The 12-module catalog (long ids) shared by every tab.
export const MODULE_CATALOG = availableModules;
export const TOTAL_MODULES = availableModules.length;

// Facilities store SHORT module ids; tiers store LONG ids. Bridge them.
export const SHORT_TO_LONG: Record<string, string> = {
  booking: "module-booking",
  scheduling: "module-staff-scheduling",
  customers: "module-customer-management",
  financial: "module-financial-reporting",
  communication: "module-communication",
  training: "module-training-education",
  grooming: "module-grooming-management",
  inventory: "module-inventory-management",
};

export const TOTAL_FACILITIES = facilities.length;

export const TIER_BADGE: Record<string, string> = {
  beginner:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  pro: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  enterprise:
    "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  custom:
    "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
};

/** Display name for a tier type (Puppy / Pack Leader / …). */
export function tierName(type: string): string {
  return subscriptionTiers.find((t) => t.type === type)?.name ?? type;
}

/** Long module ids a tier includes by default. */
export function tierDefaultModuleIds(tierType: string): Set<string> {
  const tier = subscriptionTiers.find((t) => t.type === tierType);
  return new Set(tier?.availableModules ?? []);
}

/** How many facilities are on a given tier (for change-log "tenants affected"). */
export function facilityCountOnTier(tierId: string): number {
  return facilitySubscriptions.filter((s) => s.tierId === tierId).length;
}

/** A facility's tier type, via its subscription. */
export function facilityTierType(facilityId: number): string {
  const sub = facilitySubscriptions.find((s) => s.facilityId === facilityId);
  const tier = sub
    ? subscriptionTiers.find((t) => t.id === sub.tierId)
    : undefined;
  return tier?.type ?? "beginner";
}

/** A facility's enabled modules as long ids. */
export function facilityEnabledLongIds(facilityId: number): Set<string> {
  const facility = facilities.find((f) => f.id === facilityId);
  const out = new Set<string>();
  for (const short of facility?.enabledModules ?? []) {
    const long = SHORT_TO_LONG[short];
    if (long) out.add(long);
  }
  return out;
}

/** Facilities affected by a global flag (target list, else rollout estimate). */
export function affectedFacilityCount(flag: {
  rolloutPercentage: number;
  targetFacilities?: string[];
}): number {
  if (flag.targetFacilities && flag.targetFacilities.length > 0) {
    return flag.targetFacilities.length;
  }
  return Math.round((flag.rolloutPercentage / 100) * TOTAL_FACILITIES);
}

export function formatDate(iso: string): string {
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export interface ModuleToggleItem {
  moduleId: string;
  name: string;
  category: string;
  enabled: boolean;
  tierIncluded: boolean;
  /** Effective state deviates from the tier default. */
  override: boolean;
}
