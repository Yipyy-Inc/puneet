import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// A guest moves kennels part-way through a stay.
//
// `PUT /api/boarding/stays` puts a WHOLE booking in one kennel — every night,
// the ones already slept included. That is right before the guest arrives and
// wrong after: moving a dog on its fourth night rewrote nights one to three
// as well, so a kennel somebody else had used on Monday refused a move on
// Thursday. This is the other door: from `from` on, the guest sleeps in
// `roomId`, and the nights before stay where they were.
//
// ── THE WORK IS IN THE RPC, AS IT IS NEXT DOOR ────────────────────────────
//
// `split_boarding_stay` is SECURITY INVOKER, so RLS judges every write as this
// caller; it gates `override_reason` on `override_booking_capacity` and turns
// a write RLS refused into 42501 rather than a silent success. This file only
// decides the status — and names the reason, so the screen can say it in the
// reader's language instead of passing the database's English through.
// ============================================================================

export const dynamic = "force-dynamic";

interface MoveInput {
  bookingRef?: number;
  /** The first night in the new kennel, YYYY-MM-DD. */
  from?: string;
  roomId?: string;
  overrideReason?: string;
}

export type MoveRefusal =
  | "taken"
  | "outside_stay"
  | "same_room"
  | "no_kennel"
  | "not_allowed"
  | "no_room"
  | "closed";

function refusal(reason: MoveRefusal, message: string, status: number) {
  return NextResponse.json({ error: message, reason }, { status });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json().catch(() => null)) as MoveInput | null;
  if (!input || typeof input.bookingRef !== "number") {
    return NextResponse.json(
      { error: "A booking is required." },
      { status: 422 },
    );
  }
  if (
    typeof input.from !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.from)
  ) {
    return NextResponse.json(
      {
        error: "`from` must be YYYY-MM-DD: the first night in the new kennel.",
      },
      { status: 422 },
    );
  }
  if (typeof input.roomId !== "string" || input.roomId.length === 0) {
    return NextResponse.json(
      { error: "A kennel is required." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("split_boarding_stay", {
    p_booking_ref: input.bookingRef,
    p_from: input.from,
    p_room_id: input.roomId,
    p_override_reason: input.overrideReason ?? undefined,
  });

  if (error) {
    // 23P01: the new kennel is taken on some of those nights.
    if (error.code === "23P01") {
      return refusal(
        "taken",
        "That kennel is already taken on some of those nights.",
        409,
      );
    }
    if (error.code === "42501") {
      return refusal("not_allowed", error.message, 403);
    }
    if (error.code === "23503") {
      return refusal("no_room", error.message, 422);
    }
    if (error.code === "55000") {
      return refusal("no_kennel", error.message, 409);
    }
    if (error.code === "22023") {
      return refusal(
        error.hint === "split_same_room"
          ? "same_room"
          : error.hint === "split_closed_booking"
            ? "closed"
            : "outside_stay",
        error.message,
        422,
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ segment: data });
}
