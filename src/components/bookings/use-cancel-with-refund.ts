"use client";

import { toast } from "sonner";

import type { CancelRefundMethod } from "@/components/bookings/modals/CancelBookingModal";
import {
  refundTender,
  useCancelBooking,
  useRefundBooking,
  useRefundBookingToCard,
} from "@/lib/api/booking-money";
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
  ): Promise<void> => {
    const ref = formatBookingRef(bookingId);
    let refunded = 0;
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
