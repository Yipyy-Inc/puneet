import {
  resolveEffectivePricing,
  type EffectivePricing,
} from "@/lib/api/grooming";
import {
  groomingSizeFor,
  type GroomingSizeTier,
} from "@/lib/grooming/size-tier";
import type { PetSize } from "@/types/base";
import type {
  CoatType,
  GroomingPackage,
  PetServicePricingOverride,
} from "@/types/grooming";
import type { Pet } from "@/types/pet";

// ============================================================================
// One pet's groom, as "Choose the groom" shows it and the estimate charges it
// (the client's mock, 2026-10-01):
//
//   Full Groom                                   ◷ 1h 30m
//   $85    Small base $75 · +$10 curly coat
//   S $75 · M $90 · L $110 · XL $135
//
// The SIZE is the facility's own bands (`groomingSizeFor`, the rule
// `create_booking` books by); the PRICE is `resolveEffectivePricing` — saved
// pet price, breed, groomer, size, coat, age — plus the matting surcharge when
// staff mark the coat matted; the MINUTES are the size's own, plus matting's.
// One function for the cards and the bill, so they cannot disagree.
// ============================================================================

export interface GroomPrice {
  /** The facility's size for this pet; null = base price and length. */
  size: PetSize | null;
  /** What the pet is charged for the groom, matting included. */
  price: number;
  /** The size's own price before any adjustment — "Small base $75". */
  sizePrice: number;
  /** The groom's length for this pet, matting included, add-ons not. */
  minutes: number;
  source: EffectivePricing["source"];
  coat?: { coatType: string; delta: number };
  age?: { label: string; delta: number };
  tier?: { tier: string; delta: number };
  /** Set when staff marked the coat matted. */
  matting?: { amount: number; minutes: number };
}

/** The matting surcharge and minutes this package charges. */
export function mattingFor(pkg: GroomingPackage): {
  amount: number;
  minutes: number;
} {
  return {
    amount: Math.max(0, Number(pkg.mattedSurchargeDefault ?? 0)),
    minutes: Math.max(0, Math.round(Number(pkg.mattedExtraMinutes ?? 0))),
  };
}

export function groomPrice(input: {
  pet: Pick<Pet, "id" | "weight" | "breed" | "coatType" | "age">;
  pkg: GroomingPackage;
  tiers: readonly GroomingSizeTier[];
  matted?: boolean;
  overrides?: readonly PetServicePricingOverride[];
}): GroomPrice {
  const { pet, pkg } = input;
  const size = groomingSizeFor(pet.weight, input.tiers);
  const pricing = resolveEffectivePricing({
    petId: pet.id,
    petSize: size ?? undefined,
    petBreed: pet.breed,
    // The pet's list and grooming's share every word but two (hairless;
    // double/matted), and those simply match no adjustment.
    petCoatType: pet.coatType as CoatType | undefined,
    petAgeMonths:
      typeof pet.age === "number"
        ? Math.max(0, Math.round(pet.age * 12))
        : undefined,
    package: pkg,
    petPricingOverrides: [...(input.overrides ?? [])],
  });
  const sizePrice =
    size && pkg.sizePricing[size] !== undefined
      ? pkg.sizePricing[size]!
      : pkg.basePrice;
  const matting = input.matted ? mattingFor(pkg) : undefined;
  return {
    size,
    price: pricing.price + (matting?.amount ?? 0),
    sizePrice,
    minutes: pricing.durationMin + (matting?.minutes ?? 0),
    source: pricing.source,
    ...(pricing.coatAdjustment ? { coat: pricing.coatAdjustment } : {}),
    ...(pricing.ageAdjustment
      ? {
          age: {
            label: pricing.ageAdjustment.label,
            delta: pricing.ageAdjustment.delta,
          },
        }
      : {}),
    ...(pricing.tierAdjustment ? { tier: pricing.tierAdjustment } : {}),
    ...(matting ? { matting } : {}),
  };
}

/** S $75 · M $90 · L $110 · XL $135 — each size this package prices. */
export function tierPrices(
  pkg: GroomingPackage,
): Array<{ size: PetSize; price: number }> {
  return (["small", "medium", "large", "giant"] as const).flatMap((size) =>
    pkg.sizePricing[size] !== undefined
      ? [{ size, price: pkg.sizePricing[size]! }]
      : [],
  );
}
