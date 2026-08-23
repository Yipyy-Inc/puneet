import type { GiftCardWithLedger } from "@/lib/api/gift-cards";
import type { GiftCard, GiftCardTransaction } from "@/types/payments";

// ============================================================================
// A Postgres gift card, in the shape this screen already speaks.
//
// ── WHY A SHIM AND NOT A REWRITE ──────────────────────────────────────────
//
// The gift-cards screen is 2,099 lines and its five card components another
// ~3,900, all typed against `GiftCard` from `src/types/payments`. Retyping them
// in the same change that swaps the data source would make one diff that both
// moves the data and rewrites the UI, and a bug in it would be impossible to
// attribute to either.
//
// So the data moves first and the shape holds. This file is the whole seam, and
// it deletes in one piece when the components are retyped.
//
// ── TWO FIELDS DO NOT SURVIVE THE CROSSING ────────────────────────────────
//
// `facilityId` is a NUMBER on the legacy type and a uuid in Postgres. It is set
// to 0 rather than to 11, deliberately: 11 is the demo facility's legacy id, and
// stamping it here would make a Pawradise card claim to be a Doggieville one and
// pass every `=== FACILITY_ID` filter it met. Zero matches nothing, so any
// filter still standing on it empties loudly instead of lying quietly. The real
// scoping is done by the session — `/api/gift-cards` never sees a facility from
// the caller at all.
//
// `currency` narrows to the legacy enum. Postgres stores CAD by default and the
// fixture only ever knew USD; the schema below accepts both, so nothing is
// coerced. A currency this screen cannot render is a display problem to fix in
// the component, not a number to quietly change.
// ============================================================================

/** See the header — 0 means "ask the session", not "facility zero". */
export const NO_LEGACY_FACILITY_ID = 0;

function toLegacyTransaction(
  entry: GiftCardWithLedger["transactions"][number],
): GiftCardTransaction {
  // The legacy type knows three kinds and the ledger has four. `adjusted` is
  // signed, so it reads as a purchase when it puts money on and a redemption
  // when it takes money off — which is what it is.
  const type: GiftCardTransaction["type"] =
    entry.kind === "issued"
      ? "purchase"
      : entry.kind === "refunded"
        ? "refund"
        : entry.kind === "redeemed"
          ? "redemption"
          : entry.amount >= 0
            ? "purchase"
            : "redemption";

  return {
    id: entry.id,
    giftCardId: entry.giftCardId,
    type,
    // The legacy shape carries an UNSIGNED amount and infers direction from
    // `type`. The ledger's is signed, and that is the truer one — so the sign
    // is dropped here and only here.
    amount: Math.abs(entry.amount),
    balanceAfter: entry.balanceAfter,
    timestamp: entry.createdAt,
    notes: entry.note ?? undefined,
  };
}

export function toLegacyGiftCard(row: GiftCardWithLedger): GiftCard {
  return {
    id: row.id,
    facilityId: NO_LEGACY_FACILITY_ID,
    code: row.code,
    type: row.kind,
    initialAmount: row.initialAmount,
    currentBalance: row.balance,
    currency: row.currency === "USD" ? "USD" : "CAD",
    // `effectiveStatus`, not `status`. Nothing sweeps expired cards, so the
    // column still says active on one that is dead and the table would offer a
    // customer a card the till is about to refuse.
    status: row.effectiveStatus,
    purchasedBy: row.purchasedByName ?? undefined,
    purchasedByClientId: row.purchasedByClientRef ?? undefined,
    purchaseDate: row.issuedAt,
    recipientName: row.recipientName ?? undefined,
    recipientEmail: row.recipientEmail ?? undefined,
    message: row.message ?? undefined,
    expiryDate: row.expiresAt ?? undefined,
    neverExpires: row.expiresAt === null,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt ?? undefined,
    transactionHistory: row.transactions.map(toLegacyTransaction),
    updatedAt: row.updatedAt,
  };
}
