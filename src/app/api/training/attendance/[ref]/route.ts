import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";

// ============================================================================
// A dog leaves its class — or was never in it.
//
// The same three moves daycare has, and the same asymmetry: checking OUT keeps
// the row and its times because the session happened and ended; REVERTING
// deletes it because the check-in was a mistake, and a row reading "arrived at
// 17:58, no longer considered to have arrived" would be a fiction.
//
// Boarding does the opposite — its revert is an UPDATE — because there the row
// is also the kennel assignment. Training's row, like daycare's, means only
// "this dog arrived", so a mistaken one has nothing left to say.
// ============================================================================

export const dynamic = "force-dynamic";

interface UpdateInput {
  checkOut?: boolean;
  /** Undo a checkout — the wrong dog was collected. */
  reopen?: boolean;
  notes?: string;
}

async function bookingIdFor(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  ref: number,
): Promise<string | null> {
  const { data } = await supabase
    .from("bookings")
    .select("id")
    .eq("ref", ref)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const bookingRef = Number((await params).ref);
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
  const bookingId = await bookingIdFor(supabase, bookingRef);
  if (!bookingId) {
    return NextResponse.json(
      { error: "That booking does not exist, or is not yours." },
      { status: 404 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (body.checkOut) patch.checked_out_at = new Date().toISOString();
  if (body.reopen) patch.checked_out_at = null;
  if (body.notes !== undefined) patch.session_notes = body.notes;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("training_attendance")
    .update(patch as never)
    .eq("booking_id", bookingId)
    .select("booking_id");

  if (error) {
    if (error.message.includes("leaves_after_arriving")) {
      return NextResponse.json(
        { error: "This dog has not been checked in yet." },
        { status: 422 },
      );
    }
    return writeFailure(error, {
      denied: "Not allowed to change training attendance at this facility.",
      duplicate: "That session has already been recorded.",
    });
  }

  const denied = deniedIfUntouched(
    data,
    "Not allowed to change this session, or nobody has checked in yet.",
  );
  if (denied) return denied;

  return new NextResponse(null, { status: 204 });
}

/** Back to scheduled — the dog was never here. Removes the record. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const bookingRef = Number((await params).ref);
  if (!Number.isFinite(bookingRef)) {
    return NextResponse.json(
      { error: "That is not a booking reference." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const bookingId = await bookingIdFor(supabase, bookingRef);
  if (!bookingId) {
    return NextResponse.json(
      { error: "That booking does not exist, or is not yours." },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("training_attendance")
    .delete()
    .eq("booking_id", bookingId)
    .select("booking_id");

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to change training attendance at this facility.",
      duplicate: "That session cannot be reverted.",
    });
  }

  const denied = deniedIfUntouched(
    data,
    "Not allowed to revert this session, or it was never checked in.",
  );
  if (denied) return denied;

  return new NextResponse(null, { status: 204 });
}
