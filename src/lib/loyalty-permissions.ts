/**
 * Loyalty & Referral Permissions System
 * 
 * Role-based permission checks for loyalty features
 * Fully configurable per facility
 */

export type LoyaltyPermission =
  | "loyalty.view"
  | "loyalty.manage"
  | "loyalty.reports.view"
  | "loyalty.reports.export"
  | "loyalty.rewards.manage"
  | "loyalty.rewards.issue"
  | "loyalty.rewards.redeem"
  | "loyalty.points.adjust"
  | "loyalty.referrals.manage"
  | "loyalty.referrals.view"
  | "loyalty.settings.manage";

export interface LoyaltyPermissionConfig {
  facilityId: number;
  locationId?: number; // Optional: location-specific permissions
  rolePermissions: Record<string, LoyaltyPermission[]>;
  customPermissions?: Record<string, LoyaltyPermission[]>; // User-specific overrides
}

/**
 * Default role permissions for loyalty features
 */
export const defaultLoyaltyPermissions: Record<string, LoyaltyPermission[]> = {
  facility_admin: [
    "loyalty.view",
    "loyalty.manage",
    "loyalty.reports.view",
    "loyalty.reports.export",
    "loyalty.rewards.manage",
    "loyalty.rewards.issue",
    "loyalty.rewards.redeem",
    "loyalty.points.adjust",
    "loyalty.referrals.manage",
    "loyalty.referrals.view",
    "loyalty.settings.manage",
  ],
  manager: [
    "loyalty.view",
    "loyalty.manage",
    "loyalty.reports.view",
    "loyalty.rewards.manage",
    "loyalty.rewards.issue",
    "loyalty.rewards.redeem",
    "loyalty.referrals.view",
    "loyalty.referrals.manage",
  ],
  staff: [
    "loyalty.view",
    "loyalty.reports.view",
    "loyalty.rewards.redeem",
    "loyalty.referrals.view",
  ],
  front_desk: [
    "loyalty.view",
    "loyalty.rewards.redeem",
  ],
  customer: [
    "loyalty.view",
    "loyalty.rewards.redeem",
    "loyalty.referrals.view",
  ],
};

/**
 * Check if user has specific loyalty permission
 */
export function hasLoyaltyPermission(
  userRole: string,
  permission: LoyaltyPermission,
  customPermissions?: Record<string, LoyaltyPermission[]>
): boolean {
  // Check custom permissions first
  if (customPermissions && customPermissions[userRole]) {
    return customPermissions[userRole].includes(permission);
  }

  // Check default role permissions
  const rolePermissions = defaultLoyaltyPermissions[userRole] || [];
  return rolePermissions.includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getLoyaltyPermissionsForRole(
  userRole: string,
  customPermissions?: Record<string, LoyaltyPermission[]>
): LoyaltyPermission[] {
  // Merge custom with default
  const defaultPerms = defaultLoyaltyPermissions[userRole] || [];
  const customPerms = customPermissions?.[userRole] || [];
  
  // Combine and deduplicate
  return Array.from(new Set([...defaultPerms, ...customPerms]));
}

/**
 * Check if loyalty feature is enabled for facility
 */
export function isLoyaltyEnabledForFacility(
  facilityId: number,
  locationId?: number
): boolean {
  // In production, this would check database
  // For now, check if config exists and is enabled
  const { getFacilityLoyaltyConfig } = require("@/data/facility-loyalty-config");
  const config = getFacilityLoyaltyConfig(facilityId);
  
  if (!config) return false;
  if (!config.enabled) return false;
  
  // Check location-specific settings if locationId provided
  if (locationId) {
    // In production, check location-specific config
    // For now, if facility is enabled, all locations are enabled
    return true;
  }
  
  return true;
}

/**
 * Check if user can access loyalty features
 */
export function canAccessLoyalty(
  userRole: string,
  facilityId: number,
  locationId?: number
): boolean {
  // Check if loyalty is enabled for facility/location
  if (!isLoyaltyEnabledForFacility(facilityId, locationId)) {
    return false;
  }

  // Check if user has view permission
  return hasLoyaltyPermission(userRole, "loyalty.view");
}
