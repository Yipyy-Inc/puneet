"use client";

import { useQuery } from "@tanstack/react-query";

// ============================================================================
// The owner's own store credit, from `/api/customer/store-credit`.
//
// /customer/wallet is in the customer sidebar and rendered `customerWallets`
// at a hardcoded `MOCK_CLIENT_ID = 15`, so every signed-in owner was shown one
// fixture client's balance and history as their own. The hardcoding went first;
// this is the real answer.
// ============================================================================

/** One facility's running balance for this person. */
export interface StoreCreditAccount {
  facilityId: string;
  facilityName: string;
  /** The SUM of the ledger, not a stored column — see the migration. */
  balance: number;
  /** Over EVERY entry, not the window below — a total summed from a page of
   *  movements is understated and says nothing about being partial. */
  totalIn: number;
  totalOut: number;
  entryCount: number;
  lastActivityAt: string;
}

/**
 * One movement. SIGNED: positive put money on, negative took it off.
 *
 * No `note` and no `authorName`. Those are staff writing about a customer to
 * other staff, and the projection withholds them deliberately.
 */
export interface StoreCreditEntry {
  id: string;
  facilityId: string;
  amount: number;
  /** added | redeemed | refund | gift_card | adjustment. */
  reason: string;
  createdAt: string;
}

const NO_ACCOUNTS: StoreCreditAccount[] = [];
const NO_ENTRIES: StoreCreditEntry[] = [];

interface StoreCreditPayload {
  accounts: StoreCreditAccount[];
  entries: StoreCreditEntry[];
}

export const customerStoreCreditQueries = {
  mine: () => ({
    queryKey: ["customer", "store-credit"] as const,
    queryFn: async (): Promise<StoreCreditPayload> => {
      const response = await fetch("/api/customer/store-credit");
      if (response.status === 401) {
        return { accounts: NO_ACCOUNTS, entries: NO_ENTRIES };
      }
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          detail?.error ?? `Could not load your wallet (${response.status})`,
        );
      }
      return (await response.json()) as StoreCreditPayload;
    },
  }),
};

/**
 * This person's credit, with `isPending` so the wallet can wait rather than
 * render its "no wallet yet" empty state over a request that has not answered.
 */
export function useMyStoreCredit() {
  const { data, isPending, isError, error } = useQuery(
    customerStoreCreditQueries.mine(),
  );
  return {
    accounts: data?.accounts ?? NO_ACCOUNTS,
    entries: data?.entries ?? NO_ENTRIES,
    isPending,
    isError,
    error: error as Error | null,
  };
}
