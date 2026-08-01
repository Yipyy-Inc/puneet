import type { Booking } from "@/types/booking";
import type { Tables } from "@/types/database";

// ============================================================================
// Database row -> the Booking object the app already expects.
//
// The schema splits a booking in two: queryable fields are columns, the long
// tail (feeding schedules, grooming stages, invoice line items, belongings)
// lives in `details`. This is the one place that knows about that split — so
// components keep receiving exactly the shape they got from the mocks, and the
// swap needed no changes to them.
//
// Reversing the two date decisions the schema made:
//   • start_at / end_at are timestamps; the app wants "YYYY-MM-DD" plus a
//     separate "HH:MM". Both are derived here rather than stored twice.
//   • `ref` is the numeric id the app has always used. `id` (uuid) is carried
//     alongside as `rowId` for writes, which is what lets a caller update a row
//     without a second lookup.
// ============================================================================

type BookingRow = Tables<"bookings"> & {
  clients?: { ref: number } | null;
  facilities?: { timezone: string } | null;
  booking_pets?: { pets: { ref: number } | null }[] | null;
};

const DEFAULT_TIMEZONE = "America/Toronto";

/**
 * Split a stored instant into the facility's wall-clock date and time.
 *
 * The zone must be the FACILITY's, not the server's and not the viewer's. A
 * booking is "2pm at the kennel" — it does not become 3pm because the person
 * looking at the roster is in another country, and it must not shift because a
 * build ran in a different region. Getting this wrong is invisible in
 * development and moves every appointment in production.
 */
function wallClockParts(timestamp: string, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(timestamp))
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    // Intl renders midnight as "24" in some locales/engines under hour12:false.
    time: `${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`,
  };
}

export type BookingWithRowId = Booking & {
  /** The uuid primary key. Needed to write; ignored by everything that reads. */
  rowId: string;
};

export function rowToBooking(row: BookingRow): BookingWithRowId {
  const details = (row.details ?? {}) as Record<string, unknown>;
  const timeZone = row.facilities?.timezone ?? DEFAULT_TIMEZONE;
  const start = wallClockParts(row.start_at, timeZone);
  const end = wallClockParts(row.end_at, timeZone);

  const petRefs = (row.booking_pets ?? [])
    .map((bp) => bp.pets?.ref)
    .filter((ref): ref is number => typeof ref === "number");

  return {
    // The long tail first, so an explicit column always wins over a stale copy
    // that might linger in details.
    ...(details as Partial<Booking>),

    rowId: row.id,
    id: row.ref,
    clientId: row.clients?.ref ?? 0,
    // Single pet stays a number: `petId` is `number | number[]` and plenty of
    // callers assume the scalar form when there is only one.
    petId: petRefs.length === 1 ? petRefs[0] : petRefs,
    facilityId: 11,

    service: row.service,
    serviceType: row.service_type ?? undefined,
    status: row.status,
    paymentStatus: row.payment_status as Booking["paymentStatus"],

    startDate: start.date,
    endDate: end.date,
    checkInTime: start.time,
    checkOutTime: end.time,

    assignedStaff: row.assigned_staff_name ?? undefined,

    basePrice: Number(row.base_price),
    discount: Number(row.discount),
    totalCost: Number(row.total_cost),
    tipAmount: row.tip_amount === null ? undefined : Number(row.tip_amount),

    specialRequests: row.special_requests ?? undefined,
  } as BookingWithRowId;
}

/**
 * The select needed to satisfy rowToBooking.
 *
 * Kept next to the mapper because the two have to agree: a column dropped here
 * becomes `undefined` in the mapped object rather than a type error, which is
 * exactly the kind of failure that reaches production looking like missing
 * data.
 */
export const BOOKING_SELECT = `
  *,
  clients!inner ( ref ),
  facilities!inner ( timezone ),
  booking_pets ( pets ( ref ) )
` as const;
