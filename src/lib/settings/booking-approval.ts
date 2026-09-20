import { z } from "zod";

// ============================================================================
// How long a facility tells a customer it takes to answer a booking request.
//
// ── WHAT THIS REPLACED, AND WHAT IT DELIBERATELY DOES NOT KEEP ─────────────
//
// `getApprovalConfig()` in src/data/facility-config.ts: a per-service switch,
// a response time and an auto-confirm delay, saved to localStorage — so the
// promise a customer read depended on which browser had last opened Settings.
//
// The switch CAME BACK on 2026-09-20, for real this time — see
// `autoConfirmsService` below, the server pricing it depends on, and the
// trigger branch that lets a priced, server-made booking be confirmed. What
// follows is why it was deleted in between.
//
// The switch was gone rather than moved. `private.enforce_booking_integrity`
// makes EVERY booking a customer inserts a `request_submitted` with no price,
// whatever the switch said, so "Direct booking — customers are confirmed
// instantly" was never true; and nothing anywhere read the auto-confirm delay.
// A setting that decides nothing is worse than none. What is real is the wait a
// customer is told to expect, so that is what a facility sets.
// ============================================================================

export const APPROVAL_SERVICES = [
  "boarding",
  "daycare",
  "grooming",
  "training",
] as const;
export type ApprovalService = (typeof APPROVAL_SERVICES)[number];

/** Hours, as a customer reads them: at least one, at most a month. */
export const responseHoursSchema = z.number().int().min(1).max(720);

/**
 * Whether a customer's booking for this service is CONFIRMED on the spot
 * rather than queued as a request.
 *
 * Keyed by any service the facility offers, not by APPROVAL_SERVICES: a custom
 * module is a slug in the same `bookings.service` text column, and a facility
 * that sells dog-walking wants this switch for dog-walking too.
 *
 * Absent means OFF — a request — which is what every facility had before this
 * existed and is the safe answer for one that has not chosen.
 */
export const autoConfirmSchema = z.record(
  z.string().min(1).max(60),
  z.boolean(),
);

export const bookingApprovalSchema = z.object({
  responseHours: z.partialRecord(
    z.enum(APPROVAL_SERVICES),
    responseHoursSchema,
  ),
  // Optional rather than defaulted, so a facility saved before this existed
  // parses unchanged and reads as "every service is a request".
  autoConfirm: autoConfirmSchema.optional(),
});

export type BookingApproval = z.infer<typeof bookingApprovalSchema>;

/** A day, for every service, until a facility says otherwise. */
export const DEFAULT_RESPONSE_HOURS = 24;

export const DEFAULT_BOOKING_APPROVAL: BookingApproval = {
  responseHours: {},
};

/**
 * Does this facility confirm a customer's booking for this service outright?
 *
 * The answer here is only half of it: the server still has to be able to PRICE
 * the booking from the facility's own rates. A booking it cannot price becomes
 * a request whatever this says, because confirming an unpriced stay is worse
 * than making somebody wait. See lib/bookings/price-booking.ts.
 */
export function autoConfirmsService(
  approval: BookingApproval,
  service: string,
): boolean {
  return approval.autoConfirm?.[service] === true;
}

export function responseHoursFor(
  approval: BookingApproval,
  service: string,
): number {
  return (
    approval.responseHours[service as ApprovalService] ?? DEFAULT_RESPONSE_HOURS
  );
}
