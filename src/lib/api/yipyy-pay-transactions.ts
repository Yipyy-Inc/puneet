"use client";

import {
  keepPreviousData,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";

// ============================================================================
// Reading the takings from the screen's side.
//
// A factory rather than a fetch in a component, per CLAUDE.md: the query key
// carries every input, so changing the range or a filter refetches and two tabs
// asking the same question share one request.
//
// `placeholderData: keepPreviousData` is deliberate. Moving from "this week" to
// "this month" replaces every number on the screen, and without it the KPI row
// unmounts to skeletons and back on each press — which reads as breakage rather
// than loading. The stale numbers stay put, dimmed by `isFetching`, until the
// real ones arrive.
// ============================================================================

export interface TakingsBreakdown {
  service?: string;
  method?: string | null;
  channel?: string;
  day?: string;
  net: number;
  gross?: number;
  refunded?: number;
  sales: number;
}

/** Dollars, as the ledger stores them. Formatted at the edge, not here. */
export interface Takings {
  gross: number;
  refunded: number;
  net: number;
  tips: number;
  tax: number;
  sales: number;
  refunds: number;
  /** From `payment_intents` — a failed payment is never a `payments` row. */
  failed: number;
  cloverSales: number;
  cloverGross: number;
  timeZone: string;
  byService: TakingsBreakdown[];
  byDay: TakingsBreakdown[];
  byMethod: TakingsBreakdown[];
  byChannel: TakingsBreakdown[];
}

export interface Transaction {
  id: string;
  at: string;
  /** Cents, SIGNED. A refund is negative here and stays negative on screen. */
  amountCents: number;
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  method: string | null;
  kind: "sale" | "refund";
  processor: string | null;
  cloverPaymentId: string | null;
  cloverOrderId: string | null;
  deviceSerial: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  entryMethod: string | null;
  authCode: string | null;
  takenBy: string | null;
  channel: "in_person" | "online" | "other";
  bookingRef: number | null;
  service: string | null;
  clientName: string | null;
  petNames: string[];
}

export interface TransactionsPage {
  window: { from: string; to: string };
  transactions: Transaction[];
  total: number;
  offset: number;
  limit: number;
  takings: Takings | null;
}

export interface TransactionsQuery {
  from: string;
  to: string;
  offset?: number;
  limit?: number;
  kind?: "sales" | "refunds" | "clover" | null;
  method?: string | null;
  service?: string | null;
}

function toSearch(query: TransactionsQuery): string {
  const params = new URLSearchParams({ from: query.from, to: query.to });
  if (query.offset) params.set("offset", String(query.offset));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.kind) params.set("kind", query.kind);
  if (query.method) params.set("method", query.method);
  if (query.service) params.set("service", query.service);
  return params.toString();
}

export const transactionQueries = {
  page: (query: TransactionsQuery) => ({
    queryKey: ["yipyy-pay", "transactions", query] as const,
    queryFn: async (): Promise<TransactionsPage> => {
      const response = await fetch(
        `/api/payments/yipyy-pay/transactions?${toSearch(query)}`,
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Could not read the payments.");
      }
      return (await response.json()) as TransactionsPage;
    },
  }),
};

export function useTransactions(
  query: TransactionsQuery,
): UseQueryResult<TransactionsPage, Error> {
  return useQuery({
    ...transactionQueries.page(query),
    placeholderData: keepPreviousData,
  });
}
