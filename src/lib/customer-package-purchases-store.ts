"use client";

import { useSyncExternalStore } from "react";

import {
  customerPackagePurchases,
  services,
  type ServicePackage,
  type CustomerPackagePurchase,
} from "@/data/services-pricing";

// Live list of the customer's prepaid pass purchases. Seeded from the
// deterministic mock data and appended to when the customer buys a pack from
// the portal's "Buy Passes & Bundles" section. A module store (not local
// state) so a purchase persists in "My prepaid packs" while navigating.

// Single mock customer for the customer portal, matching PackagesTab.
const MOCK_CUSTOMER_ID = "15";

let purchases: CustomerPackagePurchase[] = [...customerPackagePurchases];
const listeners = new Set<() => void>();
let seq = 0;

function emit() {
  listeners.forEach((l) => l());
}

/** Build a customer purchase record from a facility package definition. */
export function purchasePackage(
  pkg: ServicePackage,
  customerId: string = MOCK_CUSTOMER_ID,
): CustomerPackagePurchase {
  const now = new Date();
  const totalPasses = pkg.services.reduce((sum, s) => sum + s.quantity, 0);
  // Multi-service bundles collapse to a primary service for the owned-pack
  // card (the model tracks one serviceId/category per purchase).
  const primary = pkg.services[0];
  const primaryService = services.find((s) => s.id === primary?.serviceId);
  const expires = new Date(now);
  expires.setDate(expires.getDate() + pkg.validDays);

  const record: CustomerPackagePurchase = {
    id: `cpp-${now.getTime()}-${seq++}`,
    customerId,
    packageId: pkg.id,
    packageName: pkg.name,
    category: primaryService?.category ?? "daycare",
    serviceId: primary?.serviceId ?? "",
    serviceLabel: primaryService?.name ?? pkg.name,
    totalPasses,
    purchaseDate: now.toISOString(),
    expiresAt: expires.toISOString(),
    pricePaid: pkg.packagePrice,
    passes: Array.from({ length: totalPasses }, (_, i) => ({
      passNumber: i + 1,
      status: "available" as const,
    })),
    adjustments: [],
  };

  purchases = [record, ...purchases];
  emit();
  return record;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot() {
  return purchases;
}
function getServerSnapshot() {
  return customerPackagePurchases;
}

export function useCustomerPackagePurchases(): CustomerPackagePurchase[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
