import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  activeFacilityIdForStaff,
  inFacility,
} from "@/lib/api/facility-context";
import { assignKennelsOnConfirm } from "@/lib/boarding/assign-kennel-on-confirm";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// Find a kennel for a confirmed boarding booking that has none.
//
// ── THE DEAD END THIS CLOSES ──────────────────────────────────────────────
//
// A confirmed stay with no kennel could not be given one from any board. The
// kennel board lists guests already in a kennel ("a stay with no kennel is
// not shown"); the check-in board's "Assign a kennel first" linked to that
// same board; the booking page said "No kennel yet" and stopped. Only
// re-opening the whole booking in the wizard reached a room.
//
// It happens less now — an approved request is given a kennel of its rate's
// type as it is confirmed — but not never: none may have been free then.
// This runs the same choice again, for staff, when one may have come free.
//
// ── THE SAME CHOICE, UNDER THE CALLER'S OWN SESSION ───────────────────────
//
// `assignKennelsOnConfirm`: the rate's room types, pets its rules admit, a
// kennel that holds the household, the first free one, written through
// `assign_boarding_room` so RLS judges it as it judges the kennel board.
// Any of the rate's types, not only those clients may book — staff are
// placing it. Staff only: a customer has no facility to act in.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json().catch(() => null)) as {
    bookingRef?: unknown;
  } | null;
  const bookingRef = input?.bookingRef;
  if (typeof bookingRef !== "number" || !Number.isInteger(bookingRef)) {
    return NextResponse.json(
      { error: "A booking is required." },
      { status: 422 },
    );
  }

  const scope = await activeFacilityIdForStaff();
  if (!scope) {
    return NextResponse.json(
      { error: "Only the facility's staff can place a guest." },
      { status: 403 },
    );
  }

  const supabase = await createServerClient();
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id")
    .match(inFacility(scope))
    .eq("ref", bookingRef)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const [outcome] = await assignKennelsOnConfirm(
    supabase as unknown as SupabaseClient,
    [(booking as { id: string }).id],
    { clientsOnly: false },
  );

  // Nothing to do: not boarding, not confirmed, or in a kennel already.
  if (!outcome) {
    return NextResponse.json(
      {
        error: "This booking is not a confirmed stay waiting for a kennel.",
        reason: "not_waiting",
      },
      { status: 409 },
    );
  }

  // `kennel: null` is an answer, not a failure: none of the rate's types is
  // free for these nights, and the screen says so.
  return NextResponse.json({ kennel: outcome.kennel });
}
