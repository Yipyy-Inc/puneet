"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// The payments waiting to be placed.
//
// Its own query key rather than a slice of the Yipyy Pay overview: the overview
// is a dashboard that reloads on focus, and this is a work queue whose contents
// change when somebody acts on it. Sharing a key would mean an attach silently
// refetching the payouts and the activity feed as well.
// ============================================================================

export interface UnattachedPayment {
  id: string;
  processorPaymentId: string;
  processorOrderId: string | null;
  deviceSerial: string | null;
  amountCents: number;
  tipCents: number;
  taxCents: number;
  currency: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  entryMethod: string | null;
  takenAt: string | null;
  discoveredAt: string;
}

export interface UnattachedResult {
  /** Whether this person may turn one into a ledger row, or only look. */
  canAttach: boolean;
  payments: UnattachedPayment[];
}

export interface SweepOutcome {
  examined: number;
  reversed: number;
  recovered: number;
  unattached: number;
  drained: number;
  problem: string | null;
}

const KEY = ["clover", "unattached"] as const;

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) throw new Error(body?.error ?? fallback);
  return body as T;
}

export function useUnattachedPayments() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<UnattachedResult> => {
      const response = await fetch("/api/payments/clover/unattached");
      return readJson<UnattachedResult>(
        response,
        "The unmatched payments could not be loaded.",
      );
    },
  });
}

export function useAttachPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      bookingRef?: number;
      clientId?: string;
      note?: string;
    }) => {
      const response = await fetch("/api/payments/clover/unattached", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "attach", ...input }),
      });
      return readJson<{ paymentId: string }>(
        response,
        "That payment could not be attached.",
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      // The booking's balance has moved, so the dashboard's activity and payout
      // figures are now stale. This is the one place the two queues genuinely
      // do depend on each other.
      void queryClient.invalidateQueries({ queryKey: ["yipyy-pay"] });
    },
  });
}

export function useDismissPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; note: string }) => {
      const response = await fetch("/api/payments/clover/unattached", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss", ...input }),
      });
      return readJson<{ dismissed: true }>(
        response,
        "That payment could not be set aside.",
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useReconcileNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<SweepOutcome> => {
      const response = await fetch("/api/payments/clover/reconcile", {
        method: "POST",
      });
      return readJson<SweepOutcome>(
        response,
        "The reconciliation could not be run.",
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      void queryClient.invalidateQueries({ queryKey: ["yipyy-pay"] });
    },
  });
}
