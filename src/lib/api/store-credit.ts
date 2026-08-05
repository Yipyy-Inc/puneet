"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// Store credit, which is the same thing as "prepaid credits".
//
// The memberships screen kept its own fixture list; the till spends
// `store_credit_entries`. This is the one ledger, read as a set of accounts
// (the balance is a SUM, not a column) and written one entry at a time.
// ============================================================================

export interface StoreCreditAccount {
  clientRef: number;
  clientName: string;
  balance: number;
  totalIssued: number;
  totalSpent: number;
  lastActivityAt: string | null;
  lastSpentAt: string | null;
  entryCount: number;
}

export interface StoreCreditEntry {
  id: string;
  clientRef: number;
  amount: number;
  reason: string;
  note: string;
  authorName: string;
  createdAt: string;
}

export interface StoreCreditPayload {
  accounts: StoreCreditAccount[];
  entries: StoreCreditEntry[];
}

const storeCreditKeys = {
  all: ["store-credit"] as const,
  ledger: () => ["store-credit", "ledger"] as const,
};

export function useStoreCredit() {
  return useQuery({
    queryKey: storeCreditKeys.ledger(),
    queryFn: async (): Promise<StoreCreditPayload> => {
      const response = await fetch("/api/store-credit");
      if (!response.ok) {
        const parsed = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(parsed?.error ?? `Request failed (${response.status})`);
      }
      return (await response.json()) as StoreCreditPayload;
    },
  });
}

/**
 * One entry on the ledger.
 *
 * `added` issues credit and needs `process_refund`; a negative `adjustment`
 * takes it back and needs `financial_take_payment`. Giving money away and
 * taking money in are different rights, and the policy says so rather than this
 * hook.
 *
 * There is no update and no delete, deliberately: the table has no policy for
 * either. A credit issued in error is corrected by an entry that says so, which
 * is what a ledger is for.
 */
export function useWriteStoreCredit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      clientRef: number;
      amount: number;
      note?: string;
      reason?: "added" | "adjustment";
    }) => {
      const response = await fetch("/api/store-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const parsed = (await response.json().catch(() => null)) as {
        id?: string;
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(parsed?.error ?? "Could not write that entry.");
      }
      return parsed?.id ?? "";
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: storeCreditKeys.all });
      // The client's balance shows on their record and at the till.
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
