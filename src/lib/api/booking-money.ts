"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { bookingMutations } from "./booking";

// ============================================================================
// Taking money on a booking, and giving it back.
//
// Three screens mounted `ProcessPaymentModal` and none of them took a payment:
// two closed the dialog and called `toast.success`, the third moved a string in
// React state. Nothing reached the server on any of them.
//
// Two of those three could not even open the dialog. The list page never called
// its own `setProcessingPayment`, so its mount is gone. The other,
// `/facility/dashboard/bookings/[id]`, redirects to the client-nested route on
// mount and is left alone — it has 1197 lines of unreachable UI behind that
// redirect, and removing two dialogs while leaving the three buttons that open
// them would be worse than either doing all of it or none.
//
// The client-nested booking page is the surface, and it calls these.
//
// ── THE AMOUNT IS THE BALANCE, NOT THE PRICE ───────────────────────────────
//
// What is owed is `totalCost - amountPaid`, and `amountPaid` only started
// existing in 20260806680000. Before it there was no way to charge the balance,
// so the modals charged the full price — which is right exactly once and wrong
// on every part-paid booking.
//
// ── NOTHING HERE SETS paymentStatus ────────────────────────────────────────
//
// It is derived from the ledger. These functions record money; the booking
// moves itself. A mutation that also PATCHed the status would be a second
// answer to the same question, and the query cache would hold whichever
// arrived last.
// ============================================================================

/** `payments.method` — what the modals offer, in the ledger's vocabulary. */
const TENDER = {
  card: "new-card",
  cash: "cash",
  store_credit: "store-credit",
} as const;

interface PaymentRow {
  bookingRef: string;
  method: string;
  subtotal: number;
  tax: number;
  tip: number;
  storeCreditApplied: number;
  packagePassApplied: number;
  loyaltyDiscountApplied: number;
  amountCharged: number;
  grandTotal: number;
  cashReceived?: number;
  receiptChannels: string[];
  creditNote: string;
}

/**
 * The row `POST /api/payments` expects, with the arithmetic done once.
 *
 * `subtotal` is signed: negative is a refund. The database re-checks every
 * relationship here (`grand_total = subtotal + tax + tip`, and the charged
 * amount being the remainder), so a mistake in this function is a 4xx rather
 * than a wrong number in the books.
 */
function paymentRow(input: {
  bookingId: number;
  method: keyof typeof TENDER;
  subtotal: number;
  tip?: number;
  note?: string;
}): PaymentRow {
  const tip = input.tip ?? 0;
  const grandTotal = input.subtotal + tip;
  return {
    bookingRef: String(input.bookingId),
    method: TENDER[input.method],
    subtotal: input.subtotal,
    tax: 0,
    tip,
    storeCreditApplied: 0,
    packagePassApplied: 0,
    loyaltyDiscountApplied: 0,
    amountCharged: grandTotal,
    grandTotal,
    // Only cash carries a tender, and the CHECK refuses it on anything else.
    ...(input.method === "cash" ? { cashReceived: grandTotal } : {}),
    receiptChannels: [],
    creditNote: input.note ?? "",
  };
}

async function postPayment(row: PaymentRow): Promise<void> {
  const response = await fetch("/api/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(row),
  });
  if (!response.ok) {
    const parsed = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(parsed?.error ?? "Could not record that payment.");
  }
}

/**
 * Everything a payment can move.
 *
 * `bookings` because the status and `amountPaid` are derived from the ledger,
 * `store-credit` because a refund to credit writes a ledger entry in the same
 * transaction, and `clients` because an outstanding balance is shown there.
 */
function useSettleInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["store-credit"] });
    void queryClient.invalidateQueries({ queryKey: ["clients"] });
  };
}

/**
 * `RefundModal` offers "original / store_credit / cash"; the ledger's column
 * takes 'new-card' / 'store-credit' / 'cash'. Mapped here rather than at each
 * call site, so a third spelling has one place to be reconciled.
 */
export function refundTender(method: string): "card" | "store_credit" | "cash" {
  if (method === "store_credit") return "store_credit";
  if (method === "cash") return "cash";
  // "original", "card", and anything else: back where it came from.
  return "card";
}

/** What is still owed on a booking. Never negative: an overpayment is not a debt. */
export function balanceOf(booking: {
  totalCost: number;
  amountPaid?: number;
}): number {
  return Math.max(0, booking.totalCost - (booking.amountPaid ?? 0));
}

/** The statuses `clients.outstanding_balance` counts — see Decision 1 in 20260806780000. */
const DELIVERED = new Set(["ready", "completed"]);

/**
 * Booked, not yet delivered, and not yet paid.
 *
 * The counterpart to `client.outstandingBalance`, which deliberately covers
 * only DELIVERED bookings. This is the other conversation — "you have $400 of
 * boarding coming up" is not a debt, and adding the two together produces a
 * number that is true of neither.
 *
 * Not a stored column: a screen showing it already has the booking list, and a
 * second derived figure on `clients` would be a second thing to keep right.
 */
export function upcomingUnpaid(
  bookings: { status: string; totalCost: number; amountPaid?: number }[],
): number {
  return bookings
    .filter(
      (b) =>
        !DELIVERED.has(b.status) &&
        b.status !== "cancelled" &&
        b.status !== "declined" &&
        b.status !== "no_show",
    )
    .reduce((sum, b) => sum + balanceOf(b), 0);
}

/**
 * Take a payment for a booking's outstanding balance.
 *
 * The caller passes the booking, not an amount — the amount is the balance,
 * and letting a screen decide it is how three screens end up charging three
 * different numbers.
 */
export function useTakeBookingPayment() {
  const invalidate = useSettleInvalidation();
  return useMutation({
    mutationFn: async (input: {
      booking: { id: number; totalCost: number; amountPaid?: number };
      method: "cash" | "card";
      tipAmount?: number;
    }) => {
      const balance = balanceOf(input.booking);
      if (balance <= 0) {
        throw new Error("This booking has already been paid in full.");
      }
      await postPayment(
        paymentRow({
          bookingId: input.booking.id,
          method: input.method,
          subtotal: balance,
          tip: input.tipAmount,
        }),
      );
      return balance;
    },
    onSuccess: invalidate,
  });
}

/**
 * Give money back — to the card it came from, or to store credit.
 *
 * Store credit is not a second write from here: `record_payment` writes the
 * ledger entry in the same transaction as the negative payment
 * (20260806760000), because a refund recorded without the credit it promised is
 * money that left the books and reached nobody.
 */
export function useRefundBooking() {
  const invalidate = useSettleInvalidation();
  return useMutation({
    mutationFn: async (input: {
      bookingId: number;
      amount: number;
      /** `RefundModal` says "original"; the ledger calls that a card. */
      method: "card" | "store_credit" | "cash";
      reason: string;
    }) => {
      if (input.amount <= 0) {
        throw new Error("A refund needs an amount.");
      }
      await postPayment(
        paymentRow({
          bookingId: input.bookingId,
          method: input.method,
          subtotal: -input.amount,
          note: input.reason,
        }),
      );
      return input.amount;
    },
    onSuccess: invalidate,
  });
}

/** What `settle_bookings` actually took, per booking. */
export interface SettledBooking {
  bookingRef: number;
  amount: number;
}

/**
 * Settle several bookings in one transaction.
 *
 * NO AMOUNTS ARE SENT. The database reads each balance and returns what it
 * took, so a dialog left open while somebody else took a payment cannot
 * overcharge — and the receipt is printed from the RESULT rather than from the
 * figures the dialog was showing.
 *
 * Bookings that owed nothing come back absent, not zero. The caller compares
 * what it asked for against what happened.
 */
export function useSettleBookings() {
  const invalidate = useSettleInvalidation();
  return useMutation({
    mutationFn: async (input: {
      bookingRefs: number[];
      method: string;
    }): Promise<SettledBooking[]> => {
      const response = await fetch("/api/payments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const parsed = (await response.json().catch(() => null)) as {
        settled?: SettledBooking[];
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(parsed?.error ?? "Could not record those payments.");
      }
      return (parsed?.settled ?? []).map((s) => ({
        bookingRef: s.bookingRef,
        amount: Number(s.amount),
      }));
    },
    onSuccess: invalidate,
  });
}

/**
 * Cancel a booking, refunding first when there is money to return.
 *
 * ORDER IS DELIBERATE. Refund, then cancel:
 *
 *   refund lands, cancel fails  → the money is right and the status is stale.
 *                                 Visible, and fixed by cancelling again.
 *   cancel lands, refund fails  → a cancelled booking whose money was never
 *                                 returned, and nothing on screen says so.
 *
 * Two HTTP calls rather than an RPC because only the first moves money, and
 * the recoverable failure is the one that can happen.
 */
export function useCancelBooking() {
  const invalidate = useSettleInvalidation();
  return useMutation({
    mutationFn: async (input: {
      bookingId: number;
      reason: string;
      refund?: { amount: number; method: "card" | "store_credit" };
    }) => {
      if (input.refund && input.refund.amount > 0) {
        await postPayment(
          paymentRow({
            bookingId: input.bookingId,
            method: input.refund.method,
            subtotal: -input.refund.amount,
            note: input.reason,
          }),
        );
      }
      await bookingMutations.update(input.bookingId, {
        status: "cancelled",
        // The reason is the booking's, not the payment's — a cancellation with
        // no refund still has one.
        cancellationReason: input.reason,
      });
      return input.refund?.amount ?? 0;
    },
    onSuccess: invalidate,
  });
}
