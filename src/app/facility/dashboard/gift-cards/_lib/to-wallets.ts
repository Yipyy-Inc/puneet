import type {
  StoreCreditEntry,
  StoreCreditPayload,
} from "@/lib/api/store-credit";
import type { CustomerWallet, WalletTransaction } from "@/types/payments";

// ============================================================================
// A customer's wallet, from the ledger their money is actually on.
//
// The Wallets tab read `customerWallets` from src/data. The page has carried a
// comment since 2026-08-23 saying what that was:
//
//   "It is `store_credit_entries` — the same ledger `record_payment` spends
//    from at checkout — and the fixture `customerWallets` was a duplicate of
//    it."
//
// The duplicate was believed and the original was not read. MEASURED: the tab
// showed 2 wallets holding $335.00 while this facility's ledger held 194
// entries and $7,830.00 across one account — and the Redeem to Credit modal on
// the SAME page, which already used `useStoreCredit()`, showed that customer
// with $7,515.00. One screen, two answers, twenty-two times apart.
//
// ── THERE IS NO WALLET ROW, AND THE ID SAYS SO ────────────────────────────
//
// Store credit is a LEDGER, not an account table: a balance is the sum of a
// client's entries. So there is no wallet id to carry through, and this makes
// one — `credit-<clientRef>` — because React keys, the expanded-history set and
// the adjust dialog all need something stable to hold onto.
//
// It is stable across reloads and unique per client, which is everything those
// callers need. It is NOT a database identifier and nothing should send it to
// one: the write path takes `clientRef`.
//
// ── BALANCE AFTER IS DERIVED, NOT STORED ──────────────────────────────────
//
// `store_credit_entries` records the movement and not the running total. Since
// the account balance IS the sum of its entries, walking them oldest-first
// gives the exact figure after each one rather than an estimate — the same
// arithmetic the balance itself comes from.
// ============================================================================

/**
 * What a ledger `reason` is, in the wallet vocabulary the tab renders.
 *
 * The real column holds three values today — `gift_card`, `added`,
 * `adjustment`. `added` and `adjustment` both land on "adjustment" because
 * that is what they are from the wallet's side: money put on or taken off by a
 * person. Which of the two it was is not lost — the raw reason goes into the
 * description, where a reader can see it.
 */
const TYPE_BY_REASON: Record<string, WalletTransaction["type"]> = {
  gift_card: "gift_card_redeem",
  added: "adjustment",
  adjustment: "adjustment",
};

/** Newest first, the order a history is read in. */
function byNewest(a: { createdAt: string }, b: { createdAt: string }): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function toWallets(
  payload: StoreCreditPayload | undefined,
  facilityId: number,
): CustomerWallet[] {
  if (!payload) return [];

  const byClient = new Map<number, StoreCreditEntry[]>();
  for (const entry of payload.entries) {
    const existing = byClient.get(entry.clientRef);
    if (existing) existing.push(entry);
    else byClient.set(entry.clientRef, [entry]);
  }

  return payload.accounts.map((account) => {
    const walletId = `credit-${account.clientRef}`;
    // Oldest first for the running total, then reversed for display. Doing it
    // in one pass in the other order would make every balanceAfter wrong.
    const oldestFirst = [...(byClient.get(account.clientRef) ?? [])].sort(
      (a, b) => -byNewest(a, b),
    );

    let running = 0;
    const transactions: WalletTransaction[] = oldestFirst.map((entry) => {
      running += entry.amount;
      return {
        id: entry.id,
        walletId,
        facilityId,
        clientId: account.clientRef,
        type: TYPE_BY_REASON[entry.reason] ?? "adjustment",
        amount: entry.amount,
        balanceAfter: running,
        // The note if somebody wrote one, else the reason itself — never an
        // invented sentence about what happened.
        description: entry.note?.trim() || entry.reason,
        performedBy: entry.authorName || undefined,
        createdAt: entry.createdAt,
      };
    });

    return {
      id: walletId,
      facilityId,
      clientId: account.clientRef,
      balance: account.balance,
      // The ledger does not store a currency per entry; the facility's cards
      // are CAD and the till is one merchant account. Stated here rather than
      // in three call sites guessing separately.
      currency: "CAD",
      // A ledger has no opening date of its own — the first entry is when this
      // customer's credit began, and the last is when it last moved.
      createdAt: oldestFirst[0]?.createdAt ?? account.lastActivityAt ?? "",
      updatedAt: account.lastActivityAt ?? oldestFirst.at(-1)?.createdAt ?? "",
      transactions: transactions.reverse(),
    };
  });
}
