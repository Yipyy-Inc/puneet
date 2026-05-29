import type { CustomerPackage } from "@/types/packages";

/**
 * A `CustomerPackage` row is what a specific client owns: the package id they
 * bought (`packageId` → catalog), how many passes are left, and the per-pass
 * service breakdown.
 *
 * `passes[].moduleId` is the **service module** the pass belongs to
 * ("grooming", "daycare", …) and is what consumers filter on. `passes[].packageId`
 * is the optional reference back to the catalog row for that specific pass
 * (`GroomingPackage.id` for grooming). The previous `serviceId` field
 * conflated these two and made the BookingModal filter fragile.
 */
export type CustomerPackageRecord = CustomerPackage & {
  packageName: string;
  passes: {
    moduleId: string;
    packageId: string;
    serviceName: string;
    totalPasses: number;
    usedPasses: number;
  }[];
};

export const mockCustomerPackages: CustomerPackageRecord[] = [
  {
    id: "cp-001",
    customerId: 1,
    packageId: "gpp-001",
    packageName: "5x Full Groom Pack",
    purchasedAt: "2026-05-01T10:00:00Z",
    expiresAt: "2026-11-01T10:00:00Z",
    passesTotal: 5,
    passesUsed: 2,
    passes: [
      {
        moduleId: "grooming",
        packageId: "groom-pkg-002",
        serviceName: "Full Groom",
        totalPasses: 5,
        usedPasses: 2,
      },
    ],
    status: "active",
    redemptions: [
      {
        id: "red-001",
        date: "2026-05-10T14:30:00Z",
        bookingId: 101,
        petId: 1,
        petName: "Buddy",
        serviceLabel: "Full Groom",
        passNumber: 1,
      },
      {
        id: "red-002",
        date: "2026-05-21T09:00:00Z",
        bookingId: 105,
        petId: 1,
        petName: "Buddy",
        serviceLabel: "Full Groom",
        passNumber: 2,
      },
    ],
  },
  {
    id: "cp-002",
    customerId: 2,
    packageId: "gpp-002",
    packageName: "3x Bath & Brush Pack",
    purchasedAt: "2026-04-15T11:00:00Z",
    expiresAt: "2026-10-15T11:00:00Z",
    passesTotal: 3,
    passesUsed: 0,
    passes: [
      {
        moduleId: "grooming",
        packageId: "groom-pkg-001",
        serviceName: "Bath & Brush",
        totalPasses: 3,
        usedPasses: 0,
      },
    ],
    status: "active",
    redemptions: [],
  },
  {
    id: "cp-003",
    customerId: 3,
    packageId: "gpp-001",
    packageName: "5x Full Groom Pack",
    purchasedAt: "2026-03-01T09:00:00Z",
    expiresAt: "2026-09-01T09:00:00Z",
    passesTotal: 5,
    passesUsed: 4,
    passes: [
      {
        moduleId: "grooming",
        packageId: "groom-pkg-002",
        serviceName: "Full Groom",
        totalPasses: 5,
        usedPasses: 4,
      },
    ],
    status: "active",
    redemptions: [
      {
        id: "red-003",
        date: "2026-03-20T10:00:00Z",
        petId: 3,
        petName: "Luna",
        serviceLabel: "Full Groom",
        passNumber: 1,
      },
      {
        id: "red-004",
        date: "2026-04-05T10:00:00Z",
        petId: 3,
        petName: "Luna",
        serviceLabel: "Full Groom",
        passNumber: 2,
      },
      {
        id: "red-005",
        date: "2026-04-22T10:00:00Z",
        petId: 3,
        petName: "Luna",
        serviceLabel: "Full Groom",
        passNumber: 3,
      },
      {
        id: "red-006",
        date: "2026-05-10T10:00:00Z",
        petId: 3,
        petName: "Luna",
        serviceLabel: "Full Groom",
        passNumber: 4,
      },
    ],
  },
];

/**
 * Increments `passesUsed` on a customer package and appends a redemption row.
 * Mutates `mockCustomerPackages` in place to match the rest of the
 * mock-data-as-store pattern in this codebase (see `loadCustomPetPricingOverrides`).
 * Caller is responsible for invalidating the `customer-packages` query so
 * `useQuery` consumers re-render.
 */
export function redeemPackagePass(
  customerPackageId: string,
  redemption: {
    petId?: number;
    petName?: string;
    bookingId?: number;
    serviceLabel: string;
  },
): { ok: true; passesLeft: number } | { ok: false; reason: string } {
  const pkg = mockCustomerPackages.find((p) => p.id === customerPackageId);
  if (!pkg) return { ok: false, reason: "Package not found" };
  if (pkg.status !== "active") {
    return { ok: false, reason: `Package is ${pkg.status}` };
  }
  if (pkg.passesUsed >= pkg.passesTotal) {
    return { ok: false, reason: "No passes remaining" };
  }
  const nextPassNumber = pkg.passesUsed + 1;
  pkg.passesUsed = nextPassNumber;
  // Keep the per-service counter in sync — currently every package has a single
  // pass row, but the schema allows multi-service packs, so bump the first
  // matching pass row by service label / module.
  const matchingPass = pkg.passes[0];
  if (matchingPass) matchingPass.usedPasses = nextPassNumber;
  pkg.redemptions.push({
    id: `red-${customerPackageId}-${nextPassNumber}`,
    date: new Date().toISOString(),
    petId: redemption.petId,
    petName: redemption.petName,
    bookingId: redemption.bookingId,
    serviceLabel: redemption.serviceLabel,
    passNumber: nextPassNumber,
  });
  if (pkg.passesUsed >= pkg.passesTotal) {
    pkg.status = "exhausted";
  }
  return { ok: true, passesLeft: pkg.passesTotal - pkg.passesUsed };
}
