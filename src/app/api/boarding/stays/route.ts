import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// Where a guest sleeps.
//
// PUT because it is idempotent and covers all three moves the ops board makes:
// place a guest who has no kennel, move one who does, and clear the assignment
// (`roomId: null`). One door rather than three.
//
// ── THE WORK IS IN THE RPC, DELIBERATELY ──────────────────────────────────
//
// `assign_boarding_room` (20260806640000) is SECURITY INVOKER, so RLS judges
// every write as this caller. Two things make it the right home rather than
// this file:
//
//   * `override_reason` must be gated on `override_booking_capacity`, and RLS
//     cannot say "you may write this row but not that column". A check that
//     lived only here would have PostgREST beside it, reachable with the same
//     session cookie.
//
//   * An UPDATE or DELETE refused by RLS matches nothing and reports success.
//     Inside the function the row count is available, so it raises 42501
//     instead — which is why this route has no `deniedIfUntouched` call and
//     the rls-writes gate has nothing to flag.
// ============================================================================

export const dynamic = "force-dynamic";

interface AssignInput {
  bookingRef?: number;
  /** null clears the assignment and frees the kennel. */
  roomId?: string | null;
  overrideReason?: string;
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json().catch(() => null)) as AssignInput | null;

  if (!input || typeof input.bookingRef !== "number") {
    return NextResponse.json(
      { error: "A booking is required." },
      { status: 422 },
    );
  }

  // `undefined` and `null` mean different things here and the difference is
  // the whole API: null is "clear the room", missing is "you forgot to say".
  if (input.roomId === undefined) {
    return NextResponse.json(
      { error: "A room is required, or null to clear the assignment." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("assign_boarding_room", {
    p_booking_ref: input.bookingRef,
    p_room_id: input.roomId,
    p_override_reason: input.overrideReason ?? null,
  });

  if (error) {
    // 23P01 is the exclusion constraint: the kennel is taken for these dates.
    // A conflict, not a malformed request — and the raw message names a
    // constraint, which is no use to the person at the desk.
    if (error.code === "23P01") {
      return NextResponse.json(
        {
          error:
            "That room is already taken for these dates. Pick another room, or override if you have the permission.",
        },
        { status: 409 },
      );
    }

    // The message passes through unchanged: every `raise` in the RPC is
    // already a sentence for a person ("This facility has no boarding room
    // BD-99"), unlike a raw constraint violation. Only the STATUS is decided
    // here.
    const denied = error.code === "42501";
    const badRequest = error.code === "23503";
    return NextResponse.json(
      { error: error.message },
      { status: denied ? 403 : badRequest ? 422 : 500 },
    );
  }

  return NextResponse.json({ roomId: data ?? null });
}
