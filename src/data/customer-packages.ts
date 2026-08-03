import type { CustomerPackage } from "@/types/packages";

// ============================================================================
// A TYPE FILE NOW. The fixture and its mutator are gone.
//
// `mockCustomerPackages` held four purchases and `redeemPackagePass` spent
// them by mutating the array in place. Both are replaced by
// /api/packages/owned and the `redeem_package_pass` RPC.
//
// Two things the fixture could not do, which is why it went rather than being
// repointed:
//
//   - It kept the used-count in THREE places -- `passesUsed`,
//     `passes[].usedPasses`, and the length of `redemptions[]` -- updated by
//     hand on every redemption. The shape below still carries all three
//     because six screens read them; the mapper now fills all three from one
//     derived number, so they cannot disagree.
//
//   - Three of its four purchases belonged to clients 1, 2 and 3, who do not
//     exist. Seeding them would have meant inventing three households
//     (20260806360000).
// ============================================================================

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
