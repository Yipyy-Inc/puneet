import type { TierType } from "@/data/subscription-tiers";
import type { TierWithUsage } from "@/types/commercial-tiers";

/** Platform-limit fields, in display order, mapped to the data model. */
export const LIMIT_FIELDS = [
  { key: "maxUsers", label: "Max Staff", short: "Staff" },
  { key: "maxClients", label: "Max Clients", short: "Clients" },
  { key: "maxLocations", label: "Max Locations", short: "Locations" },
  { key: "maxReservations", label: "Max Bookings / mo", short: "Bookings/mo" },
  { key: "storageGB", label: "Storage", short: "Storage", suffix: " GB" },
] as const;

export type LimitKey = (typeof LIMIT_FIELDS)[number]["key"];

/** ≤ 0 is treated as unlimited (the editor uses 0, legacy data uses -1). */
export function formatLimit(value: number, suffix = ""): string {
  return value <= 0 ? "Unlimited" : `${value.toLocaleString()}${suffix}`;
}

/** Convert a stored limit to its editable form (legacy -1 sentinel → 0). */
export function toEditableLimit(value: number): number {
  return value < 0 ? 0 : value;
}

/** Discount of the annual price vs. paying monthly for 12 months. */
export function annualDiscountPct(monthly: number, annual: number): number {
  const full = monthly * 12;
  if (full <= 0 || annual <= 0 || annual >= full) return 0;
  return Math.round((1 - annual / full) * 100);
}

/** Per-tier-type accent styling for cards, badges and matrix columns. */
export const TIER_ACCENT: Record<TierType, { bar: string; badge: string }> = {
  beginner: {
    bar: "bg-linear-to-r from-sky-500 to-blue-600",
    badge: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  },
  pro: {
    bar: "bg-linear-to-r from-violet-500 to-purple-600",
    badge:
      "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  },
  enterprise: {
    bar: "bg-linear-to-r from-amber-500 to-orange-600",
    badge:
      "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
  custom: {
    bar: "bg-linear-to-r from-emerald-500 to-teal-600",
    badge:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
};

/** A blank tier for the "Create New Tier" flow. */
export function createDraftTier(): TierWithUsage {
  const now = new Date().toISOString();
  return {
    id: `tier-${Date.now()}`,
    name: "",
    type: "custom",
    description: "",
    pricing: { monthly: 0, quarterly: 0, yearly: 0, currency: "USD" },
    features: [],
    limitations: {
      maxUsers: 5,
      maxReservations: 200,
      storageGB: 10,
      maxLocations: 1,
      maxClients: 100,
    },
    availableModules: ["module-booking", "module-customer-management"],
    isActive: true,
    isCustomizable: true,
    isPublic: true,
    transactionFeePercent: 2.9,
    createdAt: now,
    updatedAt: now,
    facilityCount: 0,
  };
}
