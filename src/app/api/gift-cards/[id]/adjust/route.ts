import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import {
  CARD_SELECT,
  toCardRow,
  type CardRecord,
  type GiftCardRow,
} from "@/lib/api/mappers/gift-card";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Correcting a gift card balance.
//
// Its own route rather than a field on PATCH, because it is not the same kind
// of change: PATCH edits a recipient or cancels a card and touches no money,
// while this appends to the ledger. Putting them together would give the edit
// route a field that moves money, which is exactly the shape the balance
// trigger exists to refuse.
//
// The amount is SIGNED — positive puts money back on, negative takes it off —
// and the reason is required. An adjustment is the one entry with no document
// behind it, so the sentence explaining it is the only audit there will be.
// ============================================================================

export const dynamic = "force-dynamic";

export interface AdjustResult {
  card: GiftCardRow;
  /** What was applied, echoed back. Signed. */
  amount: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    amount?: number;
    reason?: string;
  } | null;

  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount === 0) {
    return NextResponse.json(
      { error: "An adjustment has to move the balance." },
      { status: 400 },
    );
  }

  const reason = body?.reason?.trim();
  if (!reason) {
    return NextResponse.json(
      {
        error:
          "An adjustment needs a reason. It is the only record of why the balance changed.",
      },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();

  // The facility is NOT sent and NOT read here: `adjust_gift_card` finds the
  // card and checks the permission on its own facility in one query.
  const { data, error } = await supabase.rpc("adjust_gift_card", {
    p_gift_card_id: id,
    p_amount: amount,
    p_reason: reason,
  });

  if (error) {
    // 42501 covers "no such card", "not your facility" and "cancelled" — the
    // first two deliberately indistinguishable.
    if (error.code === "42501") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    // 23514 is the overdraft, raised by the applying trigger: the request was
    // well formed and the card does not hold that much.
    if (error.code === "23514") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const card = data as unknown as CardRecord;

  // Re-read only for the buyer embed, so the answer matches the list's shape.
  const { data: full } = await supabase
    .from("gift_cards")
    .select(CARD_SELECT)
    .eq("id", card.id)
    .maybeSingle();

  const result: AdjustResult = {
    card: toCardRow((full ?? card) as unknown as CardRecord, Date.now()),
    amount,
  };

  return NextResponse.json(result);
}
