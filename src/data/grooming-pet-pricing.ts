// Saved per-pet pricing overrides — see PetServicePricingOverride in
// @/types/grooming. These pre-fill the price and duration on the next
// booking for that pet, eliminating the need to remember manual adjustments.

import type { PetServicePricingOverride } from "@/types/grooming";

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

export const petServicePricing: PetServicePricingOverride[] = [
  // Buddy (petId 1) — Golden Retriever, Full Groom. Coat runs heavier than
  // the standard large-dog price, so we charge $95 instead of the size
  // default and add 15 extra minutes.
  {
    id: "psp-001",
    petId: 1,
    packageId: "groom-pkg-002",
    customPrice: 95,
    customDurationMin: 135,
    note: "Heavier coat than typical Golden — extra brushing time built in.",
    createdBy: "Jessica Martinez",
    createdAt: daysAgo(42),
  },
  // Charlie (petId 14) — Beagle, Basic Bath. Quick wash, slight discount.
  {
    id: "psp-002",
    petId: 14,
    packageId: "groom-pkg-001",
    customPrice: 42,
    note: "Quick bath, no extra fuss — recurring customer.",
    createdBy: "Marcus Thompson",
    createdAt: daysAgo(90),
  },
];
