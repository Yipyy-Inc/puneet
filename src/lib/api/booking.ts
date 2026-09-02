import { useQuery } from "@tanstack/react-query";

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

/**
 * What is assigned to the viewer: booking refs, and the pets they cover.
 *
 * ── WHAT THIS REPLACED ───────────────────────────────────────────────────
 *
 *   return pool[booking.id % pool.length];          // ← the assignment
 *
 * `resolveBookingStaffId` decided WHO A BOOKING BELONGS TO by arithmetic on
 * its reference number, over a pool built from the staff FIXTURE. Three
 * permission scopes read it — view_bookings on the list and two detail pages,
 * and add_pet_notes — so `assigned_shifts` admitted whatever a modulo picked.
 *
 * Its other branch matched `assigned_staff_name` against fixture staff names,
 * and that column is null on every row that carries a real assignment. So the
 * real column, `bookings.assigned_staff_id`, was never consulted at all.
 *
 * MEASURED: with one booking assigned to groomer@yipyy.dev in Postgres, that
 * groomer's list said "No bookings found".
 *
 * The argument is the viewer's SCOPE (undefined for full access), not a staff
 * id — /api/bookings/assigned resolves the caller from their session, so a
 * screen cannot ask about somebody else.
 *
 * `refs`/`petIds` are null while the answer is unknown. That is not "assigned
 * to nothing": callers must hold off deciding rather than deny, or the gate
 * flashes at somebody who has access.
 */
export function useAssignedBookingRefs(scoped: string | undefined): {
  refs: Set<number> | null;
  petIds: Set<number> | null;
  pending: boolean;
} {
  const { data, isPending } = useQuery({
    queryKey: ["bookings", "assigned", scoped ?? null] as const,
    enabled: Boolean(scoped),
    queryFn: async (): Promise<{ refs: number[]; petIds: number[] }> => {
      const response = await fetch("/api/bookings/assigned");
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(detail?.error ?? `Request failed (${response.status})`);
      }
      return (await response.json()) as { refs: number[]; petIds: number[] };
    },
  });

  return {
    refs: data ? new Set(data.refs) : null,
    petIds: data ? new Set(data.petIds) : null,
    pending: Boolean(scoped) && isPending,
  };
}

/** Filter `list` to the bookings in `refs`. */
export function scopeBookingsToRefs(
  list: Booking[],
  refs: Set<number>,
): Booking[] {
  return list.filter((b) => refs.has(b.id));
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
  all: () => ({
    queryKey: ["bookings", "all"] as const,
    queryFn: async () => fetchBookings(),
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
  /**
   * `locationId` is the caller's ACTIVELY SELECTED branch (`useLocationContext`),
   * sent as a header rather than a body field — `NewBooking.locationId` is
   * documented as ignored at creation, and that stays true. The server resolves
   * where a new booking lands from this header via `getFacilityContext()`,
   * falling back to the facility's primary location when it is absent or names
   * a location outside this facility.
   */
  create: async (
    data: NewBooking,
    locationId?: string | null,
  ): Promise<Booking> =>
    liveWrite<Booking>(
      "/api/bookings",
      "POST",
      data,
      locationId ? { "x-yipyy-location-id": locationId } : undefined,
    ),

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
