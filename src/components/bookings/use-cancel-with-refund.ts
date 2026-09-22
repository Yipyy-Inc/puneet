"use client";

import { toast } from "sonner";

import type { CancelRefundMethod } from "@/components/bookings/modals/CancelBookingModal";
import {
  refundTender,
  useCancelBooking,
  useRefundBooking,
  useRefundBookingToCard,
} from "@/lib/api/booking-money";
import { useAddLineItems } from "@/lib/api/booking-line-items";
import { formatBookingRef } from "@/lib/booking-id";
import { formatMoney } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// Cancelling a booking, with its refund — the handler CancelBookingModal
// awaits, shared by the booking page and the calendar.
//
// AWAITED, and refund FIRST: a refund that lands before a failed cancel
// leaves the money right and the status stale — visible, and fixed by
// cancelling again. The other order leaves a cancelled booking whose money
// never went back. "Back to the card" is the processor refund Issue Refund
// uses; a shortfall stops the cancel so somebody finishes it by hand.
//
// The calendar cancelled with a status PATCH and a window.confirm promising
// that "refund eligibility will be reviewed" — nothing reviewed it.
// ============================================================================

export function useCancelWithRefund() {
  const addLineItems = useAddLineItems();
  const cancelBooking = useCancelBooking();
  const refundBooking = useRefundBooking();
  const refundToCard = useRefundBookingToCard();
  const { t, fill, locale } = useStaffText("cancelBooking");
  const money = (amount: number) => formatMoney(amount, locale);

  return async (
    bookingId: number,
    reason: string,
    refundMethod: CancelRefundMethod,
    refundAmount: number,
    /**
     * What the facility's policy keeps that it does not ALREADY hold.
     *
     * Money already paid is kept simply by refunding less of it — no row
     * needed, it is theirs. A shortfall is different: the policy says the
     * facility is owed something the customer never handed over, and the only
     * honest way to record that is a line on the bill. Visible, chaseable, and
     * on the invoice, rather than a number somebody remembers.
     */
    fee?: { amount: number; name: string } | null,
  ): Promise<void> => {
    const ref = formatBookingRef(bookingId);
    let refunded = 0;

    // FIRST, and before anything moves: if this fails nothing has happened
    // yet, and the dialog stays open with the reason. Writing a line item
    // needs `retail_process_sale` rather than `edit_bookings`, so somebody who
    // may cancel a booking may still be refused here — which must surface, not
    // vanish.
    if (fee && fee.amount > 0) {
      await addLineItems.mutateAsync({
        bookingRef: bookingId,
        items: [
          {
            kind: "fee",
            name: fee.name,
            unitPrice: Math.round(fee.amount * 100) / 100,
            quantity: 1,
          },
        ],
      });
    }
    if (refundAmount > 0) {
      if (refundMethod === "original") {
        const result = await refundToCard.mutateAsync({
          bookingRef: bookingId,
          amountCents: Math.round(refundAmount * 100),
          reason,
        });
        refunded = result.refundedCents / 100;
        if (result.shortfallCents > 0) {
          throw new Error(
            fill("partialCardRefund", {
              refunded: money(refunded),
              short: money(result.shortfallCents / 100),
            }),
          );
        }
      } else {
        await refundBooking.mutateAsync({
          bookingId,
          amount: refundAmount,
          method: refundTender(refundMethod),
          reason,
        });
        refunded = refundAmount;
      }
    }
    await cancelBooking.mutateAsync({ bookingId, reason });
    const done =
      refunded <= 0
        ? fill("cancelledDone", { ref })
        : fill(
            refundMethod === "store_credit"
              ? "cancelledRefundedCredit"
              : refundMethod === "cash"
                ? "cancelledRefundedCash"
                : "cancelledRefundedCard",
            { ref, amount: money(refunded) },
          );
    toast.success(done, { description: t("notMessaged") });
  };
}
