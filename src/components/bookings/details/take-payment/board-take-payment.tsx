"use client";

import { useQuery } from "@tanstack/react-query";

import { useBookingCheckout } from "@/hooks/use-booking-checkout";
import { bookingQueries } from "@/lib/api/booking";
import { formatBookingRef } from "@/lib/booking-id";
import { balanceOf } from "@/lib/api/booking-money";
import { useBookingTips } from "@/lib/api/booking-tips";
import { useClientRecord } from "@/lib/api/client";
import type {
  CheckoutPayment,
  CheckoutResult,
} from "@/lib/checkout/checkout-payment";
import { formatMoney, formatStayRange } from "@/lib/i18n/format";
import { tipStillToCollect } from "@/lib/payments/pledged-tip";
import { timeFeesTotal, type TimeFeeResult } from "@/lib/policies/time-fee";
import { useServiceName } from "@/lib/staff/use-service-name";
import { useStaffText } from "@/lib/staff/use-staff-text";

import { TakePaymentDialog } from "./take-payment-dialog";

// ============================================================================
// The board's Check Out, on the same Take payment dialog as the booking page
// (decision 1, 2026-10-03).
//
// The board's card knows a row of the day, not the booking — no row id to
// charge a card against, no client uuid to find their cards. So this reads
// the booking and its client when the till opens, and runs the SAME checkout
// the booking page runs, with the board's one difference kept: it does not
// check the pet out itself (`completeOnSettle: false`), because the card does
// that through the board's own status flow once the money has an answer.
// ============================================================================

export function BoardTakePayment({
  bookingRef,
  open,
  onOpenChange,
  timeFees,
  clearTimeFees,
  loyalty,
  onSettled,
  canSettle,
}: {
  bookingRef: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The late-pickup and early-drop-off fees the card worked out. */
  timeFees: TimeFeeResult[];
  clearTimeFees: () => void;
  loyalty: {
    discount: { label: string; amount: number } | null | undefined;
    consume: (bookingRef: number) => Promise<unknown>;
    release: () => Promise<unknown>;
  };
  /** The card's own checkout, once the money has an answer. */
  onSettled: () => void;
  /** Whether the card's Check Out came first — the till follows it. */
  canSettle: () => boolean;
}) {
  const { t, fill, locale } = useStaffText("takePayment");
  const {
    t: gcT,
    fill: gcFill,
    locale: gcLocale,
  } = useStaffText("checkoutGiftCard");
  const { fill: fillJoin } = useStaffText("joinMembership");
  const serviceName = useServiceName();
  const { data: booking } = useQuery({
    ...bookingQueries.detail(bookingRef),
    enabled: open && Number.isInteger(bookingRef),
  });
  const { client } = useClientRecord(booking?.clientId);
  const { data: tips } = useBookingTips(open ? bookingRef : null);

  const checkout = useBookingCheckout({
    booking,
    clientRef: booking?.clientId ?? 0,
    timeFees,
    clearTimeFees,
    // ── NO `serviceCharges` HERE, DELIBERATELY ───────────────────────────
    //
    // The booking page passes them; the board must not. `amount_due` already
    // holds every service charge the create path wrote, and passing them again
    // would show a doubled total and charge it. The only booking this leaves
    // uncharged is one that had no price when it was made — a customer's
    // request — and those are priced and settled from the booking page.
    loyaltyDiscount: loyalty.discount,
    consumeLoyaltyDiscount: loyalty.consume,
    releaseLoyaltyDiscount: loyalty.release,
    membershipDiscount: null,
    completeOnSettle: false,
    text: {
      discountRefused: fillJoin("discountRefused", {}),
      giftCardNoTip: gcT("noTip"),
      giftCardRemaining: (amount) =>
        gcFill("remaining", { amount: formatMoney(amount, gcLocale) }),
    },
  });

  if (!booking || !client) return null;

  const onConfirm = async (
    payment: CheckoutPayment,
  ): Promise<CheckoutResult> => {
    if (!canSettle()) throw new Error(t("checkOutFirst"));
    if (balanceOf(booking) + timeFeesTotal(timeFees) <= 0) {
      onSettled();
      return { taken: 0, message: t("nothingLeft") };
    }
    const result = await checkout(payment);
    onSettled();
    return result;
  };

  return (
    <TakePaymentDialog
      open={open}
      onOpenChange={onOpenChange}
      booking={booking}
      clientName={client.name}
      clientRef={client.id}
      clientRowId={
        client.rowId ??
        (booking as { clientRowId?: string }).clientRowId ??
        null
      }
      bookingLabel={fill("bookingLabel", {
        ref: formatBookingRef(booking.id),
        service: serviceName(booking.service),
      })}
      receiptServiceWindow={formatStayRange(
        booking.startDate,
        booking.endDate,
        locale,
      )}
      amountDue={balanceOf(booking) + timeFeesTotal(timeFees)}
      loyaltyDiscount={loyalty.discount ?? undefined}
      pledgedTip={tipStillToCollect(booking.tipAmount, tips?.tipCollected)}
      receiptLines={[
        {
          label: booking.serviceType || serviceName(booking.service),
          amount: booking.totalCost,
        },
        ...timeFees.map((fee) => ({ label: fee.label, amount: fee.amount })),
      ]}
      onConfirm={onConfirm}
    />
  );
}
