import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import {
  CARD_SELECT,
  toCardRow,
  type CardRecord,
} from "@/lib/api/mappers/gift-card";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Taking money off a gift card.
//
// ── BY CODE, AND ONLY BY CODE ─────────────────────────────────────────────
//
// The counter has the card in front of it, not its uuid. More importantly, the
// code is what `redeem_gift_card` resolves and permission-checks in a SINGLE
// query, which is what makes "no such code" and "a real code at another
// facility" the same answer. A route that looked the card up first to find its
// id would reopen exactly the oracle the function was written to close — a gift
// card code is a bearer instrument, so an error that separates real from
// invented is a way to search for real ones.
//
// That is also why this route does not check the facility, the status or the
// balance itself. Every one of those checks happens inside the function, under
// a row lock, in the same transaction as the ledger entry. Repeating them here
// would be a second opinion formed before the lock was taken.
//
// ── THE LEDGER ENTRY IS THE REDEMPTION ────────────────────────────────────
//
// There is no write policy on `gift_card_transactions` at all, so the entry can
// only arrive through the function, and `gift_cards.balance` is recomputed by
// the trigger that applies it. An overdraft is refused by that trigger with a
// sentence naming both numbers, and the balance is left exactly where it was.
// ============================================================================

export const dynamic = "force-dynamic";

export interface RedeemResult {
  card: ReturnType<typeof toCardRow>;
  /** What was actually taken off, echoed back for the receipt. */
  amount: number;
}

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    amount?: number;
    bookingRef?: number | string;
    note?: string;
  } | null;

  const code = body?.code?.trim();
  if (!code) {
    return NextResponse.json(
      { error: "A gift card code is required." },
      { status: 400 },
    );
  }

  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "A redemption has to take something off the card." },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();

  // Resolution failing is NOT fatal: the money still moved, and recording the
  // entry against no booking beats refusing a payment because a lookup missed.
  // RLS narrows this read to bookings the caller can already see.
  let bookingId: string | undefined;
  if (body?.bookingRef !== undefined && body.bookingRef !== null) {
    const ref = Number(body.bookingRef);
    if (Number.isFinite(ref)) {
      const { data: booking } = await supabase
        .from("bookings")
        .select("id")
        .eq("ref", ref)
        .maybeSingle();
      bookingId = (booking as { id: string } | null)?.id ?? undefined;
    }
  }

  const { data, error } = await supabase.rpc("redeem_gift_card", {
    p_code: code,
    p_amount: amount,
    p_booking_id: bookingId,
    p_note: body?.note?.trim() || undefined,
  });

  if (error) {
    // 42501 covers all four refusals the function can give — unknown code, not
    // your facility, cancelled, expired — and they are deliberately not told
    // apart here either. The message the function wrote is the one to show.
    if (error.code === "42501") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    // 23514 is the overdraft: well-formed request, not enough money on the
    // card. A 409 rather than a 400 — the caller sent nothing wrong.
    if (error.code === "23514") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const card = data as unknown as CardRecord;

  // Re-read for the buyer embed, so the answer is the same shape as the list.
  // Only the row the function already returned, so nothing new can be seen.
  const { data: full } = await supabase
    .from("gift_cards")
    .select(CARD_SELECT)
    .eq("id", card.id)
    .maybeSingle();

  const result: RedeemResult = {
    card: toCardRow((full ?? card) as unknown as CardRecord, Date.now()),
    amount,
  };

  return NextResponse.json(result);
}
