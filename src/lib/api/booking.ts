import { bookings } from "@/data/bookings";
import { BOOKING_REQUESTS } from "@/data/booking-requests";
import { facilityStaff } from "@/data/facility-staff";
import type { Booking, NewBooking } from "@/types/booking";
import type { ServiceModule } from "@/types/facility-staff";

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

export const bookingQueries = {
  /**
   * All bookings, or — when `assignedStaffId` is passed (the viewer's id when
   * view_bookings resolves to assigned_only, via useAssignedScope) — only that
   * staff member's assigned bookings. Same factory admin uses; admin passes no
   * scope and gets the full set.
   */
  all: (opts?: { assignedStaffId?: string }) => ({
    queryKey: ["bookings", opts?.assignedStaffId ?? "all"] as const,
    queryFn: async () =>
      opts?.assignedStaffId
        ? scopeBookingsToStaff(bookings, opts.assignedStaffId)
        : bookings,
  }),
  detail: (id: number) => ({
    queryKey: ["bookings", id] as const,
    queryFn: async () => bookings.find((b) => b.id === id),
  }),
  byClient: (clientId: number) => ({
    queryKey: ["bookings", "by-client", clientId] as const,
    queryFn: async () => bookings.filter((b) => b.clientId === clientId),
  }),
  byFacility: (facilityId: number) => ({
    queryKey: ["bookings", "by-facility", facilityId] as const,
    queryFn: async () => bookings.filter((b) => b.facilityId === facilityId),
  }),
  requests: () => ({
    queryKey: ["booking-requests"] as const,
    queryFn: async () => BOOKING_REQUESTS,
  }),
};

export const bookingMutations = {
  create: async (data: NewBooking): Promise<Booking> => {
    const newId = Math.max(...bookings.map((b) => b.id), 0) + 1;
    const booking: Booking = { ...data, id: newId };
    bookings.push(booking);
    return booking;
  },
  update: async (
    id: number,
    data: Partial<NewBooking>,
  ): Promise<Booking | undefined> => {
    const index = bookings.findIndex((b) => b.id === id);
    if (index === -1) return undefined;
    bookings[index] = { ...bookings[index], ...data };
    return bookings[index];
  },
};
