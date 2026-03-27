/**
 * Grooming Workflow - Phase 1: Pre-Booking Validation
 *
 * This module handles facility configuration checks that occur BEFORE
 * the customer sees any booking options. All validation is invisible to the customer.
 */

export type {
  GroomerSelectionMode,
  GroomingServiceCategory,
  GroomingBookingRules,
  GroomingFacilityConfig,
  GroomingPreBookingValidation,
} from "@/types/grooming";
export type { DepositType } from "@/types/base";

import type {
  GroomingBookingRules,
  GroomingFacilityConfig,
  GroomingPreBookingValidation,
} from "@/types/grooming";

/**
 * Default grooming configuration
 * This would typically come from the facility's settings in production
 */
export const defaultGroomingConfig: GroomingFacilityConfig = {
  enabled: true,
  bookingRules: {
    leadTime: {
      minimumHours: 24, // 24 hours for salon
      allowSameDay: false,
      allowTomorrow: true,
    },
    groomerSelection: {
      mode: "optional",
      tiers: [
        {
          id: "senior",
          name: "Senior Stylist",
          description: "Experienced groomer",
        },
        {
          id: "junior",
          name: "Junior Stylist",
          description: "Entry-level groomer",
        },
      ],
    },
    deposit: {
      type: "percentage",
      percentage: 25, // 25% deposit
      refundable: true,
      requiredAtBooking: true,
    },
    serviceVisibility: {
      categories: [
        { id: "full-groom", name: "Full Groom", enabled: true },
        { id: "bath-only", name: "Bath Only", enabled: true },
        {
          id: "haircut",
          name: "Haircut",
          enabled: true,
          hiddenWhenFullyBooked: true,
          fullyBookedWeeksThreshold: 2,
        },
        { id: "nail-trim", name: "Nail Trim", enabled: true },
        { id: "de-shed", name: "De-Shedding", enabled: true },
      ],
      hideFullyBookedCategories: true,
    },
    vaccination: {
      requireRecordsBeforeBooking: true, // Blocks booking until staff approves
      requiredVaccines: ["Rabies", "DHPP", "Bordetella"],
    },
  },
  operatingHours: {
    monday: { open: "09:00", close: "18:00" },
    tuesday: { open: "09:00", close: "18:00" },
    wednesday: { open: "09:00", close: "18:00" },
    thursday: { open: "09:00", close: "18:00" },
    friday: { open: "09:00", close: "18:00" },
    saturday: { open: "09:00", close: "17:00" },
    sunday: { open: "10:00", close: "16:00" },
  },
  serviceTypes: {
    salon: true,
    mobile: false,
  },
};

/**
 * Pre-Booking Validation Results
 * These are computed BEFORE the customer sees any booking options
 */

/**
 * Validates grooming booking rules BEFORE customer sees booking options
 * This is the "invisible" pre-booking validation
 *
 * @param config - Facility grooming configuration
 * @param requestedDate - Date customer wants to book (optional, for validation)
 * @returns Validation results
 */
export function validateGroomingPreBooking(
  config: GroomingFacilityConfig,
  requestedDate?: Date,
): GroomingPreBookingValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if grooming is enabled
  if (!config.enabled) {
    errors.push("Grooming service is not enabled for this facility");
    return {
      isAvailable: false,
      earliestAvailableDate: null,
      availableCategories: [],
      groomerSelectionOptions: {
        mode: config.bookingRules.groomerSelection.mode,
        canSelectGroomer: false,
        canSelectTier: false,
        showGroomerNames: false,
      },
      depositInfo: {
        required: false,
        type: "none",
        message: "",
      },
      validationErrors: errors,
      validationWarnings: warnings,
    };
  }

  // Calculate earliest available date based on lead time
  const now = new Date();
  const minimumAdvanceTime =
    config.bookingRules.leadTime.minimumHours * 60 * 60 * 1000;
  let earliestDate = new Date(now.getTime() + minimumAdvanceTime);

  // Apply same-day/tomorrow rules
  if (!config.bookingRules.leadTime.allowSameDay) {
    // If same-day not allowed, move to tomorrow at minimum
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    if (earliestDate < tomorrow) {
      earliestDate = tomorrow;
    }
  }

  if (!config.bookingRules.leadTime.allowTomorrow) {
    // If tomorrow not allowed, move to day after tomorrow
    const dayAfterTomorrow = new Date(now);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    dayAfterTomorrow.setHours(0, 0, 0, 0);

    if (earliestDate < dayAfterTomorrow) {
      earliestDate = dayAfterTomorrow;
    }
  }

  // Validate requested date if provided
  if (requestedDate) {
    if (requestedDate < earliestDate) {
      errors.push(
        `Requested date is too soon. Minimum advance booking: ${config.bookingRules.leadTime.minimumHours} hours`,
      );
    }
  }

  // Filter available service categories
  const availableCategories =
    config.bookingRules.serviceVisibility.categories.filter(
      (category) => category.enabled,
    );

  // TODO: In production, check if categories are fully booked and hide them
  // For now, we just filter by enabled status
  // const fullyBookedCategories = await checkFullyBookedCategories(config);
  // const visibleCategories = availableCategories.filter(
  //   (cat) => !cat.hiddenWhenFullyBooked || !fullyBookedCategories.includes(cat.id)
  // );

  // Determine groomer selection options based on mode
  const groomerSelection = config.bookingRules.groomerSelection;
  const groomerSelectionOptions = {
    mode: groomerSelection.mode,
    canSelectGroomer:
      groomerSelection.mode === "optional" ||
      groomerSelection.mode === "full-choice",
    canSelectTier:
      groomerSelection.mode === "tier-only" ||
      groomerSelection.mode === "optional",
    showGroomerNames: groomerSelection.mode === "full-choice",
    tiers: groomerSelection.tiers,
  };

  // Calculate deposit information
  const depositInfo = {
    required: config.bookingRules.deposit.type !== "none",
    type: config.bookingRules.deposit.type,
    amount: config.bookingRules.deposit.amount,
    percentage: config.bookingRules.deposit.percentage,
    message: generateDepositMessage(config.bookingRules.deposit),
  };

  return {
    isAvailable: true,
    earliestAvailableDate: earliestDate,
    availableCategories,
    groomerSelectionOptions,
    depositInfo,
    validationErrors: errors,
    validationWarnings: warnings,
  };
}

/**
 * Generates a customer-facing message about deposit requirements
 */
function generateDepositMessage(
  deposit: GroomingBookingRules["deposit"],
): string {
  if (deposit.type === "none") {
    return "";
  }

  if (deposit.type === "fixed" && deposit.amount) {
    return `A $${deposit.amount.toFixed(2)} deposit is required to secure your appointment.`;
  }

  if (deposit.type === "percentage" && deposit.percentage) {
    return `A ${deposit.percentage}% deposit is required to secure your appointment.`;
  }

  return "A deposit is required to secure your appointment.";
}

/**
 * Checks if a date is within facility operating hours
 */
export function isWithinOperatingHours(
  date: Date,
  config: GroomingFacilityConfig,
): boolean {
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dayName = dayNames[date.getDay()] as keyof typeof config.operatingHours;
  const hours = config.operatingHours[dayName];

  if (!hours) return false;

  const timeString = date.toTimeString().slice(0, 5); // HH:mm format
  return timeString >= hours.open && timeString <= hours.close;
}

/**
 * Gets the next available booking slot based on configuration
 */
export function getNextAvailableBookingSlot(
  config: GroomingFacilityConfig,
): Date | null {
  const validation = validateGroomingPreBooking(config);

  if (!validation.isAvailable || !validation.earliestAvailableDate) {
    return null;
  }

  let candidateDate = validation.earliestAvailableDate;

  // Find next slot within operating hours
  const maxAttempts = 14; // Try up to 2 weeks ahead
  let attempts = 0;

  while (attempts < maxAttempts) {
    if (isWithinOperatingHours(candidateDate, config)) {
      return candidateDate;
    }

    // Move to next day and try again
    candidateDate = new Date(candidateDate);
    candidateDate.setDate(candidateDate.getDate() + 1);
    candidateDate.setHours(9, 0, 0, 0); // Default to 9 AM
    attempts++;
  }

  return null;
}
