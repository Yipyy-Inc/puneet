import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  CARD_SELECT,
  toCardRow,
  type CardRecord,
} from "@/lib/api/mappers/gift-card";
import { ledgersForCards } from "@/lib/api/gift-card-ledger";
import {
  activeFacilityIdForStaff,
  inFacility,
} from "@/lib/api/facility-context";

// ============================================================================
// The gift cards the signed-in OWNER bought.
//
// ── WHY NOT /api/gift-cards ───────────────────────────────────────────────
//
// That route is the counter's. It resolves the facility with
// `getFacilityContext()`, which for somebody holding no membership falls back
// to the demo facility — so a real customer asking it would be answered about a
// business they have never heard of, and their own cards would be missing from
// a list that looked complete.
//
// ── THE FILTER IS EXPLICIT, THOUGH RLS WOULD DO IT ────────────────────────
//
// `gift_cards_read` already admits `purchased_by_client_id in
// private.own_client_ids()`, so a customer cannot read anyone else's through
// this. But that policy has a SECOND arm for staff holding
// `financial_manage_gift_cards`, and a staff member is also a signed-in person:
// leaning on RLS alone would quietly turn a customer endpoint into a second
// door onto the whole facility's cards. Scoping to the caller's own client rows
// means this answers the same question whoever asks it.
//
// Scoping by client also scopes by facility for free — a client row IS one
// facility's record of a person — so there is no facility read here to get
// wrong.
//
// ── CARDS RECEIVED ARE NOT HERE, AND CANNOT BE YET ────────────────────────
//
// `gift_cards_read` has no recipient arm: a card names a recipient EMAIL, and
// an email address is not an identity — anyone who can type an address into the
// buy form would otherwise decide whose card it is. Until a card can be claimed
// by the person who actually holds it, "Cards I received" has no honest source.
// Debt map.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();

  // Which facility's record of this person, named by the subdomain exactly as
  // /api/clients/me resolves it. With no facility named (the apex) every record
  // they hold counts, because there is no one facility to mean.
  //
  // `activeFacilityIdForStaff()` is null for a customer, so `inFacility(null)`
  // is a no-op and they read through RLS exactly as before. It is not a no-op
  // for STAFF, who are also signed-in people and are also admitted by this
  // table's other policy arm — it pins them to the facility on screen instead
  // of every facility RLS would merge. That is the same reason
  // check:facility-scoped-reads exists.
  const scope = await activeFacilityIdForStaff();
  const slug = (await headers()).get("x-facility-slug");
  let clientQuery = supabase
    .from("clients")
    .select("id, facilities!inner(slug)")
    .match(inFacility(scope))
    .eq("profile_id", user.id);
  if (slug) clientQuery = clientQuery.eq("facilities.slug", slug);

  const { data: clientRows, error: clientError } = await clientQuery;
  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 500 });
  }

  const clientIds = (clientRows ?? []).map((row) => row.id);
  // Signed in with no client record is an ordinary state, not an error — see
  // the stranger gate in /api/clients/me. No records means no cards.
  if (clientIds.length === 0) {
    return NextResponse.json({ cards: [] });
  }

  const { data, error } = await supabase
    .from("gift_cards")
    .select(CARD_SELECT)
    .match(inFacility(scope))
    .in("purchased_by_client_id", clientIds)
    .order("issued_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const now = Date.now();
  const cards = ((data ?? []) as unknown as CardRecord[]).map((row) =>
    toCardRow(row, now),
  );

  // The history comes with the cards rather than behind a flag: the screen that
  // reads this shows a card's movements in its detail dialog, and an owner has
  // a handful of cards, not a facility's thousands. `gift_card_transactions_read`
  // admits the buyer to exactly these rows, so this adds no reach.
  //
  // A failed ledger fails the request. A card whose history could not be read is
  // not a card with no history — showing "no transactions yet" over a broken
  // read is the specific lie 20260902175656 was written to stop.
  try {
    const ledgers = await ledgersForCards(
      supabase,
      cards.map((card) => card.id),
    );
    return NextResponse.json({
      cards: cards.map((card) => ({
        ...card,
        transactions: ledgers.get(card.id) ?? [],
      })),
    });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Ledger failed." },
      { status: 400 },
    );
  }
}
