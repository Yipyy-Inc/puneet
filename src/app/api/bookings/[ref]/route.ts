import { NextResponse, after, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { notifyStaff } from "@/lib/notifications/notify-staff";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  BOOKING_SELECT,
  bookingToRow,
  rowToBooking,
} from "@/lib/api/mappers/booking";
import { writeFailure } from "@/lib/api/write-failure";
import { staffForStylist } from "@/lib/api/stylist-staff";
import {
  checkStatusTransition,
  isPresenceTracked,
  type Presence,
  type TransitionRefusal,
} from "@/lib/bookings/booking-lifecycle";
import type { BookingStatus } from "@/types/base";
import type { NewBooking } from "@/types/booking";
import { requireForms } from "@/lib/forms/require-forms";

// ============================================================================
// A single booking, by its app-facing numeric ref.
//
// PATCH rather than PUT: callers send the fields they changed, and
// bookingToRow maps only what it was given. A full replace would blank every
// column the caller omitted — which for a booking means losing the feeding
// schedule because someone edited the price.
//
// ── ONLY WHAT CHANGED IS WRITTEN (2026-09-18) ────────────────────────────
//
// It merged the whole booking and wrote EVERY column back, re-deriving
// start_at / end_at in the timezone of the facility the SESSION was showing.
// A status change from a portal open on another facility's timezone moved the
// booking's times, and an audit of changes would have recorded reschedules
// nobody made. The row is built twice — from the stored booking and from the
// merge — and only the columns that differ are sent. The facility (and its
// timezone) is the BOOKING's, never the session's: getFacilityContext()
// answers the demo facility for a customer, which made this route 500 on a
// real customer's cancel.
//
// ── THE STATUS MOVES ONLY WHERE ITS LIFECYCLE ALLOWS ──────────────────────
//
// checkStatusTransition (src/lib/bookings/booking-lifecycle.ts), the same rule
// every screen offers its buttons from. For daycare, boarding, training and
// grooming the status agrees with where the pet is: arriving and leaving go
// through the attendance writes (the database mirrors them, 20260918151018),
// and a direct write here may only bring a stray status into line with
// presence. Cancelling needs cancel_bookings; a service with no attendance
// record checks its before-check-in forms here, as the attendance routes do.
// ============================================================================

export const dynamic = "force-dynamic";

const REFUSAL: Record<TransitionRefusal, string> = {
  use_arrival:
    "Check this pet in or out from the booking's arrival controls — the status follows where the pet is.",
  not_on_site: "The pet is not on site, so it cannot be in progress or ready.",
  arrived: "The pet arrived, so this booking was not a no-show.",
  declined_final: "A declined booking can only be cancelled.",
  cancelled_final: "A cancelled booking can only be reinstated.",
  not_a_request: "A confirmed booking cannot go back to being a request.",
};

interface StoredBooking {
  id: string;
  status: BookingStatus;
  facility_id: string;
  facilities: { timezone: string | null } | null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { ref } = await params;
  const bookingRef = Number(ref);
  if (!Number.isFinite(bookingRef)) {
    return NextResponse.json({ error: "Invalid booking id." }, { status: 400 });
  }

  const input = (await request.json()) as Partial<NewBooking>;
  const supabase = await createServerClient();

  // `details` is replaced wholesale rather than merged, so a partial update
  // carrying any long-tail field must carry all of them. Read the current row
  // first and merge, otherwise editing the price would drop the rest.
  const { data: current } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("ref", bookingRef)
    .maybeSingle();

  if (!current) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  const stored = current as unknown as StoredBooking;
  const context = {
    facilityId: stored.facility_id,
    timeZone: stored.facilities?.timezone ?? "America/Toronto",
  };

  // The FK alone would not stop a location belonging to another facility
  // being written here -- checked explicitly, against the BOOKING's facility.
  if (typeof input.locationId === "string") {
    const { data: location } = await supabase
      .from("locations")
      .select("facility_id")
      .eq("id", input.locationId)
      .maybeSingle();
    if (!location || location.facility_id !== context.facilityId) {
      return NextResponse.json(
        { error: "That location doesn't belong to this business." },
        { status: 422 },
      );
    }
  }

  const existing = rowToBooking(current);

  // The reason belongs to a form override, so it is taken off the booking's
  // changes before `bookingToRow` could file it in `details`.
  const { formOverrideReason, ...changes } = input;
  const currentStatus = stored.status;
  const nextStatus = changes.status as BookingStatus | undefined;
  const statusMoves = nextStatus !== undefined && nextStatus !== currentStatus;

  if (statusMoves) {
    const { data: presenceRow } = await supabase
      .from("booking_presence")
      .select("presence")
      .eq("booking_id", stored.id)
      .maybeSingle();
    const presence = ((presenceRow as { presence?: string } | null)?.presence ??
      "unknown") as Presence;
    const verdict = checkStatusTransition(currentStatus, nextStatus, {
      service: existing.service,
      presence,
    });
    if (!verdict.ok) {
      return NextResponse.json(
        { error: REFUSAL[verdict.reason], reason: verdict.reason },
        { status: 422 },
      );
    }

    // A member of staff needs the permission for what they are doing. A
    // customer's own cancel is decided by enforce_booking_integrity, which
    // lets a customer cancel their open booking and nothing else; a platform
    // admin's is the database's call (has_permission), not this map's —
    // my_permissions answers for a facility they may not belong to.
    const viewer = await getViewer().catch(() => null);
    const isMember = Boolean(
      viewer && viewer.memberships.length > 0 && !viewer.isPlatformAdmin,
    );
    if (isMember && nextStatus === "cancelled") {
      const permissions = await myPermissions();
      if (!holds(permissions, "cancel_bookings")) {
        return NextResponse.json(
          { error: "You do not have permission to cancel bookings." },
          { status: 403 },
        );
      }
    }

    // Approving a request: the forms the facility requires before approval.
    if (
      nextStatus === "confirmed" &&
      (currentStatus === "request_submitted" || currentStatus === "waitlisted")
    ) {
      const refused = await requireForms(
        supabase,
        stored.id,
        "before_approval",
        formOverrideReason,
      );
      if (refused) return refused;
    }

    // Checking in a service with no attendance record: its forms are asked
    // for here, as the attendance routes ask for theirs.
    if (nextStatus === "checked_in" && !isPresenceTracked(existing.service)) {
      const refused = await requireForms(
        supabase,
        stored.id,
        "before_checkin",
        formOverrideReason,
      );
      if (refused) return refused;
    }
  }

  const merged = { ...existing, ...changes } as Partial<NewBooking>;
  const before = bookingToRow(existing as Partial<NewBooking>, context);
  const after_ = bookingToRow(merged, context);

  // Only the columns this request changed.
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(after_)) {
    if (
      JSON.stringify(value) !==
      JSON.stringify((before as Record<string, unknown>)[key])
    ) {
      row[key] = value;
    }
  }

  // A groom moved to another groomer's column. The create route resolves the
  // stylist the same way; without it here a drag across columns changed the
  // time and left the groom with the groomer it came from.
  if (existing.service === "grooming" && input.stylistPreference) {
    const stylist = await staffForStylist(
      supabase,
      context.facilityId,
      input.stylistPreference,
    );
    if (!stylist) {
      return NextResponse.json(
        { error: "That groomer is not on this facility's team." },
        { status: 422 },
      );
    }
    row.assigned_staff_id = stylist.staffId;
    row.assigned_staff_name = stylist.name;
  }

  if (Object.keys(row).length === 0) {
    // Nothing to write is an answer, not a refusal.
    return NextResponse.json(existing);
  }

  const { data: written, error } = await supabase
    .from("bookings")
    .update(row as never)
    .eq("ref", bookingRef)
    .select("id");

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to edit bookings.",
      duplicate: "That change conflicts with another booking.",
    });
  }

  // An UPDATE filtered out by RLS is not an error in Postgres — it affects
  // zero rows and reports success. Without this check the route returns 200
  // and the unchanged booking, so a caller who is not allowed to edit gets
  // told their edit worked. A write that silently does nothing is worse than
  // one that fails loudly.
  if (!written || written.length === 0) {
    return NextResponse.json(
      { error: "Not allowed to edit this booking." },
      { status: 403 },
    );
  }

  const { data: updated } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("ref", bookingRef)
    .single();

  // A customer cancelling their own booking is news to the desk; staff
  // cancelling one is not. The facility comes from the booking row, never from
  // getFacilityContext(), which answers the demo facility for a customer.
  if (nextStatus === "cancelled" && currentStatus !== "cancelled") {
    const viewer = await getViewer().catch(() => null);
    if (viewer && viewer.memberships.length === 0) {
      const { data: booked } = await supabase
        .from("bookings")
        .select("id, facility_id, clients(name)")
        .eq("ref", bookingRef)
        .maybeSingle();
      const bookedRow = booked as unknown as {
        id: string;
        facility_id: string;
        clients: { name: string | null } | null;
      } | null;
      if (bookedRow) {
        after(() =>
          notifyStaff({
            facilityId: bookedRow.facility_id,
            kind: "booking_cancelled",
            params: {
              client: bookedRow.clients?.name ?? undefined,
              service: existing.service,
              date: existing.startDate?.slice(0, 10),
            },
            link: `/facility/dashboard/bookings/${bookingRef}`,
            sourceId: bookedRow.id,
            dedupeKey: `booking_cancelled:${bookedRow.id}`,
            actorProfileId: user.id,
            request,
          }),
        );
      }
    }
  }

  return NextResponse.json(updated ? rowToBooking(updated) : null);
}
