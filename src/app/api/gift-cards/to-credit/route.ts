import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Handing a gift card in, so its value lands on the customer's account.
//
// ── THE WALLET IS `store_credit_entries` ──────────────────────────────────
//
// Not a new table and not `loyalty_accounts.credit_balance`. Store credit has
// existed since 20260806220000: append-only, signed, balance derived by the
// `client_store_credit` view, and — the part that matters — already SPENT DOWN
// by `record_payment` at checkout. Money that goes in here comes out again.
//
// That is why this route exists and why the screen's "Redeem to Wallet" button
// was off rather than wired to something plausible: the destination had to be
// somewhere the customer can actually spend from.
//
// ── ONE CALL, BECAUSE IT IS ONE MOVEMENT ──────────────────────────────────
//
// Debiting the card and crediting the account are two ledgers and one fact. Two
// requests could leave a card spent with nothing credited — the customer's
// money, gone, with an error message where it used to be. `redeem_gift_card_to_
// credit` does both in a single transaction or neither.
// ============================================================================

export const dynamic = "force-dynamic";

export interface ToCreditResult {
  /** The customer's store-credit balance AFTER the move. */
  creditBalance: number;
  /** What was taken off the card, echoed for the receipt. */
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
    clientRef?: number | string;
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

  const clientRef = Number(body?.clientRef);
  if (!Number.isFinite(clientRef)) {
    return NextResponse.json(
      { error: "Which customer is this going to?" },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();

  // No facility is sent and none is read here. The function resolves the card,
  // checks the permission on the card's OWN facility in the same query, and
  // requires the customer to belong to that facility too — so a ref from
  // somewhere else finds nobody rather than the wrong person.
  const { data, error } = await supabase.rpc("redeem_gift_card_to_credit", {
    p_code: code,
    p_amount: amount,
    p_client_ref: clientRef,
    p_note: body?.note?.trim() || undefined,
  });

  if (error) {
    // 42501 covers unknown code, another facility's card, cancelled, expired,
    // and a customer who is not here — the first two deliberately alike.
    if (error.code === "42501") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    // 23514 is the overdraft, raised by the gift-card trigger under the row
    // lock. Well-formed request; the card does not hold that much.
    if (error.code === "23514") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const result: ToCreditResult = {
    creditBalance: Number(data ?? 0),
    amount,
  };

  return NextResponse.json(result);
}
