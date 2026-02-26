export const facilityConfig = {
  services: {
    boarding: {
      enabled: true,
      status: "available",
      description: "Overnight pet boarding services",
    },
    daycare: {
      enabled: true,
      status: "available",
      description: "Daytime pet daycare services",
    },
    grooming: {
      enabled: true,
      status: "available",
      description: "Pet grooming and styling services",
    },
  },
  pricing: {
    enforceOnAll: false,
    defaultPricing: {
      boarding: { basePrice: 50, additionalPet: 25 },
      daycare: { basePrice: 30, additionalPet: 15 },
      grooming: { basePrice: 40, additionalPet: 20 },
    },
    taxSettings: {
      taxRate: 0.08, // 8%
      taxIncluded: false,
      taxRegions: [
        { region: "US-CA", rate: 0.085 },
        { region: "US-NY", rate: 0.08875 },
      ],
    },
  },
  bookingRules: {
    enforceOnAll: false,
    cutOffTimes: {
      boarding: 24, // hours before check-in
      daycare: 2, // hours before start
      grooming: 4, // hours before appointment
    },
    deposits: {
      required: true,
      percentage: 0.5, // 50% deposit
      refundable: false,
    },
    cancellationPolicies: {
      freeCancellationHours: 24,
      lateCancellationFee: 0.25, // 25% of booking value
      noShowFee: 0.5, // 50% of booking value
    },
  },
  checkInOutTimes: {
    defaultSchedules: {
      checkIn: { boarding: "14:00", daycare: "07:00" },
      checkOut: { boarding: "11:00", daycare: "18:00" },
    },
    operatingHours: {
      monday: { open: "06:00", close: "22:00" },
      tuesday: { open: "06:00", close: "22:00" },
      wednesday: { open: "06:00", close: "22:00" },
      thursday: { open: "06:00", close: "22:00" },
      friday: { open: "06:00", close: "22:00" },
      saturday: { open: "07:00", close: "20:00" },
      sunday: { open: "08:00", close: "18:00" },
    },
  },
  vaccinationRequirements: {
    mandatoryRecords: true,
    requiredVaccinations: [
      { name: "Rabies", required: true, frequency: "annual" },
      { name: "DHPP", required: true, frequency: "annual" },
      { name: "Bordetella", required: true, frequency: "annual" },
      { name: "Leptospirosis", required: false, frequency: "annual" },
    ],
    documentationRequired: true,
  },
  userRoles: {
    defaultPermissions: {
      admin: {
        manageUsers: true,
        manageBookings: true,
        viewReports: true,
        manageSettings: true,
      },
      manager: {
        manageUsers: false,
        manageBookings: true,
        viewReports: true,
        manageSettings: false,
      },
      staff: {
        manageUsers: false,
        manageBookings: true,
        viewReports: false,
        manageSettings: false,
      },
      customer: {
        manageUsers: false,
        manageBookings: false,
        viewReports: false,
        manageSettings: false,
      },
    },
  },
  staffScheduling: {
    configurationOptions: {
      maxHoursPerDay: 8,
      maxHoursPerWeek: 40,
      breakTime: 30, // minutes
      overtimeRate: 1.5,
      shiftTypes: ["morning", "afternoon", "evening", "overnight"],
    },
  },
  petCategories: {
    weightLimits: {
      small: { min: 0, max: 15 }, // lbs
      medium: { min: 16, max: 50 },
      large: { min: 51, max: 100 },
      extraLarge: { min: 101, max: Infinity },
    },
    sizeLimits: {
      daycare: { maxWeight: 50, maxSize: "medium" },
      boarding: { maxWeight: 100, maxSize: "large" },
    },
    breedRestrictions: {
      restrictedBreeds: ["Pit Bull", "Rottweiler", "Doberman"],
      allowedWithApproval: ["German Shepherd", "Boxer"],
    },
  },
  customFields: {
    pets: [
      { name: "Microchip Number", type: "text", required: false },
      { name: "Favorite Toy", type: "text", required: false },
      { name: "Special Needs", type: "textarea", required: false },
    ],
    customers: [
      { name: "Emergency Contact", type: "text", required: true },
      {
        name: "Preferred Communication",
        type: "select",
        options: ["Email", "Phone", "SMS"],
        required: false,
      },
    ],
    bookings: [
      { name: "Special Instructions", type: "textarea", required: false },
      { name: "Transportation Needed", type: "boolean", required: false },
    ],
  },
  reports: {
    defaultDashboardLayouts: {
      overview: ["totalBookings", "revenue", "activeClients"],
      detailed: ["bookingTrends", "servicePopularity", "staffPerformance"],
    },
  },
  waiversAndContracts: {
    templates: {
      liabilityWaiver: {
        name: "Pet Care Liability Waiver",
        required: true,
        content: "Standard liability waiver text...",
      },
      boardingContract: {
        name: "Boarding Service Agreement",
        required: true,
        content: "Boarding contract terms...",
      },
      daycareAgreement: {
        name: "Daycare Service Agreement",
        required: true,
        content: "Daycare agreement terms...",
      },
    },
  },
  careInstructions: {
    enabled: true,
    customerEditableFields: {
      feedingSchedule: true,
      feedingAmount: true,
      medicationList: true,
      groomingSensitivities: true,
      behaviorNotes: true,
    },
  },
};
