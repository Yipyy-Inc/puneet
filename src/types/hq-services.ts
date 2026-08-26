import type { GroomingPackage } from "@/types/grooming";
import type { PetSize } from "@/types/base";

// ============================================================================
// A grooming service's real per-location price overrides, for HQ Services.
// `grooming_service_size_prices.location_id` already carries this — see
// src/lib/api/mappers/grooming.ts's `perLocationSizePricing`. An extension of
// `GroomingPackage`, not a change to it: every other grooming screen keeps
// reading `sizePricing` (the facility-wide or single-branch effective view)
// exactly as before.
// ============================================================================

export interface HqLocationPricing {
  locationId: string;
  sizePricing: Partial<Record<PetSize, number>>;
}

export interface HqGroomingService extends GroomingPackage {
  locationPricing: HqLocationPricing[];
}
