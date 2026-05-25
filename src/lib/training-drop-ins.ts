/**
 * Drop-in bookings — single-session attendance for a series that has
 * `allowDropIns: true`. Distinct from `TrainingEnrollment` because the
 * customer is paying for one session, not committing to the full cohort.
 *
 * Stored client-side via TanStack Query setQueryData; consumers (Series
 * Sessions tab counters, Session View student list, customer Drop-In
 * dialog) all read from the same key so a booking propagates instantly.
 */
import type { QueryClient } from "@tanstack/react-query";
import type { TrainingSeries } from "@/lib/training-series";
import { trainingQueries } from "@/lib/api/training";

export type DropInStatus =
  | "booked" // Customer paid + reserved the seat; hasn't shown up yet.
  | "checked-in" // Marked present at session start.
  | "no-show" // Failed to attend.
  | "cancelled"; // Customer or facility cancelled before the session.

export interface TrainingDropInBooking {
  id: string;
  seriesId: string;
  /** TrainingSeriesSession.id — the specific session the drop-in attends. */
  sessionId: string;
  /** Denormalized for cheap rendering on the counters tab + student list. */
  sessionDate: string;
  sessionNumber: number;
  /** HH:MM start time of the host session — denormalized so the calendar
   *  filter can match drop-ins to TrainingSession rows by date + time
   *  without re-resolving through the series catalog. */
  sessionStartTime?: string;
  petId: number;
  petName: string;
  petBreed?: string;
  ownerId: number;
  ownerName: string;
  ownerPhone?: string;
  ownerEmail?: string;
  /** Price charged for this single session — captured at booking time so
   *  later price changes don't retroactively shift historical revenue. */
  price: number;
  /** Mock invoice line — captures the "Drop-in fee · {seriesName}" line item
   *  that goes on the customer's invoice, separate from any series package
   *  charge. Populated at booking time so revenue reports can split drop-in
   *  income from series package income without re-deriving. */
  invoiceLine: DropInInvoiceLine;
  status: DropInStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DropInInvoiceLine {
  /** Stable id for the line item — also stamped on the booking record. */
  id: string;
  description: string;
  /** Stable categorisation flag so revenue reports can filter to
   *  drop-in-only without parsing the description. */
  category: "training-drop-in";
  amount: number;
  /** YYYY-MM-DD. */
  dateISO: string;
}

/** Global drop-in defaults — used when the series doesn't carry overrides on
 *  `enrollmentRules.dropInMaxPerSession / .dropInPrice`. Mirrors the global
 *  values configured in Settings → Training. */
export const DEFAULT_DROP_IN_MAX_PER_SESSION = 3;
export const DEFAULT_DROP_IN_PRICE = 40;

/** Resolve the effective drop-in max for a series session — series override
 *  > module-settings default > hard-coded fallback. The signature lets the
 *  caller pass either a number or undefined-from-settings and trust the
 *  result. */
export function resolveDropInMax(
  series: TrainingSeries,
  defaultFromSettings: number | undefined,
): number {
  return (
    series.enrollmentRules.dropInMaxPerSession ??
    defaultFromSettings ??
    DEFAULT_DROP_IN_MAX_PER_SESSION
  );
}

/** Resolve the effective drop-in price for a series — series override >
 *  module-settings default > legacy `fullPayment / weeks` fallback so older
 *  series without an explicit price still produce a sane number. */
export function resolveDropInPrice(
  series: TrainingSeries,
  defaultFromSettings: number | undefined,
): number {
  if (typeof series.enrollmentRules.dropInPrice === "number") {
    return series.enrollmentRules.dropInPrice;
  }
  if (typeof defaultFromSettings === "number") return defaultFromSettings;
  if (series.numberOfWeeks > 0) {
    return Math.round(
      series.enrollmentRules.fullPaymentAmount / series.numberOfWeeks,
    );
  }
  return DEFAULT_DROP_IN_PRICE;
}

/** Group bookings by series session id — drives the per-row counters on
 *  the Sessions tab. Cancelled bookings drop out so the count reflects
 *  reserved seats only. */
export function buildDropInCountsBySessionId(
  bookings: TrainingDropInBooking[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    map.set(b.sessionId, (map.get(b.sessionId) ?? 0) + 1);
  }
  return map;
}

/** Filter helpers — shorthand for the common reads. */
export function getDropInsForSession(
  bookings: TrainingDropInBooking[],
  sessionId: string,
): TrainingDropInBooking[] {
  return bookings.filter(
    (b) => b.sessionId === sessionId && b.status !== "cancelled",
  );
}

export function getDropInsForSeries(
  bookings: TrainingDropInBooking[],
  seriesId: string,
): TrainingDropInBooking[] {
  return bookings.filter(
    (b) => b.seriesId === seriesId && b.status !== "cancelled",
  );
}

/** Drop-in revenue across an entire series. Useful for the Series detail
 *  header (when wired) and for the future revenue report split. */
export function totalDropInRevenue(
  bookings: TrainingDropInBooking[],
  seriesId?: string,
): number {
  let sum = 0;
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    if (seriesId && b.seriesId !== seriesId) continue;
    sum += b.price;
  }
  return sum;
}

let bookingSeed = 0;
export function nextDropInId(): string {
  bookingSeed += 1;
  return `drop-${Date.now()}-${bookingSeed}`;
}

let invoiceLineSeed = 0;
export function nextDropInInvoiceLineId(): string {
  invoiceLineSeed += 1;
  return `inv-line-${Date.now()}-${invoiceLineSeed}`;
}

/** Write a booking through to the shared cache. */
export function fanOutDropInUpsert(
  queryClient: QueryClient,
  booking: TrainingDropInBooking,
): void {
  const key = trainingQueries.dropInBookings().queryKey;
  queryClient.setQueryData<TrainingDropInBooking[]>(key, (prev = []) => {
    const exists = prev.some((b) => b.id === booking.id);
    if (exists) return prev.map((b) => (b.id === booking.id ? booking : b));
    return [...prev, booking];
  });
}
