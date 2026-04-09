import type {
  CustomServiceModule,
  CustomServiceCategory,
  FacilityResource,
  PricingModelType,
  CustomServiceWorkflowQuestionnaire,
  CustomServiceWorkflowResourceType,
  CustomServiceTaskTemplateQuestionnaireItem,
} from "@/types/facility";

// ========================================
// SHARED CONSTANTS (used across wizard, cards, pages)
// ========================================

export const COLOR_HEX_MAP: Record<string, string> = {
  "blue-500": "#3b82f6",
  "indigo-500": "#6366f1",
  "cyan-500": "#06b6d4",
  "green-500": "#22c55e",
  "emerald-500": "#10b981",
  "pink-500": "#ec4899",
  "orange-500": "#f97316",
  "yellow-500": "#eab308",
  "purple-500": "#a855f7",
  "red-500": "#ef4444",
  "teal-500": "#14b8a6",
  "gray-500": "#6b7280",
  "gray-400": "#9ca3af",
};

export function getGradientStyle(
  fromColor: string,
  toColor: string,
): { background: string } {
  return {
    background: `linear-gradient(135deg, ${COLOR_HEX_MAP[fromColor] ?? "#3b82f6"}, ${COLOR_HEX_MAP[toColor] ?? "#6366f1"})`,
  };
}

export const PRICING_MODEL_LABELS: Record<PricingModelType, string> = {
  flat_rate: "Flat Rate",
  duration_based: "Duration-Based",
  per_pet: "Per Pet",
  per_booking: "Per Booking",
  per_route: "Per Route",
  dynamic: "Dynamic Pricing",
  addon_only: "Add-On Only",
};

// ========================================
// CATEGORY METADATA
// ========================================

export interface CategoryMeta {
  id: CustomServiceCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  /** Tailwind classes for the category badge */
  badgeClass: string;
  /** Tailwind classes for a subtle tinted background */
  tintClass: string;
  /** Tailwind classes for the category icon container */
  iconContainerClass: string;
  /** Tailwind text color class */
  textClass: string;
}

export const CUSTOM_SERVICE_CATEGORIES_META: CategoryMeta[] = [
  {
    id: "timed_session",
    name: "Timed Session",
    description:
      "Fixed or variable-duration bookings like pool sessions or enrichment suites",
    icon: "Clock",
    color: "blue",
    badgeClass:
      "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800",
    tintClass: "bg-sky-50 dark:bg-sky-950/20",
    iconContainerClass:
      "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
    textClass: "text-sky-600 dark:text-sky-400",
  },
  {
    id: "stay_based",
    name: "Stay-Based",
    description:
      "Multi-day services that may require room or kennel assignment",
    icon: "Bed",
    color: "purple",
    badgeClass:
      "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800",
    tintClass: "bg-violet-50 dark:bg-violet-950/20",
    iconContainerClass:
      "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400",
    textClass: "text-violet-600 dark:text-violet-400",
  },
  {
    id: "transport",
    name: "Transport",
    description: "Route-based services like chauffeur pickup and drop-off",
    icon: "Car",
    color: "green",
    badgeClass:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
    tintClass: "bg-emerald-50 dark:bg-emerald-950/20",
    iconContainerClass:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "event_based",
    name: "Event-Based",
    description: "One-off or recurring group events like birthday parties",
    icon: "PartyPopper",
    color: "orange",
    badgeClass:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    tintClass: "bg-amber-50 dark:bg-amber-950/20",
    iconContainerClass:
      "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
    textClass: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "addon_only",
    name: "Add-On Only",
    description:
      "Cannot be booked standalone — must be linked to another service",
    icon: "PlusCircle",
    color: "gray",
    badgeClass:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700",
    tintClass: "bg-slate-50 dark:bg-slate-900/20",
    iconContainerClass:
      "bg-slate-100 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400",
    textClass: "text-slate-500 dark:text-slate-400",
  },
  {
    id: "one_time_appointment",
    name: "One-Time Appointment",
    description: "Single scheduled appointment like therapy sessions",
    icon: "CalendarCheck",
    color: "teal",
    badgeClass:
      "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800",
    tintClass: "bg-teal-50 dark:bg-teal-950/20",
    iconContainerClass:
      "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400",
    textClass: "text-teal-600 dark:text-teal-400",
  },
];

/** Lookup helper for category metadata by ID */
export function getCategoryMeta(
  categoryId: CustomServiceCategory,
): CategoryMeta | undefined {
  return CUSTOM_SERVICE_CATEGORIES_META.find((c) => c.id === categoryId);
}

export const CUSTOM_SERVICE_ADDON_LIBRARY: Array<{
  id: string;
  name: string;
}> = [
  { id: "towel-service", name: "Towel Service" },
  { id: "premium-shampoo-rinse", name: "Premium Shampoo Rinse" },
  { id: "blueberry-facial", name: "Blueberry Facial" },
  { id: "nail-trim", name: "Nail Trim" },
  { id: "tooth-brushing", name: "Tooth Brushing" },
];

function toHexColor(color: string): string {
  if (color.startsWith("#")) return color;
  return COLOR_HEX_MAP[color] ?? "#3b82f6";
}

function inferResourceType(module: CustomServiceModule): CustomServiceWorkflowResourceType {
  if (module.category === "transport") return "van";
  if (module.category === "stay_based") return "room";

  if (module.capacity?.resources?.length) {
    const firstType = module.capacity.resources[0].type.toLowerCase();
    if (firstType.includes("pool")) return "pool";
    if (firstType.includes("room")) return "room";
    if (firstType.includes("van") || firstType.includes("vehicle")) return "van";
    if (firstType.includes("yard")) return "yard";
    if (firstType.includes("equip")) return "equipment";
  }

  return "other";
}

function inferTaskTemplates(module: CustomServiceModule): CustomServiceTaskTemplateQuestionnaireItem[] {
  return (module.staffAssignment.taskGeneration ?? []).map((taskKey, index) => ({
    id: `${module.id}-template-${taskKey}-${index}`,
    taskName:
      taskKey === "setup"
        ? `${module.name} setup`
        : taskKey === "cleanup"
          ? `${module.name} cleanup`
          : `${module.name} execution`,
    taskType: taskKey === "cleanup" ? "cleanup" : "care",
    timingRule:
      taskKey === "setup"
        ? "before_start"
        : taskKey === "cleanup"
          ? "after_check_out"
          : "at_check_in",
    offsetMinutes: taskKey === "setup" ? 15 : taskKey === "cleanup" ? 15 : 0,
    assignedStaffRole:
      module.staffAssignment.requiredRole === "custom"
        ? (module.staffAssignment.customRoleName ?? "custom")
        : module.staffAssignment.requiredRole,
    requiresCompletionNote: taskKey !== "execution",
    requiresPhotoProof: false,
  }));
}

export function createDefaultCustomServiceWorkflowQuestionnaire(
  overrides?: Partial<CustomServiceWorkflowQuestionnaire>,
): CustomServiceWorkflowQuestionnaire {
  return {
    appearsOnCalendar: true,
    calendarColor: "#3b82f6",
    calendarCardDisplayMode: "full-block",
    requiresTimeSlots: true,
    requiresResource: false,
    resourceType: "other",
    resourceIds: [],
    requiresCheckInOut: true,
    generatesTasks: false,
    taskTemplates: [],
    allowsAddOns: true,
    allowedAddOnIds: [],
    bookableOnline: true,
    onlineLeadTimeHours: undefined,
    onlineCapacityLimit: undefined,
    affectsCapacityHeatmap: true,
    capacityCeilingPerHour: undefined,
    questionnaireCompleted: false,
    questionnaireCompletedAt: undefined,
    ...overrides,
  };
}

export function getModuleWorkflowQuestionnaire(
  module: CustomServiceModule,
): CustomServiceWorkflowQuestionnaire {
  const inferred = createDefaultCustomServiceWorkflowQuestionnaire({
    appearsOnCalendar: module.calendar.enabled,
    calendarColor: toHexColor(module.iconColor),
    calendarCardDisplayMode: "full-block",
    requiresTimeSlots: module.calendar.enabled,
    requiresResource:
      module.calendar.assignedTo === "resource" ||
      module.calendar.assignedTo === "room" ||
      module.calendar.assignedTo === "combination",
    resourceType: inferResourceType(module),
    resourceIds: module.calendar.assignedResourceIds ?? [],
    requiresCheckInOut: module.checkInOut.enabled,
    generatesTasks: (module.staffAssignment.taskGeneration ?? []).length > 0,
    taskTemplates: inferTaskTemplates(module),
    allowsAddOns: module.category !== "addon_only",
    allowedAddOnIds: [],
    bookableOnline: module.onlineBooking.enabled,
    onlineLeadTimeHours: module.onlineBooking.cancellationPolicy.hoursBeforeBooking,
    onlineCapacityLimit: module.capacity?.maxPerSlot,
    affectsCapacityHeatmap:
      module.capacity?.enabled ?? module.calendar.maxSimultaneousBookings > 0,
    capacityCeilingPerHour: module.capacity?.maxPerSlot,
    questionnaireCompleted: true,
  });

  if (!module.workflow) {
    return inferred;
  }

  return {
    ...inferred,
    ...module.workflow,
    resourceIds: module.workflow.resourceIds ?? inferred.resourceIds,
    taskTemplates: module.workflow.taskTemplates ?? inferred.taskTemplates,
    allowedAddOnIds: module.workflow.allowedAddOnIds ?? inferred.allowedAddOnIds,
  };
}

export function normalizeCustomServiceModule(
  module: CustomServiceModule,
): CustomServiceModule {
  const workflow = getModuleWorkflowQuestionnaire(module);

  return {
    ...module,
    calendar: {
      ...module.calendar,
      enabled: workflow.appearsOnCalendar,
      assignedResourceIds: workflow.requiresResource
        ? workflow.resourceIds
        : module.calendar.assignedResourceIds,
    },
    checkInOut: {
      ...module.checkInOut,
      enabled: workflow.requiresCheckInOut,
    },
    onlineBooking: {
      ...module.onlineBooking,
      enabled: workflow.bookableOnline,
    },
    capacity: {
      enabled: workflow.affectsCapacityHeatmap,
      maxPerSlot: workflow.capacityCeilingPerHour ?? module.capacity?.maxPerSlot ?? 1,
      slotDurationMinutes: module.capacity?.slotDurationMinutes ?? 60,
      resources: module.capacity?.resources ?? [],
      waitlistEnabled: module.capacity?.waitlistEnabled ?? false,
      maxWaitlist: module.capacity?.maxWaitlist ?? 0,
      autoPromote: module.capacity?.autoPromote ?? false,
      notifyOnAvailability: module.capacity?.notifyOnAvailability ?? false,
    },
    staffAssignment: {
      ...module.staffAssignment,
      taskGeneration: workflow.generatesTasks
        ? module.staffAssignment.taskGeneration
        : [],
    },
    workflow,
  };
}

// ========================================
// FACTORY FUNCTION
// ========================================

export function createDefaultCustomServiceModule(
  facilityId: number,
): CustomServiceModule {
  const now = new Date().toISOString();
  return {
    id: `csm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    facilityId,
    name: "",
    slug: "",
    icon: "PawPrint",
    iconColor: "blue-500",
    iconColorTo: "indigo-500",
    category: "timed_session",
    description: "",
    internalNotes: "",
    calendar: {
      enabled: true,
      durationMode: "fixed",
      durationOptions: [{ minutes: 60, label: "60 min" }],
      bufferTimeMinutes: 15,
      maxSimultaneousBookings: 1,
      assignedTo: "staff",
      assignedResourceIds: [],
    },
    checkInOut: {
      enabled: true,
      checkInType: "manual",
      checkOutTimeTracking: true,
      qrCodeSupport: false,
    },
    stayBased: {
      enabled: false,
      requiresRoomKennel: false,
      affectsKennelView: false,
      generatesDailyTasks: false,
    },
    onlineBooking: {
      enabled: true,
      eligibleClients: "all",
      approvalRequired: false,
      maxDogsPerSession: 1,
      cancellationPolicy: { hoursBeforeBooking: 24, feePercentage: 0 },
      depositRequired: false,
    },
    pricing: {
      model: "flat_rate",
      basePrice: 0,
      taxable: true,
      tipAllowed: false,
      membershipDiscountEligible: false,
    },
    staffAssignment: {
      autoAssign: false,
      requiredRole: "general",
      taskGeneration: [],
    },
    careInstructions: {
      feeding: "optional",
      medication: "optional",
      belongings: "optional",
    },
    yipyyGoRequired: false,
    requiresEvaluation: false,
    showInSidebar: true,
    sidebarPosition: 100,
    dependencies: [],
    workflow: createDefaultCustomServiceWorkflowQuestionnaire({
      appearsOnCalendar: true,
      requiresTimeSlots: true,
      requiresResource: false,
      resourceIds: [],
      requiresCheckInOut: true,
      generatesTasks: false,
      allowsAddOns: true,
      allowedAddOnIds: [],
      bookableOnline: true,
      affectsCapacityHeatmap: true,
      questionnaireCompleted: false,
    }),
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}

// ========================================
// SEED DATA — FACILITY RESOURCES
// ========================================

export const defaultFacilityResources: FacilityResource[] = [
  {
    id: "res-pool-1",
    facilityId: 11,
    name: "Main Pool",
    type: "pool",
    capacity: 8,
    isAvailable: true,
    description: "Heated indoor pool for swim sessions and aqua therapy",
  },
  {
    id: "res-van-1",
    facilityId: 11,
    name: "Van #1",
    type: "van",
    capacity: 4,
    isAvailable: true,
    description: "Primary pickup/drop-off van",
  },
  {
    id: "res-van-2",
    facilityId: 11,
    name: "Van #2",
    type: "van",
    capacity: 4,
    isAvailable: true,
    description: "Secondary pickup/drop-off van",
  },
  {
    id: "res-party-room",
    facilityId: 11,
    name: "Party Room",
    type: "room",
    capacity: 15,
    isAvailable: true,
    description: "Decorated event room for birthday parties and socials",
  },
];

// ========================================
// SEED DATA — CUSTOM SERVICE MODULES
// ========================================

export const defaultCustomServiceModules: CustomServiceModule[] = [
  {
    id: "csm-yodas-splash",
    facilityId: 11,
    name: "Yoda's Splash",
    slug: "yodas-splash",
    icon: "Droplets",
    iconColor: "cyan-500",
    iconColorTo: "blue-500",
    category: "timed_session",
    description:
      "Supervised swim sessions in our heated indoor pool. Perfect for exercise, rehab, or just fun!",
    internalNotes: "Pool must be cleaned 15 min before each session",
    calendar: {
      enabled: true,
      durationMode: "variable",
      durationOptions: [
        { minutes: 30, label: "30 min", price: 25 },
        { minutes: 60, label: "60 min", price: 40 },
      ],
      bufferTimeMinutes: 15,
      maxSimultaneousBookings: 4,
      assignedTo: "resource",
      assignedResourceIds: ["res-pool-1"],
    },
    checkInOut: {
      enabled: true,
      checkInType: "manual",
      checkOutTimeTracking: true,
      qrCodeSupport: true,
    },
    stayBased: {
      enabled: false,
      requiresRoomKennel: false,
      affectsKennelView: false,
      generatesDailyTasks: false,
    },
    onlineBooking: {
      enabled: true,
      eligibleClients: "all",
      approvalRequired: false,
      maxDogsPerSession: 2,
      cancellationPolicy: { hoursBeforeBooking: 12, feePercentage: 50 },
      depositRequired: true,
      depositAmount: 10,
    },
    pricing: {
      model: "duration_based",
      basePrice: 25,
      durationTiers: [
        { durationMinutes: 30, price: 25 },
        { durationMinutes: 60, price: 40 },
      ],
      taxable: true,
      tipAllowed: true,
      membershipDiscountEligible: true,
    },
    staffAssignment: {
      autoAssign: true,
      requiredRole: "pool_staff",
      taskGeneration: ["setup", "execution", "cleanup"],
    },
    yipyyGoRequired: true,
    yipyyGo: {
      enabled: true,
      sendBeforeHours: 24,
      required: true,
      standardSections: {
        belongings: true,
        feeding: false,
        medications: true,
        behaviorNotes: true,
        addOns: true,
        tip: true,
      },
      customSections: [
        {
          id: "waiver",
          name: "Swimming Waiver",
          icon: "📋",
          type: "yes_no",
          required: true,
          items: [
            {
              id: "w1",
              label:
                "I confirm my pet is healthy, has no open wounds, and is cleared for swimming",
              required: true,
            },
          ],
        },
        {
          id: "pool-prefs",
          name: "Pool Preferences",
          icon: "🏊",
          type: "checklist",
          required: false,
          items: [
            { id: "p1", label: "Bringing own towel", required: false },
            { id: "p2", label: "Life jacket needed", required: false },
            { id: "p3", label: "Warm water preferred", required: false },
          ],
        },
      ],
    },
    requiresEvaluation: true,
    showInSidebar: true,
    sidebarPosition: 10,
    dependencies: [],
    eligibilityRules: {
      enabled: true,
      operator: "all",
      conditions: [
        {
          id: "ec-1",
          type: "pet_type",
          operator: "equals",
          value: "Dog",
          label: "Only dogs allowed in pool",
        },
        {
          id: "ec-2",
          type: "evaluation",
          operator: "has",
          value: "swim",
          label: "Pet must have passed swim evaluation",
        },
        {
          id: "ec-3",
          type: "weight",
          operator: "less_than",
          value: 100,
          label: "Pet must be under 100 lbs",
        },
      ],
      deniedMessage:
        "This service requires a passed swim evaluation and the pet must be a dog under 100 lbs.",
    },
    serviceDependencies: {
      requiresServices: [
        {
          moduleId: "boarding",
          moduleName: "Boarding",
          type: "concurrent",
        },
      ],
    },
    capacity: {
      enabled: true,
      maxPerSlot: 3,
      slotDurationMinutes: 45,
      resources: [
        {
          id: "pool-main",
          name: "Main Pool",
          type: "pool",
          maxConcurrent: 3,
          shared: false,
        },
        {
          id: "pool-therapy",
          name: "Therapy Pool",
          type: "pool",
          maxConcurrent: 1,
          shared: false,
        },
      ],
      waitlistEnabled: true,
      maxWaitlist: 5,
      autoPromote: true,
      notifyOnAvailability: true,
    },
    workflow: createDefaultCustomServiceWorkflowQuestionnaire({
      appearsOnCalendar: true,
      calendarColor: "#06b6d4",
      calendarCardDisplayMode: "full-block",
      requiresTimeSlots: true,
      requiresResource: true,
      resourceType: "pool",
      resourceIds: ["res-pool-1"],
      requiresCheckInOut: true,
      generatesTasks: true,
      taskTemplates: [
        {
          id: "yoda-setup",
          taskName: "Pool prep",
          taskType: "care",
          timingRule: "before_start",
          offsetMinutes: 30,
          assignedStaffRole: "pool_staff",
          requiresCompletionNote: true,
          requiresPhotoProof: false,
        },
        {
          id: "yoda-towel-ready",
          taskName: "Towel ready",
          taskType: "care",
          timingRule: "before_start",
          offsetMinutes: 15,
          assignedStaffRole: "pool_staff",
          requiresCompletionNote: false,
          requiresPhotoProof: false,
        },
        {
          id: "yoda-rinse-dry",
          taskName: "Rinse and dry",
          taskType: "cleanup",
          timingRule: "after_check_out",
          offsetMinutes: 0,
          assignedStaffRole: "groomer",
          requiresCompletionNote: true,
          requiresPhotoProof: true,
        },
      ],
      allowsAddOns: true,
      allowedAddOnIds: [
        "towel-service",
        "premium-shampoo-rinse",
        "blueberry-facial",
      ],
      bookableOnline: true,
      onlineLeadTimeHours: 24,
      onlineCapacityLimit: 2,
      affectsCapacityHeatmap: true,
      capacityCeilingPerHour: 2,
      questionnaireCompleted: true,
      questionnaireCompletedAt: "2024-09-15T10:00:00Z",
    }),
    status: "active",
    createdAt: "2024-09-15T10:00:00Z",
    updatedAt: "2024-11-20T14:30:00Z",
  },
  {
    id: "csm-paws-express",
    facilityId: 11,
    name: "Paws Express",
    slug: "paws-express",
    icon: "Car",
    iconColor: "green-500",
    iconColorTo: "emerald-500",
    category: "transport",
    description:
      "Door-to-door chauffeur service. We pick up and drop off your pet safely and on time.",
    internalNotes: "Check van gas level before each route",
    calendar: {
      enabled: true,
      durationMode: "fixed",
      durationOptions: [{ minutes: 45, label: "Route" }],
      bufferTimeMinutes: 0,
      maxSimultaneousBookings: 1,
      assignedTo: "resource",
      assignedResourceIds: ["res-van-1", "res-van-2"],
    },
    checkInOut: {
      enabled: true,
      checkInType: "manual",
      checkOutTimeTracking: true,
      qrCodeSupport: false,
    },
    stayBased: {
      enabled: false,
      requiresRoomKennel: false,
      affectsKennelView: false,
      generatesDailyTasks: false,
    },
    onlineBooking: {
      enabled: true,
      eligibleClients: "approved_only",
      approvalRequired: true,
      maxDogsPerSession: 4,
      cancellationPolicy: { hoursBeforeBooking: 24, feePercentage: 100 },
      depositRequired: false,
    },
    pricing: {
      model: "per_route",
      basePrice: 30,
      taxable: true,
      tipAllowed: true,
      membershipDiscountEligible: false,
    },
    staffAssignment: {
      autoAssign: true,
      requiredRole: "driver",
      taskGeneration: ["execution"],
    },
    yipyyGoRequired: true,
    yipyyGo: {
      enabled: true,
      sendBeforeHours: 48,
      required: true,
      standardSections: {
        belongings: true,
        feeding: false,
        medications: true,
        behaviorNotes: true,
        addOns: false,
        tip: true,
      },
      customSections: [
        {
          id: "pickup",
          name: "Pickup Instructions",
          icon: "📍",
          type: "text_fields",
          required: true,
          items: [
            {
              id: "addr",
              label: "Pickup address",
              required: true,
              placeholder: "123 Main St, Apt 4B",
            },
            {
              id: "gate",
              label: "Gate/buzzer code",
              required: false,
              placeholder: "Buzz #42",
            },
            {
              id: "notes",
              label: "Special pickup instructions",
              required: false,
              type: "textarea",
              placeholder: "Dog will be in the backyard...",
            },
          ],
        },
        {
          id: "emergency",
          name: "Emergency Contact Confirmation",
          icon: "🚨",
          type: "yes_no",
          required: true,
          items: [
            {
              id: "e1",
              label: "I confirm my emergency contact information is up to date",
              required: true,
            },
          ],
        },
      ],
    },
    requiresEvaluation: false,
    showInSidebar: true,
    sidebarPosition: 20,
    dependencies: [],
    capacity: {
      enabled: true,
      maxPerSlot: 6,
      slotDurationMinutes: 120,
      resources: [
        {
          id: "van-1",
          name: "Van #1 — West Route",
          type: "vehicle",
          maxConcurrent: 6,
          shared: false,
        },
        {
          id: "van-2",
          name: "Van #2 — East Route",
          type: "vehicle",
          maxConcurrent: 6,
          shared: false,
        },
      ],
      waitlistEnabled: true,
      maxWaitlist: 3,
      autoPromote: false,
      notifyOnAvailability: true,
    },
    workflow: createDefaultCustomServiceWorkflowQuestionnaire({
      appearsOnCalendar: true,
      calendarColor: "#22c55e",
      calendarCardDisplayMode: "compact-block",
      requiresTimeSlots: true,
      requiresResource: true,
      resourceType: "van",
      resourceIds: ["res-van-1", "res-van-2"],
      requiresCheckInOut: true,
      generatesTasks: true,
      taskTemplates: [
        {
          id: "express-route-check",
          taskName: "Route readiness check",
          taskType: "care",
          timingRule: "before_start",
          offsetMinutes: 20,
          assignedStaffRole: "driver",
          requiresCompletionNote: true,
          requiresPhotoProof: false,
        },
        {
          id: "express-trip-complete",
          taskName: "Trip completion log",
          taskType: "cleanup",
          timingRule: "after_check_out",
          offsetMinutes: 10,
          assignedStaffRole: "driver",
          requiresCompletionNote: true,
          requiresPhotoProof: false,
        },
      ],
      allowsAddOns: false,
      allowedAddOnIds: [],
      bookableOnline: true,
      onlineLeadTimeHours: 24,
      onlineCapacityLimit: 6,
      affectsCapacityHeatmap: true,
      capacityCeilingPerHour: 6,
      questionnaireCompleted: true,
      questionnaireCompletedAt: "2024-10-01T09:00:00Z",
    }),
    status: "active",
    createdAt: "2024-10-01T09:00:00Z",
    updatedAt: "2024-12-05T11:00:00Z",
  },
  {
    id: "csm-birthday-pawty",
    facilityId: 11,
    name: "Birthday Pawty",
    slug: "birthday-pawty",
    icon: "PartyPopper",
    iconColor: "pink-500",
    iconColorTo: "orange-500",
    category: "event_based",
    description:
      "Celebrate your furry friend's special day with a party package including treats, decorations, and photos!",
    internalNotes:
      "Confirm decorations 48 hours prior. Cake must be ordered from approved vendor.",
    calendar: {
      enabled: true,
      durationMode: "fixed",
      durationOptions: [{ minutes: 120, label: "2 hours" }],
      bufferTimeMinutes: 60,
      maxSimultaneousBookings: 1,
      assignedTo: "resource",
      assignedResourceIds: ["res-party-room"],
    },
    checkInOut: {
      enabled: true,
      checkInType: "manual",
      checkOutTimeTracking: true,
      qrCodeSupport: false,
    },
    stayBased: {
      enabled: false,
      requiresRoomKennel: false,
      affectsKennelView: false,
      generatesDailyTasks: false,
    },
    onlineBooking: {
      enabled: true,
      eligibleClients: "all",
      approvalRequired: true,
      maxDogsPerSession: 10,
      cancellationPolicy: { hoursBeforeBooking: 48, feePercentage: 50 },
      depositRequired: true,
      depositAmount: 50,
    },
    pricing: {
      model: "per_booking",
      basePrice: 200,
      taxable: true,
      tipAllowed: true,
      membershipDiscountEligible: true,
    },
    staffAssignment: {
      autoAssign: true,
      requiredRole: "custom",
      customRoleName: "Party Host",
      taskGeneration: ["setup", "execution", "cleanup"],
    },
    yipyyGoRequired: false,
    requiresEvaluation: false,
    showInSidebar: true,
    sidebarPosition: 30,
    dependencies: [],
    workflow: createDefaultCustomServiceWorkflowQuestionnaire({
      appearsOnCalendar: true,
      calendarColor: "#ec4899",
      calendarCardDisplayMode: "full-block",
      requiresTimeSlots: true,
      requiresResource: true,
      resourceType: "room",
      resourceIds: ["res-party-room"],
      requiresCheckInOut: true,
      generatesTasks: true,
      taskTemplates: [
        {
          id: "party-setup",
          taskName: "Party room setup",
          taskType: "care",
          timingRule: "before_start",
          offsetMinutes: 30,
          assignedStaffRole: "party_host",
          requiresCompletionNote: true,
          requiresPhotoProof: false,
        },
      ],
      allowsAddOns: true,
      allowedAddOnIds: ["towel-service", "blueberry-facial"],
      bookableOnline: true,
      onlineLeadTimeHours: 48,
      onlineCapacityLimit: 1,
      affectsCapacityHeatmap: true,
      capacityCeilingPerHour: 1,
      questionnaireCompleted: true,
      questionnaireCompletedAt: "2024-11-10T08:00:00Z",
    }),
    status: "draft",
    createdAt: "2024-11-10T08:00:00Z",
    updatedAt: "2024-11-10T08:00:00Z",
  },
];
