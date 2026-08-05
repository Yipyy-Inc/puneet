"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// Putting something on a booking's bill, and taking it back off.
//
// A bag of food added at pickup used to live in a `useState<InvoiceLineItem[]>`
// on the booking page and was cleared at checkout. It is a row now
// (20260806820000), which is what makes `amount_due` — and therefore the
// balance, the client's debt and any bulk settle — include it.
//
// Nothing here computes a total. Adding the row IS the change to the bill.
// ============================================================================

export interface NewLineItem {
  /** 'item' is something sold, 'fee' is something charged. */
  kind?: "item" | "fee";
  name: string;
  unitPrice: number;
  quantity?: number;
  /** A retail product id, a module id — whatever it came from, if anything. */
  sourceId?: string;
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (response.status === 204) return undefined as T;
  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(parsed?.error ?? "Could not change that bill.");
  }
  return parsed as T;
}

/**
 * Everything a line item moves.
 *
 * `bookings` because `extras_total` and `amount_due` are derived from these
 * rows, and `clients` because a delivered booking's balance is part of what the
 * client owes.
 */
function useBillInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["clients"] });
  };
}

/**
 * Add lines to a booking's bill.
 *
 * Takes an ARRAY because a basket is scanned as a basket: four items arriving
 * as four requests can half-succeed, and a customer charged for two of the four
 * things in their bag is worse than an error.
 */
export function useAddLineItems() {
  const invalidate = useBillInvalidation();
  return useMutation({
    mutationFn: async (input: { bookingRef: number; items: NewLineItem[] }) =>
      json<{ items: { id: string; name: string; price: number }[] }>(
        `/api/bookings/${input.bookingRef}/line-items`,
        { method: "POST", body: JSON.stringify({ items: input.items }) },
      ),
    onSuccess: invalidate,
  });
}

/** Take one line back off — something added by mistake, before it is paid. */
export function useRemoveLineItem() {
  const invalidate = useBillInvalidation();
  return useMutation({
    mutationFn: async (input: { bookingRef: number; id: string }) =>
      json<void>(
        `/api/bookings/${input.bookingRef}/line-items?id=${encodeURIComponent(input.id)}`,
        { method: "DELETE" },
      ),
    onSuccess: invalidate,
  });
}
