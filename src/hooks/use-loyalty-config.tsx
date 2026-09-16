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
import { useFacilitySettings } from "@/lib/api/facility-settings";
import { usePermission } from "@/hooks/use-facility-rbac";
import { isReferralProgramEnabled } from "@/lib/loyalty/referral-program";
import type { FacilityLoyaltyConfig, RewardTypeConfig } from "@/types/loyalty";

// Mock settings - TODO: Replace with actual useSettings hook
interface _MockSettings {
  selectedFacility: { id: number } | null;
  userRole: string;
  userPermissions: string[];
}

interface UseLoyaltyConfigResult {
  // Configuration state
  isEnabled: boolean;
  config: FacilityLoyaltyConfig | null;

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
  getLocationConfig: (locationId?: number) => FacilityLoyaltyConfig | null;
}

/**
 * Hook to get loyalty configuration for current facility
 * Respects multi-location, permissions, and modular design
 */
export function useLoyaltyConfig(locationId?: number): UseLoyaltyConfigResult {
  // TODO: Replace with actual useSettings hook
  // For now, use mock data
  const selectedFacility = useMemo<{ id: number } | null>(
    () => ({ id: 1 }),
    [],
  ); // Mock

  // ── WHETHER THE PROGRAMME IS ON IS THE FACILITY'S ANSWER ────────────────
  //
  // `enabled` comes from the `loyalty_config` settings domain — the same row
  // the Loyalty settings screen writes. It used to come from
  // getFacilityLoyaltyConfig(1): the fixture for facility 1, so a facility that
  // had switched loyalty OFF still saw every loyalty screen, and one that had
  // switched it on saw whatever the fixture said.
  //
  // `config` below is still the fixture shape. No consumer reads it (they read
  // isEnabled, the feature flags and the permissions), and the stored
  // programme is a different type — swapping it is the rest of making loyalty
  // real, not the switch. Debt map.
  const { settings } = useFacilitySettings();
  const isEnabled = settings.loyalty_config.value.enabled === true;

  const config = useMemo(() => {
    if (!selectedFacility) return null;
    return getFacilityLoyaltyConfig(selectedFacility.id);
  }, [selectedFacility]);

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

  // ── THE VIEWER'S OWN GRANTS, NOT A ROLE THIS HOOK INVENTED ──────────────
  //
  // This was a table keyed on `userRole = "facility_admin"`, hard-coded two
  // lines above it — so every caller, whatever their role, was handed the full
  // set. `usePermission` is the same check the sidebar and the route guards
  // make, and the keys are the marketing catalogue's own.
  const canManageLoyalty = usePermission("marketing_manage_loyalty");
  const canViewAnalytics = usePermission("marketing_view_analytics");
  const canViewMarketing = usePermission("marketing_view");
  const canManageReferrals = usePermission("marketing_manage_referrals");

  const permissions = useMemo(
    () => ({
      // Whoever may manage the programme may obviously see it.
      canViewLoyalty: canViewMarketing || canManageLoyalty,
      canManageLoyalty,
      canViewReports: canViewAnalytics || canManageLoyalty,
      canManageRewards: canManageLoyalty,
      canManageReferrals,
    }),
    [canViewMarketing, canManageLoyalty, canViewAnalytics, canManageReferrals],
  );

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
      rewardsEnabled:
        config.rewardTypes &&
        config.rewardTypes.some((rt: RewardTypeConfig) => rt.enabled),
      referralsEnabled: isReferralProgramEnabled(config),
      expirationEnabled: config.pointsExpiration?.enabled === true,
    };
  }, [config, isEnabled]);

  // Get location-specific config
  const getLocationConfig = useMemo(() => {
    return (_targetLocationId?: number) => {
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
  config: FacilityLoyaltyConfig | null;
} {
  const { isEnabled, config, features } = useLoyaltyConfig();

  return {
    canViewLoyalty: isEnabled && features.pointsEnabled,
    canRedeemRewards: isEnabled && features.rewardsEnabled,
    canViewReferrals: isEnabled && features.referralsEnabled,
    config: isEnabled ? config : null,
  };
}
