"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { GiftCardRow } from "@/lib/api/mappers/gift-card";
import type { GiftCardDetailPayload } from "@/app/api/gift-cards/[id]/route";
import type { GiftCardTransactionRow } from "@/lib/api/gift-card-ledger";
import type { RedeemResult } from "@/app/api/gift-cards/redeem/route";
import type { AdjustResult } from "@/app/api/gift-cards/[id]/adjust/route";
import type { ToCreditResult } from "@/app/api/gift-cards/to-credit/route";

// ============================================================================
// Gift cards, from the browser.
//
// ── SEPARATE FROM `src/data/gift-cards.ts`, ON PURPOSE ────────────────────
//
// That file is the fixture — cards, wallets, physical batches, audit logs and
// programme settings, all hand-written. This one reads Postgres, and only the
// part of it that exists: cards and their ledger. Wallets, batches and the
// settings panel are still fixtures and are NOT quietly served from here, so a
// screen cannot import this believing it got all of them.
//
// ── THERE IS NO `setBalance`, AND THERE CANNOT BE ─────────────────────────
//
// `gift_cards.balance` is trigger-maintained from `gift_card_transactions` and
// a second trigger refuses a hand-written change, so a mutation for it could
// only ever return an error. Money moves through `useIssueGiftCard` and
// `useRedeemGiftCard`, each of which is one transaction in the database.
// ============================================================================

export type { GiftCardRow, GiftCardTransactionRow, GiftCardDetailPayload };

/** A card with its movements, as `allWithLedger` returns it. */
export interface GiftCardWithLedger extends GiftCardRow {
  transactions: GiftCardTransactionRow[];
}

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

async function send<T>(
  url: string,
  body: unknown,
  method: "POST" | "PATCH" = "POST",
): Promise<T> {
  const response = await fetch(url, {
    method,
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

export const giftCardQueries = {
  /** Every card this facility has issued, newest first. */
  all: () => ({
    queryKey: ["gift-cards", "list"] as const,
    queryFn: async () =>
      (await get<{ cards: GiftCardRow[] }>("/api/gift-cards")).cards,
  }),

  /**
   * Every card WITH its movements attached.
   *
   * What the gift-cards screen reads: it shows a card's history inline and its
   * reports tab sums across all of them, so fetching the ledger per card would
   * be one request per row. Two queries for the whole facility instead.
   */
  allWithLedger: () => ({
    queryKey: ["gift-cards", "list", "with-ledger"] as const,
    queryFn: async () =>
      (
        await get<{ cards: GiftCardWithLedger[] }>(
          "/api/gift-cards?withLedger=1",
        )
      ).cards,
  }),

  /**
   * One card and its whole ledger, in a single request.
   *
   * Together rather than separately because the balance and the history that
   * explains it must not be able to disagree on screen — which is exactly what
   * the fixture allowed, storing both and maintaining them apart.
   */
  detail: (id: string | undefined) => ({
    queryKey: ["gift-cards", "detail", id] as const,
    enabled: Boolean(id),
    queryFn: async () =>
      await get<GiftCardDetailPayload>(
        `/api/gift-cards/${encodeURIComponent(id ?? "")}`,
      ),
  }),

  /**
   * Look a card up by the code on it — the counter's "check balance".
   *
   * Returns `null` for a code this facility does not have, and that is the same
   * answer a code belonging to ANOTHER facility gets. Deliberate: a gift card
   * code is a bearer instrument, so an answer that separates "real, but not
   * yours" from "not real" is a way to search for real ones.
   */
  byCode: (code: string | undefined) => ({
    queryKey: ["gift-cards", "by-code", code] as const,
    enabled: Boolean(code?.trim()),
    queryFn: async (): Promise<GiftCardRow | null> => {
      const { cards } = await get<{ cards: GiftCardRow[] }>(
        `/api/gift-cards?code=${encodeURIComponent(code?.trim() ?? "")}`,
      );
      return cards[0] ?? null;
    },
  }),
};

function invalidateGiftCards(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ["gift-cards"] });
}

export interface IssueGiftCardInput {
  amount: number;
  kind?: "online" | "physical";
  /** A pre-printed batch number. Left out, the database generates one. */
  code?: string;
  recipientName?: string;
  recipientEmail?: string;
  message?: string;
  expiresAt?: string;
  purchasedByClientRef?: number;
}

/**
 * Sell a card.
 *
 * The card and its opening balance are created in ONE transaction, so there is
 * no state in which a card exists worth nothing. The code is generated in the
 * database when none is supplied — two tills cannot mint the same one.
 */
export function useIssueGiftCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: IssueGiftCardInput) =>
      (await send<{ card: GiftCardRow }>("/api/gift-cards", input)).card,
    onSuccess: () => invalidateGiftCards(queryClient),
  });
}

/**
 * Take money off a card.
 *
 * REJECTS when the card is unknown, cancelled, expired, or does not hold
 * enough — and that rejection is the point: the caller must not go on to treat
 * the bill as part-paid by a card that paid nothing. What this replaces spliced
 * an in-memory array and could not fail.
 */
export function useRedeemGiftCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      code: string;
      amount: number;
      bookingRef?: number;
      note?: string;
    }) => await send<RedeemResult>("/api/gift-cards/redeem", input),
    onSuccess: () => invalidateGiftCards(queryClient),
  });
}

/**
 * Hand the card in: its value moves onto the customer's account credit.
 *
 * The destination is `store_credit_entries` — the same ledger `record_payment`
 * spends from at checkout, so this is money the customer can actually use, not
 * a number parked somewhere. Both ledgers move in ONE database transaction, so
 * there is no state where the card is spent and nothing was credited.
 *
 * Needs `financial_manage_gift_cards`, NOT `process_refund`: this is a transfer
 * between two liabilities rather than a grant, and reception — who works the
 * counter — holds the first and not the second.
 */
export function useRedeemGiftCardToCredit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      code: string;
      amount: number;
      clientRef: number;
      note?: string;
    }) => await send<ToCreditResult>("/api/gift-cards/to-credit", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["store-credit"] });
      return invalidateGiftCards(queryClient);
    },
  });
}

/**
 * Correct a balance by appending to the ledger.
 *
 * `amount` is SIGNED: positive puts money back on, negative takes it off. A
 * reason is required — an adjustment is the one entry with no document behind
 * it, so the sentence explaining it is the only audit there will be.
 *
 * Separate from `useUpdateGiftCard` on purpose. That one edits a card and
 * touches no money; this one moves it, and the two must not share a form.
 */
export function useAdjustGiftCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; amount: number; reason: string }) =>
      await send<AdjustResult>(
        `/api/gift-cards/${encodeURIComponent(input.id)}/adjust`,
        { amount: input.amount, reason: input.reason },
      ),
    onSuccess: () => invalidateGiftCards(queryClient),
  });
}

/**
 * Edit the parts of a card that are not money — recipient, message, expiry,
 * and cancelling it.
 *
 * There is no `balance` here. Putting value back on a card is a `refunded`
 * ledger entry, not a field.
 */
export function useUpdateGiftCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: string;
      recipientName?: string | null;
      recipientEmail?: string | null;
      message?: string | null;
      expiresAt?: string | null;
      status?: "active" | "cancelled";
    }) =>
      (
        await send<{ card: GiftCardRow }>(
          `/api/gift-cards/${encodeURIComponent(id)}`,
          patch,
          "PATCH",
        )
      ).card,
    onSuccess: () => invalidateGiftCards(queryClient),
  });
}
