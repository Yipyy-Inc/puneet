import { z } from "zod";
import { petSizeEnum, kennelStatusEnum } from "@/types/base";

// ============================================================================
// Boarding Enums
// ============================================================================

export const appetiteStatusEnum = z.enum(["ate-all", "left-some", "refused"]);
export type AppetiteStatus = z.infer<typeof appetiteStatusEnum>;

export const boardingStatusEnum = z.enum([
  "checked-in",
  "checked-out",
  "scheduled",
  "cancelled",
]);
export type BoardingStatus = z.infer<typeof boardingStatusEnum>;

export const petTypeEnum = z.enum(["dog", "cat"]);
export type PetType = z.infer<typeof petTypeEnum>;

export const boardingRoomTypeIdEnum = z.enum([
  "standard",
  "deluxe",
  "vip",
  "cat-suite",
]);
export type BoardingRoomTypeId = z.infer<typeof boardingRoomTypeIdEnum>;

export const yipyyGoPreCheckStatusEnum = z.enum([
  "not-submitted",
  "submitted",
  "approved",
  "corrections-requested",
]);
export type YipyyGoPreCheckStatus = z.infer<typeof yipyyGoPreCheckStatusEnum>;

export const boardingOpsRequestStatusEnum = z.enum([
  "new",
  "in-review",
  "accepted",
  "declined",
]);
export type BoardingOpsRequestStatus = z.infer<
  typeof boardingOpsRequestStatusEnum
>;

// Re-export for convenience
export { kennelStatusEnum, petSizeEnum };
export type { KennelStatus } from "@/types/base";
export type { PetSize } from "@/types/base";

// ============================================================================
// Medication Frequency Rule
// ============================================================================

export const medFrequencyRuleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("daily") }),
  z.object({ type: z.literal("every_other_day"), startDayOfStay: z.number().optional() }),
  z.object({ type: z.literal("every_n_days"), n: z.number(), startDayOfStay: z.number().optional() }),
  z.object({ type: z.literal("specific_days"), daysOfWeek: z.array(z.number()) }),
  z.object({ type: z.literal("first_n_days"), days: z.number() }),
  z.object({ type: z.literal("last_n_days"), days: z.number() }),
  z.object({ type: z.literal("as_needed") }),
]);
export type MedFrequencyRule = z.infer<typeof medFrequencyRuleSchema>;

// ============================================================================
// Medication Schedule (boarding-specific, not the same as lib/types.ts meds)
// ============================================================================

export const medicationScheduleSchema = z.object({
  id: z.string(),
  medicationName: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  times: z.array(z.string()),
  instructions: z.string(),
  requiresPhotoProof: z.boolean(),
  frequencyRule: medFrequencyRuleSchema.optional(),
});

export type MedicationSchedule = z.infer<typeof medicationScheduleSchema>;

// ============================================================================
// Post-Surgery Info & Heat Cycle Info (optional per-guest care flags)
// ============================================================================

export const postSurgeryInfoSchema = z.object({
  procedureType: z.string(),
  surgeryDate: z.string(),
  vetInstructions: z.string(),
  monitoringIntervalHours: z.number().default(3),
});
export type PostSurgeryInfo = z.infer<typeof postSurgeryInfoSchema>;

export const heatCycleInfoSchema = z.object({
  startDate: z.string(),
  dayNumber: z.number(),
  notes: z.string().optional(),
});
export type HeatCycleInfo = z.infer<typeof heatCycleInfoSchema>;

// ============================================================================
// Facility Feeding Configuration
// ============================================================================

export const feedingSlotSchema = z.object({
  id: z.string(),
  label: z.string(),
  time: z.string(),
  enabled: z.boolean(),
  sortOrder: z.number(),
});
export type FeedingSlot = z.infer<typeof feedingSlotSchema>;

export const facilityFeedingConfigSchema = z.object({
  slots: z.array(feedingSlotSchema),
  showMedicationsInChecklist: z.boolean(),
  matchWindowMinutes: z.number().default(90),
});
export type FacilityFeedingConfig = z.infer<typeof facilityFeedingConfigSchema>;

// ============================================================================
// Add-on Schedule
// ============================================================================

export const addonTypeEnum = z.enum([
  "play_session",
  "group_play",
  "nature_walk",
  "grooming",
  "training",
  "cuddle_time",
  "spa",
]);
export type AddonType = z.infer<typeof addonTypeEnum>;

export const addonScheduleSchema = z.object({
  id: z.string(),
  addonType: addonTypeEnum,
  name: z.string(),
  scheduledTime: z.string(),
  durationMinutes: z.number(),
  notes: z.string().optional(),
});
export type AddonSchedule = z.infer<typeof addonScheduleSchema>;

// ============================================================================
// Boarding Guest
// ============================================================================

export const boardingGuestSchema = z
  .object({
    id: z.string(),
    petId: z.number(),
    petName: z.string(),
    petBreed: z.string(),
    petSize: petSizeEnum,
    petWeight: z.number(),
    petColor: z.string(),
    petPhotoUrl: z.string().optional(),
    ownerId: z.number(),
    ownerName: z.string(),
    ownerPhone: z.string(),
    emergencyVetContact: z.string(),
    checkInDate: z.string(),
    checkOutDate: z.string(),
    actualCheckIn: z.string().optional(),
    actualCheckOut: z.string().optional(),
    kennelId: z.string(),
    kennelName: z.string(),
    status: boardingStatusEnum,
    packageType: z.string(),
    totalNights: z.number(),
    nightlyRate: z.number(),
    discountApplied: z.number(),
    peakSurcharge: z.number(),
    totalPrice: z.number(),
    allergies: z.array(z.string()),
    feedingInstructions: z.string(),
    foodBrand: z.string(),
    feedingTimes: z.array(z.string()),
    feedingAmount: z.string(),
    medications: z.array(medicationScheduleSchema),
    addOns: z.array(addonScheduleSchema).optional(),
    postSurgery: postSurgeryInfoSchema.optional(),
    heatCycle: heatCycleInfoSchema.optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string(),
    createdAt: z.string(),
    includesEvaluation: z.boolean().optional(),
    evaluationStatus: z
      .enum(["pending", "in_progress", "completed", "skipped"])
      .optional(),
  })
  .catchall(z.unknown());

export type BoardingGuest = z.infer<typeof boardingGuestSchema>;

// ============================================================================
// Boarding Rate & Pricing
// ============================================================================

export const boardingRateSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    basePrice: z.number(),
    isActive: z.boolean(),
    sizePricing: z.object({
      small: z.number(),
      medium: z.number(),
      large: z.number(),
      giant: z.number(),
    }),
    color: z.string().optional(),
  })
  .catchall(z.unknown());

export type BoardingRate = z.infer<typeof boardingRateSchema>;

export const multiNightDiscountSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    minNights: z.number(),
    maxNights: z.number().nullable(),
    discountPercent: z.number(),
    discountMode: z.enum(["percentage", "flat", "free_nights"]).optional(),
    discountAmount: z.number().optional(),
    freeNights: z.number().optional(),
    applicableServices: z.array(z.string()).optional(),
    isActive: z.boolean(),
  })
  .catchall(z.unknown());

export type MultiNightDiscount = z.infer<typeof multiNightDiscountSchema>;

export const peakDateRangeSchema = z.object({
  start: z.string(),
  end: z.string(),
});
export type PeakDateRange = z.infer<typeof peakDateRangeSchema>;

export const peakRepeatPatternSchema = z.object({
  daysOfWeek: z.array(z.number()),
  everyXWeeks: z.number(),
  windowStart: z.string(),
  windowEnd: z.string(),
});
export type PeakRepeatPattern = z.infer<typeof peakRepeatPatternSchema>;

export const peakSurchargeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    surchargePercent: z.number(),
    isActive: z.boolean(),
    // MoéGo parity fields
    dateMode: z.enum(["specific", "repeat", "holiday"]).optional(),
    dateRanges: z.array(peakDateRangeSchema).optional(),
    repeatPattern: peakRepeatPatternSchema.optional(),
    holidayCountryCode: z.string().optional(),
    holidayNames: z.array(z.string()).optional(),
    holidayYearsAhead: z.number().optional(),
    holidayDates: z.array(z.string()).optional(),
    holidayExtensionDaysBefore: z.number().optional(),
    holidayExtensionDaysAfter: z.number().optional(),
    surchargeType: z.enum(["percentage", "flat"]).optional(),
    surchargeAmount: z.number().optional(),
    scope: z.enum(["per_each_pet", "first_pet_only"]).optional(),
    chargePerLodging: z.boolean().optional(),
    applicableServices: z.array(z.string()).optional(),
  })
  .catchall(z.unknown());

export type PeakSurcharge = z.infer<typeof peakSurchargeSchema>;

// ============================================================================
// Multi-Pet Discount Rules
// ============================================================================

export const multiPetDiscountTierSchema = z.object({
  petCount: z.number(),
  discountAmount: z.number(),
});
export type MultiPetDiscountTier = z.infer<typeof multiPetDiscountTierSchema>;

export const multiPetDiscountRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  applicableServices: z.array(z.string()),
  isActive: z.boolean(),
  discountType: z.enum(["per_pet", "additional_pet"]),
  discountValueType: z.enum(["flat", "percentage"]).optional(),
  sameLodging: z.boolean(),
  tiers: z.array(multiPetDiscountTierSchema),
});
export type MultiPetDiscountRule = z.infer<typeof multiPetDiscountRuleSchema>;

// ============================================================================
// Late / Early / Overflow / Custom Fees
// ============================================================================

export const latePickupFeeSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  enabled: z.boolean(),
  condition: z.enum(["late_pickup", "early_dropoff"]),
  graceMinutes: z.number(),
  feeType: z.enum([
    "flat",
    "per_hour",
    "per_30min",
    "per_minute",
    "extra_night",
  ]),
  amount: z.number(),
  maxFee: z.number().optional(),
  taxRate: z.number().optional(),
  scope: z.enum(["per_booking", "per_pet"]),
  basedOn: z.enum(["business_hours", "custom_time"]),
  customTime: z.string().optional(),
  applyFromTime: z.string().optional(),
  applyUntilTime: z.string().optional(),
  applicableServices: z.array(z.string()).optional(),
});
export type LatePickupFee = z.infer<typeof latePickupFeeSchema>;

export const exceed24HourFeeSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  enabled: z.boolean(),
  amount: z.number(),
  taxRate: z.number().optional(),
  scope: z.enum(["per_booking", "per_pet"]),
  description: z.string().optional(),
});
export type Exceed24HourFee = z.infer<typeof exceed24HourFeeSchema>;

export const customFeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  amount: z.number(),
  feeType: z.enum(["flat", "percentage"]),
  adjustmentKind: z.enum(["fee", "discount"]).optional(),
  taxRate: z.number().optional(),
  scope: z.enum(["per_booking", "per_pet"]),
  autoApply: z.enum([
    "none",
    "at_checkout",
    "by_care_type",
    "new_customer",
    "new_pet",
    "customer_segment",
    "addon_purchase",
  ]),
  autoApplyCareTypes: z.array(z.string()).optional(),
  customerStatuses: z.array(z.string()).optional(),
  membershipPlans: z.array(z.string()).optional(),
  requireMembershipActive: z.boolean().optional(),
  requirePrepaidBalance: z.boolean().optional(),
  triggerAddOnIds: z.array(z.string()).optional(),
  waivedAddOnIds: z.array(z.string()).optional(),
  waivePercentage: z.number().optional(),
  applicableServices: z.array(z.string()),
  isActive: z.boolean(),
});
export type CustomFee = z.infer<typeof customFeeSchema>;

export const roomTypeAdjustmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  roomTypeIds: z.array(z.string()),
  minNights: z.number().nullable().optional(),
  maxNights: z.number().nullable().optional(),
  sameRoomRequired: z.boolean(),
  adjustmentKind: z.enum(["discount", "surcharge"]),
  adjustmentType: z.enum(["flat", "percentage"]),
  amount: z.number(),
  applicableServices: z.array(z.string()).optional(),
  isActive: z.boolean(),
});
export type RoomTypeAdjustment = z.infer<typeof roomTypeAdjustmentSchema>;

export const groomingConditionAdjustmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  hairTypes: z.array(z.string()).optional(),
  breeds: z.array(z.string()).optional(),
  sexes: z.array(z.enum(["male", "female"])).optional(),
  petStatuses: z.array(z.enum(["active", "inactive", "deceased"])).optional(),
  ageMinYears: z.number().nullable().optional(),
  ageMaxYears: z.number().nullable().optional(),
  weightMinKg: z.number().nullable().optional(),
  weightMaxKg: z.number().nullable().optional(),
  durationMinutesMin: z.number().nullable().optional(),
  durationMinutesMax: z.number().nullable().optional(),
  appointmentWindowStart: z.string().optional(),
  appointmentWindowEnd: z.string().optional(),
  billingMode: z.enum(["one_time", "per_unit"]).optional(),
  unitType: z.enum(["nights", "days", "sessions"]).optional(),
  adjustmentKind: z.enum(["discount", "surcharge"]),
  adjustmentType: z.enum(["flat", "percentage"]),
  amount: z.number(),
  applicableServices: z.array(z.string()).optional(),
  isActive: z.boolean(),
});
export type GroomingConditionAdjustment = z.infer<
  typeof groomingConditionAdjustmentSchema
>;

export const serviceBundleRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  triggerService: z.string(),
  bundledService: z.string(),
  bundledServiceLabel: z.string(),
  triggerUnit: z.enum(["nights", "sessions", "days"]),
  minUnits: z.number(),
  maxUnits: z.number().nullable().optional(),
  requireSamePet: z.boolean(),
  requireSameRoom: z.boolean(),
  bundleMode: z.enum(["mandatory", "optional"]),
  pricingMode: z.enum([
    "included",
    "discount_flat",
    "discount_percentage",
    "fixed_price",
  ]),
  pricingValue: z.number().optional(),
  notes: z.string().optional(),
  applicableServices: z.array(z.string()).optional(),
  isActive: z.boolean(),
});
export type ServiceBundleRule = z.infer<typeof serviceBundleRuleSchema>;

export type DiscountStackingMode = "best_only" | "apply_all_sequence";

// ============================================================================
// Care Sheet Logs
// ============================================================================

export const medicationLogSchema = z.object({
  id: z.string(),
  guestId: z.string(),
  medicationId: z.string(),
  medicationName: z.string(),
  scheduledTime: z.string(),
  givenTime: z.string(),
  givenBy: z.string(),
  givenByInitials: z.string(),
  dosage: z.string(),
  photoProofUrl: z.string().optional(),
  notes: z.string(),
});

export type MedicationLog = z.infer<typeof medicationLogSchema>;

export const feedingLogSchema = z.object({
  id: z.string(),
  guestId: z.string(),
  scheduledTime: z.string(),
  actualTime: z.string(),
  foodType: z.string(),
  amount: z.string(),
  appetiteStatus: appetiteStatusEnum,
  fedBy: z.string(),
  fedByInitials: z.string(),
  notes: z.string(),
});

export type FeedingLog = z.infer<typeof feedingLogSchema>;

export const pottyLogSchema = z.object({
  id: z.string(),
  guestId: z.string(),
  time: z.string(),
  type: z.enum(["pee", "poop", "both"]),
  location: z.enum(["outdoor", "indoor"]),
  hadAccident: z.boolean(),
  notes: z.string(),
  staffInitials: z.string(),
});

export type PottyLog = z.infer<typeof pottyLogSchema>;

export const walkLogSchema = z.object({
  id: z.string(),
  guestId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  duration: z.number(),
  staffInitials: z.string(),
  notes: z.string(),
});

export type WalkLog = z.infer<typeof walkLogSchema>;

export const playtimeLogSchema = z.object({
  id: z.string(),
  guestId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  type: z.enum(["group", "solo"]),
  notes: z.string(),
  staffInitials: z.string(),
});

export type PlaytimeLog = z.infer<typeof playtimeLogSchema>;

export const kennelCleanLogSchema = z.object({
  id: z.string(),
  kennelId: z.string(),
  guestId: z.string(),
  cleanedAt: z.string(),
  cleanedBy: z.string(),
  cleanedByInitials: z.string(),
  deepClean: z.boolean(),
  blocked: z.boolean(),
  blockReason: z.string().optional(),
  notes: z.string(),
});

export type KennelCleanLog = z.infer<typeof kennelCleanLogSchema>;

// ============================================================================
// Daily Care Sheet
// ============================================================================

export const dailyCareSheetSchema = z.object({
  id: z.string(),
  guestId: z.string(),
  petName: z.string(),
  date: z.string(),
  feedings: z.array(feedingLogSchema),
  medications: z.array(medicationLogSchema),
  pottyBreaks: z.array(pottyLogSchema),
  walks: z.array(walkLogSchema),
  playtime: z.array(playtimeLogSchema),
  kennelCleans: z.array(kennelCleanLogSchema),
  generalNotes: z.string(),
  staffOnDuty: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DailyCareSheet = z.infer<typeof dailyCareSheetSchema>;

// ============================================================================
// Kennel Card
// ============================================================================

export const kennelCardDataSchema = z.object({
  id: z.string(),
  guestId: z.string(),
  petName: z.string(),
  petBreed: z.string(),
  petSex: z.string(),
  petWeight: z.number(),
  petColor: z.string(),
  petPhotoUrl: z.string().optional(),
  ownerNames: z.string(),
  primaryPhone: z.string(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  allergies: z.array(z.string()),
  medications: z.array(
    z.object({
      name: z.string(),
      schedule: z.string(),
    }),
  ),
  feedingInstructions: z.string(),
  foodBrand: z.string(),
  feedingAmount: z.string(),
  feedingTimes: z.array(z.string()),
  emergencyVetContact: z.string(),
  qrCodeUrl: z.string(),
  generatedAt: z.string(),
  printedAt: z.string().optional(),
});

export type KennelCardData = z.infer<typeof kennelCardDataSchema>;

// ============================================================================
// Boarding Ops Types (from boarding-ops.ts)
// ============================================================================

export const boardingRoomTypeSchema = z.object({
  id: boardingRoomTypeIdEnum,
  name: z.string(),
  description: z.string(),
  defaultCapacity: z.number(),
  allowsShared: z.boolean(),
  allowedPetTypes: z.array(petTypeEnum),
});

export type BoardingRoomType = z.infer<typeof boardingRoomTypeSchema>;

export const boardingRoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  typeId: boardingRoomTypeIdEnum,
  capacity: z.number(),
  allowsShared: z.boolean(),
  allowedPetTypes: z.array(petTypeEnum),
  restrictions: z.array(z.string()),
});

export type BoardingRoom = z.infer<typeof boardingRoomSchema>;

export const preCheckAuditEventSchema = z.object({
  id: z.string(),
  at: z.string(),
  actorType: z.enum(["customer", "staff", "system"]),
  actorName: z.string(),
  action: z.string(),
  details: z.string().optional(),
});

export type PreCheckAuditEvent = z.infer<typeof preCheckAuditEventSchema>;

export const yipyyGoPreCheckFormSchema = z.object({
  id: z.string(),
  status: yipyyGoPreCheckStatusEnum,
  submittedAt: z.string().optional(),
  approvedAt: z.string().optional(),
  belongings: z.array(z.string()),
  feedingInstructions: z.string(),
  medicationInstructions: z.string(),
  behaviorNotes: z.string(),
  staffNotes: z.string(),
  photoUrls: z.array(z.string()),
  qrCodeToken: z.string(),
  audit: z.array(preCheckAuditEventSchema),
});

export type YipyyGoPreCheckForm = z.infer<typeof yipyyGoPreCheckFormSchema>;

export const boardingBookingRequestSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  status: boardingOpsRequestStatusEnum,
  clientId: z.number(),
  clientName: z.string(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  requestedRoomTypeId: boardingRoomTypeIdEnum,
  pets: z.array(
    z.object({
      petId: z.number(),
      petName: z.string(),
      petType: petTypeEnum,
      breed: z.string(),
      evaluationRequired: z.boolean(),
      behaviorTags: z.array(z.string()),
    }),
  ),
  addOnsByPetId: z.record(
    z.string(),
    z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        unit: z.enum(["flat", "day"]),
        unitPrice: z.number(),
        quantity: z.number(),
      }),
    ),
  ),
  paymentStatus: z.enum(["unpaid", "deposit", "partial", "paid"]),
  tipAmount: z.number(),
  totalEstimate: z.number(),
  preCheck: yipyyGoPreCheckFormSchema,
});

export type BoardingBookingRequest = z.infer<
  typeof boardingBookingRequestSchema
>;
