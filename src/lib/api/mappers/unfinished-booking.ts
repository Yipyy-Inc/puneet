import { z } from "zod";

import type {
  AbandonmentStep,
  UnfinishedBooking,
  UnfinishedBookingNote,
  UnfinishedBookingStatus,
} from "@/types/unfinished-booking";

// ============================================================================
// public.unfinished_bookings ⇄ the `UnfinishedBooking` the screens read
// (20260914133049).
//
// `id` is the row's uuid: an unfinished booking has no ref, and the resume
// link carries the uuid. The client and pet are their refs, as everywhere.
// Everything the form held rides in `draft` — the BookingModal preselection
// shape — and is spread back onto the record for `buildResumePreselection`.
//
// `facilityId` is 0: the flat type wants a number and the row has a uuid.
// Scoping is the session's (see forms' live-shape.ts for the same sentinel).
// ============================================================================

export const ABANDONMENT_STEPS = [
  "service_selection",
  "pet_selection",
  "date_and_details",
  "add_ons",
  "forms",
  "review",
  "payment",
] as const satisfies readonly AbandonmentStep[];

export const UNFINISHED_BOOKING_SELECT =
  "id, service, step, status, requested_start, requested_end, estimated_value, draft, notes, last_contacted_at, recovered_at, abandoned_at, clients(ref, name, email, phone)";

/**
 * What staff read: the customer's columns plus the recovery outcome
 * (20260914144927). The customer's routes keep the narrower select, so the
 * tick's internal reasons never reach them.
 */
export const UNFINISHED_BOOKING_STAFF_SELECT = `${UNFINISHED_BOOKING_SELECT}, recovery_outcome, recovery_detail, recovery_resolved_at`;

export type UnfinishedBookingRow = {
  id: string;
  service: string | null;
  step: AbandonmentStep;
  status: UnfinishedBookingStatus;
  requested_start: string | null;
  requested_end: string | null;
  estimated_value: number | string | null;
  draft: Record<string, unknown> | null;
  notes: UnfinishedBookingNote[] | null;
  last_contacted_at: string | null;
  recovered_at: string | null;
  abandoned_at: string;
  recovery_outcome?: "queued" | "none" | "skipped" | null;
  recovery_detail?: string | null;
  recovery_resolved_at?: string | null;
  clients: {
    ref: number;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

/** The draft fields a resumed form reads back, as the form sent them. */
const draftSchema = z
  .object({
    preSelectedPetId: z.number().int().positive().optional(),
    petName: z.string().max(200).optional(),
    petType: z.enum(["dog", "cat"]).optional(),
    serviceType: z.string().max(100).optional(),
    preSelectedCheckInTime: z.string().max(10).optional(),
    preSelectedCheckOutTime: z.string().max(10).optional(),
    preSelectedDaycareDates: z.array(z.string().max(10)).max(60).optional(),
    preSelectedRoomId: z.string().max(100).optional(),
    preSelectedDaycareSectionId: z.string().max(100).optional(),
    preSelectedExtraServices: z.array(z.unknown()).max(50).optional(),
    preSelectedFeedingSchedule: z.array(z.unknown()).max(50).optional(),
    preSelectedMedications: z.array(z.unknown()).max(50).optional(),
    preSelectedSpecialRequests: z.string().max(4000).optional(),
    preSelectedNotificationEmail: z.boolean().optional(),
    preSelectedNotificationSMS: z.boolean().optional(),
  })
  .strip();

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** What the customer's form sends when it is left partway. */
export const unfinishedBookingWriteSchema = z.object({
  clientRef: z.number().int().positive(),
  service: z.string().min(1).max(60).optional(),
  step: z.enum(ABANDONMENT_STEPS),
  requestedStart: isoDay.optional(),
  requestedEnd: isoDay.optional(),
  estimatedValue: z.number().min(0).max(100000).optional(),
  draft: draftSchema.default({}),
});
export type UnfinishedBookingWrite = z.input<
  typeof unfinishedBookingWriteSchema
>;

/** Staff follow-up: a status, a note, or both. */
export const unfinishedBookingStaffPatchSchema = z
  .object({
    status: z.enum(["abandoned", "contacted", "recovered"]).optional(),
    note: z.string().trim().min(1).max(2000).optional(),
  })
  .refine((p) => p.status !== undefined || p.note !== undefined, {
    message: "Nothing to change.",
  });
export type UnfinishedBookingStaffPatch = z.infer<
  typeof unfinishedBookingStaffPatchSchema
>;

export function rowToUnfinishedBooking(
  row: UnfinishedBookingRow,
): UnfinishedBooking {
  const draft = draftSchema.safeParse(row.draft ?? {});
  const d = draft.success ? draft.data : {};
  return {
    id: row.id,
    clientId: row.clients?.ref,
    clientName: row.clients?.name ?? "",
    clientEmail: row.clients?.email ?? "",
    clientPhone: row.clients?.phone ?? undefined,
    petId: d.preSelectedPetId,
    petName: d.petName,
    petType: d.petType,
    service: row.service ?? undefined,
    serviceType: d.serviceType,
    requestedStartDate: row.requested_start ?? undefined,
    requestedEndDate: row.requested_end ?? undefined,
    facilityId: 0,
    abandonedAt: row.abandoned_at,
    abandonmentStep: row.step,
    status: row.status,
    lastContactedAt: row.last_contacted_at ?? undefined,
    notes: row.notes ?? [],
    estimatedValue:
      row.estimated_value === null ? undefined : Number(row.estimated_value),
    checkInTime: d.preSelectedCheckInTime,
    checkOutTime: d.preSelectedCheckOutTime,
    daycareDates: d.preSelectedDaycareDates,
    roomPreference: d.preSelectedRoomId,
    daycareSectionId: d.preSelectedDaycareSectionId,
    extraServices:
      d.preSelectedExtraServices as UnfinishedBooking["extraServices"],
    feedingSchedule:
      d.preSelectedFeedingSchedule as UnfinishedBooking["feedingSchedule"],
    medications: d.preSelectedMedications as UnfinishedBooking["medications"],
    specialRequests: d.preSelectedSpecialRequests,
    notificationEmail: d.preSelectedNotificationEmail,
    notificationSMS: d.preSelectedNotificationSMS,
    ...(row.recovery_outcome && row.recovery_resolved_at
      ? {
          recovery: {
            outcome: row.recovery_outcome,
            detail: row.recovery_detail ?? undefined,
            resolvedAt: row.recovery_resolved_at,
            sends: [],
          },
        }
      : {}),
  };
}
