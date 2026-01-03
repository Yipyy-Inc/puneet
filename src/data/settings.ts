// ========================================
// EVALUATION CONFIGURATION DATA
// ========================================

export interface EvaluationConfig {
  internalName: string;
  customerName: string;
  description: string;
  price: number;
  duration: "half-day" | "full-day" | "custom";
  customHours?: number;
  taxSettings: {
    taxable: boolean;
    taxRate?: number;
  };
}

export const evaluationConfig: EvaluationConfig = {
  internalName: "Pet Evaluation",
  customerName: "Pet Evaluation",
  description:
    "A brief assessment to ensure your pet is ready for the selected service.",
  price: 0,
  duration: "half-day",
  taxSettings: {
    taxable: false,
  },
};

// ========================================
// BUSINESS CONFIGURATION DATA
// ========================================

export interface BusinessProfile {
  businessName: string;
  email: string;
  phone: string;
  website: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  logo: string;
  description: string;
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

type DayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export type BusinessHours = {
  [K in DayOfWeek]: {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  };
};

export interface Location {
  id: string;
  name: string;
  address: string;
  phone: string;
  capacity: number;
  isActive: boolean;
}

export interface BookingRules {
  minimumAdvanceBooking: number; // hours
  maximumAdvanceBooking: number; // days
  cancelPolicyHours: number;
  cancelFeePercentage: number;
  depositPercentage: number;
  depositRequired: boolean;
  capacityLimit: number;
  allowOverBooking: boolean;
  overBookingPercentage: number;
}

export interface KennelType {
  id: string;
  name: string;
  size: "small" | "medium" | "large" | "xlarge";
  dimensions: string;
  amenities: string[];
  dailyRate: number;
  quantity: number;
}

export interface PetSizeClass {
  id: string;
  name: string;
  weightMin: number;
  weightMax: number;
  unit: "lbs" | "kg";
}

export interface VaccinationRule {
  id: string;
  vaccineName: string;
  required: boolean;
  expiryWarningDays: number;
  applicableServices: string[];
}

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
  allowOverBooking: false,
  overBookingPercentage: 10,
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

export interface PaymentGateway {
  provider: "stripe" | "square" | "paypal";
  isEnabled: boolean;
  apiKey: string;
  webhookSecret: string;
  testMode: boolean;
}

export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  applicableServices: string[];
  isDefault: boolean;
}

export interface CurrencySettings {
  currency: string;
  symbol: string;
  decimalPlaces: number;
  thousandSeparator: string;
  decimalSeparator: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: {
    [key: string]: boolean;
  };
}

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

export interface NotificationToggle {
  id: string;
  name: string;
  description: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  category: "client" | "staff" | "system";
}

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
// INTEGRATIONS DATA
// ========================================

export interface Integration {
  id: string;
  name: string;
  category: "communication" | "accounting" | "ai" | "phone";
  isEnabled: boolean;
  config: {
    [key: string]: string | number | boolean | Record<string, boolean>;
  };
}

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

export interface SubscriptionPlan {
  planName: string;
  planTier: "starter" | "professional" | "enterprise";
  billingCycle: "monthly" | "annual";
  price: number;
  nextBillingDate: string;
  status: "active" | "trial" | "cancelled";
}

export interface ModuleAddon {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  isEnabled: boolean;
  isIncludedInPlan: boolean;
}

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

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: "created" | "updated" | "deleted";
  section: string;
  settingName: string;
  oldValue: string;
  newValue: string;
  ipAddress: string;
}

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

export interface ModuleConfig {
  clientFacingName: string;
  staffFacingName: string;
  slogan: string;
  description: string;
  bannerImage?: string;
  basePrice: number;
  settings: {
    evaluation: {
      enabled: boolean;
      optional?: boolean;
    };
  };
  status: {
    disabled: boolean;
    reason?: string;
  };
}

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
  },
  status: {
    disabled: true,
    reason: "not implemented yet",
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
  },
  status: {
    disabled: true,
    reason: "not implemented yet",
  },
};
