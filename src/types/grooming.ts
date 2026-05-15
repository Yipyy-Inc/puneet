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
  /** Weekly booking ceiling. Scheduling system uses this to prevent burnout. */
  maxWeeklyAppointments: z.number().optional(),
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
  /** Hex color used on the day-view calendar to identify this stylist's blocks. */
  calendarColor: z.string().optional(),
  /** Service/package ids this stylist is explicitly qualified to perform. */
  qualifiedPackageIds: z.array(z.string()).optional(),
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

// ============================================================================
// Mobile Grooming — Vans
// ============================================================================

/**
 * Service area drawn on a map. Two modes:
 *   - "postal" — explicit list of postal/zip codes the van covers.
 *   - "radius" — center address with a radius in kilometres. Real address
 *     matching needs geocoding; we store the raw values and offer an explicit
 *     `centerLat`/`centerLng` for future use.
 * `dayOfWeek` is 0=Sunday … 6=Saturday so an area can be active on specific days.
 */
export const serviceAreaSchema = z.object({
  id: z.string(),
  facilityId: z.number(),
  name: z.string(),
  type: z.enum(["postal", "radius"]),
  postalCodes: z.array(z.string()).optional(),
  centerAddress: z.string().optional(),
  centerLat: z.number().optional(),
  centerLng: z.number().optional(),
  radiusKm: z.number().optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)),
  active: z.boolean(),
  color: z.string().optional(),
});
export type ServiceArea = z.infer<typeof serviceAreaSchema>;

/**
 * Mobile-grooming travel zone. The facility defines concentric distance
 * brackets from its home base ("Zone 1: 0–5 mi, Zone 2: 5–15 mi, …") and
 * each zone adds a travel surcharge that appears as its own line item on
 * the booking invoice. Surcharges can be flat dollar amounts or a
 * percentage of the service subtotal — `mode` encodes which.
 *
 * Resolution: the zone whose `maxMiles` is the smallest value still ≥
 * the client's distance wins. A pet at 7 miles falls into Zone 2 (max 15)
 * even if Zone 3 (max 25) also matches.
 */
export const travelZoneSchema = z.object({
  id: z.string(),
  label: z.string(),
  /** Inclusive upper bound, in miles, from the facility's base address. */
  maxMiles: z.number().nonnegative(),
  /** Surcharge mode — flat dollar amount or percent of service subtotal. */
  surchargeMode: z.enum(["flat", "percent"]),
  /** Surcharge value — dollars when mode = "flat", percent when "percent". */
  surchargeAmount: z.number().nonnegative(),
  active: z.boolean(),
});
export type TravelZone = z.infer<typeof travelZoneSchema>;

/**
 * Per-ZIP / postal-code tax rate. Different jurisdictions have different
 * sales tax rates and mobile-grooming businesses cross those boundaries on
 * a single route. The `prefix` is matched by longest-prefix-wins so a more
 * specific 5-char ZIP overrides a general 3-char one.
 *
 * Set `isDefault` on exactly one row to make it the fallback when no
 * prefix matches.
 */
export const zipTaxRateSchema = z.object({
  id: z.string(),
  /** ZIP or Canadian postal-code prefix (case-insensitive, no spaces). */
  prefix: z.string(),
  /** Combined tax rate as a percentage (e.g. 14.975 for QC). */
  ratePercent: z.number().nonnegative(),
  /** Human-readable jurisdiction label shown on the invoice line. */
  label: z.string(),
  isDefault: z.boolean().optional(),
});
export type ZipTaxRate = z.infer<typeof zipTaxRateSchema>;

/**
 * Per-staff weekly service-area assignment with per-date overrides ("Certain
 * Area for Certain Days"). The weekly template is the default — "Jessica
 * covers North area every Monday and Wednesday." Specific dates can override
 * without touching the template — "Jessica covers East area on 2026-06-20
 * because of a special event."
 *
 * Map keys:
 *   - weeklyTemplate keys are day-of-week integers 0=Sun … 6=Sat. Value is a
 *     ServiceArea.id, or null if the staff doesn't work that day.
 *   - dateOverrides keys are ISO dates (YYYY-MM-DD). Value is a ServiceArea.id
 *     to override with, or null to mark that specific date as "no area"
 *     (off / unassigned).
 *
 * Resolution: dateOverrides wins if a key exists for the date; otherwise fall
 * back to weeklyTemplate by day-of-week. See {@link getStaffAreaForDate}.
 */
export const staffServiceAreaScheduleSchema = z.object({
  staffId: z.string(),
  weeklyTemplate: z.record(z.string(), z.string().nullable()),
  dateOverrides: z.record(z.string(), z.string().nullable()),
});
export type StaffServiceAreaSchedule = z.infer<
  typeof staffServiceAreaScheduleSchema
>;

/**
 * Real-time GPS ping for a mobile grooming van. Stored only during the van's
 * working hours on the appointment day — all pings older than today are
 * deleted automatically so the system is operationally useful without
 * becoming a privacy concern.
 *
 * Coordinates are optional so the model also captures "tracking active but
 * the device couldn't get a fix" — useful for distinguishing a stopped van
 * from a van whose phone went into a basement.
 */
export const vanLocationPingSchema = z.object({
  id: z.string(),
  vanId: z.string(),
  recordedAt: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  /** Human-readable label — usually the address of the current stop. */
  address: z.string().optional(),
  /** Appointment id the van is currently at, when known. Enables the
   *  expected-duration delay heuristic. */
  currentAppointmentId: z.string().optional(),
});
export type VanLocationPing = z.infer<typeof vanLocationPingSchema>;

/**
 * Derived live status of a van — computed from its ping history. Not a
 * stored field; produced by {@link deriveVanLiveStatus}.
 */
export const vanLiveStatusEnum = z.enum([
  "driving",
  "stopped",
  "no-location",
  "no-data-all-day",
]);
export type VanLiveStatus = z.infer<typeof vanLiveStatusEnum>;

export const mobileGroomingVanSchema = z.object({
  id: z.string(),
  facilityId: z.number(),
  name: z.string(),
  licensePlate: z.string(),
  homeBaseAddress: z.string(),
  /** Staff (groomers) assigned to this van — kept as a flat list for any
   *  downstream consumer that doesn't care about role split. Always equals
   *  [primaryDriverId, secondGroomerId].filter(Boolean). */
  assignedStaffIds: z.array(z.string()),
  /** Required driver / lead groomer for this van. */
  primaryDriverId: z.string().optional(),
  /** Optional second groomer riding along; gets payroll credit too. */
  secondGroomerId: z.string().optional(),
  active: z.boolean(),
  /** Hex color used on the calendar to identify this van's column / blocks. */
  calendarColor: z.string().optional(),
  notes: z.string().optional(),
});
export type MobileGroomingVan = z.infer<typeof mobileGroomingVanSchema>;

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

// A single sequential stage in a split-service appointment. The same booking
// may chain stages — e.g., bath by Sarah, then cut by Marcus — each owned by
// a different stylist with its own time window.
export const appointmentStageSchema = z.object({
  id: z.string(),
  /** Stage label shown on the calendar block and in the panel — "Bath", "Cut", "Blow-dry"… */
  label: z.string(),
  stylistId: z.string(),
  stylistName: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  /** ISO timestamp captured when the stage's groomer marks their portion done. */
  completedAt: z.string().optional(),
});
export type AppointmentStage = z.infer<typeof appointmentStageSchema>;

// One additional pet sharing the same booking (same household, same arrival).
// Has its own service so multi-pet visits can mix Full Groom + Bath, etc.
export const additionalPetSchema = z.object({
  petName: z.string(),
  petBreed: z.string().optional(),
  petSize: petSizeEnum,
  packageId: z.string(),
  packageName: z.string(),
});
export type AdditionalPet = z.infer<typeof additionalPetSchema>;

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

// ============================================================================
// Notes & History
// ============================================================================

/**
 * Critical at-a-glance alert tied to an appointment. Renders the red badge on
 * the calendar card and the prominent banner inside the booking. Multiple are
 * allowed on a single booking — "bites when ears are touched" + "on Apoquel"
 * + "reactive to other dogs" stay as three separate alerts instead of being
 * crammed into one field.
 *
 * `appliesToFuture` tells the carry-forward logic to surface this alert on
 * every future appointment for the same pet. Pet-level alerts are derived
 * from past appointments at render time so editing a single pet's profile
 * immediately propagates to every booking in the calendar.
 */
export const alertNoteSchema = z.object({
  id: z.string(),
  text: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
  appliesToFuture: z.boolean(),
});
export type AlertNote = z.infer<typeof alertNoteSchema>;

/**
 * Internal staff note specific to one appointment. Acts like a chat thread on
 * the booking — bather and groomer leave timestamped messages so handoffs are
 * legible. These never carry over to future appointments.
 */
export const ticketCommentSchema = z.object({
  id: z.string(),
  staff: z.string(),
  message: z.string(),
  at: z.string(),
});
export type TicketComment = z.infer<typeof ticketCommentSchema>;

/**
 * Update-history entry on an appointment. Either a freeform `description`
 * event (created, email sent…) or a structured `fieldChange` with before /
 * after values so accountability is preserved at the field level.
 */
export const appointmentHistoryEntrySchema = z.object({
  id: z.string(),
  at: z.string(),
  staff: z.string(),
  description: z.string().optional(),
  fieldChange: z
    .object({
      field: z.string(),
      before: z.string().nullable(),
      after: z.string().nullable(),
    })
    .optional(),
});
export type AppointmentHistoryEntry = z.infer<
  typeof appointmentHistoryEntrySchema
>;

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
  /**
   * Additional pets from the same household sharing this booking. The primary
   * pet is the one in petName/petBreed/etc above; co-pets are listed here.
   */
  additionalPets: z.array(additionalPetSchema).optional(),
  /**
   * Co-groomers working alongside the primary stylist on this appointment.
   * Used for big-dog jobs or training shadowing. The primary stylist is
   * stylistId/stylistName.
   */
  additionalStylistIds: z.array(z.string()).optional(),
  /**
   * Sequential stages for a split-service appointment (e.g., bath by one
   * stylist then cut by another). When present, the calendar renders one
   * block per stage in its respective groomer's column instead of a single
   * full-length block.
   */
  stages: z.array(appointmentStageSchema).optional(),
  /**
   * Critical alerts shown as a red badge on the calendar card and as a
   * prominent banner inside the booking. See {@link alertNoteSchema}.
   */
  alertNotes: z.array(alertNoteSchema).optional(),
  /**
   * Threaded internal comments left by staff during the appointment.
   * See {@link ticketCommentSchema}.
   */
  ticketComments: z.array(ticketCommentSchema).optional(),
  /**
   * Update history — both freeform events and structured field-level diffs
   * (before / after). See {@link appointmentHistoryEntrySchema}.
   */
  history: z.array(appointmentHistoryEntrySchema).optional(),
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

// ============================================================================
// Age-Group Pricing (per-service modifier by pet age)
// ============================================================================

/**
 * Price adjustment applied when a pet's age matches a rule. Three modes:
 *   - flat-add:      add a fixed dollar amount (e.g. +$10 senior surcharge)
 *   - flat-subtract: subtract a fixed dollar amount (e.g. -$15 puppy discount)
 *   - percent:       signed percentage of the size-default price (e.g. +20%)
 * Amounts are always positive — the mode encodes the direction.
 */
export const ageGroupAdjustmentSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("flat-add"), amount: z.number().nonnegative() }),
  z.object({
    mode: z.literal("flat-subtract"),
    amount: z.number().nonnegative(),
  }),
  z.object({ mode: z.literal("percent"), amount: z.number() }),
]);
export type AgeGroupAdjustment = z.infer<typeof ageGroupAdjustmentSchema>;

/**
 * One age-group pricing rule on a grooming package. The age range is
 * specified in months so puppy ranges (under 12 months) and senior ranges
 * (96+ months / 8+ years) can both be expressed in the same unit. Either
 * bound may be omitted — `minMonths` alone means "and up", `maxMonths`
 * alone means "and below".
 *
 * Rules are evaluated in array order; the first range that contains the
 * pet's age wins. Configure non-overlapping ranges to keep behavior
 * predictable.
 */
export const ageGroupPricingRuleSchema = z.object({
  id: z.string(),
  /** Display label — "Puppy", "Senior", "Adult", or whatever the facility wants. */
  label: z.string(),
  minMonths: z.number().nonnegative().optional(),
  maxMonths: z.number().nonnegative().optional(),
  adjustment: ageGroupAdjustmentSchema,
});
export type AgeGroupPricingRule = z.infer<typeof ageGroupPricingRuleSchema>;

// ============================================================================
// Default Add-On Rules (conditional auto-attach)
// ============================================================================

/**
 * A single condition a pet must satisfy for the parent default-add-on rule
 * to fire. Discriminated by `kind`.
 *
 * Examples:
 *   { kind: "weight-gte", value: 30 }                  // 30 lbs and up
 *   { kind: "pet-size-in", values: ["large", "giant"] }
 *   { kind: "coat-type-in", values: ["double", "long", "wire", "curly"] }
 *   { kind: "breed-includes", value: "Poodle" }         // case-insensitive substring
 */
export const defaultAddOnConditionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("weight-gte"), value: z.number() }),
  z.object({ kind: z.literal("weight-lte"), value: z.number() }),
  z.object({
    kind: z.literal("pet-size-in"),
    values: z.array(petSizeEnum).min(1),
  }),
  z.object({
    kind: z.literal("coat-type-in"),
    values: z.array(coatTypeEnum).min(1),
  }),
  z.object({ kind: z.literal("breed-includes"), value: z.string() }),
]);
export type DefaultAddOnCondition = z.infer<typeof defaultAddOnConditionSchema>;

/**
 * One default-add-on rule attached to a grooming package. With no conditions
 * the add-on is always attached when the package is booked; with conditions
 * the add-on is only attached when the pet satisfies ALL of them.
 */
export const defaultAddOnRuleSchema = z.object({
  addOnId: z.string(),
  conditions: z.array(defaultAddOnConditionSchema).optional(),
});
export type DefaultAddOnRule = z.infer<typeof defaultAddOnRuleSchema>;

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
  coatAdjustments: z
    .object({
      short: z.number(),
      medium: z.number(),
      long: z.number(),
      wire: z.number(),
      curly: z.number(),
      double: z.number(),
    })
    .partial()
    .optional(),
  breedOverrides: z.record(z.string(), z.number()).optional(),
  includes: z.array(z.string()),
  isActive: z.boolean(),
  isPopular: z.boolean().optional(),
  purchaseCount: z.number(),
  createdAt: z.string(),
  assignedStylistIds: z.array(z.string()).optional(),
  requiresEvaluation: z.boolean().optional(),
  productUsage: z.array(productUsageSchema).optional(),
  color: z.string().optional(),
  /** Optional photo/icon URL shown to clients on the online booking page. */
  imageUrl: z.string().optional(),
  /** Minimum hours of advance notice required for online bookings. Staff can override manually. */
  minBookingNoticeHours: z.number().optional(),
  /** Maximum number of times this service can be booked per calendar day across all groomers. */
  maxPerDay: z.number().optional(),
  /**
   * Per-stylist price overrides for this package, keyed by stylistId. Lets a
   * senior groomer charge $95 for the same service the rest of the team
   * charges $80. Sits between pet-specific custom prices and the package
   * default in the resolution priority. See {@link resolveEffectivePricing}.
   */
  stylistPricing: z.record(z.string(), z.number()).optional(),
  /**
   * Add-ons that auto-attach when this package is booked. Each rule can
   * optionally restrict the auto-attach to pets matching its conditions —
   * "Teeth Brushing for every Full Groom" is unconditional; "De-shedding
   * Treatment only for double-coat breeds" carries a coat-type condition.
   * Conditions on a single rule are AND-ed together. Resolved at booking
   * time by {@link resolveAutoAddOns}.
   */
  defaultAddOns: z.array(defaultAddOnRuleSchema).optional(),
  /**
   * Age-group pricing modifiers — the fourth pricing dimension alongside
   * size, breed, and coat. Each rule defines an age range (in months) and
   * an adjustment that's applied on top of the size-default price.
   *
   * Resolution: pet-specific overrides and stylist-specific package prices
   * skip age adjustment (those are explicit overrides). The size-default
   * tier applies the matching age rule's adjustment. See
   * {@link resolveEffectivePricing}.
   */
  ageGroupPricing: z.array(ageGroupPricingRuleSchema).optional(),
  /**
   * Eligibility filters — when any of these are set, the service is only
   * offered for pets matching the listed sizes / coats / breeds. Empty or
   * undefined arrays mean "no restriction on that dimension". Used by the
   * booking dialog to hide services that don't fit the selected pet.
   */
  eligiblePetSizes: z.array(petSizeEnum).optional(),
  eligibleCoatTypes: z.array(coatTypeEnum).optional(),
  eligibleBreeds: z.array(z.string()).optional(),
  /**
   * Minimum stylist skill level required to perform this service. When set,
   * the booking dialog filters the groomer dropdown to qualified stylists
   * only. See {@link stylistSkillLevelEnum} for the ordered ranks.
   */
  requiredSkillLevel: stylistSkillLevelEnum.optional(),
});
export type GroomingPackage = z.infer<typeof groomingPackageSchema>;

// ============================================================================
// Pet-Specific Pricing Overrides
// ============================================================================

/**
 * Saved price and/or duration for a specific pet + package combination. When
 * a Poodle's full groom routinely runs $85 instead of the $80 size-default
 * because of its coat, staff bake that into the pet profile so the next
 * booking pre-fills automatically without anyone having to remember to
 * adjust it manually.
 *
 * Priority order resolved by {@link resolveEffectivePricing}:
 *   1. Pet-specific override (this type) — wins if present
 *   2. Stylist-specific package price ({@link groomingPackageSchema}.stylistPricing)
 *   3. Package size pricing / base price
 */
export const petServicePricingOverrideSchema = z.object({
  id: z.string(),
  petId: z.number(),
  packageId: z.string(),
  customPrice: z.number().optional(),
  customDurationMin: z.number().optional(),
  /** Reason staff saved this — surfaces as a tooltip on the booking screen. */
  note: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.string(),
});
export type PetServicePricingOverride = z.infer<
  typeof petServicePricingOverrideSchema
>;

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
  /** Supplier ordering portal (opens in a new tab when reordering). */
  supplierUrl: z.string().optional(),
  /** Supplier email for the pre-filled reorder mailto fallback. */
  supplierEmail: z.string().optional(),
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
