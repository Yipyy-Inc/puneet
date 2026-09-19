import type { Booking } from "@/types/booking";

// ============================================================================
// A CUSTOMER'S REQUEST, DECIDED BY STAFF.
//
// A request is a booking in `request_submitted` (or `waitlisted`). The
// database zeroes a customer's price on insert and keeps what the form quoted
// as `details.requestedQuote`, so an unpriced request reads $0 — and nothing
// stopped staff confirming it at $0, which is a booking the facility is paid
// nothing for. These are the rules the decision route and the requests page
// share. Pure, so they are unit-tested.
// ============================================================================

export type RequestAction = "approve" | "decline" | "waitlist";

/** The statuses a decision can be taken on. */
export const OPEN_REQUEST_STATUSES = [
  "request_submitted",
  "waitlisted",
] as const;

export function isOpenRequest(status: string | undefined): boolean {
  return (OPEN_REQUEST_STATUSES as readonly string[]).includes(status ?? "");
}

/** The status an action moves a request to. */
export function statusFor(action: RequestAction) {
  return action === "approve"
    ? "confirmed"
    : action === "decline"
      ? "declined"
      : "waitlisted";
}

/** What the customer's form priced the request at, or null when it did not. */
export function quotedTotal(
  booking: Pick<Booking, "requestedQuote">,
): number | null {
  const total = Number(booking.requestedQuote?.totalCost ?? 0);
  return Number.isFinite(total) && total > 0 ? total : null;
}

export type ApprovalRefusal = "unpriced";

/**
 * May this request be approved at the price it carries now?
 *
 * Refused when it is still $0 and the customer's form quoted a price: that is
 * the request as it arrived, never priced. A booking staff priced at $0 on
 * purpose — a full discount, a comp — carries its base price and passes, and
 * so does a request whose form quoted nothing.
 */
export function approvalRefusal(
  booking: Pick<Booking, "requestedQuote" | "totalCost" | "basePrice">,
  atQuote: boolean,
): ApprovalRefusal | null {
  if (atQuote) return null;
  const charged = Number(booking.totalCost ?? 0);
  const base = Number(booking.basePrice ?? 0);
  if (charged > 0 || base > 0) return null;
  return quotedTotal(booking) !== null ? "unpriced" : null;
}

/** The columns "approve at the quoted price" writes. */
export function quotedPrice(booking: Pick<Booking, "requestedQuote">) {
  const quote = booking.requestedQuote;
  const totalCost = quotedTotal(booking) ?? 0;
  const discount = Number(quote?.discount ?? 0) || 0;
  const basePrice = Number(quote?.basePrice ?? 0) || totalCost + discount;
  return { basePrice, discount, totalCost };
}

/** The key that ties a request's days together — its group, or itself. */
export function requestKey(
  booking: Pick<Booking, "id" | "bookingGroup">,
): string {
  return booking.bookingGroup?.id ?? `ref:${booking.id}`;
}

/**
 * Requests as the page shows them: one entry per request, its days together,
 * in date order. A three-day daycare request is three bookings (one per day,
 * which is what the boards read) and ONE decision.
 */
export function groupRequests<
  T extends Pick<Booking, "id" | "bookingGroup" | "startDate">,
>(bookings: readonly T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const booking of bookings) {
    const key = requestKey(booking);
    groups.set(key, [...(groups.get(key) ?? []), booking]);
  }
  return [...groups.values()].map((days) =>
    [...days].sort((a, b) => a.startDate.localeCompare(b.startDate)),
  );
}
