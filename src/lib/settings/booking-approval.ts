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
// The switch is gone rather than moved. `private.enforce_booking_integrity`
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

export const bookingApprovalSchema = z.object({
  responseHours: z.partialRecord(
    z.enum(APPROVAL_SERVICES),
    responseHoursSchema,
  ),
});

export type BookingApproval = z.infer<typeof bookingApprovalSchema>;

/** A day, for every service, until a facility says otherwise. */
export const DEFAULT_RESPONSE_HOURS = 24;

export const DEFAULT_BOOKING_APPROVAL: BookingApproval = {
  responseHours: {},
};

export function responseHoursFor(
  approval: BookingApproval,
  service: string,
): number {
  return (
    approval.responseHours[service as ApprovalService] ?? DEFAULT_RESPONSE_HOURS
  );
}
