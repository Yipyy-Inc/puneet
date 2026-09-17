import { NextResponse, type NextRequest } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

import { getFacilityContext } from "@/lib/api/facility-context";
import { ledgersForFacility } from "@/lib/api/gift-card-ledger";
import { getViewer } from "@/lib/auth/viewer";
import {
  CARD_SELECT,
  toCardRow,
  type CardRecord,
} from "@/lib/api/mappers/gift-card";
import { createServerClient } from "@/lib/supabase/server";
import { readAllPages, type RangeableQuery } from "@/lib/api/read-all-pages";

// ============================================================================
// Gift cards: what the facility has issued, and what it still owes on them.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// Nothing — there was no table until 20260822900000. `/facility/dashboard/
// gift-cards` issued cards into `src/data/gift-cards.ts` and React state, so a
// business could take a customer's money, hand over a card, and hold no record
// of the liability. Every other unconverted screen loses a setting; that one
// lost money owed to somebody.
//
// ── THE BALANCE IS READ, NEVER SENT ───────────────────────────────────────
//
// Same rule as the loyalty ledger: `gift_cards.balance` is trigger-maintained
// from `gift_card_transactions` and a second trigger refuses a hand-written
// change. There is no `balance` field on the PATCH in `[id]/route.ts` and there
// could not be a working one — money moves by posting to the ledger, which only
// `issue_gift_card` and `redeem_gift_card` can do.
// ============================================================================

export const dynamic = "force-dynamic";

export type { GiftCardRow } from "@/lib/api/mappers/gift-card";

/**
 * A refusal from `issue_gift_card`, as an HTTP answer.
 *
 * 23505 is the unique code per facility — the one error a person can act on
 * ("that code is already in use"), so it is not folded into the generic 400.
 */
function issueFailure(error: PostgrestError): NextResponse {
  if (error.code === "42501") {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error.code === "23505") {
    return NextResponse.json(
      { error: "A gift card with that code already exists here." },
      { status: 409 },
    );
  }
  return NextResponse.json({ error: error.message }, { status: 400 });
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

  const supabase = await createServerClient();
  const params = new URL(request.url).searchParams;

  let query = supabase
    .from("gift_cards")
    .select(CARD_SELECT)
    .eq("facility_id", context.facilityId)
    .order("issued_at", { ascending: false });

  // Looking a card up by code — the "check balance" counter question.
  //
  // A code belonging to ANOTHER facility comes back as an empty list, which is
  // the same answer as a code nobody has. That is the indistinguishability
  // `redeem_gift_card` is built around, for the same reason: a gift card code
  // is a bearer instrument, so an answer separating "real, but not yours" from
  // "not real" is a way to search for real ones.
  const code = params.get("code");
  if (code !== null) {
    const trimmed = code.trim();
    if (trimmed === "") return NextResponse.json({ cards: [] });
    // ── CASE-INSENSITIVE, BECAUSE THE CODE ON THE CARD IS ────────────────
    //
    // This was `.eq("code", trimmed)`. MEASURED 2026-09-17: 5,526 of this
    // project's 6,092 codes contain a lowercase letter, and the redeem modal
    // UPPERCASES what the counter types — so an exact match could not find
    // roughly nine cards in ten. It went unnoticed while the modal scanned an
    // in-memory list with `gc.code.toLowerCase() === q`, which was already
    // case-insensitive; this restores that, it does not loosen it.
    //
    // Safe to fold: zero codes in the table collide case-insensitively, and
    // `code` is unique per facility.
    //
    // `ilike` is a PATTERN match, so `%` and `_` from a caller would be
    // wildcards — a way to fish for real codes one character at a time. They
    // are escaped, which leaves an exact match that ignores case and nothing
    // else. The backslash goes first, or it re-escapes the escapes.
    const exact = trimmed
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
    query = query.ilike("code", exact);
  }

  const status = params.get("status");
  if (status && status !== "all") query = query.eq("status", status);

  // Paged: PostgREST answers at most 1000 rows to an unbounded select, in
  // silence, and this facility holds 5,975 cards. Unpaged, the screen's reports
  // tab summed the first thousand and called it the facility's gift-card
  // revenue. A code LOOKUP is unaffected either way — it matches one row — but
  // the list behind the totals was short.
  const { rows: data, error } = await readAllPages<CardRecord>(
    query as unknown as RangeableQuery<CardRecord>,
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const now = Date.now();
  const cards = (data as unknown as CardRecord[]).map((row) =>
    toCardRow(row, now),
  );

  // `withLedger=1` attaches each card's movements — two extra queries for the
  // whole facility, not two per card.
  //
  // Opt-in rather than always, because the two callers want different things:
  // the gift-cards screen shows a card's history inline and sums across all of
  // them in its reports tab, while a checkout looking a code up needs the
  // balance and nothing else. Sending the history to the till would be paying
  // for a statement to answer "how much is on this?".
  if (params.get("withLedger") === "1") {
    // `ledgersForFacility` throws now instead of answering with an empty Map.
    // Caught here so the caller gets a message rather than a stack trace — and
    // so a failed ledger is never dressed up as a set of cards with no history,
    // which is what this endpoint did until 20260902175656.
    try {
      const ledgers = await ledgersForFacility(supabase, context.facilityId);
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

  return NextResponse.json({ cards });
}

/**
 * Issue a card.
 *
 * One RPC, because a card and its opening balance are one fact: two round trips
 * can leave a card worth nothing, or a ledger entry against no card. There is
 * no INSERT policy on `gift_cards` at all, so this is not merely the preferred
 * path — it is the only one.
 */
export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    amount?: number;
    kind?: string;
    code?: string;
    recipientName?: string;
    recipientEmail?: string;
    message?: string;
    expiresAt?: string;
    purchasedByClientRef?: number | string;
  } | null;

  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "A gift card has to be worth something." },
      { status: 400 },
    );
  }

  const kind = body?.kind ?? "online";
  if (kind !== "online" && kind !== "physical") {
    return NextResponse.json(
      { error: `Unknown gift card kind '${kind}'.` },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();

  // The buyer is optional — a card bought with cash by somebody who is not on
  // file is still a real liability, and refusing to record it would push the
  // business back to not recording it at all.
  let purchasedByClientId: string | undefined;
  if (
    body?.purchasedByClientRef !== undefined &&
    body.purchasedByClientRef !== null &&
    body.purchasedByClientRef !== ""
  ) {
    const ref = Number(body.purchasedByClientRef);
    if (!Number.isFinite(ref)) {
      return NextResponse.json(
        { error: "`purchasedByClientRef` must be a number." },
        { status: 400 },
      );
    }
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("facility_id", context.facilityId)
      .eq("ref", ref)
      .maybeSingle();
    if (!client) {
      return NextResponse.json({ error: "No such client." }, { status: 404 });
    }
    purchasedByClientId = (client as { id: string }).id;
  }

  // The facility comes from the SESSION, never the body — a caller naming
  // their own facility_id is how one business writes into another's data, and
  // `check:facility-from-session` fails the build on it.
  const { data, error } = await supabase.rpc("issue_gift_card", {
    p_facility_id: context.facilityId,
    p_amount: amount,
    p_kind: kind,
    // `undefined` rather than `null`: these are DEFAULT parameters, and
    // PostgREST omits an undefined key so the function's own default applies.
    p_code: body?.code?.trim() || undefined,
    p_recipient_name: body?.recipientName?.trim() || undefined,
    p_recipient_email: body?.recipientEmail?.trim() || undefined,
    p_message: body?.message?.trim() || undefined,
    p_expires_at: body?.expiresAt || undefined,
    p_purchased_by_client_id: purchasedByClientId,
  });

  if (error) return issueFailure(error);

  // Read back through the same select the list uses, so a freshly issued card
  // arrives the same shape as every other one — buyer resolved, not a hole the
  // screen has to refetch to fill.
  const { data: full } = await supabase
    .from("gift_cards")
    .select(CARD_SELECT)
    .eq("id", (data as unknown as { id: string }).id)
    .single();

  return NextResponse.json(
    { card: toCardRow(full as unknown as CardRecord, Date.now()) },
    { status: 201 },
  );
}
