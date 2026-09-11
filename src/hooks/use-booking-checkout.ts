"use client";

import { toast } from "sonner";

import type {
  CheckoutPayment,
  CheckoutResult,
} from "@/components/bookings/PaymentCheckoutFlow";
import {
  balanceOf,
  checkoutTender,
  useChargeBooking,
  useChargeSavedCard,
  usePayWithGiftCard,
} from "@/lib/api/booking-money";
import { useAddLineItems } from "@/lib/api/booking-line-items";
import { useUpdateBookingStatus } from "@/lib/api/booking-status";
import { useEarnLoyaltyPoints } from "@/lib/api/loyalty-ledger";
import { useStoreCredit, useWriteStoreCredit } from "@/lib/api/store-credit";
import { useChargeOnTerminal } from "@/lib/api/terminals";
import { planSplit, type PlannedPart } from "@/lib/checkout/plan-split";
import type { LateFeeResult } from "@/lib/late-pickup-fee";
import type { Booking } from "@/types/booking";

// ============================================================================
// Taking the money on the booking page.
//
// ── IT WAITS, AND IT FAILS OUT LOUD ──────────────────────────────────────
//
// This lived inline in page.tsx as `void (async () => { … })()`: the handler
// returned before anything was charged, so the dialog said "Payment Complete —
// $X charged successfully" while the payment was still in flight — and said
// it just the same when the payment was refused. A refused membership line or
// a spent reward `return`ed quietly: nothing charged, "Payment Complete".
//
// Everything is awaited now, and every failure THROWS: the dialog keeps itself
// open with the reason on screen, and "Payment complete" is said only by a
// handler that has finished. It returns what was really taken.
//
// ── THE BILL MOVES BEFORE THE MONEY, FOR EVERY TENDER ─────────────────────
//
// The late fee, the loyalty reward and the member discount become lines on
// the bill first — the terminal and card routes charge from `amount_due` on
// the server, so a figure that is not a line yet is not part of the charge.
// The terminal path used to spend the reward and clear the late fee without
// writing either, so the customer was charged full price and the fee vanished.
//
// ── SUPPLY, TAX AND TIP ───────────────────────────────────────────────────
//
// Recorded apart (see lib/api/booking-money paymentRow). Store credit that does
// not cover the bill pays its share of each and says what is still owed; a
// split records each part (lib/checkout/plan-split).
// ============================================================================

interface Discount {
  label: string;
  amount: number;
}

export function useBookingCheckout(input: {
  booking: (Booking & { rowId?: string }) | undefined;
  clientRef: number;
  lateFee: LateFeeResult | null;
  clearLateFee: () => void;
  loyaltyDiscount: Discount | null | undefined;
  consumeLoyaltyDiscount: (bookingRef: number) => Promise<unknown>;
  releaseLoyaltyDiscount: () => Promise<unknown>;
  membershipDiscount: Discount | null | undefined;
  /**
   * Check a checked-in booking out once the bill is settled. The dashboard card
   * says no: it checks the booking out through its own board status flow.
   */
  completeOnSettle?: boolean;
  text: {
    discountRefused: string;
    giftCardNoTip: string;
    giftCardRemaining: (amount: number) => string;
  };
}): (payment: CheckoutPayment) => Promise<CheckoutResult> {
  const addLineItems = useAddLineItems();
  const chargeBooking = useChargeBooking();
  const chargeOnTerminal = useChargeOnTerminal();
  const chargeSavedCard = useChargeSavedCard();
  const payWithGiftCard = usePayWithGiftCard();
  const writeStoreCredit = useWriteStoreCredit();
  const updateStatus = useUpdateBookingStatus();
  const earnPoints = useEarnLoyaltyPoints();
  const { data: storeCredit } = useStoreCredit();
  const storeCreditBalance =
    storeCredit?.accounts.find((a) => a.clientRef === input.clientRef)
      ?.balance ?? 0;

  return async (payment) => {
    const booking = input.booking;
    if (!booking) throw new Error("The booking is still loading.");
    const lateFee = input.lateFee;
    const reward = input.loyaltyDiscount ?? null;
    const memberOff = input.membershipDiscount ?? null;

    // ── 1. The member discount: a standing entitlement, written first ─────
    if (memberOff && memberOff.amount > 0) {
      try {
        await addLineItems.mutateAsync({
          bookingRef: booking.id,
          items: [
            {
              kind: "item",
              name: memberOff.label,
              unitPrice: -memberOff.amount,
              quantity: 1,
            },
          ],
        });
      } catch (error) {
        throw new Error(
          `${input.text.discountRefused} ${error instanceof Error ? error.message : ""}`.trim(),
        );
      }
    }

    // ── 2. The reward is spent before the money moves ────────────────────
    // A voucher another till already took stops this checkout instead of
    // discounting it anyway.
    if (reward) {
      try {
        await input.consumeLoyaltyDiscount(booking.id);
      } catch (error) {
        throw new Error(
          `That reward is no longer available. ${error instanceof Error ? error.message : ""}`.trim(),
        );
      }
    }

    // ── 3. The late fee and the reward go on the bill — every tender ─────
    const lines: {
      kind: "item" | "fee";
      name: string;
      unitPrice: number;
      quantity: number;
    }[] = [];
    if (lateFee && lateFee.amount > 0) {
      lines.push({
        kind: "fee",
        name: lateFee.label,
        unitPrice: lateFee.amount,
        quantity: 1,
      });
    }
    if (reward && reward.amount > 0) {
      lines.push({
        kind: "item",
        name: reward.label,
        unitPrice: -reward.amount,
        quantity: 1,
      });
    }
    if (lines.length > 0) {
      try {
        await addLineItems.mutateAsync({
          bookingRef: booking.id,
          items: lines,
        });
      } catch (error) {
        // Nothing has been charged: give the reward back before stopping.
        if (reward) await input.releaseLoyaltyDiscount();
        throw error instanceof Error
          ? error
          : new Error("The bill could not be updated.");
      }
    }

    // What the bill is now. The lines just written are not in `booking` yet
    // (the refetch has not landed), and the charge refuses more than this.
    const bill = {
      id: booking.id,
      totalCost: booking.totalCost,
      amountDue: Math.max(
        0,
        (booking.amountDue ?? booking.totalCost) +
          (lateFee?.amount ?? 0) -
          (reward?.amount ?? 0) -
          (memberOff?.amount ?? 0),
      ),
      amountPaid: booking.amountPaid ?? 0,
    };
    const owedSupply = balanceOf(bill);

    let taken = 0;
    let supplyPaid = 0;
    let recorded = false;
    const fail = async (error: unknown): Promise<never> => {
      // Nothing moved yet: the reward goes back, or the customer retries at
      // full price holding a voucher the system has eaten.
      if (!recorded && reward) await input.releaseLoyaltyDiscount();
      const why =
        error instanceof Error
          ? error.message
          : "The payment did not go through.";
      throw new Error(
        recorded
          ? `$${taken.toFixed(2)} was recorded, but the rest was not: ${why}`
          : why,
      );
    };

    const payPart = async (part: {
      method: CheckoutPayment["method"];
      subtotal: number;
      tax: number;
      tip: number;
      cashReceived?: number;
    }) => {
      if (part.method === "terminal") {
        if (!payment.deviceSerial) throw new Error("Choose a terminal.");
        // The customer is asked for the tip ON THE DEVICE; the route charges
        // what is still owed plus the facility's tax.
        const result = await chargeOnTerminal.mutateAsync({
          bookingRef: booking.id,
          deviceSerial: payment.deviceSerial,
          tipOnDevice: true,
        });
        const amount = result.amountCents / 100;
        const card = result.cardLast4
          ? `${result.cardBrand ?? "Card"} ···${result.cardLast4}`
          : null;
        toast.info(`$${amount.toFixed(2)} taken on the terminal`, {
          description: [
            card,
            result.tipPrompted
              ? `Tip $${(result.tipCents / 100).toFixed(2)}`
              : "No tip added.",
            result.receiptMethod === "NO_RECEIPT"
              ? "Customer declined a receipt."
              : result.receiptMethod === "EMAIL"
                ? result.receiptDelivered
                  ? "Receipt emailed."
                  : "Email receipt FAILED — offer a printed one."
                : result.receiptMethod === "SMS"
                  ? result.receiptDelivered
                    ? "Receipt texted."
                    : "Text receipt FAILED — offer a printed one."
                  : result.receiptPrinted
                    ? "Receipt printed."
                    : "No receipt printed — hand over the copy from Print.",
          ]
            .filter(Boolean)
            .join(" · "),
        });
        return { amount, supply: owedSupply - supplyPaid };
      }
      if (part.method === "card_on_file") {
        if (!payment.savedCardId) throw new Error("Choose a card to charge.");
        if (!booking.rowId) throw new Error("The booking is still loading.");
        const result = await chargeSavedCard.mutateAsync({
          bookingRowId: booking.rowId,
          savedCardId: payment.savedCardId,
          tipCents: Math.round(part.tip * 100),
        });
        if (result.card) {
          toast.info(`$${result.amount.toFixed(2)} charged to ${result.card}`);
        }
        return { amount: result.amount, supply: owedSupply - supplyPaid };
      }
      if (part.method === "gift_card") {
        if (part.tip > 0) throw new Error(input.text.giftCardNoTip);
        const { cardBalance } = await payWithGiftCard.mutateAsync({
          bookingRef: booking.id,
          code: payment.giftCardCode ?? "",
          amount: part.subtotal,
          tax: part.tax,
        });
        toast.info(input.text.giftCardRemaining(cardBalance));
        return {
          amount: Math.round((part.subtotal + part.tax) * 100) / 100,
          supply: part.subtotal,
        };
      }
      // Cash, e-transfer, store credit: a ledger row, supply/tax/tip apart.
      const amount = await chargeBooking.mutateAsync({
        booking: { ...bill, amountPaid: bill.amountPaid + supplyPaid },
        amount: part.subtotal,
        tax: part.tax,
        tipAmount: part.tip > 0 ? part.tip : undefined,
        method: checkoutTender(part.method),
        cashReceived: part.cashReceived,
        note: payment.note,
      });
      return { amount, supply: part.subtotal };
    };

    // ── 4. The money ──────────────────────────────────────────────────────
    let parts: (Omit<PlannedPart, "method" | "total" | "takesTheRest"> & {
      method: CheckoutPayment["method"];
      cashReceived?: number;
    })[];
    if (payment.splits && payment.splits.length > 0) {
      const plan = planSplit({
        subtotal: payment.subtotal,
        tax: payment.tax,
        tip: payment.tip,
        rows: payment.splits,
      });
      if (!plan.ok) return fail(new Error(plan.problem));
      parts = plan.parts;
    } else if (payment.method === "store_credit") {
      // Store credit pays what the balance covers — its share of supply, tax
      // and tip — and the rest is still owed, said plainly.
      const total = payment.subtotal + payment.tax + payment.tip;
      const share = Math.min(1, storeCreditBalance / total);
      const tax = Math.round(payment.tax * share * 100) / 100;
      const tip = Math.round(payment.tip * share * 100) / 100;
      const covered =
        Math.round(Math.min(total, storeCreditBalance) * 100) / 100;
      parts = [
        {
          method: "store_credit",
          subtotal: Math.round((covered - tax - tip) * 100) / 100,
          tax,
          tip,
        },
      ];
    } else {
      parts = [
        {
          method: payment.method,
          subtotal: payment.subtotal,
          tax: payment.tax,
          tip: payment.tip,
          cashReceived: payment.cashReceived,
        },
      ];
    }

    for (const part of parts) {
      if (part.subtotal <= 0 && part.tax <= 0 && part.tip <= 0) continue;
      try {
        const { amount, supply } = await payPart(part);
        taken = Math.round((taken + amount) * 100) / 100;
        supplyPaid = Math.round((supplyPaid + supply) * 100) / 100;
        recorded = true;
      } catch (error) {
        return fail(error);
      }
    }
    input.clearLateFee();

    const stillOwed = Math.max(
      0,
      Math.round((owedSupply - supplyPaid) * 100) / 100,
    );

    // ── 5. Change kept as store credit — for real ─────────────────────────
    // The summary used to show "→ Store credit added +$X" and nothing issued
    // it. The payment is already recorded, so a refusal here is said, not
    // thrown: the money is right, only the credit is missing.
    if (payment.changeAsCredit && payment.changeAmount > 0.005) {
      try {
        await writeStoreCredit.mutateAsync({
          clientRef: input.clientRef,
          amount: Math.round(payment.changeAmount * 100) / 100,
          reason: "added",
          note: `Change from booking #${booking.id}`,
        });
      } catch (error) {
        toast.error("The change was not added as store credit", {
          description:
            error instanceof Error
              ? `${error.message} — hand it back in cash.`
              : "Hand it back in cash.",
        });
      }
    }

    // ── 6. A checkout that settles the bill checks the booking out ────────
    // "Proceed to Checkout" took the money and left the guest checked in.
    if (
      input.completeOnSettle !== false &&
      stillOwed <= 0.005 &&
      ["checked_in", "in_progress", "ready"].includes(booking.status)
    ) {
      try {
        await updateStatus.mutateAsync({ id: booking.id, status: "completed" });
      } catch (error) {
        toast.error("Paid, but the booking was not checked out", {
          description:
            error instanceof Error
              ? error.message
              : "Check it out from the booking page.",
        });
      }
    }

    // ── 7. The points this booking earned — after, and never blocking ─────
    void earnPoints
      .mutateAsync({ bookingRef: booking.id })
      .then((result) => {
        if (result.awarded && result.points > 0) {
          toast.success(`+${result.points.toLocaleString()} points`, {
            description: result.reasons.join(" · ") || undefined,
          });
        }
        if (result.tierUp) {
          toast.success(`${result.tierUp.icon} Reached ${result.tierUp.name}`, {
            description: result.tierUp.rewarded
              ? "A tier reward has been added to their account."
              : undefined,
          });
        }
        for (const badge of result.badges) {
          toast.success(`${badge.icon} ${badge.name}`, {
            description: badge.rewardText
              ? `Badge earned — reward: ${badge.rewardText}`
              : "Badge earned",
          });
        }
      })
      .catch((error: unknown) => {
        toast.error("The points for this booking were not awarded", {
          description: error instanceof Error ? error.message : undefined,
        });
      });

    return { taken, ...(stillOwed > 0.005 ? { stillOwed } : {}) };
  };
}
