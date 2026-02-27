/**
 * Loyalty Configuration Hook
 * 
 * Provides facility-specific loyalty configuration with:
 * - Multi-location support
 * - Role-based permissions
 * - Modular enable/disable
 * - Scalable SaaS architecture
 */

import { useMemo } from "react";
import { getFacilityLoyaltyConfig } from "@/data/facility-loyalty-config";

// Mock settings - TODO: Replace with actual useSettings hook
interface MockSettings {
  selectedFacility: { id: number } | null;
  userRole: string;
  userPermissions: string[];
}

interface UseLoyaltyConfigResult {
  // Configuration state
  isEnabled: boolean;
  config: any | null;
  
  // Location awareness
  isEnabledForLocation: (locationId?: number) => boolean;
  
  // Permission checks
  canViewLoyalty: boolean;
  canManageLoyalty: boolean;
  canViewReports: boolean;
  canManageRewards: boolean;
  canManageReferrals: boolean;
  
  // Feature flags
  features: {
    pointsEnabled: boolean;
    tiersEnabled: boolean;
    rewardsEnabled: boolean;
    referralsEnabled: boolean;
    expirationEnabled: boolean;
  };
  
  // Location-specific config
  getLocationConfig: (locationId?: number) => any | null;
}

/**
 * Hook to get loyalty configuration for current facility
 * Respects multi-location, permissions, and modular design
 */
export function useLoyaltyConfig(locationId?: number): UseLoyaltyConfigResult {
  // TODO: Replace with actual useSettings hook
  // For now, use mock data
  const selectedFacility: { id: number } | null = { id: 1 }; // Mock
  const userRole = "facility_admin"; // Mock
  const userPermissions: string[] = []; // Mock

  // Get facility loyalty config
  const config = useMemo(() => {
    if (!selectedFacility) return null;
    return getFacilityLoyaltyConfig(selectedFacility.id);
  }, [selectedFacility]);

  // Check if loyalty is enabled at facility level
  const isEnabled = useMemo(() => {
    if (!config) return false;
    return config.enabled === true;
  }, [config]);

  // Check if enabled for specific location
  const isEnabledForLocation = useMemo(() => {
    return (targetLocationId?: number) => {
      if (!isEnabled || !config) return false;
      
      // If no location specified, check facility default
      if (!targetLocationId && !locationId) return isEnabled;
      
      // In production, check location-specific settings
      // For now, if loyalty is enabled at facility level, it's enabled for all locations
      return isEnabled;
    };
  }, [isEnabled, config, locationId]);

  // Permission checks
  const permissions = useMemo(() => {
    // Default permissions based on role
    const rolePermissions: Record<string, {
      canViewLoyalty: boolean;
      canManageLoyalty: boolean;
      canViewReports: boolean;
      canManageRewards: boolean;
      canManageReferrals: boolean;
    }> = {
      facility_admin: {
        canViewLoyalty: true,
        canManageLoyalty: true,
        canViewReports: true,
        canManageRewards: true,
        canManageReferrals: true,
      },
      manager: {
        canViewLoyalty: true,
        canManageLoyalty: true,
        canViewReports: true,
        canManageRewards: true,
        canManageReferrals: true,
      },
      staff: {
        canViewLoyalty: true,
        canManageLoyalty: false,
        canViewReports: true,
        canManageRewards: false,
        canManageReferrals: false,
      },
      front_desk: {
        canViewLoyalty: true,
        canManageLoyalty: false,
        canViewReports: false,
        canManageRewards: false,
        canManageReferrals: false,
      },
    };

    const defaultPermissions = rolePermissions[userRole || "staff"] || rolePermissions.staff;

    // In production, check actual permissions from userPermissions
    // For now, use role-based defaults
    return defaultPermissions;
  }, [userRole, userPermissions]);

  // Feature flags from config
  const features = useMemo(() => {
    if (!config || !isEnabled) {
      return {
        pointsEnabled: false,
        tiersEnabled: false,
        rewardsEnabled: false,
        referralsEnabled: false,
        expirationEnabled: false,
      };
    }

    return {
      pointsEnabled: config.pointsEarning ? true : false,
      tiersEnabled: config.tiers && config.tiers.length > 0,
      rewardsEnabled: config.rewardTypes && config.rewardTypes.some((rt: any) => rt.enabled),
      referralsEnabled: config.referralProgram?.enabled === true,
      expirationEnabled: config.pointsExpiration?.enabled === true,
    };
  }, [config, isEnabled]);

  // Get location-specific config
  const getLocationConfig = useMemo(() => {
    return (targetLocationId?: number) => {
      if (!config || !isEnabled) return null;
      
      // In production, this would fetch location-specific overrides
      // For now, return facility config
      return config;
    };
  }, [config, isEnabled]);

  return {
    isEnabled,
    config,
    isEnabledForLocation,
    ...permissions,
    features,
    getLocationConfig,
  };
}

/**
 * Hook to check if loyalty module is available
 * Used for conditional rendering
 */
export function useLoyaltyModuleAvailable(): boolean {
  const { isEnabled } = useLoyaltyConfig();
  return isEnabled;
}

/**
 * Hook for customer-facing loyalty features
 * Checks if customer can see/use loyalty features
 */
export function useCustomerLoyaltyAccess(): {
  canViewLoyalty: boolean;
  canRedeemRewards: boolean;
  canViewReferrals: boolean;
  config: any | null;
} {
  const { isEnabled, config, features } = useLoyaltyConfig();

  return {
    canViewLoyalty: isEnabled && features.pointsEnabled,
    canRedeemRewards: isEnabled && features.rewardsEnabled,
    canViewReferrals: isEnabled && features.referralsEnabled,
    config: isEnabled ? config : null,
  };
}
