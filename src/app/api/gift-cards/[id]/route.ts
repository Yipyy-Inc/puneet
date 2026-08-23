import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import {
  CARD_SELECT,
  toCardRow,
  type CardRecord,
  type GiftCardRow,
} from "@/lib/api/mappers/gift-card";
import {
  ledgerForCard,
  type GiftCardTransactionRow,
} from "@/lib/api/gift-card-ledger";
import { createServerClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

// ============================================================================
// One gift card, and every movement on it.
//
// ── THE LEDGER IS THE POINT OF THE PAGE ───────────────────────────────────
//
// Somebody looking at a card is almost always answering "where did the rest of
// it go?", so the card and its history come back together. Two requests would
// let the screen render a balance next to a history that does not explain it —
// which is precisely the disagreement the fixture had, storing a balance beside
// a list of transactions that were maintained separately.
//
// ── PATCH CANNOT MOVE MONEY, AND THAT IS ENFORCED TWICE ───────────────────
//
// `balance` is not in the accepted fields, and a request naming it would be
// refused by trigger anyway. `status` accepts only `cancelled` and `active` —
// `redeemed` and `expired` are arithmetic and the calendar, and a hand-set one
// would be a claim about money that the ledger does not support.
// ============================================================================

export const dynamic = "force-dynamic";

export interface GiftCardDetailPayload {
  card: GiftCardRow;
  transactions: GiftCardTransactionRow[];
}

async function loadCard(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  facilityId: string,
  id: string,
) {
  return await supabase
    .from("gift_cards")
    .select(CARD_SELECT)
    .eq("facility_id", facilityId)
    .eq("id", id)
    .maybeSingle();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const { id } = await params;
  const supabase = await createServerClient();

  const { data: card, error } = await loadCard(
    supabase,
    context.facilityId,
    id,
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!card) {
    return NextResponse.json({ error: "No such gift card." }, { status: 404 });
  }

  const payload: GiftCardDetailPayload = {
    card: toCardRow(card as unknown as CardRecord, Date.now()),
    transactions: await ledgerForCard(supabase, id),
  };

  return NextResponse.json(payload);
}

/**
 * Edit the parts of a card that are not money.
 *
 * Cancelling lives here rather than in its own route because it is the same
 * kind of change as correcting a recipient's address: a decision recorded on
 * the row, with no ledger entry behind it. Taking the remaining balance BACK is
 * a different act, and it would have to be a `refunded` entry.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    recipientName?: string | null;
    recipientEmail?: string | null;
    message?: string | null;
    expiresAt?: string | null;
    status?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  // Typed against the table rather than `Record<string, unknown>`: `balance` is
  // then not merely absent from this route, it is a compile error to add.
  const patch: TablesUpdate<"gift_cards"> = {};
  if ("recipientName" in body)
    patch.recipient_name = body.recipientName ?? null;
  if ("recipientEmail" in body)
    patch.recipient_email = body.recipientEmail ?? null;
  if ("message" in body) patch.message = body.message ?? null;
  if ("expiresAt" in body) patch.expires_at = body.expiresAt || null;

  const supabase = await createServerClient();

  if (body.status !== undefined) {
    if (body.status !== "cancelled" && body.status !== "active") {
      return NextResponse.json(
        {
          error:
            "A gift card can only be cancelled or reinstated here. `redeemed` and `expired` follow the ledger and the calendar.",
        },
        { status: 400 },
      );
    }
    // Reinstating a card that has nothing left on it would put `active` over a
    // zero balance — a card the till will refuse while the screen says it
    // works. Money comes back by posting a `refunded` entry, not by relabelling.
    if (body.status === "active") {
      const { data: current } = await supabase
        .from("gift_cards")
        .select("balance")
        .eq("facility_id", context.facilityId)
        .eq("id", id)
        .maybeSingle();
      if (!current) {
        return NextResponse.json(
          { error: "No such gift card." },
          { status: 404 },
        );
      }
      if (Number((current as { balance: string | number }).balance) <= 0) {
        return NextResponse.json(
          {
            error:
              "That card has nothing left on it. Put money back on it before reinstating it.",
          },
          { status: 409 },
        );
      }
    }
    patch.status = body.status;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  // `.select()` is what makes the refusal visible: an UPDATE that fails a
  // `using` policy affects zero rows and returns SUCCESS, so without counting
  // what was touched this would report a change that never happened.
  const { data, error } = await supabase
    .from("gift_cards")
    .update(patch)
    .eq("facility_id", context.facilityId)
    .eq("id", id)
    .select(CARD_SELECT);

  if (error) {
    const denied = error.code === "42501";
    return NextResponse.json(
      { error: error.message },
      { status: denied ? 403 : 400 },
    );
  }

  const refused = deniedIfUntouched(
    data,
    "You are not allowed to change that gift card.",
  );
  if (refused) return refused;

  return NextResponse.json({
    card: toCardRow(
      (data as unknown as CardRecord[])[0] as CardRecord,
      Date.now(),
    ),
  });
}
