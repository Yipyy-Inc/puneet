import { NextResponse } from "next/server";

import { activeFacilityIdForStaff } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// GET /api/facility/requests — what customers have asked for and nobody has
// answered.
//
// A customer's "change these dates" or "please cancel this" lands as a booking
// note carrying `customer_request`. Staff had no way to find one: it sat in a
// booking's notes, and the only prompt was a notification that scrolled away.
//
// ── PENDING IS DERIVED, NOT STORED ───────────────────────────────────────
//
// A request is open while it has no decision AND its booking is still open. A
// cancellation somebody carried out by any route therefore settles the request
// that asked for it, with no bookkeeping and nothing to get out of step. The
// decision columns exist for the answer staff give — especially a DECLINE,
// where the booking stays exactly as it was and only the note can say the
// question was dealt with.
//
// ── SCOPED TO THE ACTIVE FACILITY, NOT TO WHAT RLS ALLOWS ────────────────
//
// RLS returns every facility a platform admin or a two-facility manager can
// see, merged. `activeFacilityIdForStaff()` is the one they are looking at
// (check:facility-scoped-reads).
// ============================================================================

export const dynamic = "force-dynamic";

/** Statuses where a request can still be acted on. A cancelled booking cannot. */
const OPEN_BOOKING_STATUSES = [
  "pending",
  "request_submitted",
  "estimate_sent",
  "waitlisted",
  "confirmed",
  "checked_in",
  "in_progress",
  "ready",
];

export async function GET() {
  const viewer = await getViewer();
  if (viewer.source !== "session") {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const facilityId = await activeFacilityIdForStaff();
  if (!facilityId) {
    return NextResponse.json({ error: "No facility." }, { status: 403 });
  }

  const db = await createServerClient();

  const { data, error } = await db
    .from("notes")
    .select(
      "id, content, customer_request, created_at, created_by_name, entity_id",
    )
    .eq("facility_id", facilityId)
    .eq("category", "booking")
    .not("customer_request", "is", null)
    .neq("customer_request", "note")
    .is("customer_request_decision", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = data ?? [];
  if (rows.length === 0) return NextResponse.json([]);

  // The bookings they are about, so the list can name the guest and the dates
  // rather than a uuid. One read, not one per request.
  const { data: bookings } = await db
    .from("bookings")
    .select("id, ref, status, service, start_at, end_at")
    .in(
      "id",
      rows.map((row) => row.entity_id),
    );

  const byId = new Map((bookings ?? []).map((b) => [b.id, b]));

  return NextResponse.json(
    rows
      .map((row) => {
        const booking = byId.get(row.entity_id);
        // A request whose booking is closed is spent — see the header.
        if (!booking || !OPEN_BOOKING_STATUSES.includes(booking.status)) {
          return null;
        }
        return {
          noteId: row.id,
          kind: row.customer_request,
          content: row.content,
          askedAt: row.created_at,
          askedBy: row.created_by_name,
          bookingRef: booking.ref,
          service: booking.service,
          startAt: booking.start_at,
          endAt: booking.end_at,
          status: booking.status,
        };
      })
      .filter((row) => row !== null),
  );
}
