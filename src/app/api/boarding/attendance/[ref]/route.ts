import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/supabase/server";
import { recordArrival } from "@/lib/api/boarding-arrival-write";

// ============================================================================
// A guest goes home — or did not really arrive.
//
// ── REVERTING DOES NOT DELETE THE ROW, AND DAYCARE'S DOES ─────────────────
//
// The daycare revert is a DELETE (20260806880000): the attendance row means
// "this dog arrived", so a mistaken check-in has nothing left to say and the
// row goes. Boarding's row is not that. `boarding_stays` is the KENNEL
// ASSIGNMENT, and deleting it would quietly give away the kennel as a side
// effect of correcting an arrival — two acts, one button. So a boarding revert
// nulls the timestamps and leaves the guest holding their room.
//
// ── UNDO RUNS BACKWARDS ───────────────────────────────────────────────────
//
// A stay that has been checked out cannot jump straight back to "never
// arrived": reopen it first. Otherwise one press erases a departure and an
// arrival together, and the record would show a guest who was never here on a
// night the kennel was certainly occupied. The function refuses it; this file
// only turns that into a 422.
// ============================================================================

export const dynamic = "force-dynamic";

interface UpdateInput {
  checkOut?: boolean;
  /** Undo a checkout — the wrong guest was collected. */
  reopen?: boolean;
}

function parseRef(ref: string): number | null {
  const value = Number(ref);
  return Number.isFinite(value) ? value : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const bookingRef = parseRef((await params).ref);
  if (bookingRef === null) {
    return NextResponse.json(
      { error: "That is not a booking reference." },
      { status: 422 },
    );
  }

  const body = (await request.json().catch(() => null)) as UpdateInput | null;
  if (!body || (!body.checkOut && !body.reopen)) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 422 });
  }
  if (body.checkOut && body.reopen) {
    return NextResponse.json(
      { error: "Check out or reopen, not both." },
      { status: 422 },
    );
  }

  const response = await recordArrival(
    bookingRef,
    body.checkOut ? "check_out" : "reopen",
  );
  if (!response.ok) return response;

  return new NextResponse(null, { status: 204 });
}

/**
 * Back to scheduled — the guest was never actually here.
 *
 * Clears both timestamps and KEEPS the kennel. See the header: unassigning a
 * room and un-arriving a guest are different acts, and PUT /api/boarding/stays
 * is the one that does the first.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const bookingRef = parseRef((await params).ref);
  if (bookingRef === null) {
    return NextResponse.json(
      { error: "That is not a booking reference." },
      { status: 422 },
    );
  }

  const response = await recordArrival(bookingRef, "revert");
  if (!response.ok) return response;

  return new NextResponse(null, { status: 204 });
}
