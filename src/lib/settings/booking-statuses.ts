import { z } from "zod";

// ============================================================================
// What happens to a booking's status when something happens to the booking.
//
// ── WHERE THIS USED TO LIVE ───────────────────────────────────────────────
//
// On fixture facility 11 in `src/data/facilities.ts`, written by
// `saveBookingStatusConfig()` — an assignment into an imported module. The
// settings screen edited it for the rest of the session and a reload put it
// back; and because every booking was mapped with `facilityId: 11`, every
// facility on the platform checked in, checked out and confirmed deposits by
// the demo facility's rules.
//
// ── THE FALLBACK IS THE PLAIN LIFECYCLE ───────────────────────────────────
//
// A deposit confirms, a check-in checks in, a checkout completes. These move a
// status, not money, and a facility that never opened the screen still needs
// the check-in button to do something. A payment moves nothing by default:
// the fixture sent a fully paid booking back to "confirmed", which on a
// checked-in guest is a step backwards.
// ============================================================================

/** The statuses a booking can actually hold — the database enum. */
export const BOOKING_STATUS_IDS = [
  "pending",
  "estimate_sent",
  "request_submitted",
  "waitlisted",
  "confirmed",
  "checked_in",
  "in_progress",
  "ready",
  "completed",
  "no_show",
  "cancelled",
  "declined",
] as const;

export function isBookingStatus(
  value: string,
): value is (typeof BOOKING_STATUS_IDS)[number] {
  return (BOOKING_STATUS_IDS as readonly string[]).includes(value);
}

const transitionAction = z.enum([
  "onDepositPaid",
  "onCheckIn",
  "onCheckout",
  "onPaymentComplete",
]);

export type StatusTransitionAction = z.infer<typeof transitionAction>;

export const bookingStatusRulesSchema = z.object({
  /**
   * Named stages a facility draws in its flow. A booking cannot be PUT in one
   * yet — `bookings.status` is an enum — so they are labels, and a rule that
   * targets one is skipped rather than written and refused.
   */
  customStatuses: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      color: z.string(),
      position: z.number(),
    }),
  ),
  autoTransitions: z.object({
    onDepositPaid: z.string(),
    onCheckIn: z.string(),
    onCheckout: z.string(),
    onPaymentComplete: z.string(),
  }),
  /** Per-service overrides, checked before `autoTransitions`. */
  iftttTransitionRules: z.array(
    z.object({
      id: z.string(),
      service: z.string(),
      action: transitionAction,
      currentStatus: z.string(),
      targetStatus: z.string(),
      enabled: z.boolean(),
    }),
  ),
});

export type BookingStatusRules = z.infer<typeof bookingStatusRulesSchema>;

export const DEFAULT_BOOKING_STATUS_RULES: BookingStatusRules = {
  customStatuses: [],
  autoTransitions: {
    onDepositPaid: "confirmed",
    onCheckIn: "checked_in",
    onCheckout: "completed",
    onPaymentComplete: "none",
  },
  iftttTransitionRules: [
    {
      id: "grooming-check-in",
      service: "grooming",
      action: "onCheckIn",
      currentStatus: "any",
      targetStatus: "in_progress",
      enabled: true,
    },
  ],
};
