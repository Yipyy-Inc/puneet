// ========================================
// CORE TYPES
// ========================================

export interface Evaluation {
  id: string;
  petId: number;
  status: "pending" | "passed" | "failed" | "outdated";
  evaluatedAt?: string;
  evaluatedBy?: string;
  notes?: string;
  // Evaluation validity rules are configured by the facility and provided by API.
  // UI should treat isExpired === true as NOT approved, regardless of PASS.
  validityType?: "ALWAYS_VALID" | "EXPIRES_AFTER_INACTIVITY";
  lastActivityAt?: string;
  expiresAt?: string;
  isExpired?: boolean;
  approvedServices?: {
    daycare?: boolean;
    boarding?: boolean;
    customApproved?: string[];
    customDenied?: string[];
  };
}

export interface Pet {
  id: number;
  name: string;
  type: string;
  breed: string;
  age: number;
  weight: number;
  color: string;
  microchip: string;
  allergies: string;
  specialNeeds: string;
  imageUrl?: string;
  evaluations?: Evaluation[];
}

export interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
  status: string;
  facility: string;
  imageUrl?: string;
  pets: Pet[];
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
}

export interface FeedingScheduleItem {
  id: string;
  petId?: number;
  name: string;
  time: string;
  amount: string;
  unit: string;
  type: string;
  source: string;
  instructions: string;
  notes: string;
}

export interface MedicationItem {
  id: string;
  petId?: number;
  name: string;
  time: string[];
  amount: string;
  unit: string;
  type: string;
  source?: string;
  instructions: string;
  notes: string;
}

export interface DaycareDateTime {
  date: string;
  checkInTime: string;
  checkOutTime: string;
}

export interface ExtraService {
  serviceId: string;
  quantity: number;
  petId: number;
}

export interface Task {
  id: string;
  bookingId: number;
  petId: number;
  type: "feeding" | "medication" | "service" | "walking";
  title: string;
  time: string | null;
  details: string;
  assignedStaff?: string;
  completionStatus: "pending" | "in_progress" | "completed" | "cancelled";
  assignable: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

export interface NewBooking {
  clientId: number;
  petId: number | number[];
  facilityId: number;
  service: string;
  serviceType?: string;
  startDate: string;
  endDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  basePrice: number;
  discount: number;
  discountReason?: string;
  totalCost: number;
  paymentStatus: "pending" | "paid" | "refunded";
  specialRequests?: string;
  notificationEmail?: boolean;
  notificationSMS?: boolean;
  // Service-specific fields
  daycareSelectedDates?: string[]; // ISO date strings for multi-date daycare
  daycareDateTimes?: DaycareDateTime[];
  groomingStyle?: string;
  groomingAddOns?: string[];
  stylistPreference?: string;
  trainingType?: string;
  trainerId?: string;
  trainingGoals?: string;
  vetReason?: string;
  vetSymptoms?: string;
  isEmergency?: boolean;
  evaluationEvaluator?: string;
  evaluationSpace?: string;
  kennel?: string;
  feedingSchedule?: FeedingScheduleItem[];
  walkSchedule?: string;
  medications?: MedicationItem[];
  extraServices?: (ExtraService | string)[];
}

export interface Booking extends NewBooking {
  id: number;
  paymentMethod?: "cash" | "card";
  refundMethod?: "card" | "store_credit";
  refundAmount?: number;
  cancellationReason?: string;
}

// ========================================
// SETTINGS & CONFIGURATION TYPES
// ========================================

export interface EvaluationConfig {
  internalName: string;
  customerName: string;
  description: string;
  price: number;
  duration: "half-day" | "full-day" | "custom";
  customHours?: number;
  schedule: {
    durationOptionsMinutes: number[];
    defaultDurationMinutes?: number;
    timeWindows: Array<{
      id: string;
      label: string;
      startTime: string;
      endTime: string;
    }>;
    slotMode: "fixed" | "window";
    fixedStartTimes: string[];
  };
  taxSettings: {
    taxable: boolean;
    taxRate?: number;
  };
}

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

export type DayOfWeek =
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
  dailyCapacityLimit: number;
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

export interface NotificationToggle {
  id: string;
  name: string;
  description: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  category: "client" | "staff" | "system";
}

export interface Integration {
  id: string;
  name: string;
  category: "communication" | "accounting" | "ai" | "phone";
  isEnabled: boolean;
  config: {
    [key: string]: string | number | boolean | Record<string, boolean>;
  };
}

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

export interface FacilityBookingFlowConfig {
  evaluationRequired: boolean;
  hideServicesUntilEvaluationCompleted: boolean;
  servicesRequiringEvaluation: string[];
  hiddenServices: string[];
}

/** One-day schedule time override: custom open/close for a specific date (overrides regular weekly hours). */
export interface ScheduleTimeOverride {
  id: string;
  date: string; // YYYY-MM-DD
  /** Service(s) this override applies to. Empty or undefined = all services. */
  services?: string[]; // "daycare" | "boarding" | "grooming" | "training" | "evaluation"
  openTime: string; // HH:mm
  closeTime: string; // HH:mm
}

/** Drop-off and pick-up time windows for a specific date and service(s). Overrides regular facility hours for time selection. */
export interface DropOffPickUpOverride {
  id: string;
  date: string; // YYYY-MM-DD
  services: string[]; // "daycare" | "boarding" | "grooming" | "training" | "evaluation"
  dropOffStart: string; // HH:mm
  dropOffEnd: string; // HH:mm
  pickUpStart: string; // HH:mm
  pickUpEnd: string; // HH:mm
}

/** Block specific calendar dates for one or more services (overrides regular schedule). */
export interface ServiceDateBlock {
  id: string;
  date: string; // YYYY-MM-DD
  services: string[]; // "daycare" | "boarding" | "grooming" | "training" | "evaluation"
  /** Fully close: no check-in, no check-out on this date. */
  closed: boolean;
  /** Boarding-only: block this date as check-in (range start). */
  blockCheckIn?: boolean;
  /** Boarding-only: block this date as check-out (range end). */
  blockCheckOut?: boolean;
  /** Customer-facing message explaining the closure (e.g. "Closed for Christmas"). */
  closureMessage?: string;
}

export type ReportCardTheme =
  | "everyday"
  | "christmas"
  | "halloween"
  | "easter"
  | "thanksgiving"
  | "new_year"
  | "valentines";

export interface ReportCardTemplateSet {
  todaysVibe: string;
  friendsAndFun: string;
  careMetrics: string;
  holidaySparkle: string;
  closingNote: string;
}

export interface ReportCardAutoSendConfig {
  mode: "immediate" | "scheduled" | "checkout" | "end_of_day" | "manual";
  sendTime?: string; // HH:mm (local time)
  channels: {
    email: boolean;
    message: boolean;
    sms: boolean;
  };
}

export interface ReportCardConfig {
  enabledThemes: ReportCardTheme[];
  templates: Record<ReportCardTheme, ReportCardTemplateSet>;
  autoSend: ReportCardAutoSendConfig;
}

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
