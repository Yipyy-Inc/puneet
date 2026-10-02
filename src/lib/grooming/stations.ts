import type { GroomingStation, GroomingStationPetSize } from "@/types/rooms";

/**
 * True if the station can accept a pet of `size`. Empty allowedPetSizes (or
 * undefined) means multi-purpose — accepts every size.
 *
 * A lib of its own (2026-10-01): it lived in the stations SCREEN, so every
 * importer — the booking wizard among them — pulled that whole settings
 * screen into its module graph.
 */
export function isStationEligibleForPetSize(
  station: Pick<GroomingStation, "allowedPetSizes">,
  size: GroomingStationPetSize,
): boolean {
  if (!station.allowedPetSizes || station.allowedPetSizes.length === 0) {
    return true;
  }
  return station.allowedPetSizes.includes(size);
}
