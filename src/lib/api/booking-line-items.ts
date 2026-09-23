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
  /**
   * The custom-fee rule that charged this line.
   *
   * `unique (booking_id, fee_id)` means a fee can land ONCE on a booking, so
   * this is what lets three separate passes — booking create, checkout, a
   * member of staff by hand — try without any of them double-charging.
   */
  feeId?: string;
  /**
   * Whether the facility tax applies to this line.
   *
   * Absent means TAXED — the column defaults to true and every extra was
   * taxed unconditionally until a service charge could say otherwise.
   */
  taxable?: boolean;
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
 *
 * ── `ifAbsent` IS FOR LINES THAT MAY ALREADY BE THERE ───────────────────
 *
 * A service charge is applied by more than one pass, so "add it unless this
 * booking already has it" is the ordinary case rather than an error. With
 * `ifAbsent`, the write upserts on `(booking_id, fee_id)` and skips what is
 * already there.
 *
 * **The answer then lists only the rows actually INSERTED** — a call that
 * skipped everything returns `items: []` and a 200. Never assert
 * `items.length === sent.length`. The manual picker deliberately leaves this
 * off, because there a duplicate IS a mistake worth showing.
 */
export function useAddLineItems() {
  const invalidate = useBillInvalidation();
  return useMutation({
    mutationFn: async (input: {
      bookingRef: number;
      items: NewLineItem[];
      ifAbsent?: boolean;
    }) =>
      json<{ items: { id: string; name: string; price: number }[] }>(
        `/api/bookings/${input.bookingRef}/line-items`,
        {
          method: "POST",
          body: JSON.stringify({
            items: input.items,
            ifAbsent: input.ifAbsent === true,
          }),
        },
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
