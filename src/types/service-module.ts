/**
 * Unified ServiceModule type — the single schema for ALL services,
 * both built-in (boarding, daycare, grooming, training) and custom.
 *
 * Each engine (booking, scheduling, billing, tasks, reporting) reads
 * its own config section from this object — no hardcoded service names.
 */

// ============================================================================
// Service Category
// ============================================================================

export type ServiceCategory =
  | "timed_session"
  | "stay_based"
  | "transport"
  | "event_based"
  | "addon_only"
  | "one_time_appointment";

// ============================================================================
// Booking Engine Config
// ============================================================================

export interface BookingEngineConfig {
  supportsMultiPet: boolean;
  supportsRecurring: boolean;
  supportsExtension: boolean;
  requiresCheckIn: boolean;
  checkInType: "manual" | "qr" | "both";
  statusFlow: string[];
  cancellationPolicy?: {
    allowCancellation: boolean;
    freeBeforeHours: number;
    fee: number | { type: "fixed" | "percentage"; value: number };
  };
}

// ============================================================================
// Scheduling Engine Config
// ============================================================================

export interface SchedulingEngineConfig {
  type: "time_slot" | "date_range" | "recurring" | "on_demand";
  slotDuration?: number;
  bufferBetween?: number;
  operatingHours?: { day: number; open: string; close: string }[];
  advanceBookingDays?: number;
  sameDayBooking: boolean;
  blockoutDates?: string[];
}

// ============================================================================
// Resource Engine Config
// ============================================================================

export interface ResourceDefinition {
  id: string;
  name: string;
  type: string;
  maxConcurrent: number;
  shared: boolean;
  sharedWith?: string[];
}

export interface ResourceEngineConfig {
  enabled: boolean;
  resources: ResourceDefinition[];
  capacityPerSlot?: number;
  waitlistEnabled: boolean;
  maxWaitlist?: number;
  autoPromote?: boolean;
}

// ============================================================================
// Billing Engine Config
// ============================================================================

export type PricingModel =
  | "flat_rate"
  | "duration_based"
  | "per_pet"
  | "per_booking"
  | "per_route"
  | "dynamic"
  | "addon_only";

export interface PricingTier {
  durationMinutes: number;
  price: number;
  label?: string;
}

export interface BillingEngineConfig {
  pricingModel: PricingModel;
  basePrice: number;
  pricingTiers?: PricingTier[];
  taxable: boolean;
  tipsEnabled: boolean;
  supportsPackages: boolean;
  supportsMemberships: boolean;
  supportsDiscounts: boolean;
  depositRequired: boolean;
  depositAmount?: number;
  depositType?: "fixed" | "percentage";
  addOns?: { name: string; price: number; taxable: boolean }[];
}

// ============================================================================
// Task Engine Config
// ============================================================================

export interface TaskTemplateConfig {
  id: string;
  name: string;
  description?: string;
  category: "setup" | "execution" | "cleanup" | "transport" | "care" | "custom";
  timing: {
    type:
      | "before_start"
      | "at_start"
      | "during"
      | "at_end"
      | "after_end"
      | "custom_time";
    offsetMinutes?: number;
    customTime?: string;
  };
  durationMinutes?: number;
  assignTo?: "booking_staff" | "any_available" | "specific_role";
  isRequired: boolean;
  autoCreate: boolean;
  recurring?: {
    frequency: "daily" | "per_meal" | "per_medication";
    times?: string[];
  };
}

export interface TaskEngineConfig {
  autoGenerate: boolean;
  templates: TaskTemplateConfig[];
}

// ============================================================================
// Reporting Engine Config
// ============================================================================

export interface ReportingEngineConfig {
  trackRevenue: boolean;
  trackUtilization: boolean;
  trackStaffTime: boolean;
  utilizationMetric: "slots" | "room_nights" | "routes" | "attendance";
  reportCategory: string;
  kpis?: string[];
}

// ============================================================================
// Eligibility Config
// ============================================================================

export type ConditionType =
  | "pet_type"
  | "evaluation"
  | "membership"
  | "waiver"
  | "service_booked"
  | "tag"
  | "vaccination"
  | "age"
  | "weight"
  | "custom";

export interface EligibilityConditionDef {
  id: string;
  type: ConditionType;
  operator:
    | "equals"
    | "not_equals"
    | "has"
    | "not_has"
    | "greater_than"
    | "less_than"
    | "in_list";
  value: string | string[] | number | boolean;
  label: string;
}

export interface EligibilityConfig {
  enabled: boolean;
  operator: "all" | "any";
  conditions: EligibilityConditionDef[];
  deniedMessage?: string;
}

// ============================================================================
// Dependency Config
// ============================================================================

export interface DependencyConfig {
  requiresServices?: {
    moduleId: string;
    moduleName: string;
    type: "concurrent" | "same_day" | "any_active";
  }[];
  addonOnly?: boolean;
  addonFor?: string[];
  excludesWith?: string[];
}

// ============================================================================
// YipyyGo Config (for the unified module)
// ============================================================================

export interface YipyyGoModuleConfig {
  enabled: boolean;
  sendBeforeHours: number;
  required: boolean;
  standardSections: {
    belongings: boolean;
    feeding: boolean;
    medications: boolean;
    behaviorNotes: boolean;
    addOns: boolean;
    tip: boolean;
  };
  customSections: {
    id: string;
    name: string;
    icon?: string;
    type:
      | "checklist"
      | "yes_no"
      | "text_fields"
      | "multiple_choice"
      | "file_upload"
      | "info_display";
    required: boolean;
    items: {
      id: string;
      label: string;
      required: boolean;
      type?: "text" | "checkbox" | "radio" | "file" | "textarea";
      options?: string[];
      placeholder?: string;
    }[];
  }[];
}

// ============================================================================
// Online Booking Config
// ============================================================================

export interface OnlineBookingConfig {
  enabled: boolean;
  eligibleClients: "all" | "approved_only" | "active_members_only";
  approvalRequired: boolean;
  maxPetsPerBooking: number;
}

// ============================================================================
// Staff Config
// ============================================================================

export interface StaffConfig {
  autoAssign: boolean;
  requiredRole: string;
  customRoleName?: string;
}

// ============================================================================
// THE UNIFIED SERVICE MODULE
// ============================================================================

export interface ServiceModule {
  // Identity
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isBuiltIn: boolean;
  status: "active" | "disabled" | "draft" | "archived";
  facilityId?: number;

  // Category
  category: ServiceCategory;

  // Engine connections
  booking: BookingEngineConfig;
  scheduling: SchedulingEngineConfig;
  resources: ResourceEngineConfig;
  billing: BillingEngineConfig;
  tasks: TaskEngineConfig;
  reporting: ReportingEngineConfig;

  // Staff
  staff: StaffConfig;

  // Advanced (optional)
  eligibility?: EligibilityConfig;
  dependencies?: DependencyConfig;
  yipyyGo?: YipyyGoModuleConfig;
  onlineBooking?: OnlineBookingConfig;

  // Sidebar
  showInSidebar: boolean;
  sidebarPosition: number;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}
