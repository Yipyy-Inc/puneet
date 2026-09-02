import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// The facility's gift-card activity: the newest movements, whatever card.
//
// ── WHY THIS EXISTS RATHER THAN `?withLedger=1` ───────────────────────────
//
// The activity feed used to read `giftCardAuditLogs` from src/data — nine
// hand-written rows naming Tom Harris and a "Spring 2025 Batch" while
// `gift_card_transactions` held 4,539 real ones.
//
// The obvious replacement was the ledger the screen already fetches, and it
// does not work. `/api/gift-cards?withLedger=1` runs two capped queries and
// joins them in memory: cards `order issued_at desc`, transactions
// `order created_at asc`, PostgREST returning at most 1000 of each. This
// facility has 2,099 cards and 4,539 transactions, so the screen received the
// 1,000 NEWEST cards and the 1,000 OLDEST movements — two sets that barely
// intersect. MEASURED: 1000 cards, 0 transactions, no error.
//
// That is a real defect in the card list and it is fixed separately. But the
// feed should not have been built on it regardless: it wants the newest N
// movements across the whole facility, and asking for every card's entire
// history to display twelve rows is the wrong question, at any row count.
//
// ── THE CARD IS EMBEDDED, NOT FETCHED AGAIN ───────────────────────────────
//
// A movement on its own cannot say whether it was a digital or a physical card
// that was issued, or whose money it was. Those live on `gift_cards`, so
// PostgREST embeds them through the foreign key — one request, and the card and
// its movement cannot disagree about which facility they belong to.
//
// ── RLS ───────────────────────────────────────────────────────────────────
//
// `gift_card_transactions_read` wants `financial_manage_gift_cards`, and a
// customer may read movements on cards they bought. The facility comes from the
// session (see check:facility-from-session), and the filter below is belt as
// well as braces: RLS decides, this narrows.
// ============================================================================

export const dynamic = "force-dynamic";

/** Newest first, and capped — a feed shows a page, not a statement. */
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

// The buyer's small integer `ref` and their name live on `clients`, not on the
// card — the card holds only `purchased_by_client_id`. So the embed is two deep,
// exactly as CARD_SELECT does it in mappers/gift-card.ts.
const ACTIVITY_SELECT = `
  id, gift_card_id, kind, amount, balance_after, note, created_at,
  gift_cards!inner (
    kind, recipient_name,
    clients:purchased_by_client_id ( ref, name )
  )
`;

interface ActivityRecord {
  id: string;
  gift_card_id: string;
  kind: string;
  amount: number | string;
  balance_after: number | string;
  note: string | null;
  created_at: string;
  gift_cards: {
    kind: string;
    recipient_name: string | null;
    // PostgREST gives a to-one embed as an object, but has answered with a
    // one-element array before now — reading it as one shape only is how an
    // empty board was once produced. Both are handled.
    clients:
      | { ref: number; name: string }
      | { ref: number; name: string }[]
      | null;
  } | null;
}

export interface GiftCardActivityRow {
  id: string;
  giftCardId: string;
  /** The movement: issued, redeemed, refunded, adjusted. */
  kind: string;
  /** SIGNED, as the ledger stores it. Negative takes money off the card. */
  amount: number;
  balanceAfter: number;
  note: string | null;
  createdAt: string;
  /** "online" or "physical" — what the card is, needed to name an issue. */
  cardKind: string | null;
  clientRef: number | null;
  clientName: string | null;
}

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  const limit = Math.min(
    Number(params.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT,
    MAX_LIMIT,
  );

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("gift_card_transactions")
    .select(ACTIVITY_SELECT)
    .eq("facility_id", context.facilityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  // The error is returned, not swallowed. `ledgersForFacility` discards it and
  // answers with an empty Map, which is why the feed's emptiness looked like a
  // facility with no history rather than a query that never ran.
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (data ?? []) as unknown as ActivityRecord[];
  const activity: GiftCardActivityRow[] = rows.map((row) => {
    const embedded = row.gift_cards?.clients ?? null;
    const buyer = Array.isArray(embedded) ? (embedded[0] ?? null) : embedded;
    return {
      id: row.id,
      giftCardId: row.gift_card_id,
      kind: row.kind,
      amount: Number(row.amount),
      balanceAfter: Number(row.balance_after),
      note: row.note,
      createdAt: row.created_at,
      cardKind: row.gift_cards?.kind ?? null,
      clientRef: buyer?.ref ?? null,
      clientName: buyer?.name ?? row.gift_cards?.recipient_name ?? null,
    };
  });

  return NextResponse.json({ activity });
}
