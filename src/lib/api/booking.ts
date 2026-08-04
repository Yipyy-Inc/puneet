import { bookings } from "@/data/bookings";
import { BOOKING_REQUESTS } from "@/data/booking-requests";
import { facilityStaff } from "@/data/facility-staff";
import type { Booking, NewBooking } from "@/types/booking";
import type { ServiceModule } from "@/types/facility-staff";
import { liveFetch, liveWrite } from "./live-fetch";

// ============================================================================
// Section 8B — viewer scoping (assigned_only)
//
// The mock bookings link to staff only by sparse display-name strings, so this
// module is the single source of truth for "who is assigned to a booking" as an
// fs-* id. It (a) honours an explicit assignedStaff/stylist name when it maps to
// a profile, else (b) deterministically rotates the booking across the active
// staff assigned to its service module (stable by booking id). Scoping is
// applied HERE (data layer), not as cosmetic client filtering.
// ============================================================================

function serviceModuleFor(service: string | undefined): ServiceModule | null {
  switch ((service ?? "").toLowerCase()) {
    case "grooming":
      return "grooming";
    case "training":
      return "training";
    case "daycare":
      return "daycare";
    case "boarding":
      return "boarding";
    default:
      return null;
  }
}

/** Active staff assigned to a service module, id-sorted for stable rotation. */
function staffPool(module: ServiceModule): string[] {
  return facilityStaff
    .filter(
      (s) => s.status === "active" && s.serviceAssignments.includes(module),
    )
    .map((s) => s.id)
    .sort();
}

/** Exact full-name → fs-* id, for the few bookings that name a stylist. */
const NAME_TO_ID = new Map<string, string>(
  facilityStaff.map((s) => [`${s.firstName} ${s.lastName}`, s.id]),
);

/** The fs-* id of the staff member assigned to serve `booking` (8B). */
export function resolveBookingStaffId(booking: Booking): string | undefined {
  const named = booking.assignedStaff ?? booking.stylistPreference;
  if (named && NAME_TO_ID.has(named)) return NAME_TO_ID.get(named);
  const serviceModule = serviceModuleFor(booking.service);
  if (!serviceModule) return undefined;
  const pool = staffPool(serviceModule);
  if (pool.length === 0) return undefined;
  return pool[booking.id % pool.length];
}

/** Filter a booking list to those assigned to `staffId` (8B data-layer scope). */
export function scopeBookingsToStaff(
  list: Booking[],
  staffId: string,
): Booking[] {
  return list.filter((b) => resolveBookingStaffId(b) === staffId);
}

/** Is `booking` in `staffId`'s assigned set? (URL-fetch 403 check.) */
export function isBookingAssignedTo(
  booking: Booking,
  staffId: string,
): boolean {
  return resolveBookingStaffId(booking) === staffId;
}

/** Pet ids with at least one booking assigned to `staffId` (5C). A booking may
 *  cover one pet or several, so petId is number | number[]. */
export function assignedPetIds(staffId: string): Set<number> {
  const ids = new Set<number>();
  for (const b of bookings) {
    if (resolveBookingStaffId(b) !== staffId) continue;
    const pet = b.petId;
    if (Array.isArray(pet)) {
      for (const p of pet) ids.add(p);
    } else if (pet != null) {
      ids.add(pet);
    }
  }
  return ids;
}

/** Is this pet one the viewer is assigned to? (add_pet_notes = assigned_only.) */
export function isPetAssignedTo(petId: number, staffId: string): boolean {
  return assignedPetIds(staffId).has(petId);
}

// ============================================================================
// Reading bookings — Postgres when there is a session, mocks otherwise.
//
// The rows are real (see supabase/migrations/…_clients_pets_bookings.sql and
// scripts/apply-operational-seed.ts), but RLS scopes them to the signed-in
// caller. This existed because most of the app was browsed signed-out during
// the auth cutover, and switching hard would have turned every booking screen
// blank — indistinguishable from a bug.
//
// So: ask the API, and fall back to the mocks on 401 only. Any OTHER failure
// propagates, because a 500 or a broken shape must not be silently papered
// over with fixtures that look plausible.
//
// Every portal requires a session now, so the 401 branch is unreachable from
// the UI. Kept only until the remaining mock-backed screens move to Postgres —
// see the note in live-fetch.ts.
// ============================================================================

async function fetchBookings(params?: {
  clientRef?: number;
}): Promise<Booking[]> {
  const search = params?.clientRef ? `?clientRef=${params.clientRef}` : "";
  return liveFetch<Booking[]>(
    `/api/bookings${search}`,
    () =>
      params?.clientRef
        ? bookings.filter((b) => b.clientId === params.clientRef)
        : bookings,
    "bookings",
  );
}

export const bookingQueries = {
  /**
   * All bookings, or — when `assignedStaffId` is passed (the viewer's id when
   * view_bookings resolves to assigned_only, via useAssignedScope) — only that
   * staff member's assigned bookings. Same factory admin uses; admin passes no
   * scope and gets the full set.
   */
  all: (opts?: { assignedStaffId?: string }) => ({
    queryKey: ["bookings", opts?.assignedStaffId ?? "all"] as const,
    queryFn: async () => {
      const list = await fetchBookings();
      return opts?.assignedStaffId
        ? scopeBookingsToStaff(list, opts.assignedStaffId)
        : list;
    },
  }),
  detail: (id: number) => ({
    queryKey: ["bookings", id] as const,
    queryFn: async () => (await fetchBookings()).find((b) => b.id === id),
  }),
  byClient: (clientId: number) => ({
    queryKey: ["bookings", "by-client", clientId] as const,
    queryFn: async () => fetchBookings({ clientRef: clientId }),
  }),
  byFacility: (facilityId: number) => ({
    queryKey: ["bookings", "by-facility", facilityId] as const,
    // No facility filter is sent: RLS already scopes rows to the caller's
    // facility, and a client-supplied facility id is not a boundary anyway.
    queryFn: async () => fetchBookings(),
  }),
  requests: () => ({
    queryKey: ["booking-requests"] as const,
    queryFn: async () => BOOKING_REQUESTS,
  }),
};

export const bookingMutations = {
  create: async (data: NewBooking): Promise<Booking> =>
    liveWrite<Booking>("/api/bookings", "POST", data),

  /**
   * `Partial<Booking>`, not `Partial<NewBooking>`.
   *
   * The extra fields — `cancellationReason`, `refundMethod`, the long tail —
   * are exactly what a PATCH carries, and `bookingToRow` already routes
   * anything outside `COLUMN_FIELDS` into the `details` jsonb. Typing it to the
   * creation shape made every caller of those fields cast, which is the type
   * system being told to be quiet about something that works.
   *
   * `paymentStatus` and `amountPaid` are in `Booking` and are DERIVED: sending
   * them is accepted and discarded (20260806680000). Nothing here can mark a
   * booking paid.
   */
  update: async (
    id: number,
    data: Partial<Booking>,
  ): Promise<Booking | undefined> =>
    liveWrite<Booking>(`/api/bookings/${id}`, "PATCH", data),
};
