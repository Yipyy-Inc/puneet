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
