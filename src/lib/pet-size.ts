import type { Pet } from "@/types/pet";
import type { PetSize } from "@/types/base";

// Weight-to-size bucket thresholds (lbs). Standard industry tiers used across
// grooming and boarding: under 20 lb = small, 20–40 = medium, 40–80 = large,
// 80+ = giant. Edges align with the GroomingPackage.sizePricing buckets.
export function getPetSize(pet: Pet): PetSize {
  const w = pet.weight ?? 0;
  if (w < 20) return "small";
  if (w < 40) return "medium";
  if (w < 80) return "large";
  return "giant";
}

/**
 * Returns true when at least one of the client's pets falls into one of the
 * allowed sizes. An empty/undefined `eligibleSizes` means "no restriction"
 * and always returns true.
 */
export function petsMatchEligibleSizes(
  pets: Pet[],
  eligibleSizes: PetSize[] | undefined,
): boolean {
  if (!eligibleSizes || eligibleSizes.length === 0) return true;
  if (pets.length === 0) return true; // No pet context yet — don't pre-hide.
  return pets.some((p) => eligibleSizes.includes(getPetSize(p)));
}
