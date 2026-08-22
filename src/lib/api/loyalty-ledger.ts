"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { BadgeAwardsPayload } from "@/app/api/loyalty/badges/route";
import type { LoyaltyAccountRow } from "@/app/api/loyalty/accounts/route";
import type { LoyaltyTransactionRow } from "@/app/api/loyalty/transactions/route";
import type { LoyaltyVoucherRow } from "@/app/api/loyalty/vouchers/route";
import type { EarnResult } from "@/app/api/loyalty/earn/route";
import type { CustomerLoyaltyPayload } from "@/app/api/customer/loyalty/route";

// ============================================================================
// The loyalty ledger, from the browser.
//
// ── SEPARATE FROM `lib/api/loyalty.ts`, ON PURPOSE ────────────────────────
//
// That file is the fixture layer: twenty-odd query factories reading
// `src/data/loyalty-*`. This one reads Postgres. Adding real queries beside
// mock ones in the same module is how a screen ends up importing one believing
// it got the other — the single most expensive mistake available in this
// codebase, and the reason CLAUDE.md opens by telling you to check which half
// you are in.
//
// The fixture file keeps its name and its callers until each screen is
// converted. When the last one moves, it goes.
//
// ── NO BALANCE MUTATION EXISTS HERE, AND NONE CAN ─────────────────────────
//
// Points move by POSTING TO THE LEDGER. There is no `setBalance`, because the
// column is trigger-maintained and a second trigger refuses a hand-written
// change — a mutation for it could only ever return an error.
// ============================================================================

export type {
  LoyaltyAccountRow,
  LoyaltyTransactionRow,
  LoyaltyVoucherRow,
  EarnResult,
  CustomerLoyaltyPayload,
};

async function get<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(detail?.error ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

async function send<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return parsed as T;
}

export const loyaltyLedgerQueries = {
  /** Every account at the facility, richest balance first. */
  accounts: () => ({
    queryKey: ["loyalty-ledger", "accounts"] as const,
    queryFn: async () =>
      (await get<{ accounts: LoyaltyAccountRow[] }>("/api/loyalty/accounts"))
        .accounts,
  }),

  /**
   * One client's account, or `null` when they have none.
   *
   * Null is a real answer — a customer who has never been enrolled — and is
   * deliberately not conflated with a request that failed.
   */
  accountForClient: (clientRef: number | undefined) => ({
    queryKey: ["loyalty-ledger", "accounts", clientRef] as const,
    enabled: clientRef !== undefined,
    queryFn: async (): Promise<LoyaltyAccountRow | null> => {
      const { accounts } = await get<{ accounts: LoyaltyAccountRow[] }>(
        `/api/loyalty/accounts?clientRef=${clientRef ?? ""}`,
      );
      return accounts[0] ?? null;
    },
  }),

  /**
   * Every badge earned at this facility, plus the earners' payment history.
   *
   * Both halves in one request because the report needs them together — a badge
   * with no spend around it answers neither of the two questions it asks.
   */
  badgeAwards: () => ({
    queryKey: ["loyalty-ledger", "badge-awards"] as const,
    queryFn: async () => await get<BadgeAwardsPayload>("/api/loyalty/badges"),
  }),

  transactions: (accountId: string | undefined) => ({
    queryKey: ["loyalty-ledger", "transactions", accountId] as const,
    enabled: Boolean(accountId),
    queryFn: async () =>
      (
        await get<{ transactions: LoyaltyTransactionRow[] }>(
          `/api/loyalty/transactions?account=${encodeURIComponent(accountId ?? "")}`,
        )
      ).transactions,
  }),

  /**
   * Rewards a customer can still spend.
   *
   * `spendable=1` is resolved on the SERVER — active, and not past expiry
   * against the database's clock. Filtering expiry in the browser would make
   * whether a discount still applies a question about the till's clock.
   */
  spendableVouchers: (accountId: string | undefined) => ({
    queryKey: ["loyalty-ledger", "vouchers", accountId, "spendable"] as const,
    enabled: Boolean(accountId),
    queryFn: async () =>
      (
        await get<{ vouchers: LoyaltyVoucherRow[] }>(
          `/api/loyalty/vouchers?spendable=1&account=${encodeURIComponent(accountId ?? "")}`,
        )
      ).vouchers,
  }),

  vouchers: (accountId: string | undefined) => ({
    queryKey: ["loyalty-ledger", "vouchers", accountId] as const,
    enabled: Boolean(accountId),
    queryFn: async () =>
      (
        await get<{ vouchers: LoyaltyVoucherRow[] }>(
          `/api/loyalty/vouchers?account=${encodeURIComponent(accountId ?? "")}`,
        )
      ).vouchers,
  }),
};

/** Everything the ledger touches, after anything that moves points. */
function invalidateLedger(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ["loyalty-ledger"] });
}

export function useOpenLoyaltyAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { clientRef: number; referralCode?: string }) =>
      (
        await send<{ account: LoyaltyAccountRow; created: boolean }>(
          "/api/loyalty/accounts",
          input,
        )
      ).account,
    onSuccess: () => invalidateLedger(queryClient),
  });
}

/**
 * Post a ledger entry — the only way points move.
 *
 * `points` is SIGNED. A manual award is positive, a correction negative, and an
 * account that cannot afford the negative one is refused by the database with a
 * sentence naming the balance.
 */
export function usePostLoyaltyTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      accountId: string;
      points: number;
      description: string;
      kind?: LoyaltyTransactionRow["kind"];
      source?: LoyaltyTransactionRow["source"];
      bookingId?: string;
      reason?: string;
    }) =>
      (
        await send<{ transaction: LoyaltyTransactionRow }>(
          "/api/loyalty/transactions",
          input,
        )
      ).transaction,
    onSuccess: () => invalidateLedger(queryClient),
  });
}

/** Spend points on a reward. The ledger entry and the voucher move together. */
export function useRedeemLoyaltyPoints() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      accountId: string;
      rewardType: LoyaltyVoucherRow["rewardType"];
      rewardValue: number;
      points: number;
      expiresAt?: string;
      appliesToServices?: string[];
      description?: string;
    }) =>
      (
        await send<{ voucher: LoyaltyVoucherRow }>(
          "/api/loyalty/vouchers",
          input,
        )
      ).voucher,
    onSuccess: () => invalidateLedger(queryClient),
  });
}

/**
 * Spend a voucher, exactly once.
 *
 * REJECTS with 409 when the reward has already been used or has expired, and
 * that rejection is the point: the caller must not go on to charge a discounted
 * total for a discount it did not get. What this replaces spliced an in-memory
 * array and could not fail.
 */
export function useConsumeLoyaltyVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { voucherId: string; bookingRef?: number }) =>
      (
        await send<{ voucher: { id: string; status: string; usedAt: string } }>(
          `/api/loyalty/vouchers/${encodeURIComponent(input.voucherId)}/consume`,
          { bookingRef: input.bookingRef },
        )
      ).voucher,
    onSuccess: () => invalidateLedger(queryClient),
  });
}

/**
 * Give a voucher back after a charge that did not happen.
 *
 * Checkout spends the reward BEFORE it charges, which is the right order: the
 * alternative is taking money off a bill for a reward that turns out to be
 * gone. The cost of that order is this window — the charge fails and the
 * voucher is already spent — and this closes it.
 *
 * Only undoes a `used`. An expired or cancelled voucher stays where it is.
 */
export function useReleaseLoyaltyVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { voucherId: string }) =>
      (
        await send<{ voucher: { id: string; status: string } }>(
          `/api/loyalty/vouchers/${encodeURIComponent(input.voucherId)}/release`,
          {},
        )
      ).voucher,
    onSuccess: () => invalidateLedger(queryClient),
  });
}

/**
 * Award a completed booking its points.
 *
 * Everything the award is computed from — the booking, the rules, the visit
 * count — is read on the SERVER. The browser sends a reference and gets back
 * what was awarded and why.
 *
 * Safe to call twice: a booking that has already earned comes back
 * `alreadyEarned`, refused by a unique index rather than by a check the second
 * caller could race past.
 */
export function useEarnLoyaltyPoints() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bookingRef: number }) =>
      await send<EarnResult>("/api/loyalty/earn", input),
    onSuccess: () => invalidateLedger(queryClient),
  });
}

/**
 * A CUSTOMER's own loyalty standing — balance, tier, history, rewards, and the
 * shape of the programme they are in.
 *
 * A different route from the facility one on purpose. `/api/loyalty/accounts`
 * resolves the facility from the caller's MEMBERSHIP and falls back to the demo
 * facility for a caller with none — which every customer is. This one resolves
 * through their client row, so a pet owner sees their own business or nothing.
 */
export const customerLoyaltyQueries = {
  mine: () => ({
    queryKey: ["customer", "loyalty"] as const,
    queryFn: async () =>
      await get<CustomerLoyaltyPayload>("/api/customer/loyalty"),
  }),
};
