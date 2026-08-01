import type { Booking, NewBooking } from "@/types/booking";
import type { Tables, TablesInsert } from "@/types/database";
import {
  DEFAULT_TIMEZONE,
  instantFromWallClock,
  wallClockParts,
} from "@/lib/time/facility-time";

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

// ── Writing ─────────────────────────────────────────────────────────────────

/** Fields hoisted into columns; everything else on a booking becomes `details`. */
const COLUMN_FIELDS = [
  "id",
  "rowId",
  "clientId",
  "petId",
  "facilityId",
  "service",
  "serviceType",
  "status",
  "paymentStatus",
  "startDate",
  "endDate",
  "checkInTime",
  "checkOutTime",
  "basePrice",
  "discount",
  "totalCost",
  "tipAmount",
  "specialRequests",
  "assignedStaff",
];

/**
 * The inverse of rowToBooking, for inserts and updates.
 *
 * The caller resolves the ids — this deliberately does not look anything up.
 * A mapper that queries is a mapper you cannot reason about, and the route
 * already has to resolve the facility and client to authorise the write.
 *
 * `partial` matters for PATCH: an update must not blank every column the
 * caller left out, which is what a full mapping of a Partial<NewBooking>
 * would do.
 */
export function bookingToRow(
  input: Partial<NewBooking>,
  context: {
    facilityId: string;
    clientRowId?: string;
    locationId?: string | null;
    timeZone: string;
  },
): Partial<TablesInsert<"bookings">> {
  const row: Partial<TablesInsert<"bookings">> = {};

  if (context.clientRowId) row.client_id = context.clientRowId;
  if (context.locationId !== undefined) row.location_id = context.locationId;
  row.facility_id = context.facilityId;

  if (input.service !== undefined) row.service = input.service;
  if (input.serviceType !== undefined) row.service_type = input.serviceType;
  if (input.status !== undefined) {
    row.status = input.status as TablesInsert<"bookings">["status"];
  }
  if (input.paymentStatus !== undefined) {
    row.payment_status = input.paymentStatus;
  }
  if (input.assignedStaff !== undefined) {
    row.assigned_staff_name = input.assignedStaff;
  }
  if (input.basePrice !== undefined) row.base_price = input.basePrice;
  if (input.discount !== undefined) row.discount = input.discount;
  if (input.totalCost !== undefined) row.total_cost = input.totalCost;
  if (input.tipAmount !== undefined) row.tip_amount = input.tipAmount;
  if (input.specialRequests !== undefined) {
    row.special_requests = input.specialRequests;
  }

  // Dates are the facility's wall clock on the way in, exactly as on the way
  // out — see lib/time/facility-time.ts for why that is not negotiable.
  if (input.startDate) {
    row.start_at = instantFromWallClock(
      input.startDate,
      input.checkInTime ?? "00:00",
      context.timeZone,
    );
  }
  if (input.endDate) {
    row.end_at = instantFromWallClock(
      input.endDate,
      input.checkOutTime ?? input.checkInTime ?? "23:59",
      context.timeZone,
    );
  }

  const details: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!COLUMN_FIELDS.includes(key) && value !== undefined) {
      details[key] = value;
    }
  }
  // Cast to the generated Json type: the long tail is genuinely arbitrary
  // JSON-serialisable product data, and enumerating it here would just be the
  // Booking type written twice.
  if (Object.keys(details).length > 0) {
    row.details = details as TablesInsert<"bookings">["details"];
  }

  return row;
}
