/**
 * Multi-Location Loyalty Configuration
 *
 * Handles location-specific loyalty settings
 * Supports different configurations per location within a facility
 */

export type {
  LocationLoyaltyConfig,
  FacilityLoyaltyConfig,
} from "@/types/loyalty";

import type { FacilityLoyaltyConfig } from "@/types/loyalty";

import { getFacilityLoyaltyConfig } from "@/data/facility-loyalty-config";

/**
 * Get loyalty configuration for a specific location
 * Falls back to facility config if no location-specific config exists
 */
export function getLocationLoyaltyConfig(
  facilityId: number,
  locationId?: number,
): FacilityLoyaltyConfig | null {
  const facilityConfig = getFacilityLoyaltyConfig(facilityId);

  if (!facilityConfig || !facilityConfig.enabled) {
    return null;
  }

  // If no location specified, return facility config
  if (!locationId) {
    return facilityConfig;
  }

  // In production, check for location-specific config
  // For now, return facility config (all locations use same config)
  // In production, this would query:
  // SELECT * FROM location_loyalty_configs WHERE location_id = ? AND facility_id = ?

  return facilityConfig;
}

/**
 * Check if loyalty is enabled for a specific location
 */
export function isLoyaltyEnabledForLocation(
  facilityId: number,
  locationId?: number,
): boolean {
  const config = getLocationLoyaltyConfig(facilityId, locationId);
  return config !== null && config.enabled === true;
}

/**
 * Get effective loyalty config for location
 * Merges facility config with location overrides
 */
export function getEffectiveLoyaltyConfig(
  facilityId: number,
  locationId?: number,
): FacilityLoyaltyConfig | null {
  const facilityConfig = getLocationLoyaltyConfig(facilityId);

  if (!facilityConfig) {
    return null;
  }

  if (!locationId) {
    return facilityConfig;
  }

  // In production, merge location overrides with facility config
  // For now, return facility config
  return facilityConfig;
}
