import { NextResponse } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { ownStaffId } from "@/lib/api/own-staff";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// What is assigned to the caller: which bookings, and which pets through them.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
//   export function resolveBookingStaffId(booking: Booking) {
//     const named = booking.assignedStaff ?? booking.stylistPreference;
//     if (named && NAME_TO_ID.has(named)) return NAME_TO_ID.get(named);
//     ...
//     return pool[booking.id % pool.length];        // ← the assignment
//   }
//
// The last line decided WHO A BOOKING BELONGS TO by arithmetic on its
// reference number, against a pool built from the staff FIXTURE. Three
// permission scopes read it — view_bookings (list and two detail pages) and
// add_pet_notes — so `assigned_shifts` admitted the records a modulo picked.
//
// `bookings.assigned_staff_id` is the real column and it was never consulted.
// The name path could not save it either: it matches `assigned_staff_name`
// against fixture staff names, and that column is null on every row that
// actually carries an assignment.
//
// MEASURED: with one booking assigned to groomer@yipyy.dev in Postgres, that
// groomer's list said "No bookings found".
//
// ── PETS COME BACK WITH IT ────────────────────────────────────────────────
//
// `add_pet_notes = assigned_only` asks a different question — may I write on
// this pet — but the answer derives from the same bookings, so it is one
// request rather than two that could disagree.
//
// ── IT ANSWERS FOR THE CALLER, AND TAKES NO STAFF ID ──────────────────────
//
// Same rule as /api/clients/assigned: the scope always means "the viewer", and
// accepting an id would let a screen ask about somebody else. `ownStaffId`
// resolves the caller from their own membership through their own client, so
// RLS still applies.
//
// ── A NARROWING, NOT A BOUNDARY ───────────────────────────────────────────
//
// RLS lets a facility's staff read its bookings — a rota needs it. This says
// which ones a scoped viewer should be SHOWN. The boundary stays in
// `bookings_read`.
// ============================================================================

export const dynamic = "force-dynamic";

export interface AssignedBookingsPayload {
  /** `bookings.ref` for every booking assigned to the caller. */
  refs: number[];
  /** Pet ids covered by those bookings — `add_pet_notes` scope. */
  petIds: number[];
}

export async function GET() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const staffId = await ownStaffId(supabase, viewer, context.facilityId);
  // Rostered nowhere means nothing is assigned. An empty answer is true; a 404
  // would make the screen show a failure instead of a fact.
  if (!staffId) return NextResponse.json({ refs: [], petIds: [] });

  const { data, error } = await supabase
    .from("bookings")
    // A booking covers one pet or several, through the booking_pets join —
    // there is no pet column on `bookings` itself.
    .select("ref, booking_pets ( pets:pet_id ( ref ) )")
    .eq("facility_id", context.facilityId)
    .eq("assigned_staff_id", staffId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const refs = new Set<number>();
  const petIds = new Set<number>();
  for (const row of data ?? []) {
    const record = row as { ref?: number; booking_pets?: unknown };
    if (typeof record.ref === "number") refs.add(record.ref);
    // booking_pets is to-MANY, so an array; each of its rows embeds one pet,
    // which PostgREST has returned both as an object and as a one-element
    // array before now.
    const links = Array.isArray(record.booking_pets) ? record.booking_pets : [];
    for (const link of links) {
      const embedded = (link as { pets?: unknown }).pets;
      const pet = Array.isArray(embedded) ? embedded[0] : embedded;
      const petRef = (pet as { ref?: number } | null | undefined)?.ref;
      if (typeof petRef === "number") petIds.add(petRef);
    }
  }

  return NextResponse.json({
    refs: [...refs].sort((a, b) => a - b),
    petIds: [...petIds].sort((a, b) => a - b),
  });
}
