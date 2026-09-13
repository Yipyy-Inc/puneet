import { z } from "zod";

import {
  behaviorNotesSchema,
  belongingItemSchema,
  feedingInstructionSchema,
  medicationItemSchema,
} from "@/types/yipyygo";

// ============================================================================
// The pre-arrival form (Yipyy Go) between Postgres and the screens.
//
// yipyy_go_submissions (20260913133630) is one form per booking and pet;
// yipyy_go_charges (20260913135000) what it put on the bill;
// yipyy_go_photos (20260913135943) its photos; the check-in code and the desk
// record are 20260913140335. This file holds the request bodies the routes
// accept and the shapes the screens draw.
//
// ── WHAT A REQUEST MAY SAY ────────────────────────────────────────────────
//
// Answers reuse the form's own schemas, with one change: a photo is a
// `photoId` (a yipyy_go_photos row), never a URL — the old form stored blob:
// URLs that died with the tab. z.object strips keys it does not know, so a
// `price` smuggled into an add-on request or an answer never reaches the
// database; the price comes from the catalogue in SQL anyway.
// ============================================================================

const photoId = z.string().uuid();

const customAnswerValue = z.union([
  z.string().max(2000),
  z.number(),
  z.boolean(),
  z.array(z.string().max(500)).max(50),
]);

export const yipyyGoAnswersSchema = z.object({
  belongings: z
    .array(
      belongingItemSchema
        .omit({ photoUrl: true })
        .extend({ photoId: photoId.optional() }),
    )
    .max(50)
    .default([]),
  belongingsPhotoId: photoId.optional(),
  feedingInstructions: feedingInstructionSchema.optional(),
  medications: z
    .array(
      medicationItemSchema
        .omit({ photoUrl: true })
        .extend({ photoId: photoId.optional() }),
    )
    .max(30)
    .default([]),
  noMedications: z.boolean().default(false),
  behaviorNotes: behaviorNotesSchema.optional(),
  customAnswers: z
    .record(z.string().min(1).max(100), customAnswerValue)
    .optional(),
});
export type YipyyGoAnswers = z.infer<typeof yipyyGoAnswersSchema>;

export const yipyyGoAddOnRequestSchema = z.object({
  addOnId: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(100).optional(),
});
export type YipyyGoAddOnRequest = z.infer<typeof yipyyGoAddOnRequestSchema>;

export const yipyyGoTipChoiceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("preset"), presetId: z.string().min(1).max(100) }),
  z.object({ type: z.literal("custom"), amount: z.number().min(0).max(1000) }),
  z.object({ type: z.literal("none") }),
]);
export type YipyyGoTipChoice = z.infer<typeof yipyyGoTipChoiceSchema>;

export const yipyyGoDraftBodySchema = z.object({
  answers: yipyyGoAnswersSchema,
  addOnRequests: z.array(yipyyGoAddOnRequestSchema).max(50).default([]),
});

export const yipyyGoSubmitBodySchema = yipyyGoDraftBodySchema.extend({
  tip: yipyyGoTipChoiceSchema.optional(),
});

const petRef = z.number().int().positive();
const staffText = z.string().trim().min(1).max(1000);

export const yipyyGoReviewBodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), petRef }),
  z.object({
    action: z.literal("request_changes"),
    petRef,
    message: staffText,
  }),
  z.object({ action: z.literal("complete"), petRef, reason: staffText }),
]);
export type YipyyGoReviewBody = z.infer<typeof yipyyGoReviewBodySchema>;

export const yipyyGoDeskCheckBodySchema = z.object({
  source: z.enum(["code", "search"]),
  pets: z
    .array(
      z.object({
        petRef,
        medicationsConfirmed: z.boolean().default(false),
        belongingsConfirmed: z.boolean().default(false),
        overrideReason: z.string().trim().max(1000).optional(),
      }),
    )
    .min(1)
    .max(20),
});
export type YipyyGoDeskCheckBody = z.infer<typeof yipyyGoDeskCheckBodySchema>;

export const yipyyGoResolveBodySchema = z.object({
  code: z.string().min(16).max(128),
});

// ── What the screens draw ──────────────────────────────────────────────────

export type YipyyGoSubmissionStatus =
  | "draft"
  | "submitted"
  | "changes_requested"
  | "approved"
  | "completed_by_staff";

export type YipyyGoBookingStatus =
  | "not_required"
  | "not_started"
  | "in_progress"
  | "changes_requested"
  | "submitted"
  | "approved";

const SUBMISSION_STATUSES: readonly YipyyGoSubmissionStatus[] = [
  "draft",
  "submitted",
  "changes_requested",
  "approved",
  "completed_by_staff",
];

const BOOKING_STATUSES: readonly YipyyGoBookingStatus[] = [
  "not_required",
  "not_started",
  "in_progress",
  "changes_requested",
  "submitted",
  "approved",
];

export interface YipyyGoSubmissionRow {
  id: string;
  booking_id: string;
  pet_id: string;
  status: string;
  answers: unknown;
  add_on_requests: unknown;
  tip_choice: unknown;
  submitted_at: string | null;
  submitted_by_name: string | null;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
  changes_message: string | null;
  completed_reason: string | null;
  completed_at: string | null;
  completed_by_name: string | null;
  updated_at: string;
}

export interface YipyyGoPhoto {
  id: string;
  kind: "belongings" | "medication" | "question";
  itemRef: string | null;
  /** Signed for a minute; never stored. */
  url: string;
  /** The name it was uploaded with, without the folders the bucket keeps. */
  name: string;
  sizeBytes: number;
}

export interface YipyyGoSubmission {
  id: string;
  petRef: number;
  petName: string;
  status: YipyyGoSubmissionStatus;
  answers: YipyyGoAnswers;
  addOnRequests: YipyyGoAddOnRequest[];
  tipChoice: YipyyGoTipChoice | null;
  submittedAt: string | null;
  submittedByName: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
  changesMessage: string | null;
  completedReason: string | null;
  completedAt: string | null;
  completedByName: string | null;
  updatedAt: string;
  photos: YipyyGoPhoto[];
}

/** An answers value the database holds that no longer parses reads as empty,
 *  rather than failing the whole page. */
export function parseStoredAnswers(value: unknown): YipyyGoAnswers {
  const parsed = yipyyGoAnswersSchema.safeParse(value ?? {});
  return parsed.success
    ? parsed.data
    : yipyyGoAnswersSchema.parse({ belongings: [], medications: [] });
}

export function rowToYipyyGoSubmission(
  row: YipyyGoSubmissionRow,
  pet: { ref: number; name: string },
  photos: YipyyGoPhoto[] = [],
): YipyyGoSubmission {
  const requests = z
    .array(yipyyGoAddOnRequestSchema)
    .safeParse(row.add_on_requests ?? []);
  const tip = yipyyGoTipChoiceSchema.safeParse(row.tip_choice);
  return {
    id: row.id,
    petRef: pet.ref,
    petName: pet.name,
    status: SUBMISSION_STATUSES.includes(row.status as YipyyGoSubmissionStatus)
      ? (row.status as YipyyGoSubmissionStatus)
      : "draft",
    answers: parseStoredAnswers(row.answers),
    addOnRequests: requests.success ? requests.data : [],
    tipChoice: tip.success ? tip.data : null,
    submittedAt: row.submitted_at,
    submittedByName: row.submitted_by_name,
    reviewedAt: row.reviewed_at,
    reviewedByName: row.reviewed_by_name,
    changesMessage: row.changes_message,
    completedReason: row.completed_reason,
    completedAt: row.completed_at,
    completedByName: row.completed_by_name,
    updatedAt: row.updated_at,
    photos,
  };
}

export interface BookingYipyyGo {
  requirement: "mandatory" | "optional" | null;
  status: YipyyGoBookingStatus;
  satisfied: boolean;
  petsTotal: number;
  petsSatisfied: number;
}

export interface BookingYipyyGoRow {
  booking_id: string | null;
  requirement: string | null;
  status: string | null;
  satisfied: boolean | null;
  pets_total: number | null;
  pets_satisfied: number | null;
}

export function rowToBookingYipyyGo(row: BookingYipyyGoRow): BookingYipyyGo {
  const requirement =
    row.requirement === "mandatory" || row.requirement === "optional"
      ? row.requirement
      : null;
  return {
    requirement,
    status:
      requirement &&
      BOOKING_STATUSES.includes(row.status as YipyyGoBookingStatus)
        ? (row.status as YipyyGoBookingStatus)
        : "not_required",
    satisfied: requirement ? Boolean(row.satisfied) : true,
    petsTotal: Number(row.pets_total ?? 0),
    petsSatisfied: Number(row.pets_satisfied ?? 0),
  };
}

export interface YipyyGoCharge {
  key: string;
  kind: "add_on" | "medication_fee";
  name: string;
  unitPrice: number;
  quantity: number;
  /** False once staff removed its line: the form does not put it back. */
  onBill: boolean;
}

export interface YipyyGoChargeRow {
  charge_key: string;
  kind: string;
  name: string;
  unit_price: number | string;
  quantity: number;
  line_item_id: string | null;
}

export function rowToYipyyGoCharge(row: YipyyGoChargeRow): YipyyGoCharge {
  return {
    key: row.charge_key,
    kind: row.kind === "medication_fee" ? "medication_fee" : "add_on",
    name: row.name,
    unitPrice: Number(row.unit_price),
    quantity: row.quantity,
    onBill: row.line_item_id !== null,
  };
}

export interface YipyyGoOfferedAddOn {
  id: string;
  name: string;
  description: string;
  pricingType: string;
  unitPrice: number;
  unitLabel: string;
  maxQuantity: number;
  petScope: "per_pet" | "per_booking";
}

export function parseOfferedAddOns(value: unknown): YipyyGoOfferedAddOn[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const o = item as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.name !== "string") return [];
    return [
      {
        id: o.id,
        name: o.name,
        description: typeof o.description === "string" ? o.description : "",
        pricingType: typeof o.pricingType === "string" ? o.pricingType : "flat",
        unitPrice: Number(o.unitPrice ?? 0),
        unitLabel: typeof o.unitLabel === "string" ? o.unitLabel : "",
        maxQuantity: Math.max(1, Number(o.maxQuantity ?? 1)),
        petScope: o.petScope === "per_pet" ? "per_pet" : "per_booking",
      },
    ];
  });
}

export interface YipyyGoArrival {
  bookingRef: number;
  service: string;
  status: string;
  startAt: string;
  endAt: string;
  clientName: string;
  pets: { ref: number; name: string }[];
  requirement: "mandatory" | "optional" | null;
  formStatus: YipyyGoBookingStatus;
  satisfied: boolean;
  presence: "expected" | "on-site" | "departed" | "unknown";
}

export interface YipyyGoArrivalRow {
  booking_ref: number;
  service: string;
  status: string;
  start_at: string;
  end_at: string;
  client_name: string | null;
  pets: unknown;
  requirement: string | null;
  form_status: string | null;
  satisfied: boolean | null;
  presence: string | null;
}

export function rowToYipyyGoArrival(row: YipyyGoArrivalRow): YipyyGoArrival {
  const yipyyGo = rowToBookingYipyyGo({
    booking_id: null,
    requirement: row.requirement,
    status: row.form_status,
    satisfied: row.satisfied,
    pets_total: null,
    pets_satisfied: null,
  });
  const pets = Array.isArray(row.pets)
    ? row.pets.flatMap((p) => {
        const pet = p as { ref?: unknown; name?: unknown };
        return typeof pet.name === "string"
          ? [{ ref: Number(pet.ref), name: pet.name }]
          : [];
      })
    : [];
  const presence = row.presence;
  return {
    bookingRef: Number(row.booking_ref),
    service: row.service,
    status: row.status,
    startAt: row.start_at,
    endAt: row.end_at,
    clientName: row.client_name ?? "",
    pets,
    requirement: yipyyGo.requirement,
    formStatus: yipyyGo.status,
    satisfied: yipyyGo.satisfied,
    presence:
      presence === "expected" ||
      presence === "on-site" ||
      presence === "departed"
        ? presence
        : "unknown",
  };
}
