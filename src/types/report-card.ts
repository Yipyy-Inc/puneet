import { z } from "zod";

// ============================================================================
// A persisted report card.
//
// This is the FACILITY's shape, and it is canonical because it is the one the
// product actually produces: the staff's answers (`input`) and the prose
// generated from them (`generated`). See 20260822300000 for why the customer's
// older structured shape in `types/pet.ts` — activities[], meals[],
// pottyBreaks[] — is not what gets stored: nothing has ever collected those
// arrays, and `care_log_entries` / `daycare_attendance` already record the same
// day's feedings and potty breaks properly.
//
// `types/pet.ts`'s `reportCardSchema` still describes the fixture that the
// unconverted screens read. The two coexist until those screens move over;
// this file is the one to extend.
// ============================================================================

export const reportCardServiceEnum = z.enum([
  "daycare",
  // Not "hotel". The facility module called it that; `boarding_stays` and
  // `boarding_send_updates` call it boarding, and the database now agrees.
  "boarding",
  "grooming",
  "training",
]);
export type ReportCardService = z.infer<typeof reportCardServiceEnum>;

export const reportCardDeliveryStatusEnum = z.enum([
  "pending",
  "scheduled",
  "sent",
]);
export type ReportCardDeliveryStatus = z.infer<
  typeof reportCardDeliveryStatusEnum
>;

/**
 * The prose. Stable keys — these are the sections the AI route returns and the
 * only part of a card a facility pays for, so they are named rather than left
 * in a bag.
 */
export const reportCardGeneratedSchema = z.object({
  todaysVibe: z.string().default(""),
  friendsAndFun: z.string().default(""),
  careMetrics: z.string().default(""),
  holidaySparkle: z.string().optional(),
  closingNote: z.string().default(""),
});
export type ReportCardGenerated = z.infer<typeof reportCardGeneratedSchema>;

/**
 * The staff's answers.
 *
 * Deliberately open. A facility defines its own custom questions in
 * `facility_settings.report_cards`, so the key set is per-facility and cannot
 * be enumerated here — which is the same reason the column is `jsonb`. The
 * well-known keys are documented rather than enforced: mood, energy,
 * socialization, playNotes, bestFriends, favoriteActivities, appetite, potty,
 * meds, holiday, holidayNote, closingComment, overallFeedback, customAnswers,
 * petConditions.
 */
export const reportCardInputSchema = z.record(z.string(), z.unknown());
export type ReportCardInput = z.infer<typeof reportCardInputSchema>;

export const reportCardPhotoSchema = z.object({
  id: z.string(),
  kind: z.enum(["moment", "before", "after"]),
  caption: z.string().nullable(),
  sortOrder: z.number(),
  /** Path in the private `report-card-photos` bucket, not a URL. */
  storagePath: z.string(),
  /**
   * A short-lived signed URL for that path, minted by the route.
   *
   * The bucket is private, so the path alone renders nothing — an owner
   * given `<img src={storagePath}>` sees a broken image. Null when signing
   * failed, which the UI must treat as "no photo" rather than a broken one.
   */
  url: z.string().nullable(),
  contentType: z.string(),
  sizeBytes: z.number(),
});
export type ReportCardPhoto = z.infer<typeof reportCardPhotoSchema>;

export const reportCardSchema = z.object({
  id: z.string(),
  facilityId: z.string(),
  petId: z.string(),
  clientId: z.string(),
  bookingId: z.string().nullable(),

  serviceType: reportCardServiceEnum,
  visitDate: z.string(),
  theme: z.string().nullable(),

  input: reportCardInputSchema,
  generated: reportCardGeneratedSchema,

  deliveryStatus: reportCardDeliveryStatusEnum,
  scheduledFor: z.string().nullable(),
  sentAt: z.string().nullable(),

  // ── The owner's side. Written only through the RPCs; never PATCHed. ──────
  viewedAt: z.string().nullable(),
  favourite: z.boolean(),
  replyMessage: z.string().nullable(),
  repliedAt: z.string().nullable(),
  ratingStars: z.number().nullable(),
  ratingComment: z.string().nullable(),
  ratingSubmittedAt: z.string().nullable(),

  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),

  photos: z.array(reportCardPhotoSchema).default([]),

  // Joined for display. Not columns — a card does not own the pet's name.
  petName: z.string().optional(),
  ownerName: z.string().optional(),
  /**
   * The app's numeric refs, joined for the screens that still act in them —
   * rebooking from a card takes the pet's ref, not its uuid.
   */
  petRef: z.number().optional(),
  clientRef: z.number().optional(),
});
export type ReportCard = z.infer<typeof reportCardSchema>;

/** What the facility screen sends to create one. */
export const newReportCardSchema = z.object({
  /** The app's numeric pet ref, resolved to a uuid server-side through RLS. */
  petRef: z.number(),
  bookingRef: z.number().nullable().optional(),
  serviceType: reportCardServiceEnum,
  visitDate: z.string(),
  theme: z.string().nullable().optional(),
  input: reportCardInputSchema,
  generated: reportCardGeneratedSchema,
  /**
   * `pending` or `scheduled` drafts it; `sent` publishes it to the owner's
   * portal in the same request. The route stamps `sentAt` — a caller does not
   * get to say when something was delivered.
   */
  deliveryStatus: reportCardDeliveryStatusEnum.default("pending"),
  scheduledFor: z.string().nullable().optional(),
});
export type NewReportCard = z.infer<typeof newReportCardSchema>;
