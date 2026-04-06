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
  /** Form notification config: when to notify staff (in-app) and customer (email/SMS or in-app). */
  notifications: {
    forms: {
      staff: {
        newSubmission: true,
        redFlagAnswers: true,
        hasFileUpload: true,
      },
      customer: {
        submissionConfirmed: true,
        missingRequiredFormsReminder: true,
        formRejectedNeedsCorrection: true,
      },
    },
  },
  /** 7.1 Required forms before booking/approve/check-in (configurable per service). Form IDs from Form Builder. */
  formRequirements: {
    boarding: {
      beforeRequest: [] as string[], // Before customer can request a booking
      beforeApprove: [] as string[], // Before staff can approve a booking
      beforeCheckIn: [] as string[],
      ifMissing: "banner" as "block" | "banner", // Block step vs allow with "incomplete requirements" banner
    },
    daycare: {
      beforeRequest: [] as string[],
      beforeApprove: [] as string[],
      beforeCheckIn: [] as string[],
      ifMissing: "banner" as "block" | "banner",
    },
    grooming: {
      beforeRequest: [] as string[],
      beforeApprove: [] as string[],
      beforeCheckIn: [] as string[],
      ifMissing: "banner" as "block" | "banner",
    },
    training: {
      beforeRequest: [] as string[],
      beforeApprove: [] as string[],
      beforeCheckIn: [] as string[],
      ifMissing: "banner" as "block" | "banner",
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
    approvalWorkflow: {
      enabled: false, // If true, bookings require facility approval
      estimatedResponseTime: 24, // hours
      autoConfirmAfterHours: null, // Auto-confirm after X hours if no response (null = no auto-confirm)
    },
    /** If true, customer can reach Confirm even with missing forms; booking is "pending until requirements completed". If false, customer must complete required forms before Confirm. */
    allowBookingWithoutForms: true,
    tipping: {
      enabled: true,
      /** "percent" = suggest % of booking total; "fixed" = suggest fixed dollar amounts */
      mode: "percent" as "percent" | "fixed",
      percentSuggestions: [10, 15, 20],
      fixedSuggestions: [5, 10, 20],
      /** Index of suggestion to show as "Recommended" (0-based); null = none */
      recommendedIndex: 1,
      maxTipPercent: 50,
      maxTipAmount: 500,
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
  messaging: {
    officeHours: {
      enabled: true,
      responseTimeExpectation:
        "We typically respond within 24 hours during business days",
      awayMessage:
        "We're currently away. We'll respond to your message as soon as we're back!",
      autoReplyEnabled: true,
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
    photoSharing: {
      enabled: true,
      allowDownload: true,
      allowShare: true,
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
  training: {
    makeupSessions: {
      enabled: true,
      pricingRules: {
        type: "fixed", // "fixed" | "percentage" | "per_session"
        fixedPrice: 40, // If type is "fixed"
        percentageOfSeries: null, // If type is "percentage" (e.g., 0.15 for 15%)
        perSessionPrice: null, // If type is "per_session"
      },
      expirationRules: {
        enabled: true,
        mustScheduleWithinDays: 30, // Must schedule makeup within 30 days of missed session
        expiresAfterDays: 60, // Makeup credit expires after 60 days if not used
      },
      cancellationPolicy:
        "Free cancellation up to 24 hours before makeup session",
      refundPolicy: "Makeup sessions are non-refundable once scheduled",
    },
    courseDetails: {
      defaultWhatToBring: [
        "Your dog on a 6-foot leash",
        "High-value treats (small, soft, easy to swallow)",
        "Your dog's favorite toy (optional)",
        "Water bottle for your dog",
        "Waste bags",
      ],
      defaultCancellationPolicy:
        "Free cancellation up to 48 hours before the series starts. After that, a 25% cancellation fee applies. No refunds after the series begins.",
      defaultRefundPolicy:
        "Full refund if cancelled 48+ hours before series start. 75% refund if cancelled 24-48 hours before. No refunds after series begins or if any sessions have been attended.",
    },
  },

  // ── Pricing rules ──────────────────────────────────────────────
  pricingRules: {
    discountStacking: "best_only" as "best_only" | "apply_all_sequence",
    multiPetDiscounts: [
      {
        id: "mpd-001",
        name: "Multi-Pet Boarding Discount",
        applicableServices: ["boarding"],
        isActive: true,
        discountType: "additional_pet" as const,
        sameLodging: false,
        tiers: [
          { petCount: 2, discountAmount: 5 },
          { petCount: 3, discountAmount: 10 },
        ],
      },
      {
        id: "mpd-002",
        name: "Multi-Pet Daycare Discount",
        applicableServices: ["daycare"],
        isActive: true,
        discountType: "per_pet" as const,
        sameLodging: false,
        tiers: [{ petCount: 2, discountAmount: 3 }],
      },
    ],
    latePickupFees: [
      {
        id: "late-pickup-default",
        name: "Late Pickup Fee",
        enabled: true,
        condition: "late_pickup" as const,
        graceMinutes: 15,
        feeType: "per_30min" as const,
        amount: 10,
        maxFee: 50,
        scope: "per_pet" as const,
        basedOn: "business_hours" as const,
        applicableServices: ["boarding", "daycare"],
      },
      {
        id: "early-dropoff-default",
        name: "Early Drop-off Fee",
        enabled: false,
        condition: "early_dropoff" as const,
        graceMinutes: 30,
        feeType: "flat" as const,
        amount: 15,
        scope: "per_booking" as const,
        basedOn: "business_hours" as const,
        applicableServices: ["boarding", "daycare"],
      },
    ],
    exceed24Hour: {
      id: "exceed-24h-default",
      name: "24-Hour Overflow",
      enabled: false,
      amount: 25,
      scope: "per_pet" as const,
      description:
        "One-time fee per pet when a boarding stay exceeds the 24-hour period",
    },
    customFees: [
      {
        id: "custom-fee-001",
        name: "Holiday Surcharge",
        description:
          "Applied during major holidays (Christmas, Thanksgiving, July 4th)",
        amount: 15,
        feeType: "flat" as const,
        scope: "per_pet" as const,
        autoApply: "none" as const,
        applicableServices: ["boarding", "daycare"],
        isActive: true,
      },
      {
        id: "custom-fee-002",
        name: "After-Hours Pickup",
        description: "Pickup requested outside regular business hours",
        amount: 20,
        feeType: "flat" as const,
        scope: "per_booking" as const,
        autoApply: "none" as const,
        applicableServices: ["boarding", "daycare"],
        isActive: true,
      },
      {
        id: "custom-fee-003",
        name: "Medication Administration",
        description:
          "Fee for administering prescription medication during stay",
        amount: 10,
        feeType: "flat" as const,
        scope: "per_pet" as const,
        autoApply: "none" as const,
        applicableServices: ["boarding", "daycare"],
        isActive: true,
      },
    ],
    multiNightDiscounts: [
      {
        id: "mnd-001",
        name: "Extended Stay Discount",
        minNights: 7,
        maxNights: null,
        discountPercent: 10,
        isActive: true,
      },
      {
        id: "mnd-002",
        name: "3-Night Deal",
        minNights: 3,
        maxNights: 6,
        discountPercent: 5,
        isActive: false,
      },
    ],
    peakDateSurcharges: [
      {
        id: "pds-001",
        name: "Summer Peak",
        startDate: "2026-06-15",
        endDate: "2026-09-05",
        surchargePercent: 20,
        isActive: true,
        dateMode: "specific" as const,
        surchargeType: "percentage" as const,
        scope: "per_each_pet" as const,
        applicableServices: ["boarding", "daycare"],
      },
      {
        id: "pds-002",
        name: "Holiday Season",
        startDate: "2025-12-20",
        endDate: "2026-01-05",
        surchargePercent: 25,
        isActive: true,
        dateMode: "specific" as const,
        surchargeType: "percentage" as const,
        scope: "per_each_pet" as const,
        applicableServices: ["boarding"],
      },
    ],
  },

  // ── Feeding & Medication field options (configurable per facility) ──
  feedingOptions: {
    schedules: [
      { id: "s1", label: "AM", time: "09:00" },
      { id: "s2", label: "Noon", time: "12:00" },
      { id: "s3", label: "PM", time: "18:00" },
    ],
    units: ["Scoop", "Cup", "Oz", "Tbsp", "Grams"],
    foodTypes: ["Kibble", "Wet food", "Raw", "Prescription", "Homemade"],
    sources: ["House provide", "Owner provide"],
    instructions: ["Feed alone", "Free feed", "Hand feed", "Slow feeder"],
    allergyPresets: [
      "Chicken",
      "Beef",
      "Grain-free",
      "Sensitive stomach",
      "Dairy",
    ],
  },
  medicationOptions: {
    methods: [
      "Oral",
      "Topical",
      "Injection",
      "Mixed with food",
      "Eye drops",
      "Ear drops",
    ],
    frequencies: [
      "Once daily",
      "Twice daily",
      "Three times daily",
      "Every 8 hours",
      "As needed",
    ],
    quickTimes: [
      { label: "Morning", time: "08:00" },
      { label: "Noon", time: "12:00" },
      { label: "Evening", time: "18:00" },
      { label: "Bedtime", time: "20:00" },
    ],
  },

  // ── Care task feedback options (configurable per facility) ──────
  careTaskFeedback: {
    feeding: [
      { value: "ate_all", label: "Ate all (100%)" },
      { value: "ate_most", label: "Ate most (75%)" },
      { value: "ate_some", label: "Ate some (50%)" },
      { value: "ate_little", label: "Ate little (25%)" },
      { value: "refused", label: "Refused to eat (0%)" },
    ],
    medication: [
      { value: "given", label: "Given" },
      { value: "skipped", label: "Skipped" },
      { value: "refused", label: "Refused" },
      { value: "vomited", label: "Vomited after" },
    ],
  },
};
