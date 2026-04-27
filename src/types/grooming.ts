import { z } from "zod";

import { depositTypeEnum, petSizeEnum } from "./base";

// ============================================================================
// Grooming-Specific Enums
// ============================================================================

export const groomingStatusEnum = z.enum([
  "scheduled",
  "checked-in",
  "in-progress",
  "ready-for-pickup",
  "completed",
  "cancelled",
  "no-show",
]);
export type GroomingStatus = z.infer<typeof groomingStatusEnum>;

export const coatTypeEnum = z.enum([
  "short",
  "medium",
  "long",
  "wire",
  "curly",
  "double",
]);
export type CoatType = z.infer<typeof coatTypeEnum>;

export const productCategoryEnum = z.enum([
  "shampoo",
  "conditioner",
  "styling",
  "tools",
  "accessories",
  "health",
  "cleaning",
]);
export type ProductCategory = z.infer<typeof productCategoryEnum>;

export const measurementUnitEnum = z.enum([
  "ml",
  "oz",
  "g",
  "liter",
  "gallon",
  "count",
  "pack",
  "pair",
]);
export type MeasurementUnit = z.infer<typeof measurementUnitEnum>;

export const itemTypeEnum = z.enum(["consumable", "tool"]);
export type ItemType = z.infer<typeof itemTypeEnum>;

export const toolConditionEnum = z.enum(["good", "needs-service", "retired"]);
export type ToolCondition = z.infer<typeof toolConditionEnum>;

export const stylistSkillLevelEnum = z.enum([
  "junior",
  "intermediate",
  "senior",
  "master",
]);
export type StylistSkillLevel = z.infer<typeof stylistSkillLevelEnum>;

export const priceAdjustmentReasonEnum = z.enum([
  "matting-fee",
  "de-shedding-upgrade",
  "extra-brushing-time",
  "behavioral-handling",
  "extra-time-required",
  "product-upgrade",
  "special-treatment",
  "other",
]);
export type PriceAdjustmentReason = z.infer<typeof priceAdjustmentReasonEnum>;

export const groomerSelectionModeEnum = z.enum([
  "stealth",
  "optional",
  "tier-only",
  "full-choice",
]);
export type GroomerSelectionMode = z.infer<typeof groomerSelectionModeEnum>;

// ============================================================================
// Stylist
// ============================================================================

export const stylistCapacitySchema = z.object({
  maxDailyAppointments: z.number(),
  maxConcurrentAppointments: z.number(),
  preferredPetSizes: z.array(petSizeEnum),
  skillLevel: stylistSkillLevelEnum,
  canHandleMatted: z.boolean(),
  canHandleAnxious: z.boolean(),
  canHandleAggressive: z.boolean(),
});
export type StylistCapacity = z.infer<typeof stylistCapacitySchema>;

export const stylistSchema = z.object({
  id: z.string(),
  staffId: z.string().optional(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  photoUrl: z.string().optional(),
  specializations: z.array(z.string()),
  certifications: z.array(z.string()),
  yearsExperience: z.number(),
  status: z.enum(["active", "inactive", "on-leave"]),
  bio: z.string(),
  rating: z.number(),
  totalAppointments: z.number(),
  hireDate: z.string(),
  capacity: stylistCapacitySchema,
  visibleOnline: z.boolean().optional(),
});
export type Stylist = z.infer<typeof stylistSchema>;

export const stylistAvailabilitySchema = z.object({
  id: z.string(),
  stylistId: z.string(),
  stylistName: z.string(),
  dayOfWeek: z.number(),
  startTime: z.string(),
  endTime: z.string(),
  isAvailable: z.boolean(),
});
export type StylistAvailability = z.infer<typeof stylistAvailabilitySchema>;

export const stylistTimeOffSchema = z.object({
  id: z.string(),
  stylistId: z.string(),
  stylistName: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string(),
  status: z.enum(["pending", "approved", "denied"]),
});
export type StylistTimeOff = z.infer<typeof stylistTimeOffSchema>;

// ============================================================================
// Appointments & Intake
// ============================================================================

export const groomingIntakeSchema = z.object({
  coatCondition: z.enum(["normal", "matted", "severely-matted"]),
  behaviorNotes: z.string(),
  allergies: z.array(z.string()),
  specialInstructions: z.string(),
  beforePhotos: z.array(z.string()),
  mattingFeeWarning: z.boolean(),
  mattingFeeAmount: z.number().optional(),
  completedBy: z.string().optional(),
  completedAt: z.string().optional(),
});
export type GroomingIntake = z.infer<typeof groomingIntakeSchema>;

export const priceAdjustmentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  reason: priceAdjustmentReasonEnum,
  customReason: z.string().optional(),
  description: z.string(),
  addedBy: z.string(),
  addedAt: z.string(),
  customerNotified: z.boolean(),
  notifiedAt: z.string().optional(),
});
export type PriceAdjustment = z.infer<typeof priceAdjustmentSchema>;

export const groomingPhotoSchema = z.object({
  id: z.string(),
  url: z.string(),
  type: z.enum(["before", "after"]),
  caption: z.string().optional(),
  takenAt: z.string(),
  takenBy: z.string(),
});
export type GroomingPhoto = z.infer<typeof groomingPhotoSchema>;

export const groomingAppointmentSchema = z.object({
  id: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  petId: z.number(),
  petName: z.string(),
  petBreed: z.string(),
  petSize: petSizeEnum,
  petWeight: z.number(),
  coatType: coatTypeEnum,
  petPhotoUrl: z.string().optional(),
  ownerId: z.number(),
  ownerName: z.string(),
  ownerPhone: z.string(),
  ownerEmail: z.string(),
  stylistId: z.string(),
  stylistName: z.string(),
  packageId: z.string(),
  packageName: z.string(),
  addOns: z.array(z.string()),
  basePrice: z.number(),
  priceAdjustments: z.array(priceAdjustmentSchema),
  totalPrice: z.number(),
  status: groomingStatusEnum,
  checkInTime: z.string().nullable(),
  checkOutTime: z.string().nullable(),
  notes: z.string(),
  specialInstructions: z.string(),
  allergies: z.array(z.string()),
  intake: groomingIntakeSchema.optional(),
  afterPhotos: z.array(groomingPhotoSchema).optional(),
  lastGroomDate: z.string().optional(),
  createdAt: z.string(),
  onlineBooking: z.boolean(),
});
export type GroomingAppointment = z.infer<typeof groomingAppointmentSchema>;

// ============================================================================
// Packages, Products & Inventory
// ============================================================================

export const productUsageSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number(),
  unit: z.string(),
  isOptional: z.boolean().optional(),
});
export type ProductUsage = z.infer<typeof productUsageSchema>;

export const groomingPackageSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  basePrice: z.number(),
  duration: z.number(),
  sizePricing: z.object({
    small: z.number(),
    medium: z.number(),
    large: z.number(),
    giant: z.number(),
  }),
  includes: z.array(z.string()),
  isActive: z.boolean(),
  isPopular: z.boolean().optional(),
  purchaseCount: z.number(),
  createdAt: z.string(),
  assignedStylistIds: z.array(z.string()).optional(),
  requiresEvaluation: z.boolean().optional(),
  productUsage: z.array(productUsageSchema).optional(),
  color: z.string().optional(),
});
export type GroomingPackage = z.infer<typeof groomingPackageSchema>;

export const groomingAddOnSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  duration: z.number(),
  isActive: z.boolean(),
});
export type GroomingAddOn = z.infer<typeof groomingAddOnSchema>;

export const groomingProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string(),
  category: productCategoryEnum,
  description: z.string(),
  sku: z.string(),
  itemType: itemTypeEnum,
  measurementUnit: measurementUnitEnum,
  currentStock: z.number(),
  minStock: z.number(),
  maxStock: z.number(),
  unitPrice: z.number(),
  costPrice: z.number(),
  supplier: z.string(),
  lastRestocked: z.string(),
  expiryDate: z.string().optional(),
  isActive: z.boolean(),
  notes: z.string().optional(),
  condition: toolConditionEnum.optional(),
  lastServiced: z.string().optional(),
});
export type GroomingProduct = z.infer<typeof groomingProductSchema>;

export const productUsageLogSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  appointmentId: z.string().optional(),
  quantity: z.number(),
  usedBy: z.string(),
  usedAt: z.string(),
  reason: z.enum(["grooming", "waste", "expired", "damaged", "other"]),
  notes: z.string().optional(),
});
export type ProductUsageLog = z.infer<typeof productUsageLogSchema>;

export const inventoryOrderSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  supplier: z.string(),
  status: z.enum(["pending", "ordered", "shipped", "received", "cancelled"]),
  orderedAt: z.string(),
  expectedDelivery: z.string().optional(),
  receivedAt: z.string().optional(),
  orderedBy: z.string(),
});
export type InventoryOrder = z.infer<typeof inventoryOrderSchema>;

// ============================================================================
// Photo Albums
// ============================================================================

export const photoAlbumSchema = z.object({
  id: z.string(),
  appointmentId: z.string(),
  petId: z.number(),
  petName: z.string(),
  date: z.string(),
  stylistId: z.string(),
  stylistName: z.string(),
  beforePhotos: z.array(groomingPhotoSchema),
  afterPhotos: z.array(groomingPhotoSchema),
  notes: z.string().optional(),
  sharedWithOwner: z.boolean(),
  sharedAt: z.string().optional(),
  createdAt: z.string(),
});
export type PhotoAlbum = z.infer<typeof photoAlbumSchema>;

// ============================================================================
// Facility Config (grooming-specific)
// ============================================================================

export const groomingServiceCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  hiddenWhenFullyBooked: z.boolean().optional(),
  fullyBookedWeeksThreshold: z.number().optional(),
});
export type GroomingServiceCategory = z.infer<
  typeof groomingServiceCategorySchema
>;

export const groomingBookingRulesSchema = z.object({
  leadTime: z.object({
    minimumHours: z.number(),
    allowSameDay: z.boolean(),
    allowTomorrow: z.boolean(),
  }),
  groomerSelection: z.object({
    mode: groomerSelectionModeEnum,
    tiers: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().optional(),
        }),
      )
      .optional(),
  }),
  deposit: z.object({
    type: depositTypeEnum,
    amount: z.number().optional(),
    percentage: z.number().optional(),
    refundable: z.boolean(),
    requiredAtBooking: z.boolean(),
  }),
  serviceVisibility: z.object({
    categories: z.array(groomingServiceCategorySchema),
    hideFullyBookedCategories: z.boolean(),
  }),
  vaccination: z.object({
    requireRecordsBeforeBooking: z.boolean(),
    requiredVaccines: z.array(z.string()),
  }),
});
export type GroomingBookingRules = z.infer<typeof groomingBookingRulesSchema>;

export const groomingFacilityConfigSchema = z.object({
  enabled: z.boolean(),
  bookingRules: groomingBookingRulesSchema,
  operatingHours: z.object({
    monday: z.object({ open: z.string(), close: z.string() }),
    tuesday: z.object({ open: z.string(), close: z.string() }),
    wednesday: z.object({ open: z.string(), close: z.string() }),
    thursday: z.object({ open: z.string(), close: z.string() }),
    friday: z.object({ open: z.string(), close: z.string() }),
    saturday: z.object({ open: z.string(), close: z.string() }),
    sunday: z.object({ open: z.string(), close: z.string() }),
  }),
  serviceTypes: z.object({
    salon: z.boolean(),
    mobile: z.boolean(),
  }),
});
export type GroomingFacilityConfig = z.infer<
  typeof groomingFacilityConfigSchema
>;

export const groomingPreBookingValidationSchema = z.object({
  isAvailable: z.boolean(),
  earliestAvailableDate: z.date().nullable(),
  availableCategories: z.array(groomingServiceCategorySchema),
  groomerSelectionOptions: z.object({
    mode: groomerSelectionModeEnum,
    canSelectGroomer: z.boolean(),
    canSelectTier: z.boolean(),
    showGroomerNames: z.boolean(),
    tiers: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().optional(),
        }),
      )
      .optional(),
  }),
  depositInfo: z.object({
    required: z.boolean(),
    type: depositTypeEnum,
    amount: z.number().optional(),
    percentage: z.number().optional(),
    message: z.string(),
  }),
  validationErrors: z.array(z.string()),
  validationWarnings: z.array(z.string()),
});
export type GroomingPreBookingValidation = z.infer<
  typeof groomingPreBookingValidationSchema
>;

// ============================================================================
// Post-Booking Types
// NOTE: GroomingBookingData overlaps with GroomingAppointment but serves a
// different purpose (post-booking workflow vs appointment record). They use
// different field names (clientId vs ownerId, serviceCategory vs packageName).
// Keep separate until a backend API unifies them.
// ============================================================================

export const groomingBookingDataSchema = z.object({
  id: z.string(),
  clientId: z.number(),
  clientName: z.string(),
  clientEmail: z.string(),
  clientPhone: z.string(),
  petId: z.number(),
  petName: z.string(),
  serviceCategory: z.string(),
  serviceVariant: z.string().optional(),
  addOns: z.array(z.string()),
  groomerId: z.string().optional(),
  groomerName: z.string().optional(),
  groomerTier: z.string().optional(),
  serviceLocation: z.enum(["salon", "mobile"]),
  address: z.string().optional(),
  salonLocationId: z.string().optional(),
  appointmentDate: z.date(),
  appointmentTime: z.string(),
  duration: z.number(),
  totalPrice: z.number(),
  depositAmount: z.number(),
  depositMethod: z.enum(["full", "deposit", "hold", "venue"]),
  recurringEnabled: z.boolean(),
  recurringFrequency: z.number().optional(),
  recurringEndAfter: z.enum(["occurrences", "date", "never"]).optional(),
  recurringOccurrences: z.number().optional(),
  recurringEndDate: z.date().optional(),
  keepSameGroomer: z.boolean().optional(),
  petBehaviorNotes: z.string().optional(),
  specialInstructions: z.string().optional(),
  lastVisitDate: z.date().optional(),
  petNotes: z.string().optional(),
});
export type GroomingBookingData = z.infer<typeof groomingBookingDataSchema>;

export const groomerNotificationSchema = z.object({
  groomerId: z.string(),
  groomerName: z.string(),
  notificationType: z.enum(["app", "sms"]),
  message: z.string(),
  bookingId: z.string(),
});
export type GroomerNotification = z.infer<typeof groomerNotificationSchema>;

export const clientConfirmationSchema = z.object({
  bookingId: z.string(),
  manageBookingLink: z.string(),
  emailSent: z.boolean(),
  smsSent: z.boolean(),
  icsFileGenerated: z.boolean(),
});
export type ClientConfirmation = z.infer<typeof clientConfirmationSchema>;

// ============================================================================
// Stylist Performance & Validation
// ============================================================================

export const stylistPerformanceMetricsSchema = z.object({
  stylistId: z.string(),
  todayAppointments: z.number(),
  totalRevenue: z.number(),
  averageGroomTime: z.number(),
  cancellationRate: z.number(),
  completedCount: z.number(),
  cancelledCount: z.number(),
  totalAppointments: z.number(),
});
export type StylistPerformanceMetrics = z.infer<
  typeof stylistPerformanceMetricsSchema
>;

export const conflictDetailSchema = z.object({
  type: z.enum(["overlap", "capacity", "skill", "availability"]),
  message: z.string(),
  conflictingAppointmentId: z.string().optional(),
  conflictingAppointmentDate: z.string().optional(),
  conflictingAppointmentTime: z.string().optional(),
});
export type ConflictDetail = z.infer<typeof conflictDetailSchema>;

export const stylistConflictSchema = z.object({
  hasConflict: z.boolean(),
  conflicts: z.array(conflictDetailSchema),
  reason: z.string().nullable(),
});
export type StylistConflict = z.infer<typeof stylistConflictSchema>;

export const stylistAvailabilityCheckSchema = z.object({
  isAvailable: z.boolean(),
  canHandlePet: z.boolean(),
  conflicts: stylistConflictSchema,
  dailyAppointmentCount: z.number(),
  remainingCapacity: z.number(),
});
export type StylistAvailabilityCheck = z.infer<
  typeof stylistAvailabilityCheckSchema
>;

// ============================================================================
// Inventory Deduction
// ============================================================================

export const deductionResultSchema = z.object({
  success: z.boolean(),
  deductions: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      quantityDeducted: z.number(),
      remainingStock: z.number(),
      wasLowStock: z.boolean(),
      isNowLowStock: z.boolean(),
    }),
  ),
  errors: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      reason: z.string(),
    }),
  ),
  usageLogs: z.array(productUsageLogSchema),
});
export type DeductionResult = z.infer<typeof deductionResultSchema>;

// ============================================================================
// Display Helpers
// ============================================================================

/** Maps canonical PetSize values to short display labels used in booking UI */
export const PET_SIZE_LABELS = {
  small: "S",
  medium: "M",
  large: "L",
  giant: "XL",
} as const;
export type PetSizeLabel =
  (typeof PET_SIZE_LABELS)[keyof typeof PET_SIZE_LABELS];
