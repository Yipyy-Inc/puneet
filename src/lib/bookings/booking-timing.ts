// ============================================================================
// Where a booking sits in the customer's own calendar, and what they may do.
//
// The customer's bookings list split upcoming from past by comparing the
// booking's start — a facility-local "YYYY-MM-DD" parsed as UTC midnight —
// with the current instant, so a booking for today was "past" from the
// morning on, and its check-in code went with it. Days are compared as days
// here: today's booking is today's until its last day is over.
//
// The database has the last word on cancelling (cancel_my_booking,
// 20260919162510, to the minute); these only decide what to offer.
// ============================================================================

import { localToday } from "@/lib/vaccinations";

export type BookingTiming = "upcoming" | "today" | "past";

interface Timed {
  status: string;
  startDate: string;
  endDate?: string;
}

/** Asked for, and not yet a booking: the facility has not said yes. */
const AWAITING = new Set(["request_submitted", "estimate_sent", "waitlisted"]);
/** Nothing more happens to these. */
const FINISHED = new Set(["completed", "cancelled", "declined", "no_show"]);
/** The pet is at the facility now. */
const ON_SITE = new Set(["checked_in", "in_progress", "ready"]);
/** What the owner may still cancel or withdraw (enforce_booking_integrity). */
const OPEN = new Set([
  "pending",
  "request_submitted",
  "estimate_sent",
  "waitlisted",
  "confirmed",
]);

/** "YYYY-MM-DD", or undefined for anything that is not one. */
export function isoDayOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : undefined;
}

export function bookingTiming(
  booking: Timed,
  today: string = localToday(),
): BookingTiming {
  if (FINISHED.has(booking.status)) return "past";
  if (ON_SITE.has(booking.status)) return "today";
  const start = isoDayOrUndefined(booking.startDate?.slice(0, 10));
  if (!start) return "upcoming";
  const last = isoDayOrUndefined(booking.endDate?.slice(0, 10)) ?? start;
  if (last < today) return "past";
  if (start <= today) return "today";
  return "upcoming";
}

export function isAwaitingConfirmation(booking: { status: string }): boolean {
  return AWAITING.has(booking.status);
}

/**
 * Whether to offer Cancel (or Withdraw, for a request). A request can be
 * withdrawn until the facility answers; a booking until the day it starts —
 * the database refuses one that has already begun.
 */
export function isCustomerCancellable(
  booking: Timed,
  today: string = localToday(),
): boolean {
  if (!OPEN.has(booking.status)) return false;
  if (AWAITING.has(booking.status)) return true;
  const start = isoDayOrUndefined(booking.startDate?.slice(0, 10));
  return start === undefined || start >= today;
}

/** What is still owed: the price plus extras, less what the ledger has. */
export function balanceDue(booking: {
  totalCost: number;
  amountDue?: number;
  amountPaid?: number;
}): number {
  const due = booking.amountDue ?? booking.totalCost;
  const owed = due - (booking.amountPaid ?? 0);
  return owed > 0 ? Math.round(owed * 100) / 100 : 0;
}

/**
 * Offer "Pay" only on a booking the facility has accepted, that is not over,
 * and that owes something. A request is priced at nothing until it is
 * approved, so it never reads "Payment due".
 */
export function isPayable(booking: {
  status: string;
  totalCost: number;
  amountDue?: number;
  amountPaid?: number;
}): boolean {
  if (AWAITING.has(booking.status)) return false;
  if (["cancelled", "declined", "no_show"].includes(booking.status)) {
    return false;
  }
  return balanceDue(booking) > 0;
}
