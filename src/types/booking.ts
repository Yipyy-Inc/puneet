import { z } from "zod";
import {
  bookingStatusEnum,
  foodComponentTypeEnum,
  foodUnitEnum,
  foodSourceEnum,
  prepInstructionEnum,
  refusalActionEnum,
  feedingFrequencyEnum,
  medFormEnum,
  medFrequencyEnum,
  medAdminInstructionEnum,
  missedDoseActionEnum,
  medGivenWithEnum,
  medDayRuleEnum,
  medFoodEnum,
  medSplitByEnum,
  medSideEnum,
} from "@/types/base";

export type {
  FoodComponentType,
  FoodUnit,
  FoodSource,
  PrepInstruction,
  RefusalAction,
  FeedingFrequency,
  MedForm,
  MedFrequency,
  MedAdminInstruction,
  MissedDoseAction,
  MedGivenWith,
  MedDayRule,
  MedFood,
  MedSplitBy,
  MedSide,
} from "@/types/base";

// ============================================================================
// Feeding Types — Modular Meal Builder
// ============================================================================

export const mealComponentSchema = z.object({
  id: z.string(),
  type: foodComponentTypeEnum,
  name: z.string(),
  amount: z.string(),
  unit: foodUnitEnum,
  mixWith: z.string().optional(),
});
export type MealComponent = z.infer<typeof mealComponentSchema>;

export const feedingOccasionSchema = z.object({
  id: z.string(),
  label: z.string(),
  time: z.string(),
  /**
   * The meal time it was picked as — breakfast, lunch, dinner, snack — so a
   * screen can name it in its reader's language (2026-10-01). Absent on a
   * custom time and on older rows, which are named by `label`.
   */
  slot: z.string().optional(),
  components: z.array(mealComponentSchema),
});
export type FeedingOccasion = z.infer<typeof feedingOccasionSchema>;

/**
 * One food of a pet's feeding plan, as the Feeding step writes it
 * (2026-10-01). Its words come from lib/feeding/vocabulary.ts; `occasions`
 * still carries each meal's foods as components for the screens that read
 * those.
 */
export const feedingFoodSchema = z.object({
  id: z.string(),
  /** The owner's food, or one of the facility's house foods. */
  source: z.enum(["own", "house"]),
  /** kibble, wet, raw… — the kind of food the owner picked. */
  type: z.string(),
  brand: z.string().optional(),
  houseFoodId: z.string().optional(),
  /**
   * The house food's name as it was booked, so a food the facility renames
   * or stops offering still reads.
   */
  houseFoodName: z.string().optional(),
  /** cup, scoop, g, oz, can, tbsp… or custom (then `customUnit`). */
  unit: z.string(),
  customUnit: z.string().optional(),
  /** One portion. */
  amount: z.number(),
  /** The meals (occasion ids) it is served at; absent means every meal. */
  servedAt: z.array(z.string()).optional(),
  prep: z.array(z.string()).optional(),
  pack: z.string().optional(),
});
export type FeedingFood = z.infer<typeof feedingFoodSchema>;

export const feedingScheduleItemSchema = z.object({
  id: z.string(),
  petId: z.number().optional(),
  occasions: z.array(feedingOccasionSchema),
  source: foodSourceEnum,
  prepInstructions: z.array(prepInstructionEnum),
  prepNotes: z.string().optional(),
  ifRefuses: z.array(refusalActionEnum),
  refusalNotes: z.string().optional(),
  frequency: feedingFrequencyEnum,
  frequencyDays: z.array(z.string()).optional(),
  allergies: z.array(z.string()),
  notes: z.string(),
  feedingUnit: z.string().optional(),
  feedingInstruction: z.string().optional(),
  saveToProfile: z.boolean().optional(),

  // ── The Feeding step's own answers (2026-10-01) ─────────────────────────
  //
  // All optional: a row written before them still reads, and `occasions`,
  // `source`, `frequency` and `allergies` above are still written beside
  // them for every screen that reads those.
  /** The days of the stay it is served — the medications' rule and names. */
  dayRule: medDayRuleEnum.optional(),
  specificDays: z.array(z.string()).optional(),
  foods: z.array(feedingFoodSchema).optional(),
  styles: z.array(z.string()).optional(),
  habits: z.array(z.string()).optional(),
  /** What staff do when a meal is skipped. */
  skipMeal: z.string().optional(),
  treats: z.string().optional(),
  /**
   * Foods (by id) whose house-food charge is waived. Staff only — the
   * integrity trigger strips it from anything a customer writes.
   */
  waivedFoods: z.array(z.string()).optional(),
  /** The pet-profile plan this came from, or became. */
  profileId: z.string().optional(),
});
export type FeedingScheduleItem = z.infer<typeof feedingScheduleItemSchema>;

/**
 * A pet's feeding plan kept on its profile (`pets.details.feedingPlan`) so the
 * next booking starts with it: the plan, without what belonged to one stay —
 * its days, a waiver, the booking's own ids.
 */
export const savedFeedingPlanSchema = feedingScheduleItemSchema
  .omit({
    id: true,
    petId: true,
    dayRule: true,
    specificDays: true,
    waivedFoods: true,
    saveToProfile: true,
  })
  .extend({ profileId: z.string().min(1) });
export type SavedFeedingPlan = z.infer<typeof savedFeedingPlanSchema>;

// ============================================================================
// Medication Types — Per-Med Card Builder
// ============================================================================

export const medicationItemSchema = z.object({
  id: z.string(),
  petId: z.number().optional(),
  name: z.string(),
  purpose: z.string().optional(),
  amount: z.string(),
  strength: z.string().optional(),
  form: medFormEnum,
  frequency: medFrequencyEnum,
  frequencyNotes: z.string().optional(),
  times: z.array(z.string()),
  specificDays: z.array(z.string()).optional(),
  prnMaxPerDay: z.number().optional(),
  prnTrigger: z.string().optional(),
  adminInstructions: z.array(medAdminInstructionEnum),
  adminNotes: z.string().optional(),
  /**
   * The way it is given: the vocabulary's, or one the facility added on its
   * Feeding & medications page (`method-…`, named by `methodLabel`).
   */
  givenWith: z
    .union([medGivenWithEnum, z.string().regex(/^method-[a-z0-9]{1,40}$/)])
    .optional(),
  givenWithNotes: z.string().optional(),
  facilityProvidesMedAid: z.boolean().optional(),
  facilityMedAidItem: z.string().optional(),
  /** The medications step no longer asks; older rows carry it. */
  ifMissed: missedDoseActionEnum.optional(),
  isHighRisk: z.boolean().optional(),
  parentConfirmed: z.boolean().optional(),
  notes: z.string(),
  supplyCount: z.number().optional(),
  drugAllergies: z.array(z.string()).optional(),

  // ── The medications step's own answers (2026-10-01) ─────────────────────
  //
  // All optional: a row written before them still reads, and `amount`,
  // `frequency` and `times` above are still written alongside them, in words
  // and ids, for every screen that reads those.
  /** One dose as a number — 0.5 for "½ tablet". `amount` holds the words. */
  doseAmount: z.number().positive().optional(),
  /** tablet, capsule, chew, ml, scoop, packet, tsp, pump, application, patch,
   *  drop, units, or custom (then `customUnit`). */
  doseUnit: z.string().optional(),
  customUnit: z.string().optional(),
  splitBy: medSplitByEnum.optional(),
  side: medSideEnum.optional(),
  dayRule: medDayRuleEnum.optional(),
  food: medFoodEnum.optional(),
  /**
   * The facility's charge for what it supplies is waived. Staff only — the
   * integrity trigger strips it from anything a customer writes.
   */
  aidWaived: z.boolean().optional(),
  /** Keep this medication on the pet's profile for the next booking. */
  saveToProfile: z.boolean().optional(),
  /** The profile entry this came from, or became. */
  profileId: z.string().optional(),

  // ── The facility's rules (2026-10-01, Settings › Feeding & medications) ──
  /** The facility's name for a way of giving it added, as the booking saw it. */
  methodLabel: z.string().max(40).optional(),
  /** The owner confirmed it arrives in its original pharmacy-labelled packaging. */
  labelConfirmed: z.boolean().optional(),
  /** A controlled substance (gabapentin, trazodone…), which the facility accepts. */
  controlled: z.boolean().optional(),
});
export type MedicationItem = z.infer<typeof medicationItemSchema>;

/**
 * A medication kept on a pet's profile (`pets.details.medications`) so the
 * next booking starts with it: the medication, without what belonged to one
 * stay — its days, how much was brought, a waiver, the booking's own ids.
 */
export const savedMedicationSchema = medicationItemSchema
  .omit({
    id: true,
    petId: true,
    dayRule: true,
    specificDays: true,
    aidWaived: true,
    supplyCount: true,
    saveToProfile: true,
    labelConfirmed: true,
  })
  .extend({ profileId: z.string().min(1) });
export type SavedMedication = z.infer<typeof savedMedicationSchema>;

/** The pet's vet, as the Medications step asks for it. */
export const vetContactSchema = z.object({
  clinic: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
});
export type VetContact = z.infer<typeof vetContactSchema>;

// ============================================================================
// Supporting Schemas
// ============================================================================

export const daycareDateTimeSchema = z.object({
  date: z.string(),
  checkInTime: z.string(),
  checkOutTime: z.string(),
});

export type DaycareDateTime = z.infer<typeof daycareDateTimeSchema>;

export const extraServiceSchema = z.object({
  serviceId: z.string(),
  quantity: z.number(),
  petId: z.number(),
  /**
   * The member of staff assigned to an add-on that requires one — stored on
   * its `add_on` line (2026-09-30). Absent: nobody assigned yet.
   */
  staffId: z.string().optional(),
});

export type ExtraService = z.infer<typeof extraServiceSchema>;

/**
 * A fee as an estimate stated it, to be written on a booking's bill as it
 * stands (2026-09-30): the rule that charges it, what the bill calls it, one
 * unit's price — negative for a fee the facility set up as a discount — how
 * many, and whether tax applies.
 */
export const statedServiceChargeSchema = z.object({
  feeId: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(200),
  unitPrice: z.number().finite().min(-1_000_000).max(1_000_000),
  quantity: z.number().int().min(1).max(10_000),
  taxable: z.boolean(),
});

export type StatedServiceCharge = z.infer<typeof statedServiceChargeSchema>;

export const taskTypeEnum = z.enum([
  "feeding",
  "medication",
  "service",
  "walking",
]);

export const taskCompletionStatusEnum = z.enum([
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);

export const taskSchema = z.object({
  id: z.string(),
  bookingId: z.number(),
  petId: z.number(),
  type: taskTypeEnum,
  title: z.string(),
  time: z.string().nullable(),
  details: z.string(),
  assignedStaff: z.string().optional(),
  completionStatus: taskCompletionStatusEnum,
  assignable: z.boolean(),
  completedAt: z.string().optional(),
  completedBy: z.string().optional(),
  notes: z.string().optional(),
});

export type Task = z.infer<typeof taskSchema>;

// ============================================================================
// NewBooking Schema
// ============================================================================

export const newBookingPaymentStatusEnum = z.enum([
  "pending",
  "paid",
  "refunded",
]);

/**
 * One of the bookings a request makes — see `@/lib/bookings/booking-parts`.
 * Consumed by POST /api/bookings; never stored.
 */
export const bookingPartSchema = z.object({
  petIds: z.array(z.number()),
  startDate: z.string(),
  endDate: z.string(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  basePrice: z.number(),
  discount: z.number(),
  totalCost: z.number(),
  unitAssignment: z.string().optional(),
  trainingSessionId: z.string().optional(),
  /** This part's boarding service, where a household's pets differ. */
  boardingServiceId: z.string().optional(),
  /** Grooming: this pet's package (its `serviceType`), where pets differ. */
  serviceType: z.string().optional(),
  /** Grooming: staff marked this pet's coat matted. */
  matted: z.boolean().optional(),
});

export type BookingPart = z.infer<typeof bookingPartSchema>;

export const newBookingSchema = z.object({
  clientId: z.number(),
  petId: z.union([z.number(), z.array(z.number())]),
  /**
   * The FIXTURE's facility key, and nothing else — absent on a real booking.
   *
   * `facilities.id` is a uuid and the table has no numeric ref, so there is no
   * number a booking read from Postgres could honestly carry. `rowToBooking`
   * stamped `11` anyway until 2026-09-16, which made every
   * `b.facilityId === facility.id` comparison in the customer portal test a
   * hardcoded 11 against the fixture list's first active facility, 1 — false
   * for every booking that has ever existed. The screens behind those filters
   * were not scoped, they were EMPTY, and the fallbacks around some of them
   * hid it.
   *
   * Optional because nothing may require a caller to invent one: the create
   * route ignores whatever is sent and takes the facility from the session or
   * the parent client row, as `check:facility-from-session` requires.
   *
   * Never filter a real booking by it. A customer's own bookings are already
   * theirs (RLS) and already this facility's (the portal is served per
   * hostname); there is nothing left for a facility filter to do.
   */
  facilityId: z.number().optional(),
  /** Which branch this booking belongs to. Ignored at creation -- the
   * session resolves it, same as `facilityId` -- and only takes effect on an
   * existing booking, moving it to another of the facility's own locations. */
  locationId: z.string().optional(),
  service: z.string(),
  serviceType: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  status: bookingStatusEnum,
  basePrice: z.number(),
  discount: z.number(),
  discountReason: z.string().optional(),
  totalCost: z.number(),
  // paymentStatus is NOT here. It is not something a booking is CREATED with:
  // the database derives it from the payments ledger (20260806680000), so a
  // value supplied at creation is discarded. It lives on `bookingSchema`
  // below, which is the shape you READ.
  specialRequests: z.string().optional(),
  notificationEmail: z.boolean().optional(),
  notificationSMS: z.boolean().optional(),
  /** Display name of the primary staff member assigned to this booking
   * (e.g. the groomer for a grooming appointment). Drives which calendar
   * column the appointment renders in. */
  assignedStaff: z.string().optional(),
  tipAmount: z.number().optional(),
  // Service-specific fields
  /**
   * WHICH daycare service this booking is for — the row id.
   *
   * The server re-price and the tax stamp both resolve it, so the three
   * numbers cannot belong to three different services. Absent on a booking
   * made before 2026-09-23, which falls back to the pre-cutover rule.
   */
  daycareServiceId: z.string().nullable().optional(),
  /**
   * WHICH boarding service this booking is for — the row id.
   *
   * The daycare field's twin. The server re-price, auto-confirm and the tax
   * stamp all resolve it, so the numbers cannot belong to three different
   * rows. Absent on a booking made before 2026-09-24, which falls back to the
   * kennel class's own nightly rate — what that booking was actually sold at.
   */
  boardingServiceId: z.string().nullable().optional(),
  /** Boarding: each pet's service by pet ref, where a household's differ. */
  boardingPetServices: z.record(z.string(), z.string()).optional(),
  /** Boarding: the household asked to share one room. */
  boardingShare: z.boolean().optional(),
  /** Grooming: staff marked the coat matted — its surcharge and minutes
   *  are in the price and the times; check-in does not charge it again. */
  groomingMatted: z.boolean().optional(),
  daycareSelectedDates: z.array(z.string()).optional(),
  daycareDateTimes: z.array(daycareDateTimeSchema).optional(),
  groomingStyle: z.string().optional(),
  groomingAddOns: z.array(z.string()).optional(),
  stylistPreference: z.string().optional(),
  /** Staff booking without a form the facility requires before booking: why.
   * Saved as a form_requirement_overrides row, never on the booking itself. */
  formOverrideReason: z.string().max(500).optional(),
  /** Grooming: ids of secondary co-groomers working alongside the primary
   * stylist on this booking (payroll-credited as a shared appointment). */
  additionalStylistIds: z.array(z.string()).optional(),
  /** Grooming: sequential stages when the appointment is split across multiple
   * groomers (e.g., bath then cut). Empty/undefined = single-stage booking. */
  groomingStages: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        stylistId: z.string(),
        stylistName: z.string(),
        startTime: z.string(),
        endTime: z.string(),
      }),
    )
    .optional(),
  /** Grooming: manual duration override (minutes). Wins over the package's
   * resolved duration so staff can shorten / extend the slot block. */
  groomingDurationOverrideMin: z.number().optional(),
  trainingType: z.string().optional(),
  /** Training drop-in: the class session (`training_series_sessions.id`) this
   * booking is a seat in. An enrolment links its own sessions; a drop-in made
   * from the booking form used to link none, so the class roster never saw it. */
  trainingSessionId: z.string().optional(),
  /** Set by the server when one request made several bookings — each daycare
   * day, each boarding room. Lets a screen say "day 2 of 3". */
  bookingGroup: z
    .object({ id: z.string(), part: z.number(), of: z.number() })
    .optional(),
  /** What a customer's request was priced at when it was sent. The database
   * zeroes a customer's price on insert and keeps it here
   * (enforce_booking_integrity), so a request reads $0 until staff price it —
   * this is the number "Approve at the quoted price" uses. Server-set. */
  requestedQuote: z
    .object({
      basePrice: z.number().nullable().optional(),
      discount: z.number().nullable().optional(),
      totalCost: z.number().nullable().optional(),
      quotedAt: z.string().optional(),
    })
    .optional(),
  /**
   * The deposit the facility asks for on this booking, in dollars.
   *
   * Written by `autoConfirmCustomerBookings` when a facility has BOTH a
   * deposit rule for the service and instant booking switched on — the two
   * used to not meet, so an online booking confirmed with the whole balance
   * owed and the facility's own policy went unmentioned.
   *
   * RECORDED, NEVER CHARGED. It is a number the customer is then asked for
   * through the pay link, not money taken at confirmation. Server-set.
   */
  depositRequired: z.number().optional(),
  /** Which deposit rule asked for it, as the facility labelled it. Server-set. */
  depositRuleLabel: z.string().optional(),
  /** A customer's own cancellation, written by the database alone
   * (enforce_booking_integrity, 20260919162510): who, when, why, and whether
   * it fell inside the facility's notice window. Server-set. */
  cancellation: z
    .object({
      by: z.string().optional(),
      at: z.string().optional(),
      reason: z.string().nullable().optional(),
      withdrawal: z.boolean().optional(),
      late: z.boolean().optional(),
      noticeHours: z.number().nullable().optional(),
      feePercentage: z.number().nullable().optional(),
    })
    .optional(),
  /** The bookings this request makes, when it is more than one. Read by
   * POST /api/bookings and removed there; a stored booking never has it. */
  parts: z.array(bookingPartSchema).optional(),
  /** Daycare: the play area each dog was placed in. `sectionId` keeps the
   * first, which is what the daycare board reads. */
  daycareAreaAssignments: z
    .array(z.object({ petId: z.number(), roomId: z.string() }))
    .optional(),
  trainerId: z.string().optional(),
  /** The owner's goals for the trainer (the Goals step, 2026-10-01); a
   *  single string on a booking made before it. */
  trainingGoals: z.union([z.string(), z.array(z.string())]).optional(),
  /** none · some · lots — the owner's word for the dog's training so far. */
  trainingExperience: z.string().optional(),
  /** The owner's notes for the trainer. */
  trainerNotes: z.string().max(2000).optional(),
  /** Made Pending because the client had agreements to sign (the booking
   *  wizard, 2026-10-02): confirmed by the database when the last applicable
   *  one is signed (20261002123123). */
  awaitingAgreements: z.boolean().optional(),
  /** A customer's request: the saved card they agreed may be charged the
   *  deposit when the facility confirms it (the booking wizard, 2026-10-02).
   *  The card is checked against the client and its consent when charged. */
  depositCardId: z.string().uuid().optional(),
  /** The facility program booked (the `training_programs` setting id). */
  trainingProgramId: z.string().optional(),
  /** group · lesson · consult. */
  trainingFormat: z.string().optional(),
  /** A lesson pack's sessions; 1 or absent is one session. */
  trainingPack: z.number().int().positive().optional(),
  /** A customer's request for a class: which one. */
  trainingSeriesId: z.string().optional(),
  vetReason: z.string().optional(),
  vetSymptoms: z.string().optional(),
  isEmergency: z.boolean().optional(),
  evaluationEvaluator: z.string().optional(),
  evaluationSpace: z.string().optional(),
  includesEvaluation: z.boolean().optional(),
  evaluationStatus: z
    .enum(["pending", "in_progress", "completed", "skipped"])
    .optional(),
  /**
   * Staff booked this past the facility's evaluation rule: the pets that were
   * short of it — none on file, failed, or expired — and the reason given.
   * Kept in `details`; a customer's booking never carries one.
   */
  evaluationOverride: z
    .object({
      reason: z.string(),
      pets: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          reason: z.enum(["missing", "failed", "expired"]),
        }),
      ),
    })
    .optional(),
  kennel: z.string().optional(),
  /**
   * Boarding: the room assigned to this booking, as a `boarding_rooms.legacy_id`
   * ("R-STD-01"). `create_booking` resolves it against that table.
   *
   * This comment used to say `FacilityRoom.id`, which was never what it held.
   * `FacilityRoom` ids look like "room-ds-01" and live in a DIFFERENT room
   * model — the one the facility's own Rooms admin page edits, in localStorage.
   * The two id spaces are disjoint; see the debt map.
   */
  unitAssignment: z.string().optional(),
  /**
   * Boarding: where the guest moves part-way, planned as the booking is made.
   * From `from` — the first night in the new kennel, YYYY-MM-DD — they sleep
   * in `roomId`, a room like `unitAssignment`. `create_bookings` makes the
   * moves in the same transaction as the booking, so a kennel taken on those
   * nights refuses the booking itself. Only with a `unitAssignment`.
   */
  kennelMoves: z
    .array(z.object({ from: z.string(), roomId: z.string() }))
    .max(10)
    .optional(),
  /** Daycare: the DaycareSection.id the pet was assigned to */
  sectionId: z.string().optional(),
  /** Grooming: the GroomingStation.id assigned to this booking */
  stationAssignment: z.string().optional(),
  /** Grooming: true when this booking is for mobile (van) service. Salon
   * bookings leave this undefined / false. Drives arrival-window display
   * and service-area routing on the calendar. */
  isMobile: z.boolean().optional(),
  feedingSchedule: z.array(feedingScheduleItemSchema).optional(),
  walkSchedule: z.string().optional(),
  medications: z.array(medicationItemSchema).optional(),
  /**
   * The pets the booker said take no medication — the answer a required
   * Medications step asks for (2026-10-01), kept so an edit does not ask again.
   */
  noMedication: z.array(z.number().int()).max(20).optional(),
  /** Each pet's vet (by pet id), asked for once a pet has a medication. */
  vetContacts: z.record(z.string(), vetContactSchema).optional(),
  extraServices: z.array(z.union([extraServiceSchema, z.string()])).optional(),
  /**
   * Every charge on the booking was stated by the estimate it is made from,
   * and the customer accepted those: the facility's automatic fees are not
   * added to it — not when it is created, and not at the till (they were, on
   * top of the estimate's own, until 2026-09-30). The column
   * `bookings.service_charges_included`: staff set it, and the integrity
   * trigger pins it for a customer, who cannot switch their fees off with it.
   */
  serviceChargesIncluded: z.boolean().optional(),
  /**
   * The fees that estimate stated, one fee line each on the booking's bill at
   * the amount quoted. Their money is not in `totalCost`. Read for STAFF
   * alone, and never filed in `details`.
   */
  serviceCharges: z.array(statedServiceChargeSchema).optional(),
  initialDeposit: z
    .object({
      amount: z.number(),
      method: z.string(),
      ruleLabel: z.string().optional(),
      collectedBy: z.string().optional(),
      collectedAt: z.string().optional(),
      /** Customer-mode: id of the saved card used for this deposit. */
      paymentMethodId: z.string().optional(),
    })
    .optional(),
});

export type NewBooking = z.infer<typeof newBookingSchema>;

// ============================================================================
// Booking Schema (extends NewBooking)
// ============================================================================

export const bookingPaymentMethodEnum = z.enum(["cash", "card"]);
export const bookingRefundMethodEnum = z.enum(["card", "store_credit"]);

export const invoiceLineItemSchema = z.object({
  name: z.string(),
  unitPrice: z.number(),
  quantity: z.number(),
  price: z.number(),
  type: z
    .enum(["service", "product", "addon", "discount", "tip", "package_credit"])
    .optional(),
  taxable: z.boolean().optional(), // defaults to true for services/products
  moduleId: z.string().optional(), // links to custom module
  staffName: z.string().optional(), // for tips assigned to staff
});
export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;

export const invoicePaymentSchema = z.object({
  date: z.string(),
  method: z.string(),
  amount: z.number(),
  transactionId: z.string().optional(),
  kind: z.enum(["deposit", "prepayment", "final"]).optional(),
  collectedBy: z.string().optional(),
  note: z.string().optional(),
});
export type InvoicePayment = z.infer<typeof invoicePaymentSchema>;

export const invoiceStatusEnum = z.enum(["estimate", "open", "closed"]);
export type InvoiceStatus = z.infer<typeof invoiceStatusEnum>;

export const invoiceTaxLineSchema = z.object({
  name: z.string(), // "GST", "QST", "Sales Tax"
  rate: z.number(), // 0.05
  amount: z.number(),
});
export type InvoiceTaxLine = z.infer<typeof invoiceTaxLineSchema>;

export const invoiceAuditEventTypeEnum = z.enum([
  "invoice_created",
  "estimate_sent",
  "deposit_collected",
  "deposit_refunded",
  "item_added",
  "item_edited",
  "item_removed",
  "fee_added",
  "fee_removed",
  "discount_applied",
  "discount_removed",
  "tax_changed",
  "tip_added",
  "prepayment_collected",
  "payment_processed",
  "manager_override",
  "status_changed",
  "invoice_closed",
  "refund_issued",
]);
export type InvoiceAuditEventType = z.infer<typeof invoiceAuditEventTypeEnum>;

export interface InvoiceSnapshot {
  status: InvoiceStatus;
  items: InvoiceLineItem[];
  fees: InvoiceLineItem[];
  subtotal: number;
  discount: number;
  discountLabel?: string;
  taxRate: number;
  taxAmount: number;
  taxes?: InvoiceTaxLine[];
  total: number;
  depositRequired?: number;
  depositCollected: number;
  depositCollectedBy?: string;
  depositCollectedAt?: string;
  depositRuleLabel?: string;
  remainingDue: number;
  payments: InvoicePayment[];
  membershipApplied?: string;
  packageCreditsUsed?: number;
  tipTotal?: number;
}

export interface InvoiceAuditEvent {
  id: string;
  type: InvoiceAuditEventType;
  description: string;
  timestamp: string;
  staffName: string;
  amount?: number;
  itemName?: string;
  note?: string;
  snapshot: InvoiceSnapshot;
}

export const invoiceSchema = z.object({
  id: z.string(),
  status: invoiceStatusEnum,
  items: z.array(invoiceLineItemSchema),
  fees: z.array(invoiceLineItemSchema),
  subtotal: z.number(),
  discount: z.number(),
  discountLabel: z.string().optional(),
  discounts: z.array(invoiceLineItemSchema).optional(), // itemized discounts
  taxRate: z.number(),
  taxAmount: z.number(),
  taxes: z.array(invoiceTaxLineSchema).optional(), // multi-tax breakdown
  total: z.number(),
  depositRequired: z.number().optional(),
  depositCollected: z.number(),
  depositCollectedBy: z.string().optional(),
  depositCollectedAt: z.string().optional(),
  depositRuleLabel: z.string().optional(),
  remainingDue: z.number(),
  payments: z.array(invoicePaymentSchema),
  membershipApplied: z.string().optional(), // "Gold — 15%"
  packageCreditsUsed: z.number().optional(),
  tipTotal: z.number().optional(),
  auditTrail: z
    .array(
      z.object({
        id: z.string(),
        type: invoiceAuditEventTypeEnum,
        description: z.string(),
        timestamp: z.string(),
        staffName: z.string(),
        amount: z.number().optional(),
        itemName: z.string().optional(),
        note: z.string().optional(),
        snapshot: z.unknown(),
      }),
    )
    .optional(),
});
export type Invoice = z.infer<typeof invoiceSchema>;

export type InvoiceEditKind = "base" | "addon" | "fee" | "discount";

export function canEditInvoice(
  status: InvoiceStatus,
  kind: InvoiceEditKind,
): boolean {
  if (status === "closed") return false;
  if (status === "open" && kind === "base") return false;
  return true;
}

// ============================================================================
// Estimates
// ============================================================================

export const estimateStatusEnum = z.enum([
  "draft",
  "sent",
  "accepted",
  "declined",
  "expired",
  "converted",
]);
export type EstimateStatus = z.infer<typeof estimateStatusEnum>;

export const estimateLineItemSchema = z.object({
  label: z.string(),
  description: z.string().optional(),
  amount: z.number(),
  quantity: z.number(),
  total: z.number(),
  /**
   * Whether this line is charged the facility's tax.
   *
   * PER LINE, not per estimate. A booking splits cleanly because it has
   * `total_cost` and `extras_total` as separate columns; an estimate's
   * `line_items` is one flat array, so there is no service/extras boundary for
   * an estimate-level flag to apply to. Retail already prices this way per
   * product.
   *
   * Optional, and absent means TAXED — the same direction as every other
   * `taxable` in the app. See lib/payments/service-tax.ts.
   */
  taxable: z.boolean().optional(),
  /**
   * The add-on this line sells, named as a booking names it (`addOnRef`).
   * A booking made from the estimate bills it as an add-on line of its own
   * (2026-09-30), where it was money folded into the booking's price.
   */
  addOnRef: z.string().optional(),
  /** Which pet the add-on is for, by the pet's number. Absent: the first. */
  petRef: z.number().optional(),
  /**
   * Of an add-on line's units, how many the booking's service attaches by
   * itself — a boarding service's default add-ons. Converting bills them all;
   * the booking form, opened to redo the booking, derives these itself and is
   * given only the rest.
   */
  includedQuantity: z.number().optional(),
  /**
   * The custom fee this line charges (`CustomFee.id`). A booking made from
   * the estimate carries it as that fee's line on the bill, at this amount
   * (2026-09-30), where it was money folded into the booking's price.
   */
  feeId: z.string().optional(),
});
export type EstimateLineItem = z.infer<typeof estimateLineItemSchema>;

export const guestPetInfoSchema = z.object({
  name: z.string(),
  breed: z.string().optional(),
  weight: z.string().optional(),
  notes: z.string().optional(),
});
export type GuestPetInfo = z.infer<typeof guestPetInfoSchema>;

export const estimateSchema = z.object({
  id: z.string(),
  estimateId: z.string(),
  clientId: z.number(),
  clientName: z.string(),
  clientEmail: z.string(),
  clientPhone: z.string().optional(),
  petIds: z.array(z.number()),
  petNames: z.array(z.string()),
  service: z.string(),
  serviceType: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  notes: z.string().optional(),
  lineItems: z.array(estimateLineItemSchema),
  subtotal: z.number(),
  discount: z.number(),
  discountReason: z.string().optional(),
  taxRate: z.number(),
  taxAmount: z.number(),
  total: z.number(),
  depositRequired: z.number().optional(),
  status: estimateStatusEnum,
  sentAt: z.string().optional(),
  sentVia: z.enum(["email", "sms", "both"]).optional(),
  expiresAt: z.string().optional(),
  createdAt: z.string(),
  createdBy: z.string(),
  convertedBookingId: z.number().optional(),
  // Guest estimate fields
  isGuestEstimate: z.boolean().optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().optional(),
  guestPhone: z.string().optional(),
  accountCreated: z.boolean().optional(),
  estimateToken: z.string().optional(),
  viewedAt: z.string().optional(),
  publicNote: z.string().optional(),
  internalNote: z.string().optional(),
  roomType: z.string().optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  guestPetInfo: guestPetInfoSchema.optional(),
  // Revision history
  revisions: z
    .array(
      z.object({
        version: z.number(),
        changedAt: z.string(),
        changedBy: z.string(),
        changes: z.string(),
        previousTotal: z.number(),
        newTotal: z.number(),
      }),
    )
    .optional(),
  currentVersion: z.number().optional(),
  // Follow-up tracking
  followUpSentAt: z.string().optional(),
  followUpType: z.enum(["not_viewed", "viewed_not_booked"]).optional(),
  duplicatedFrom: z.string().optional(),
  // Acceptance / decline attribution (staff-on-behalf vs customer)
  acceptedAt: z.string().optional(),
  acceptedBy: z.string().optional(),
  acceptedOnBehalf: z.boolean().optional(),
  declinedAt: z.string().optional(),
  declineReason: z.string().optional(),
  // Auto-creation activation tracking
  accountActivatedAt: z.string().optional(),
  magicLinkExpiresAt: z.string().optional(),
  // Staff-only note (distinct from the customer-facing `publicNote`).
  // `notes` and the existing `internalNote` are also staff-only.
  internalNotes: z.string().optional(),
  // Chronological lifecycle trail:
  // Created/Sent/Viewed/Reminder/Resent/Version/Accepted/Declined/Expired/Converted
  activityLog: z
    .array(
      z.object({
        at: z.string(),
        type: z.string(),
        actor: z.string(),
        detail: z.string().optional(),
      }),
    )
    .optional(),
});
export type Estimate = z.infer<typeof estimateSchema>;

export const qbSyncActionEnum = z.enum([
  "invoice_created",
  "payment_synced",
  "deposit_synced",
  "refund_synced",
  "line_item_added",
  "sync_failed",
  "manual_resync",
]);

export const qbSyncStatusEnum = z.enum([
  "not_synced",
  "pending",
  "synced",
  "failed",
]);

export const qbSyncHistoryEntrySchema = z.object({
  action: qbSyncActionEnum,
  timestamp: z.string(),
  amount: z.number().optional(),
  quickbooksRefId: z.string().optional(),
  error: z.string().optional(),
  triggeredBy: z.string().optional(),
});

export const quickbooksSyncSchema = z.object({
  status: qbSyncStatusEnum,
  quickbooksInvoiceId: z.string().optional(),
  quickbooksCustomerId: z.string().optional(),
  lastSyncAt: z.string().optional(),
  error: z.string().optional(),
  history: z.array(qbSyncHistoryEntrySchema),
});

// ============================================================================
// Feeding / Medication / Belongings — booking-level care instructions
// ============================================================================

export const feedingStatusEnum = z.enum(["pending", "completed", "skipped"]);

export const feedingEntrySchema = z.object({
  id: z.string(),
  label: z.string(),
  time: z.string(),
  amount: z.string(),
  foodType: z.string(),
  instructions: z.string().optional(),
  status: feedingStatusEnum,
  feedback: z.string().optional(),
  completedBy: z.string().optional(),
  completedAt: z.string().optional(),
  notes: z.string().optional(),
  /**
   * The owner's plan this meal row was made from, and which of its meals, so
   * a panel can say the foods and how to serve them in the reader's language
   * (2026-10-01).
   */
  item: feedingScheduleItemSchema.optional(),
  occasionId: z.string().optional(),
});
export type FeedingEntry = z.infer<typeof feedingEntrySchema>;

export const medicationDoseSchema = z.object({
  scheduledAt: z.string(),
  status: z.enum(["pending", "given", "skipped", "refused"]),
  administeredBy: z.string().optional(),
  administeredAt: z.string().optional(),
  skipReason: z.string().optional(),
  notes: z.string().optional(),
});

export const medicationEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  dosage: z.string(),
  method: z.string(),
  frequency: z.string(),
  /** The booking record's own ids, so a screen can name them in its language. */
  formId: medFormEnum.optional(),
  frequencyId: medFrequencyEnum.optional(),
  /** What the owner said it is for, apart from the instructions. */
  purpose: z.string().optional(),
  times: z.array(z.string()),
  instructions: z.string().optional(),
  isCritical: z.boolean(),
  doses: z.array(medicationDoseSchema),
  /**
   * The booking's own medication this row was made from, so a panel can say
   * its dose, days and method in the reader's language (2026-10-01).
   */
  item: medicationItemSchema.optional(),
});
export type MedicationEntry = z.infer<typeof medicationEntrySchema>;

export const belongingEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  photoUrl: z.string().optional(),
  condition: z.string(),
  checkedInAt: z.string().optional(),
  checkedInBy: z.string().optional(),
  returned: z.boolean(),
  returnedAt: z.string().optional(),
  returnedBy: z.string().optional(),
});
export type BelongingEntry = z.infer<typeof belongingEntrySchema>;

/**
 * A pet's care as the booking form's care steps book it — what a training
 * enrolment carries to the session bookings it makes (2026-10-01).
 */
export const bookingCareSchema = newBookingSchema
  .pick({
    feedingSchedule: true,
    medications: true,
    noMedication: true,
    vetContacts: true,
  })
  .strict();
export type BookingCare = z.infer<typeof bookingCareSchema>;

export const bookingSchema = newBookingSchema.extend({
  id: z.number(),
  /** When the row was written — for a customer request, when they asked. Read-only. */
  createdAt: z.string().optional(),
  /**
   * DERIVED from the payments ledger, never sent. See `amountPaid` below and
   * 20260806680000: 'paid' once `amountPaid` covers `totalCost`, 'refunded'
   * once it goes negative, 'pending' otherwise.
   */
  paymentStatus: newBookingPaymentStatusEnum,
  /**
   * Is the pet here, and since when.
   *
   * DERIVED, from `booking_presence` (20260806960000) — whichever of
   * `grooming_appointments`, `daycare_attendance` or `boarding_stays` owns the
   * answer for this service. A SEPARATE AXIS FROM `status`, deliberately:
   * `status` is the booking's lifecycle (requested → confirmed → completed →
   * cancelled) and says nothing about whether a dog is standing in the
   * building.
   *
   * `unknown` where no attendance table exists — training and custom services
   * have none — and for a boarding booking with no kennel assigned yet.
   *
   * Optional because the mock fixtures cannot supply it.
   */
  presence: z.enum(["expected", "on-site", "departed", "unknown"]).optional(),
  arrivedAt: z.string().nullable().optional(),
  departedAt: z.string().nullable().optional(),
  /**
   * Where the booking stands on its pre-arrival form (Yipyy Go). DERIVED, from
   * `booking_yipyy_go` (20260913133630): whether the facility asks for one,
   * and how many of the booking's pets have one that counts — submitted,
   * approved or completed by staff. Optional because the fixtures cannot
   * supply it.
   */
  yipyyGo: z
    .object({
      requirement: z.enum(["mandatory", "optional"]).nullable(),
      status: z.enum([
        "not_required",
        "not_started",
        "in_progress",
        "changes_requested",
        "submitted",
        "approved",
      ]),
      satisfied: z.boolean(),
      petsTotal: z.number(),
      petsSatisfied: z.number(),
    })
    .optional(),
  /**
   * What the payments ledger says has been paid toward this booking:
   * `sum(grand_total - tip)`. DERIVED — see 20260806680000. Writing it does
   * nothing; `paymentStatus` is computed from it and `total_cost`.
   *
   * Optional because the mock fixtures predate the ledger and cannot supply it.
   * Anything read through `src/lib/api` always carries it.
   */
  amountPaid: z.number().optional(),
  /**
   * The price of anything added to this booking at the counter — products,
   * add-ons, a late fee. DERIVED from `booking_line_items` (20260806820000).
   */
  extrasTotal: z.number().optional(),
  /**
   * The part of `extrasTotal` the facility's tax applies to.
   *
   * DERIVED alongside it from `booking_line_items.taxable` (20260923200000).
   * ABSENT MEANS ALL OF IT — extras were taxed unconditionally until a
   * service charge could say otherwise, so a booking mapped without this
   * field must behave exactly as it did before the column existed.
   */
  taxableExtrasTotal: z.number().optional(),
  /**
   * The booking's own add-ons — its `add_on` lines, inside `extrasTotal`.
   * DERIVED (2026-09-30). They sat inside `totalCost` before that, so
   * anything that measured "the service and its add-ons" (a percentage fee, a
   * deposit) reads `totalCost + addOnsTotal`. Absent on an older read: 0.
   */
  addOnsTotal: z.number().optional(),
  /**
   * Whether this booking's OWN service price is taxed.
   *
   * Written by the server from the rate that priced it, and pinned to true for
   * anything a customer inserts (20260921171524). Extras are taxed regardless
   * — a tax-free service does not make a bag of food tax-free.
   *
   * Optional and absent means TAXED, like every other `taxable` in the app.
   * See lib/payments/service-tax.ts.
   */
  taxable: z.boolean().optional(),
  /**
   * What the booking COSTS in total: `totalCost + extrasTotal`.
   *
   * The number every balance is measured against. `totalCost` is the booking's
   * own price and says nothing about the bag of food added at pickup — use
   * `balanceOf()` rather than subtracting from `totalCost` by hand.
   */
  amountDue: z.number().optional(),
  paymentMethod: bookingPaymentMethodEnum.optional(),
  refundMethod: bookingRefundMethodEnum.optional(),
  refundAmount: z.number().optional(),
  cancellationReason: z.string().optional(),
  invoice: invoiceSchema.optional(),
  quickbooksSync: quickbooksSyncSchema.optional(),
  feedingInstructions: z.array(feedingEntrySchema).optional(),
  medicationInstructions: z.array(medicationEntrySchema).optional(),
  belongings: z.array(belongingEntrySchema).optional(),
});

export type Booking = z.infer<typeof bookingSchema>;

// ============================================================================
// Facility Booking Flow Config
// ============================================================================

export const facilityBookingFlowConfigSchema = z.object({
  evaluationRequired: z.boolean(),
  hideServicesUntilEvaluationCompleted: z.boolean(),
  servicesRequiringEvaluation: z.array(z.string()),
  hiddenServices: z.array(z.string()),
  /**
   * When true, the booking catalog pre-filters services/packages by the
   * client's pets on file. A service is hidden if its `eligibleSizes` field
   * is set and none of the client's pet sizes overlap with it. Services
   * without `eligibleSizes` are always shown (default).
   */
  onlyShowApplicableServices: z.boolean().optional(),
});

export type FacilityBookingFlowConfig = z.infer<
  typeof facilityBookingFlowConfigSchema
>;

// ============================================================================
// Booking Requests (from booking-requests.ts)
// ============================================================================

export const bookingRequestStatusEnum = z.enum([
  "pending",
  "declined",
  "waitlisted",
  "scheduled",
]);

export const bookingRequestServiceEnum = z.enum([
  "daycare",
  "boarding",
  "grooming",
  "training",
]);

export const bookingRequestSchema = z.object({
  id: z.string(),
  /**
   * Fixture-only, like `Booking.facilityId` above and for the same reason: a
   * real facility is a uuid. The online-booking page adapts REAL bookings into
   * this shape for display, and has no number to put here — so this must not
   * oblige it to invent one.
   */
  facilityId: z.number().optional(),
  createdAt: z.string(),
  appointmentAt: z.string(),
  clientId: z.number(),
  clientName: z.string(),
  clientContact: z.string(),
  petId: z.number(),
  petName: z.string(),
  services: z.array(bookingRequestServiceEnum),
  status: bookingRequestStatusEnum,
  notes: z.string().optional(),
  // What the customer actually entered in their online booking form.
  // Optional so older/seeded requests without detail still validate.
  startDate: z.string().optional(), // "YYYY-MM-DD"
  endDate: z.string().optional(), // "YYYY-MM-DD" — boarding checkout
  checkInTime: z.string().optional(), // "HH:mm"
  checkOutTime: z.string().optional(), // "HH:mm"
  daycareDates: z.array(z.string()).optional(), // multi-date daycare picks
  roomPreference: z.string().optional(), // boarding room id (e.g. "room-ds-01")
  daycareSectionId: z.string().optional(), // daycare play-area section (e.g. "sec-indoor-medium")
  extraServices: z.array(extraServiceSchema).optional(),
  feedingSchedule: z.array(feedingScheduleItemSchema).optional(),
  medications: z.array(medicationItemSchema).optional(),
  /** The pets answered "takes no medication". */
  noMedication: z.array(z.number().int()).optional(),
  /** Each pet's vet, by pet id. */
  vetContacts: z.record(z.string(), vetContactSchema).optional(),
  notificationEmail: z.boolean().optional(),
  notificationSMS: z.boolean().optional(),
  /** Every booking this request made — one per daycare day — in date order. */
  refs: z.array(z.number()).optional(),
  /** The days it asks for, as YYYY-MM-DD, one per booking. */
  dayDates: z.array(z.string()).optional(),
  /** What the customer's form quoted for the whole request; null when none. */
  quote: z.number().nullable().optional(),
});

export type BookingRequest = z.infer<typeof bookingRequestSchema>;
export type BookingRequestStatus = z.infer<typeof bookingRequestStatusEnum>;
export type BookingRequestService = z.infer<typeof bookingRequestServiceEnum>;

// ============================================================================
// Booking Pet Line (from boarding-ops.ts)
// ============================================================================

export const bookingPetLineSchema = z.object({
  petId: z.number(),
  petName: z.string(),
  petType: z.enum(["dog", "cat"]),
  breed: z.string(),
  evaluationRequired: z.boolean(),
  behaviorTags: z.array(z.string()),
});

export type BookingPetLine = z.infer<typeof bookingPetLineSchema>;

// ============================================================================
// Booking Add-On Line (from boarding-ops.ts)
// ============================================================================

export const bookingAddOnLineSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.enum(["flat", "day"]),
  unitPrice: z.number(),
  quantity: z.number(),
});

export type BookingAddOnLine = z.infer<typeof bookingAddOnLineSchema>;

// ============================================================================
// Step Config Types (from booking-step-config.ts)
// ============================================================================

export const detailsSubStepIdEnum = z.enum([
  "schedule",
  "roomType",
  "addons",
  "feedingMeds",
  "package",
  "dateTime",
]);

export type DetailsSubStepId = z.infer<typeof detailsSubStepIdEnum>;

export const mainStepIdEnum = z.enum([
  "pets",
  "service",
  "details",
  "forms",
  "tip",
  "confirm",
]);

export type MainStepId = z.infer<typeof mainStepIdEnum>;

// ============================================================================
// Form Schemas
// ============================================================================

export const createBookingSchema = newBookingSchema.omit({
  status: true,
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const editBookingSchema = bookingSchema.partial().required({
  id: true,
});

export type EditBookingInput = z.infer<typeof editBookingSchema>;
