"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useBookingCheckout } from "@/hooks/use-booking-checkout";
import { useRecordCareOverride } from "@/lib/api/booking-care-override";
import { useFacilityHours, usePricingRules } from "@/lib/api/facility-settings";
import { useFacilityTimeZone } from "@/lib/api/facility-profile";
import { balanceOf } from "@/lib/api/booking-money";
import { bookingValue } from "@/lib/bookings/booking-value";
import { formatMoney } from "@/lib/i18n/format";
import { tipStillToCollect } from "@/lib/payments/pledged-tip";
import {
  computeTimeFees,
  timeFeesTotal,
  type TimeFeeResult,
} from "@/lib/policies/time-fee";
import {
  serviceChargesAtTheTill,
  serviceChargesTotal,
  type ServiceChargeLine,
} from "@/lib/pricing/service-charge-lines";
import { facilityHoursForDate } from "@/lib/settings/facility-hours";
import { useStaffText } from "@/lib/staff/use-staff-text";

import type { BookingDetails } from "./use-booking-details";

// ============================================================================
// The till, as the booking page reaches it.
//
// Moved out of the page (2026-10-03), unchanged:
//
// - NOT WHILE THE PRICING RULES ARE IN FLIGHT. `usePricingRules()` answers
//   with the EMPTY fallback until it lands, and empty is indistinguishable
//   from "this facility charges no late fee" — so the till waits.
// - The late-pickup and early-drop-off fees are worked out when the till
//   opens, from presence (`arrivedAt`) and the facility's own clock.
// - The facility's service charges are re-checked at the till, for the
//   booking that had no price when it was made (`ifAbsent` makes a second
//   attempt cost nothing).
// - The care gate: unlogged meals and doses are raised BEFORE the money moves
//   — but only when the pet is leaving.
// - Two ways in, as the mock draws them: the header's "Check {pet} out" is a
//   DEPARTURE (the care gate, the time fees, and a bill it settles checks the
//   pet out); the payment card's "Take payment" only takes money. A boarder
//   whose owner pays the rest on day three is still in the kennel after it.
// ============================================================================

export function useBookingTill(
  d: BookingDetails,
  options: {
    /** Called to show the care gate's "Review": the journal's first unlogged row. */
    onReviewCare: () => void;
  },
) {
  const { rules: pricingRules, isPending: pricingPending } = usePricingRules();
  const { weekly: facilityWeeklyHours, overrides: scheduleOverrides } =
    useFacilityHours();
  const facilityTimeZone = useFacilityTimeZone();
  const recordCareOverride = useRecordCareOverride();
  const {
    t: gcT,
    fill: gcFill,
    locale: gcLocale,
  } = useStaffText("checkoutGiftCard");
  const { fill: fillJoin } = useStaffText("joinMembership");

  const [open, setOpen] = useState(false);
  // Whether this till is the pet leaving — see the header above.
  const [leaving, setLeaving] = useState(true);
  const [careGateOpen, setCareGateOpen] = useState(false);
  const [timeFees, setTimeFees] = useState<TimeFeeResult[]>([]);
  const [serviceCharges, setServiceCharges] = useState<ServiceChargeLine[]>([]);

  const booking = d.booking;
  const { t, fill, locale } = d.text;

  // The checkout's handler: awaited end to end, and it throws on every
  // failure so the dialog stays open with the reason.
  const checkout = useBookingCheckout({
    booking,
    clientRef: d.clientId,
    timeFees,
    clearTimeFees: () => setTimeFees([]),
    serviceCharges,
    loyaltyDiscount: d.loyalty.discount,
    consumeLoyaltyDiscount: d.loyalty.consume,
    releaseLoyaltyDiscount: d.loyalty.release,
    membershipDiscount: d.membershipDiscount,
    completeOnSettle: leaving,
    text: {
      discountRefused: fillJoin("discountRefused", {}),
      giftCardNoTip: gcT("noTip"),
      giftCardRemaining: (amount) =>
        gcFill("remaining", { amount: formatMoney(amount, gcLocale) }),
    },
  });

  const openCheckout = (departure = true) => {
    if (!booking) return;
    if (pricingPending) {
      toast.info(t("loadingFees"));
      return;
    }
    setLeaving(departure);
    const scheduledEndIso = `${booking.endDate}T${booking.checkOutTime ?? "12:00"}:00`;
    const scheduledStartIso = `${booking.startDate}T${booking.checkInTime ?? "08:00"}:00`;
    const petCount = Array.isArray(booking.petId) ? booking.petId.length : 1;
    // A late pickup or an early drop-off is charged as the pet LEAVES; a
    // payment in the middle of a stay asks neither.
    const fees = !departure
      ? []
      : computeTimeFees({
          fees: pricingRules.latePickupFees,
          serviceId: booking.service.toLowerCase(),
          timeZone: facilityTimeZone,
          petCount,
          perUnitBase: booking.basePrice,
          scheduledCheckInTime: scheduledStartIso,
          scheduledCheckOutTime: scheduledEndIso,
          // "How early were they" is a question only the building can answer.
          actualCheckInTime: booking.arrivedAt ?? scheduledStartIso,
          actualCheckOutTime: new Date().toISOString(),
          checkInDayHours: facilityHoursForDate(
            booking.startDate,
            facilityWeeklyHours,
            scheduleOverrides,
          ),
          checkOutDayHours: facilityHoursForDate(
            booking.endDate,
            facilityWeeklyHours,
            scheduleOverrides,
          ),
        });
    for (const fee of fees) {
      toast.warning(
        fill(
          fee.condition === "late_pickup" ? "latePickupFee" : "earlyDropoffFee",
          {
            minutes: fee.minutesOver,
            amount: formatMoney(fee.amount, locale),
          },
        ),
      );
    }
    setTimeFees(fees);
    // Nothing on a booking made from an estimate: its fees are on the bill as
    // they were quoted, and the customer accepted no others.
    setServiceCharges(
      serviceChargesAtTheTill({
        fees: pricingRules.customFees,
        context: {
          serviceId: booking.service.toLowerCase(),
          petCount,
          serviceTotal: bookingValue(booking),
          locationId: booking.locationId,
        },
        chargesStated: booking.serviceChargesIncluded === true,
        alreadyCharged: d.alreadyChargedFeeIds,
      }),
    );
    setOpen(true);
  };

  /** The till as the pet leaves, behind the care gate. */
  const toTill = () => {
    if (d.departing && d.careStatus.pending.length > 0) {
      setCareGateOpen(true);
      return;
    }
    openCheckout(true);
  };

  /** The till that only takes money: no care gate, and nobody leaves. */
  const toPayment = () => openCheckout(false);

  /** "Continue anyway": the reason is kept BEFORE the till opens. */
  const continuePastCareGate = async (reason: string) => {
    if (!booking) return;
    try {
      await recordCareOverride.mutateAsync({
        bookingRef: booking.id,
        reason,
        pending: d.careStatus.pending,
      });
    } catch (error) {
      toast.error(t("careGateNotSaved"), {
        description: error instanceof Error ? error.message : undefined,
      });
      return;
    }
    setCareGateOpen(false);
    toast(
      fill(d.careStatus.pending.length === 1 ? "careGateOne" : "careGateMany", {
        n: d.careStatus.pending.length,
      }),
    );
    openCheckout(true);
  };

  const reviewCare = () => {
    setCareGateOpen(false);
    options.onReviewCare();
  };

  // What the till offers: the ledger's balance, plus what the checkout is
  // about to write (a pending late fee, service charges). Never the price.
  const amountDue = booking
    ? balanceOf(booking) +
      timeFeesTotal(timeFees) +
      serviceChargesTotal(serviceCharges)
    : 0;

  return {
    open,
    setOpen,
    toTill,
    toPayment,
    openCheckout,
    checkout,
    timeFees,
    serviceCharges,
    amountDue,
    pledgedTip: booking
      ? tipStillToCollect(booking.tipAmount, d.tips?.tipCollected)
      : 0,
    careGate: {
      open: careGateOpen,
      close: () => setCareGateOpen(false),
      review: reviewCare,
      continueAnyway: continuePastCareGate,
    },
  };
}

export type BookingTill = ReturnType<typeof useBookingTill>;
