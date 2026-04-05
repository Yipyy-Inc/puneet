// ========================================
// EVALUATION CONFIGURATION DATA
// ========================================

import type {
  EvaluationConfig,
  EvaluationFormTemplate,
  EvaluationReportCardConfig,
  WeatherWarningRule,
  BusinessProfile,
  BusinessHours,
  Location,
  BookingRules,
  KennelType,
  PetSizeClass,
  VaccinationRule,
  PaymentGateway,
  TaxRate,
  CurrencySettings,
  NotificationToggle,
  ServiceNotificationDefault,
  TipConfig,
  Integration,
  SubscriptionPlan,
  ModuleAddon,
  AuditLogEntry,
  ModuleConfig,
  FacilityBookingFlowConfig,
  ReportCardConfig,
  ServiceDateBlock,
  ScheduleTimeOverride,
  DropOffPickUpOverride,
} from "@/types/facility";

export const evaluationConfig: EvaluationConfig = {
  internalName: "Pet Evaluation",
  customerName: "Pet Evaluation",
  description:
    "A brief assessment to ensure your pet is ready for the selected service.",
  price: 0,
  duration: "custom",
  customHours: 1,
  colorCode: "#6366f1",
  // Validity
  validityMode: "always_valid",
  expirationDays: 90,
  // Staff
  staffAssignment: "manual",
  assignedStaffIds: ["staff-001", "staff-002", "staff-004", "staff-006"],
  // Booking window
  minLeadTimeHours: 24,
  maxAdvanceDays: 30,
  // Daily capacity
  dailyPetLimits: {
    enabled: true,
    defaultLimit: 4,
    perDay: {
      mon: 4,
      tue: 4,
      wed: 4,
      thu: 4,
      fri: 3,
      sat: 2,
    },
  },
  schedule: {
    durationOptionsMinutes: [120, 240],
    defaultDurationMinutes: 120,
    timeWindows: [
      { id: "morning", label: "Morning", startTime: "09:00", endTime: "12:00" },
      {
        id: "afternoon",
        label: "Afternoon",
        startTime: "13:00",
        endTime: "17:00",
      },
    ],
    slotMode: "fixed",
    fixedStartTimes: ["09:00", "11:00", "13:00", "15:00"],
  },
  taxSettings: {
    taxable: false,
  },
};

export const evaluationFormTemplate: EvaluationFormTemplate = {
  sections: [
    {
      id: "temperament",
      title: "Temperament Assessment",
      description: "Evaluate the pet's behavior around dogs and people",
      questions: [
        {
          id: "dog_friendly",
          label: "Dog-friendly",
          type: "yes_no",
          required: true,
          allowNotes: true,
          helpText: "Does the pet interact well with other dogs?",
        },
        {
          id: "human_friendly",
          label: "Human-friendly",
          type: "yes_no",
          required: true,
          allowNotes: true,
          helpText: "Does the pet interact well with unfamiliar people?",
        },
        {
          id: "energy_level",
          label: "Energy level",
          type: "scale",
          required: true,
          scaleLabels: { low: "Low", mid: "Medium", high: "High" },
        },
        {
          id: "anxiety_level",
          label: "Anxiety level",
          type: "scale",
          required: true,
          scaleLabels: { low: "Low", mid: "Medium", high: "High" },
        },
        {
          id: "reactivity",
          label: "Reactivity",
          type: "scale",
          required: true,
          scaleLabels: { low: "Low", mid: "Medium", high: "High" },
          helpText: "Reaction to stimuli like loud sounds, quick movements",
        },
      ],
    },
    {
      id: "play_profile",
      title: "Play Profile",
      description: "Assess play style and assign an appropriate group",
      questions: [
        {
          id: "play_style",
          label: "Play style",
          type: "single_select",
          required: true,
          options: ["Gentle", "Balanced", "Rough", "Chase", "Wrestle"],
        },
        {
          id: "play_group",
          label: "Recommended play group",
          type: "single_select",
          required: true,
          options: [
            "Small dogs",
            "Large dogs",
            "Mixed",
            "Puppies",
            "Seniors",
            "Solo / Separate",
          ],
        },
      ],
    },
    {
      id: "additional",
      title: "Additional Observations",
      description: "Any other notes or concerns",
      questions: [
        {
          id: "temperament_notes",
          label: "Temperament notes",
          type: "text",
          required: false,
          placeholder: "General observations about the pet's temperament...",
        },
        {
          id: "resource_guarding",
          label: "Resource guarding observed?",
          type: "yes_no",
          required: false,
          allowNotes: true,
          helpText: "Food, toys, or space guarding behavior",
        },
        {
          id: "leash_behavior",
          label: "Leash behavior",
          type: "single_select",
          required: false,
          options: [
            "Calm",
            "Pulls slightly",
            "Reactive on leash",
            "Not tested",
          ],
        },
      ],
    },
  ],
  behaviorCodes: [
    { id: "bc-1", label: "Food motivated", color: "#22c55e" },
    { id: "bc-2", label: "Toy motivated", color: "#3b82f6" },
    { id: "bc-3", label: "Shy / Timid", color: "#f59e0b" },
    { id: "bc-4", label: "Mouthy", color: "#ef4444" },
    { id: "bc-5", label: "Resource guarder", color: "#ef4444" },
    { id: "bc-6", label: "Escape artist", color: "#f59e0b" },
    { id: "bc-7", label: "Jumper", color: "#f59e0b" },
    { id: "bc-8", label: "Excellent recall", color: "#22c55e" },
    { id: "bc-9", label: "Needs slow intro", color: "#8b5cf6" },
    { id: "bc-10", label: "Velcro dog", color: "#ec4899" },
  ],
  internalNotesEnabled: true,
};

// ========================================
// BUSINESS CONFIGURATION DATA
// ========================================

export const businessProfile: BusinessProfile = {
  businessName: "PawCare Facility",
  email: "contact@pawcare.com",
  phone: "+1 (555) 123-4567",
  website: "https://pawcare.com",
  address: {
    street: "123 Pet Street",
    city: "San Francisco",
    state: "CA",
    zipCode: "94102",
    country: "United States",
  },
  logo: "/images/logo.png",
  description:
    "Premium pet care facility offering boarding, daycare, grooming, and training services.",
  socialMedia: {
    facebook: "https://facebook.com/pawcare",
    instagram: "https://instagram.com/pawcare",
    twitter: "https://twitter.com/pawcare",
  },
};

export const businessHours: BusinessHours = {
  monday: { isOpen: true, openTime: "07:00", closeTime: "19:00" },
  tuesday: { isOpen: true, openTime: "07:00", closeTime: "19:00" },
  wednesday: { isOpen: true, openTime: "07:00", closeTime: "19:00" },
  thursday: { isOpen: true, openTime: "07:00", closeTime: "19:00" },
  friday: { isOpen: true, openTime: "07:00", closeTime: "19:00" },
  saturday: { isOpen: true, openTime: "08:00", closeTime: "18:00" },
  sunday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
};

export const locations: Location[] = [
  {
    id: "loc-001",
    name: "Main Facility - Downtown",
    address: "123 Pet Street, San Francisco, CA 94102",
    phone: "+1 (555) 123-4567",
    capacity: 50,
    isActive: true,
  },
  {
    id: "loc-002",
    name: "Branch - North Beach",
    address: "456 Dog Avenue, San Francisco, CA 94133",
    phone: "+1 (555) 987-6543",
    capacity: 30,
    isActive: true,
  },
];

export const bookingRules: BookingRules = {
  minimumAdvanceBooking: 24,
  maximumAdvanceBooking: 365,
  cancelPolicyHours: 48,
  cancelFeePercentage: 50,
  depositPercentage: 25,
  depositRequired: true,
  capacityLimit: 50,
  dailyCapacityLimit: 50,
  allowOverBooking: false,
  overBookingPercentage: 10,
};

export const facilityBookingFlowConfig: FacilityBookingFlowConfig = {
  evaluationRequired: false,
  hideServicesUntilEvaluationCompleted: false,
  servicesRequiringEvaluation: ["daycare"],
  hiddenServices: [],
  evaluationLockedMessage:
    "This service requires a pet evaluation first. Please book an evaluation so we can get to know your pet before their first visit.",
};

export const evaluationReportCardConfig: EvaluationReportCardConfig = {
  enabled: true,
  headerMessage: "Thank you for bringing your pet in for an evaluation!",
  passMessage:
    "Great news — your pet has passed their evaluation and is ready to join us! The services below are now unlocked for booking.",
  failMessage:
    "After careful assessment, we feel your pet may need a little more time before joining our programs. We encourage you to reach out so we can discuss next steps.",
  footerNote:
    "We look forward to welcoming your pet. Feel free to contact us with any questions.",
  showEvaluatorName: true,
  showEvaluationDate: true,
  showTemperament: true,
  showPlayStyle: true,
  showPlayGroup: true,
  showBehaviorTags: false,
  showStaffNotes: true,
  showApprovedServices: true,
  notifyViaEmail: true,
  notifyViaSMS: false,
};

/** Recurring holidays — facility is closed on these dates every year */
export const facilityHolidays: Array<{
  month: number;
  day: number;
  name: string;
}> = [
  { month: 1, day: 1, name: "New Year's Day" },
  { month: 7, day: 4, name: "Independence Day" },
  { month: 12, day: 25, name: "Christmas Day" },
  { month: 12, day: 31, name: "New Year's Eve" },
  { month: 11, day: 28, name: "Thanksgiving" },
];

export const serviceDateBlocks: ServiceDateBlock[] = [];
export const scheduleTimeOverrides: ScheduleTimeOverride[] = [];
export const dropOffPickUpOverrides: DropOffPickUpOverride[] = [];

// ========================================
// 7.1 FORM REQUIREMENTS PER SERVICE
// ========================================

export interface FormRequirementGate {
  /** Which stage this form is required at */
  stage: "before_booking" | "before_approval" | "before_checkin";
  /** What happens when the form is missing */
  enforcement: "block" | "warn";
}

export interface ServiceFormRequirement {
  /** Form ID from the forms system */
  formId: string;
  /** Human-readable form name (for display) */
  formName: string;
  /** Gates at which this form is required */
  gates: FormRequirementGate[];
  /** Only require for specific pet types (empty = all) */
  petTypes?: string[];
  /** Whether this requirement is currently active */
  enabled: boolean;
}

export interface ServiceFormRequirementsConfig {
  serviceType: string;
  serviceLabel: string;
  requirements: ServiceFormRequirement[];
}

export const formRequirements: ServiceFormRequirementsConfig[] = [
  {
    serviceType: "daycare",
    serviceLabel: "Daycare",
    requirements: [
      {
        formId: "form-intake-demo",
        formName: "New Client Intake Form",
        gates: [{ stage: "before_booking", enforcement: "block" }],
        enabled: true,
      },
      {
        formId: "form-vaccine-upload",
        formName: "Vaccination Records",
        gates: [
          { stage: "before_booking", enforcement: "warn" },
          { stage: "before_checkin", enforcement: "block" },
        ],
        enabled: true,
      },
    ],
  },
  {
    serviceType: "boarding",
    serviceLabel: "Boarding",
    requirements: [
      {
        formId: "form-intake-demo",
        formName: "New Client Intake Form",
        gates: [{ stage: "before_booking", enforcement: "block" }],
        enabled: true,
      },
      {
        formId: "form-vaccine-upload",
        formName: "Vaccination Records",
        gates: [{ stage: "before_checkin", enforcement: "block" }],
        enabled: true,
      },
      {
        formId: "form-boarding-agreement",
        formName: "Boarding Agreement & Liability Waiver",
        gates: [{ stage: "before_approval", enforcement: "block" }],
        enabled: true,
      },
    ],
  },
  {
    serviceType: "grooming",
    serviceLabel: "Grooming",
    requirements: [
      {
        formId: "form-intake-demo",
        formName: "New Client Intake Form",
        gates: [{ stage: "before_booking", enforcement: "warn" }],
        enabled: true,
      },
    ],
  },
  {
    serviceType: "training",
    serviceLabel: "Training",
    requirements: [
      {
        formId: "form-intake-demo",
        formName: "New Client Intake Form",
        gates: [{ stage: "before_booking", enforcement: "warn" }],
        enabled: true,
      },
      {
        formId: "form-training-questionnaire",
        formName: "Training Goals & Behavior Questionnaire",
        gates: [{ stage: "before_approval", enforcement: "block" }],
        enabled: true,
      },
    ],
  },
];

export const reportCardConfig: ReportCardConfig = {
  enabledThemes: [
    "everyday",
    "christmas",
    "halloween",
    "easter",
    "thanksgiving",
    "new_year",
    "valentines",
  ],
  templates: {
    everyday: {
      todaysVibe:
        "{petName} had a {moodLabel} day with {energyLabel} energy at {facilityName}.",
      friendsAndFun: "{petName} was {socialLabel} during playtime. {playNote}",
      careMetrics:
        "Meals: {appetiteLabel}. Potty: {pottyLabel}. Meds: {medsLabel}.",
      holidaySparkle:
        "{petName} enjoyed a little seasonal fun today. {holidayNote}",
      closingNote:
        "Thanks for trusting {facilityName} with {petName}, {ownerName}! {closingComment}",
    },
    christmas: {
      todaysVibe:
        "{petName} jingled through the day with a {moodLabel} mood and {energyLabel} energy.",
      friendsAndFun: "{petName} was {socialLabel} with friends. {playNote}",
      careMetrics:
        "Meals: {appetiteLabel}. Potty: {pottyLabel}. Meds: {medsLabel}.",
      holidaySparkle: "{petName} joined our Christmas cheer. {holidayNote}",
      closingNote: "Happy holidays from {facilityName}! {closingComment}",
    },
    halloween: {
      todaysVibe:
        "{petName} had a {moodLabel} day with {energyLabel} energy — spooky fun included!",
      friendsAndFun: "{petName} was {socialLabel} during playtime. {playNote}",
      careMetrics:
        "Meals: {appetiteLabel}. Potty: {pottyLabel}. Meds: {medsLabel}.",
      holidaySparkle:
        "{petName} joined our Halloween festivities. {holidayNote}",
      closingNote:
        "Tricks, treats, and tail wags from {facilityName}. {closingComment}",
    },
    easter: {
      todaysVibe:
        "{petName} had a {moodLabel} day with {energyLabel} energy — a springtime hop!",
      friendsAndFun: "{petName} was {socialLabel} with pals. {playNote}",
      careMetrics:
        "Meals: {appetiteLabel}. Potty: {pottyLabel}. Meds: {medsLabel}.",
      holidaySparkle: "{petName} enjoyed our Easter fun. {holidayNote}",
      closingNote: "Warm wishes from {facilityName}. {closingComment}",
    },
    thanksgiving: {
      todaysVibe:
        "{petName} had a {moodLabel} day with {energyLabel} energy and lots of gratitude.",
      friendsAndFun: "{petName} was {socialLabel} during playtime. {playNote}",
      careMetrics:
        "Meals: {appetiteLabel}. Potty: {pottyLabel}. Meds: {medsLabel}.",
      holidaySparkle: "{petName} joined our Thanksgiving cheer. {holidayNote}",
      closingNote:
        "We’re thankful for {petName} at {facilityName}. {closingComment}",
    },
    new_year: {
      todaysVibe:
        "{petName} had a {moodLabel} day with {energyLabel} energy to ring in the New Year!",
      friendsAndFun: "{petName} was {socialLabel} during playtime. {playNote}",
      careMetrics:
        "Meals: {appetiteLabel}. Potty: {pottyLabel}. Meds: {medsLabel}.",
      holidaySparkle:
        "{petName} joined our New Year celebration. {holidayNote}",
      closingNote: "Cheers from {facilityName}! {closingComment}",
    },
    valentines: {
      todaysVibe:
        "{petName} had a {moodLabel} day with {energyLabel} energy and lots of love.",
      friendsAndFun: "{petName} was {socialLabel} during playtime. {playNote}",
      careMetrics:
        "Meals: {appetiteLabel}. Potty: {pottyLabel}. Meds: {medsLabel}.",
      holidaySparkle:
        "{petName} enjoyed our Valentine's sparkle. {holidayNote}",
      closingNote: "With love from {facilityName}. {closingComment}",
    },
  },
  autoSend: {
    mode: "immediate",
    sendTime: "18:00",
    channels: { email: true, message: true, sms: false },
  },
  brand: {
    reportTitle: "Daily Report Card",
    accentColor: "#6366f1",
    showFacilityLogo: true,
  },
  serviceConfigs: [
    {
      serviceId: "daycare",
      enabled: true,
      enabledSections: [
        "todaysVibe",
        "friendsAndFun",
        "careMetrics",
        "holidaySparkle",
        "closingNote",
        "overallFeedback",
        "photoShowcase",
      ],
    },
    {
      serviceId: "boarding",
      enabled: true,
      enabledSections: [
        "todaysVibe",
        "friendsAndFun",
        "careMetrics",
        "closingNote",
        "petCondition",
        "overallFeedback",
        "photoShowcase",
      ],
    },
    {
      serviceId: "grooming",
      enabled: false,
      enabledSections: [
        "todaysVibe",
        "careMetrics",
        "closingNote",
        "petCondition",
        "photoShowcase",
      ],
    },
    {
      serviceId: "training",
      enabled: false,
      enabledSections: [
        "todaysVibe",
        "closingNote",
        "customFeedback",
        "overallFeedback",
      ],
    },
  ],
  overallFeedback: {
    title: "Overall Experience",
    responseOptions: ["Excellent", "Good", "Fair", "Needs Attention"],
  },
  customQuestions: [],
  petCondition: {
    categories: [
      {
        id: "coat",
        label: "Coat Condition",
        options: ["Normal", "Dry", "Oily", "Matted", "Shedding"],
      },
      {
        id: "skin",
        label: "Skin",
        options: ["Normal", "Dry", "Irritated", "Rash"],
      },
      {
        id: "ears",
        label: "Ears",
        options: ["Normal", "Dirty", "Irritated", "Odor"],
      },
      {
        id: "eyes",
        label: "Eyes",
        options: ["Normal", "Discharge", "Red", "Tearing"],
      },
    ],
  },
  reviewBooster: {
    ratingThreshold: 4,
    reviewUrl: "",
    reviewPromptText: "Loved your pet's experience? Leave us a review!",
  },
};

export const reportCardSectionMeta: Record<
  string,
  { label: string; description: string }
> = {
  todaysVibe: { label: "Today's Vibe", description: "Mood and energy summary" },
  friendsAndFun: {
    label: "Friends & Fun",
    description: "Social behavior and play notes",
  },
  careMetrics: {
    label: "Care Metrics",
    description: "Meals, potty breaks, medications",
  },
  holidaySparkle: {
    label: "Holiday Sparkle",
    description: "Seasonal themed content",
  },
  closingNote: {
    label: "Closing Note",
    description: "Wrap-up message to the owner",
  },
  overallFeedback: {
    label: "Overall Feedback",
    description: "Staff feedback with response options",
  },
  customFeedback: {
    label: "Custom Feedback",
    description: "Facility-created questions",
  },
  petCondition: {
    label: "Pet Condition",
    description: "Health and grooming observations",
  },
  nextAppointment: {
    label: "Next Appointment",
    description: "Upcoming booking info or link",
  },
  reviewBooster: {
    label: "Review Booster",
    description: "Prompt for external reviews",
  },
  photoShowcase: {
    label: "Photo Showcase",
    description: "Photo and video highlights",
  },
};

export const kennelTypes: KennelType[] = [
  {
    id: "kennel-001",
    name: "Standard Small",
    size: "small",
    dimensions: "3' x 4' x 6'",
    amenities: ["Indoor", "Climate Control", "Water Bowl"],
    dailyRate: 35,
    quantity: 10,
  },
  {
    id: "kennel-002",
    name: "Standard Medium",
    size: "medium",
    dimensions: "4' x 6' x 6'",
    amenities: ["Indoor", "Climate Control", "Water Bowl", "Raised Bed"],
    dailyRate: 45,
    quantity: 15,
  },
  {
    id: "kennel-003",
    name: "Deluxe Large",
    size: "large",
    dimensions: "6' x 8' x 6'",
    amenities: [
      "Indoor/Outdoor Access",
      "Climate Control",
      "Premium Bedding",
      "TV",
    ],
    dailyRate: 65,
    quantity: 8,
  },
  {
    id: "kennel-004",
    name: "Luxury Suite",
    size: "xlarge",
    dimensions: "8' x 10' x 8'",
    amenities: [
      "Indoor/Outdoor Access",
      "Climate Control",
      "Premium Bedding",
      "TV",
      "Webcam",
      "Private Yard",
    ],
    dailyRate: 95,
    quantity: 5,
  },
];

export const petSizeClasses: PetSizeClass[] = [
  {
    id: "size-001",
    name: "Extra Small (Toy)",
    weightMin: 0,
    weightMax: 10,
    unit: "lbs",
  },
  { id: "size-002", name: "Small", weightMin: 11, weightMax: 25, unit: "lbs" },
  { id: "size-003", name: "Medium", weightMin: 26, weightMax: 50, unit: "lbs" },
  { id: "size-004", name: "Large", weightMin: 51, weightMax: 100, unit: "lbs" },
  {
    id: "size-005",
    name: "Extra Large (Giant)",
    weightMin: 101,
    weightMax: 200,
    unit: "lbs",
  },
];

export const vaccinationRules: VaccinationRule[] = [
  {
    id: "vax-001",
    vaccineName: "Rabies",
    required: true,
    expiryWarningDays: 30,
    applicableServices: ["boarding", "daycare", "grooming", "training"],
  },
  {
    id: "vax-002",
    vaccineName: "DHPP (Distemper)",
    required: true,
    expiryWarningDays: 30,
    applicableServices: ["boarding", "daycare"],
  },
  {
    id: "vax-003",
    vaccineName: "Bordetella",
    required: true,
    expiryWarningDays: 14,
    applicableServices: ["boarding", "daycare"],
  },
  {
    id: "vax-004",
    vaccineName: "Canine Influenza",
    required: false,
    expiryWarningDays: 30,
    applicableServices: ["boarding"],
  },
];

// ========================================
// FINANCIAL SETTINGS DATA
// ========================================

export const paymentGateways: PaymentGateway[] = [
  {
    provider: "stripe",
    isEnabled: true,
    apiKey: "sk_test_*********************",
    webhookSecret: "whsec_*********************",
    testMode: true,
  },
  {
    provider: "square",
    isEnabled: false,
    apiKey: "",
    webhookSecret: "",
    testMode: false,
  },
];

export const taxRates: TaxRate[] = [
  {
    id: "tax-001",
    name: "Standard Sales Tax",
    rate: 8.5,
    applicableServices: ["all"],
    isDefault: true,
  },
  {
    id: "tax-002",
    name: "Service Tax",
    rate: 10.0,
    applicableServices: ["grooming", "training"],
    isDefault: false,
  },
];

export const currencySettings: CurrencySettings = {
  currency: "USD",
  symbol: "$",
  decimalPlaces: 2,
  thousandSeparator: ",",
  decimalSeparator: ".",
};

// ========================================
// NOTIFICATION SETTINGS DATA
// ========================================

export const notificationToggles: NotificationToggle[] = [
  {
    id: "notif-001",
    name: "Booking Confirmation",
    description: "Send when a new booking is created",
    email: true,
    sms: false,
    push: true,
    category: "client",
  },
  {
    id: "notif-002",
    name: "Booking Reminder",
    description: "24-hour reminder before appointment",
    email: true,
    sms: true,
    push: true,
    category: "client",
  },
  {
    id: "notif-003",
    name: "Check-In Notification",
    description: "Notify when pet is checked in",
    email: true,
    sms: false,
    push: true,
    category: "client",
  },
  {
    id: "notif-004",
    name: "Payment Receipt",
    description: "Send receipt after payment",
    email: true,
    sms: false,
    push: false,
    category: "client",
  },
  {
    id: "notif-005",
    name: "Incident Alert",
    description: "Notify manager of new incidents",
    email: true,
    sms: true,
    push: true,
    category: "staff",
  },
  {
    id: "notif-006",
    name: "Low Inventory Alert",
    description: "Alert when inventory is low",
    email: true,
    sms: false,
    push: true,
    category: "system",
  },
];

// ========================================
// TIP CONFIGURATION DATA
// ========================================

export const tipConfig: TipConfig = {
  enabled: true,
  mode: "general",
  general: {
    options: [
      { type: "percentage", value: 15 },
      { type: "percentage", value: 20 },
      { type: "percentage", value: 25 },
    ],
    preferredIndex: 1,
  },
  smart: {
    thresholdAmount: 50,
    belowThreshold: {
      options: [
        { type: "fixed", value: 5 },
        { type: "fixed", value: 10 },
        { type: "fixed", value: 15 },
      ],
      preferredIndex: 1,
    },
    aboveThreshold: {
      options: [
        { type: "percentage", value: 15 },
        { type: "percentage", value: 20 },
        { type: "percentage", value: 25 },
      ],
      preferredIndex: 1,
    },
  },
};

/** Per-service notification defaults — controls pre-selected toggles in the booking confirmation */
export const serviceNotificationDefaults: ServiceNotificationDefault[] = [
  { serviceId: "daycare", serviceLabel: "Daycare", email: true, sms: false },
  { serviceId: "boarding", serviceLabel: "Boarding", email: true, sms: false },
  { serviceId: "grooming", serviceLabel: "Grooming", email: true, sms: true },
  { serviceId: "training", serviceLabel: "Training", email: true, sms: false },
  {
    serviceId: "evaluation",
    serviceLabel: "Pet Evaluation",
    email: true,
    sms: false,
  },
];

// ========================================
// INTEGRATIONS DATA
// ========================================

export const integrations: Integration[] = [
  {
    id: "int-001",
    name: "Twilio SMS",
    category: "communication",
    isEnabled: true,
    config: {
      accountSid: "AC*********************",
      authToken: "*********************",
      phoneNumber: "+1234567890",
    },
  },
  {
    id: "int-002",
    name: "SendGrid Email",
    category: "communication",
    isEnabled: true,
    config: {
      apiKey: "SG.*********************",
      fromEmail: "noreply@pawcare.com",
      fromName: "PawCare Facility",
    },
  },
  {
    id: "int-003",
    name: "SMTP Email",
    category: "communication",
    isEnabled: false,
    config: {
      host: "smtp.gmail.com",
      port: 587,
      username: "",
      password: "",
      secure: true,
    },
  },
  {
    id: "int-004",
    name: "Twilio VOIP",
    category: "phone",
    isEnabled: true,
    config: {
      accountSid: "AC*********************",
      authToken: "*********************",
      phoneNumber: "+1234567890",
      recordCalls: true,
    },
  },
  {
    id: "int-005",
    name: "QuickBooks Online",
    category: "accounting",
    isEnabled: false,
    config: {
      clientId: "",
      clientSecret: "",
      realmId: "",
      syncFrequency: "daily",
    },
  },
  {
    id: "int-006",
    name: "OpenAI",
    category: "ai",
    isEnabled: true,
    config: {
      apiKey: "sk-*********************",
      model: "gpt-4",
      features: {
        aiReceptionist: true,
        smartSuggestions: true,
        sentimentAnalysis: false,
      },
    },
  },
];

// ========================================
// SUBSCRIPTION DATA
// ========================================

export const subscription: SubscriptionPlan = {
  planName: "Professional Plan",
  planTier: "professional",
  billingCycle: "monthly",
  price: 199,
  nextBillingDate: "2024-03-20",
  status: "active",
};

export const moduleAddons: ModuleAddon[] = [
  {
    id: "mod-001",
    name: "Daycare Module",
    description: "Full daycare management with attendance tracking",
    monthlyPrice: 0,
    isEnabled: true,
    isIncludedInPlan: true,
  },
  {
    id: "mod-002",
    name: "Boarding Module",
    description: "Overnight boarding with kennel management",
    monthlyPrice: 0,
    isEnabled: true,
    isIncludedInPlan: true,
  },
  {
    id: "mod-003",
    name: "Grooming Module",
    description: "Grooming appointments and packages",
    monthlyPrice: 29,
    isEnabled: true,
    isIncludedInPlan: false,
  },
  {
    id: "mod-004",
    name: "Training Module",
    description: "Class management and training programs",
    monthlyPrice: 29,
    isEnabled: true,
    isIncludedInPlan: false,
  },
  {
    id: "mod-005",
    name: "Retail/POS Module",
    description: "Point of sale and inventory management",
    monthlyPrice: 49,
    isEnabled: false,
    isIncludedInPlan: false,
  },
  {
    id: "mod-006",
    name: "AI Receptionist",
    description: "AI-powered phone answering and booking",
    monthlyPrice: 99,
    isEnabled: true,
    isIncludedInPlan: false,
  },
];

// ========================================
// AUDIT LOG DATA
// ========================================

export const auditLog: AuditLogEntry[] = [
  {
    id: "audit-001",
    timestamp: "2024-02-22T10:30:00Z",
    userId: "user-001",
    userName: "Sarah Johnson",
    action: "updated",
    section: "Business Configuration",
    settingName: "Business Hours - Monday",
    oldValue: "08:00 - 18:00",
    newValue: "07:00 - 19:00",
    ipAddress: "192.168.1.100",
  },
  {
    id: "audit-002",
    timestamp: "2024-02-21T15:45:00Z",
    userId: "user-002",
    userName: "Emma Wilson",
    action: "updated",
    section: "Financial Settings",
    settingName: "Tax Rate - Standard Sales Tax",
    oldValue: "8.0%",
    newValue: "8.5%",
    ipAddress: "192.168.1.105",
  },
  {
    id: "audit-003",
    timestamp: "2024-02-20T09:15:00Z",
    userId: "user-001",
    userName: "Sarah Johnson",
    action: "created",
    section: "Integrations",
    settingName: "OpenAI Integration",
    oldValue: "",
    newValue: "Enabled with API key",
    ipAddress: "192.168.1.100",
  },
  {
    id: "audit-004",
    timestamp: "2024-02-19T14:20:00Z",
    userId: "user-002",
    userName: "Emma Wilson",
    action: "updated",
    section: "Booking Rules",
    settingName: "Deposit Percentage",
    oldValue: "20%",
    newValue: "25%",
    ipAddress: "192.168.1.105",
  },
  {
    id: "audit-005",
    timestamp: "2024-02-18T11:00:00Z",
    userId: "user-001",
    userName: "Sarah Johnson",
    action: "updated",
    section: "Notifications",
    settingName: "Booking Reminder - SMS",
    oldValue: "Disabled",
    newValue: "Enabled",
    ipAddress: "192.168.1.100",
  },
];

// ========================================
// MODULE CONFIGURATION DATA
// ========================================

export const daycareConfig: ModuleConfig = {
  clientFacingName: "Happy Paws Daycare",
  staffFacingName: "Daycare Management",
  slogan: "Where Every Paw Feels at Home",
  description:
    "Professional daycare services with supervised play, socialization, and personalized care for your furry friends.",
  bannerImage: "/services/daycare.jpg",
  basePrice: 35,
  settings: {
    evaluation: {
      enabled: true,
      optional: false,
    },
    careInstructions: {
      feeding: "required",
      medication: "optional",
      belongings: "optional",
    },
  },
  status: {
    disabled: false,
  },
};

// Boarding Module Configuration

export const boardingConfig: ModuleConfig = {
  clientFacingName: "Cozy Kennels Boarding",
  staffFacingName: "Boarding Management",
  slogan: "Your Pet's Home Away From Home",
  description:
    "Comfortable overnight boarding with personalized care, exercise, and attention for your beloved pets.",
  bannerImage: "/services/boarding.jpg",
  basePrice: 45,
  settings: {
    evaluation: {
      enabled: false,
    },
    careInstructions: {
      feeding: "required",
      medication: "required",
      belongings: "required",
    },
  },
  status: {
    disabled: false,
  },
};

// Grooming Module Configuration

export const groomingConfig: ModuleConfig = {
  clientFacingName: "Pawfect Grooming",
  staffFacingName: "Grooming Services",
  slogan: "Pamper Your Pet to Perfection",
  description:
    "Professional grooming services including bathing, trimming, and styling to keep your pet looking and feeling great.",
  basePrice: 50,
  settings: {
    evaluation: {
      enabled: false,
    },
    careInstructions: {
      feeding: "disabled",
      medication: "disabled",
      belongings: "optional",
    },
  },
  status: {
    disabled: false,
    reason: undefined,
  },
};

// Training Module Configuration

export const trainingConfig: ModuleConfig = {
  clientFacingName: "Obedience Training Academy",
  staffFacingName: "Training Programs",
  slogan: "Train Smart, Love More",
  description:
    "Expert training programs to teach obedience, tricks, and behavior modification for well-behaved pets.",
  basePrice: 60,
  settings: {
    evaluation: {
      enabled: false,
    },
    careInstructions: {
      feeding: "disabled",
      medication: "disabled",
      belongings: "disabled",
    },
  },
  status: {
    disabled: false,
    reason: undefined,
  },
};

// ========================================
// WEATHER WARNING RULES
// ========================================

export const weatherWarningRules: WeatherWarningRule[] = [
  {
    id: "rule-cold-extreme",
    name: "Extreme Cold",
    condition: "temperature_below",
    value: -10,
    severity: "critical",
    message:
      "Extreme cold — all dogs must stay indoors. No outdoor activities.",
    autoAction: "Move all dogs to indoor areas immediately",
    isActive: true,
    appliesToAreas: ["outdoor_park", "covered_patio", "pool"],
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "rule-cold-moderate",
    name: "Cold Weather",
    condition: "temperature_below",
    value: 0,
    severity: "warning",
    message:
      "Cold weather — limit outdoor time to 15 minutes. Monitor small breeds closely.",
    isActive: true,
    appliesToAreas: ["outdoor_park"],
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "rule-heat-extreme",
    name: "Extreme Heat",
    condition: "feels_like_above",
    value: 35,
    severity: "critical",
    message:
      "Extreme heat — keep all dogs indoors with AC. Provide extra water bowls.",
    autoAction: "Cancel all outdoor play sessions",
    isActive: true,
    appliesToAreas: ["outdoor_park", "covered_patio"],
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "rule-heat-moderate",
    name: "Hot Weather",
    condition: "feels_like_above",
    value: 30,
    severity: "warning",
    message:
      "Hot weather — move dogs to shaded or indoor areas. Ensure fresh water available.",
    isActive: true,
    appliesToAreas: ["outdoor_park"],
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "rule-rain",
    name: "Rain Alert",
    condition: "weather_is",
    value: "rain",
    severity: "warning",
    message:
      "Rain expected — bring dogs inside from outdoor park. Dry towels at entrance.",
    isActive: true,
    appliesToAreas: ["outdoor_park"],
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "rule-thunderstorm",
    name: "Thunderstorm Alert",
    condition: "weather_is",
    value: "thunderstorm",
    severity: "critical",
    message:
      "Thunderstorm — ALL dogs indoors immediately. Monitor anxious dogs for stress.",
    autoAction: "Activate calming protocol for noise-sensitive dogs",
    isActive: true,
    appliesToAreas: ["all"],
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "rule-high-wind",
    name: "High Wind",
    condition: "wind_speed_above",
    value: 50,
    severity: "warning",
    message: "High winds — secure outdoor equipment. Small dogs stay indoors.",
    isActive: true,
    appliesToAreas: ["outdoor_park"],
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "rule-snow",
    name: "Snow Alert",
    condition: "weather_is",
    value: "snow",
    severity: "warning",
    message:
      "Snowfall — outdoor park closed. All activities moved indoors. Check paws for ice.",
    isActive: true,
    appliesToAreas: ["outdoor_park", "covered_patio"],
    createdAt: "2024-01-01T00:00:00Z",
  },
];
