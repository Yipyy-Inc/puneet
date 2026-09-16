"use client";

import { useQuery } from "@tanstack/react-query";

import type { GiftCardRow } from "@/lib/api/mappers/gift-card";
import type { GiftCardTransactionRow } from "@/lib/api/gift-card-ledger";

/** A card plus its movements — the route sends both, because the detail dialog
 *  shows a statement and an owner has a handful of cards, not thousands. */
export interface MyGiftCard extends GiftCardRow {
  transactions: GiftCardTransactionRow[];
}

// ============================================================================
// The owner's own gift cards, from `/api/customer/gift-cards`.
//
// The customer portal read `src/data/gift-cards` filtered by a hardcoded client
// 15 and a hardcoded facility 11, so "Cards I sent" listed Alice Johnson's
// cards to whoever was signed in. This is the real question, asked as the real
// person.
//
// Only cards they BOUGHT. Received cards have no honest source yet — see the
// route header.
// ============================================================================

export const customerGiftCardQueries = {
  mine: () => ({
    queryKey: ["customer", "gift-cards"] as const,
    queryFn: async (): Promise<MyGiftCard[]> => {
      const response = await fetch("/api/customer/gift-cards");
      // 401 is "not signed in", which the portal renders as its signed-out
      // state elsewhere; an empty list keeps this list from throwing inside it.
      if (response.status === 401) return [];
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          detail?.error ??
            `Could not load your gift cards (${response.status})`,
        );
      }
      const body = (await response.json()) as { cards: MyGiftCard[] };
      return body.cards;
    },
  }),
};

/** Cards this person bought, with `isPending` so a list can wait rather than
 *  render "none yet" over a request that has not answered. */
export function useMyGiftCards() {
  const { data, isPending, isError, error } = useQuery(
    customerGiftCardQueries.mine(),
  );
  return {
    cards: data ?? NO_CARDS,
    isPending,
    isError,
    error: error as Error | null,
  };
}

// A stable empty array: a fresh `[]` each render is what makes an effect that
// depends on it loop (check:query-default-loops).
const NO_CARDS: MyGiftCard[] = [];
