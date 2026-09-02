import "server-only";

import type { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Reading a gift card's ledger, once, for both routes that need it.
//
// The detail route wants one card's entries; the list route wants every card's,
// because the screen it feeds shows a card's history inline and its reports tab
// sums across all of them. Same two queries either way, so they live here
// rather than being written twice and drifting.
//
// ── WHY BOOKING REFS COST A SECOND QUERY ──────────────────────────────────
//
// `gift_card_transactions.booking_id` carries NO foreign key. That is
// deliberate: an append-only row must outlive the booking it paid for, and
// `on delete set null` is an UPDATE the append-only guard refuses — which is
// exactly how `audit_log` made every facility undeletable until 20260822500000
// removed that constraint.
//
// No constraint means no relationship for PostgREST to embed, so the refs are
// resolved here. A booking that has since been deleted resolves to null, which
// is the honest answer and the whole reason the column was written that way.
// ============================================================================

type Client = Awaited<ReturnType<typeof createServerClient>>;

export interface GiftCardTransactionRow {
  id: string;
  giftCardId: string;
  kind: "issued" | "redeemed" | "refunded" | "adjusted";
  /** SIGNED. Positive puts money on the card, negative takes it off. */
  amount: number;
  balanceAfter: number;
  bookingId: string | null;
  /** Resolved for display. Null when the booking is gone, or there was none. */
  bookingRef: number | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

interface LedgerRecord {
  id: string;
  gift_card_id: string;
  kind: string;
  amount: string | number;
  balance_after: string | number;
  booking_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

const LEDGER_SELECT =
  "id, gift_card_id, kind, amount, balance_after, booking_id, note, created_by, created_at";

async function refsForBookings(
  supabase: Client,
  ids: string[],
): Promise<Map<string, number>> {
  const found = new Map<string, number>();
  if (ids.length === 0) return found;

  const { data } = await supabase
    .from("bookings")
    .select("id, ref")
    .in("id", ids);

  for (const row of (data ?? []) as { id: string; ref: number }[]) {
    found.set(row.id, row.ref);
  }
  return found;
}

function toRow(
  row: LedgerRecord,
  refs: Map<string, number>,
): GiftCardTransactionRow {
  return {
    id: row.id,
    giftCardId: row.gift_card_id,
    kind: row.kind as GiftCardTransactionRow["kind"],
    amount: Number(row.amount),
    balanceAfter: Number(row.balance_after),
    bookingId: row.booking_id,
    bookingRef: row.booking_id ? (refs.get(row.booking_id) ?? null) : null,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

/**
 * One card's entries, oldest first — the order somebody reads a statement in.
 */
export async function ledgerForCard(
  supabase: Client,
  giftCardId: string,
): Promise<GiftCardTransactionRow[]> {
  const { data, error } = await supabase
    .from("gift_card_transactions")
    .select(LEDGER_SELECT)
    .eq("gift_card_id", giftCardId)
    .order("created_at", { ascending: true });

  // Same rule as ledgersForFacility below: a card whose history could not be
  // read is not a card with no history, and the balance beside it came from a
  // trigger over exactly these rows.
  if (error) throw new Error(`Gift-card ledger unavailable: ${error.message}`);

  const rows = (data ?? []) as unknown as LedgerRecord[];
  const refs = await refsForBookings(
    supabase,
    rows.map((row) => row.booking_id).filter((v): v is string => Boolean(v)),
  );
  return rows.map((row) => toRow(row, refs));
}

/**
 * Every card's entries at one facility, grouped by card.
 *
 * Two queries for the whole screen rather than two per card. RLS narrows the
 * read the same way it narrows the cards themselves, so a caller who cannot see
 * a card cannot see its ledger either and the grouping has nothing to hide.
 *
 * ── IT THROWS NOW, AND IT USED TO SHRUG ──────────────────────────────────
 *
 * This discarded the error and returned an empty Map. So a read that never
 * finished was indistinguishable from a facility that has never sold a gift
 * card, and the screen showed the second.
 *
 * That is not hypothetical. `gift_card_transactions_read` calls
 * `private.has_permission(facility_id, …)` with a COLUMN as its argument, so
 * it cannot be hoisted and ran once per row; at 4,539 rows the query hit the
 * statement timeout. The gift-cards screen answered with every card's history
 * empty, its revenue tile at $0.00 and its status breakdown at zero cards —
 * all of it silent, none of it true. 20260902175656 adds the index that makes
 * the read affordable; this makes the next failure of any kind say so.
 */
export async function ledgersForFacility(
  supabase: Client,
  facilityId: string,
): Promise<Map<string, GiftCardTransactionRow[]>> {
  const { data, error } = await supabase
    .from("gift_card_transactions")
    .select(LEDGER_SELECT)
    .eq("facility_id", facilityId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Gift-card ledger unavailable: ${error.message}`);

  const rows = (data ?? []) as unknown as LedgerRecord[];
  const refs = await refsForBookings(
    supabase,
    rows.map((row) => row.booking_id).filter((v): v is string => Boolean(v)),
  );

  const grouped = new Map<string, GiftCardTransactionRow[]>();
  for (const row of rows) {
    const entry = toRow(row, refs);
    const existing = grouped.get(entry.giftCardId);
    if (existing) existing.push(entry);
    else grouped.set(entry.giftCardId, [entry]);
  }
  return grouped;
}
