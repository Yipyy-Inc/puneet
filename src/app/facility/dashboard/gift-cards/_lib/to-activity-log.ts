import type { GiftCardActivityRow } from "@/lib/api/gift-cards";
import type { GiftCardAuditLog } from "@/types/payments";

// ============================================================================
// The facility's gift-card activity, from the movements that actually happened.
//
// This replaces `giftCardAuditLogs` (src/data/gift-cards.ts) — hand-written
// rows naming Tom Harris, Alice Johnson and a "Spring 2025 Batch". The screen
// showed those nine while `gift_card_transactions` held 4,513 real ones.
//
// ── WHY NOT THE LEDGER THE SCREEN ALREADY HAS ─────────────────────────────
//
// `allWithLedger()` looked like the answer — the page fetches it for the
// balances. It is not. That endpoint runs two capped queries and joins them in
// memory: cards newest-first, transactions OLDEST-first, 1000 of each. With
// 2,099 cards and 4,539 movements the screen got the 1,000 newest cards and
// the 1,000 oldest movements. MEASURED: 1000 cards, 0 transactions, no error,
// because the query's error is discarded.
//
// So this reads /api/gift-cards/activity, which asks the question the feed
// actually has: the newest N movements, whatever card they were on.
//
// ── THE MAPPING, AND WHAT IT REFUSES TO GUESS ─────────────────────────────
//
// `gift_card_transactions.kind` has four values; the audit-log enum has
// twelve, because it was written for a fixture that could invent any event it
// liked. Only these are derivable:
//
//   issued + card.kind online    → issued_digital
//   issued + card.kind physical  → issued_physical
//   redeemed                     → redeemed
//   refunded                     → refunded
//   adjusted                     → balance_adjusted
//
// `redeemed` is NEW in that enum, added with this. The two values that existed
// — `redeemed_to_wallet` and `wallet_used` — both name a DESTINATION, and the
// database does not record one: `/api/gift-cards/redeem` and
// `/api/gift-cards/to-credit` write the same `kind`. The only thing that
// differs is `note`, which is free text the caller supplies ("Moved to Alice
// Johnson's account credit", but also "E2E partial"). Reading a destination out
// of it would be a guess wearing a fact's clothes.
//
// ── AND WHAT HAS NO ROW AT ALL ────────────────────────────────────────────
//
// `activated`, `voided`, `expired`, `expiry_changed`, `batch_generated` and
// `batch_imported` are not movements — they are changes to `gift_cards`, and
// nothing writes a transaction for them. 2,063 cards are cancelled and not one
// of them has an event saying when or by whom.
//
// So the Voided and Expired filters return nothing, and that is a true
// statement about the log rather than about the cards. The empty state says
// which, because "no voided cards" and "voiding is not recorded" are different
// facts and only one of them is this one.
// ============================================================================

/** Movement kinds this facility's log can actually contain. */
const ACTION_BY_KIND = {
  redeemed: "redeemed",
  refunded: "refunded",
  adjusted: "balance_adjusted",
} as const satisfies Partial<Record<string, GiftCardAuditLog["action"]>>;

/**
 * The facility's movements as the activity feed reads them.
 *
 * `rows` arrive scoped to the caller's facility by the session and already
 * ordered newest-first, so there is nothing to filter or sort here.
 */
export function toActivityLog(
  rows: GiftCardActivityRow[],
  facilityId: number,
): GiftCardAuditLog[] {
  const logs: GiftCardAuditLog[] = [];

  for (const tx of rows) {
    // Who the money concerns. The buyer if there is one, else whoever it was
    // addressed to — a card bought at the counter for cash has no client row.
    const clientName = tx.clientName ?? undefined;

    const action =
      tx.kind === "issued"
        ? tx.cardKind === "physical"
          ? "issued_physical"
          : "issued_digital"
        : ACTION_BY_KIND[tx.kind as keyof typeof ACTION_BY_KIND];
    if (action) {
      logs.push({
        id: tx.id,
        facilityId,
        giftCardId: tx.giftCardId,
        action,
        // `amount` is SIGNED in the ledger — negative takes money off — and the
        // column renders it as a bare `$x.xx`. The action already says the
        // direction, so a redemption reads "$40.00" rather than "$-40.00".
        amount: Math.abs(tx.amount),
        // Exact, not approximated: the ledger stores the balance AFTER and the
        // signed delta, so before is arithmetic rather than a lookup.
        balanceBefore: tx.balanceAfter - tx.amount,
        balanceAfter: tx.balanceAfter,
        // The database records `created_by` as a WorkOS id. Putting `user_01…`
        // in a column headed "By" is what src/lib/api/mappers/scheduling.ts
        // declines to do for the same reason, so this is absent until a name
        // can be resolved for it.
        performedBy: "",
        clientId: tx.clientRef ?? undefined,
        clientName,
        notes: tx.note ?? undefined,
        timestamp: tx.createdAt,
        // walletId, batchId, performedById and ipAddress are left out. Nothing
        // records them, and an empty string would render as a value.
      });
    }
  }

  return logs;
}
