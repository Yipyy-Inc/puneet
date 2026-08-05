import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";

// ============================================================================
// Checking a dog out, and the things noted while it was here.
//
// ── CHECKING OUT IS A TIMESTAMP, NOT A STATUS ─────────────────────────────
//
// `daycare_attendance.status` is a generated column and refuses to be written
// at all ("column status can only be updated to DEFAULT"). Departure is
// `checked_out_at`, and the status follows — which is why a dog cannot be
// marked collected without a time it was collected at.
//
// The CHECK refuses a checkout with no check-in, and one that precedes it. A
// dog that left before it arrived is not a state this table can hold.
// ============================================================================

export const dynamic = "force-dynamic";

interface UpdateInput {
  checkOut?: boolean;
  /** Undo a checkout — the wrong dog was collected. */
  reopen?: boolean;
  playGroup?: string | null;
  notes?: string;
  rateType?: string;
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
    return NextResponse.json(
      { error: "That is not a booking reference." },
      { status: 422 },
    );
  }

  const body = (await request.json().catch(() => null)) as UpdateInput | null;
  if (!body) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 422 });
  }
  if (body.checkOut && body.reopen) {
    return NextResponse.json(
      { error: "Check out or reopen, not both." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id")
    .eq("ref", bookingRef)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json(
      { error: "That booking does not exist, or is not yours." },
      { status: 404 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (body.checkOut) patch.checked_out_at = new Date().toISOString();
  if (body.reopen) patch.checked_out_at = null;
  if (body.playGroup !== undefined) patch.play_group = body.playGroup;
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.rateType !== undefined) patch.rate_type = body.rateType;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("daycare_attendance")
    .update(patch as never)
    .eq("booking_id", (booking as { id: string }).id)
    .select("booking_id");

  if (error) {
    // The CHECK constraint, said in words a person at a counter can act on.
    if (error.message.includes("leaves_after_arriving")) {
      return NextResponse.json(
        { error: "This dog has not been checked in yet." },
        { status: 422 },
      );
    }
    return writeFailure(error, {
      denied: "Not allowed to change daycare attendance at this facility.",
      duplicate: "That visit has already been recorded.",
    });
  }

  const denied = deniedIfUntouched(
    data,
    "Not allowed to change this visit, or it has no attendance record yet.",
  );
  if (denied) return denied;

  return new NextResponse(null, { status: 204 });
}

/**
 * Back to scheduled — the dog was never actually here.
 *
 * A DELETE, not a status flip, and the asymmetry is the meaning. It is the
 * same distinction boarding draws (20260806640000): checking OUT records that
 * the visit happened and then ended, so it keeps its row and its times.
 * Reverting says the check-in was a mistake — the wrong dog, the wrong
 * booking — and a row reading "arrived at 08:02, no longer considered to have
 * arrived" would be a fiction.
 *
 * The booking survives: it is still on today's floor, as `scheduled`.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { ref } = await params;
  const bookingRef = Number(ref);
  if (!Number.isFinite(bookingRef)) {
    return NextResponse.json(
      { error: "That is not a booking reference." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id")
    .eq("ref", bookingRef)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json(
      { error: "That booking does not exist, or is not yours." },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("daycare_attendance")
    .delete()
    .eq("booking_id", (booking as { id: string }).id)
    .select("booking_id");

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to change daycare attendance at this facility.",
      duplicate: "That visit cannot be reverted.",
    });
  }

  const denied = deniedIfUntouched(
    data,
    "Not allowed to revert this visit, or it was never checked in.",
  );
  if (denied) return denied;

  return new NextResponse(null, { status: 204 });
}
