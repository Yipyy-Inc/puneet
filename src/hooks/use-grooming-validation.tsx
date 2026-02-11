"use client";

import { useMemo, useState, useEffect } from "react";
import {
  type GroomingFacilityConfig,
  type GroomingPreBookingValidation,
  validateGroomingPreBooking,
  getNextAvailableBookingSlot,
  defaultGroomingConfig,
} from "@/lib/grooming-config";
import { useSettings } from "@/hooks/use-settings";

/**
 * Hook for grooming pre-booking validation
 * 
 * This hook performs Phase 1 validation (invisible to customer):
 * - Checks facility configuration
 * - Validates lead times
 * - Determines available service categories
 * - Calculates deposit requirements
 * - Determines groomer selection options
 * 
 * All validation happens BEFORE the customer sees any booking options.
 */
export function useGroomingValidation(requestedDate?: Date) {
  const { grooming } = useSettings();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get grooming config from settings
  // TODO: In production, this would come from the facility's actual settings
  // For now, we use the default config but can be overridden by facility settings
  const groomingConfig: GroomingFacilityConfig = useMemo(() => {
    // Merge facility settings with default config
    // This is where you'd integrate with actual facility settings API
    return {
      ...defaultGroomingConfig,
      enabled: grooming?.status?.disabled !== true,
      // Override with facility-specific settings if available
      bookingRules: {
        ...defaultGroomingConfig.bookingRules,
        // Facility can override lead time
        leadTime: {
          minimumHours: grooming?.bookingRules?.minimumAdvanceBookingHours ?? 
                        defaultGroomingConfig.bookingRules.leadTime.minimumHours,
          allowSameDay: grooming?.bookingRules?.allowSameDayBooking ?? 
                       defaultGroomingConfig.bookingRules.leadTime.allowSameDay,
          allowTomorrow: true, // Default to allowing tomorrow
        },
        // Facility can override deposit settings
        deposit: {
          type: grooming?.bookingRules?.depositRequired 
            ? (grooming.bookingRules.depositAmount 
                ? "fixed" 
                : "percentage")
            : "none",
          amount: grooming?.bookingRules?.depositAmount,
          percentage: grooming?.bookingRules?.depositPercentage,
          refundable: grooming?.bookingRules?.depositRefundable ?? true,
          requiredAtBooking: true,
        },
      },
    };
  }, [grooming, requestedDate]);

  // Perform pre-booking validation (only on client to avoid hydration issues)
  const validation: GroomingPreBookingValidation = useMemo(() => {
    if (!isMounted) {
      // Return a safe default during SSR
      return {
        isAvailable: false,
        earliestAvailableDate: null,
        availableCategories: [],
        groomerSelectionOptions: {
          mode: "stealth",
          canSelectGroomer: false,
          canSelectTier: false,
          showGroomerNames: false,
        },
        depositInfo: {
          required: false,
          type: "none",
          message: "",
        },
        validationErrors: [],
        validationWarnings: [],
      };
    }
    return validateGroomingPreBooking(groomingConfig, requestedDate);
  }, [groomingConfig, requestedDate, isMounted]);

  // Get next available booking slot (only on client)
  const nextAvailableSlot = useMemo(() => {
    if (!isMounted) return null;
    return getNextAvailableBookingSlot(groomingConfig);
  }, [groomingConfig, isMounted]);

  return {
    config: groomingConfig,
    validation,
    nextAvailableSlot,
    // Convenience getters
    isAvailable: validation.isAvailable,
    availableCategories: validation.availableCategories,
    groomerSelectionMode: validation.groomerSelectionOptions.mode,
    canSelectGroomer: validation.groomerSelectionOptions.canSelectGroomer,
    depositRequired: validation.depositInfo.required,
    depositMessage: validation.depositInfo.message,
  };
}
