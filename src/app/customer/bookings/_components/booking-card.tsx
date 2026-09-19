"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  MessageSquare,
  Clock,
  CreditCard,
  EllipsisVertical,
  Eye,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PetAvatar } from "@/components/ui/pet-avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  balanceDue,
  isAwaitingConfirmation,
  isCustomerCancellable,
  isPayable,
} from "@/lib/bookings/booking-timing";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import {
  formatDateLong,
  formatMoney,
  formatTimeOfDay,
} from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import type { Booking } from "@/types/booking";

import { downloadCalendarEvent } from "./calendar-event";

// ============================================================================
// One booking, as its owner sees it — upcoming and past alike.
//
// It replaced two cards that between them carried a "Reschedule" that opened
// a blank booking form, a "Cancel" that waited a second and did nothing, a
// "Pay now" to a fixture billing page, an "Email receipt" toast, a tip that
// was kept in the browser, staff notes from a fixture, and past bookings faded
// with opacity (§6 rule 4). Every control here does what it says; the ones
// that could not were removed rather than kept as promises.
//
// The card is not one big link: a button inside a link is two controls in one
// place. The title is the link, and "View booking" says so for a keyboard.
// ============================================================================

export interface BookingCardPet {
  id: number;
  name: string;
  imageUrl?: string | null;
}

interface BookingCardProps {
  booking: Booking;
  pets: BookingCardPet[];
  facilityName?: string;
  today: string;
  onCancel: (booking: Booking, petName: string) => void;
  onNote: (
    booking: Booking,
    petName: string,
    kind: "note" | "change_dates",
  ) => void;
}

export function petOf(
  booking: Booking,
  pets: BookingCardPet[],
): BookingCardPet | undefined {
  const petId = Array.isArray(booking.petId) ? booking.petId[0] : booking.petId;
  return pets.find((p) => p.id === petId);
}

export function BookingCard({
  booking,
  pets,
  facilityName,
  today,
  onCancel,
  onNote,
}: BookingCardProps) {
  const { t, fill, locale } = useCustomerText("bookings");
  const pet = petOf(booking, pets);
  const petName = pet?.name ?? t("petFallback");
  const service = serviceTypeLabel(locale, booking.service);
  const href = `/customer/bookings/${booking.id}`;

  const awaiting = isAwaitingConfirmation(booking);
  const payable = isPayable(booking);
  const owed = balanceDue(booking);
  const cancellable = isCustomerCancellable(booking, today);
  const upcoming = (booking.endDate ?? booking.startDate) >= today;
  const late = booking.cancellation?.late === true;
  // What add_owner_booking_note accepts: open, or under way.
  const noteable = !["completed", "cancelled", "declined", "no_show"].includes(
    booking.status,
  );

  const multiDay = booking.endDate && booking.endDate !== booking.startDate;
  const when = multiDay
    ? fill("dateRange", {
        from: formatDateLong(booking.startDate, locale),
        to: formatDateLong(booking.endDate!, locale),
      })
    : formatDateLong(booking.startDate, locale);
  const time = booking.checkInTime
    ? booking.checkOutTime && !multiDay
      ? `${formatTimeOfDay(booking.checkInTime, locale)} – ${formatTimeOfDay(booking.checkOutTime, locale)}`
      : formatTimeOfDay(booking.checkInTime, locale)
    : null;

  return (
    <article
      data-slot="booking-card"
      className="bg-card border-line shadow-card flex flex-col gap-4 rounded-2xl border p-4 sm:p-5"
    >
      <div className="flex min-w-0 items-start gap-4">
        <PetAvatar name={petName} src={pet?.imageUrl} size="lg" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-body-ink text-[15px] font-semibold">
              <Link href={href} className="hover:underline">
                {fill("cardTitle", { service, pet: petName })}
              </Link>
            </h3>
            <StatusBadge type="status" value={booking.status} size="sm" />
          </div>
          <p className="text-ink-secondary text-[13.5px]">
            {when}
            {time && <span className="tabular-nums"> · {time}</span>}
          </p>
          {facilityName && (
            <p className="text-ink-tertiary text-[13.5px]">{facilityName}</p>
          )}
        </div>
        <p className="text-body-ink shrink-0 text-[15px] font-semibold tabular-nums">
          {awaiting
            ? t("priceOnConfirmation")
            : formatMoney(booking.amountDue ?? booking.totalCost, locale)}
        </p>
      </div>

      {awaiting && (
        <p className="text-ink-tertiary flex items-center gap-2 text-[13.5px]">
          <Clock className="size-4 shrink-0" aria-hidden />
          {t("awaitingConfirmation")}
        </p>
      )}
      {late && (
        <p className="text-warning flex items-start gap-2 text-[13.5px] font-medium">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {booking.cancellation?.feePercentage
            ? fill("cancelledLateWithFee", {
                fee: booking.cancellation.feePercentage,
              })
            : t("cancelledLate")}
        </p>
      )}
      {payable && (
        <p className="text-ink-secondary text-[13.5px] tabular-nums">
          {fill("balanceOwed", { amount: formatMoney(owed, locale) })}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {payable && (
          <Button asChild>
            <Link href={`/pay/${booking.id}`}>
              <CreditCard className="size-4" aria-hidden />
              {fill("payAmount", { amount: formatMoney(owed, locale) })}
            </Link>
          </Button>
        )}
        {cancellable && (
          <Button variant="outline" onClick={() => onCancel(booking, petName)}>
            <X className="size-4" aria-hidden />
            {awaiting ? t("withdrawRequest") : t("cancelBooking")}
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href={href}>
            <Eye className="size-4" aria-hidden />
            {t("viewBooking")}
          </Link>
        </Button>
        {upcoming && noteable && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={fill("moreFor", { pet: petName })}
              >
                <EllipsisVertical className="size-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onNote(booking, petName, "change_dates")}
              >
                <CalendarClock className="size-4" aria-hidden />
                {t("askToChangeDates")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onNote(booking, petName, "note")}
              >
                <MessageSquare className="size-4" aria-hidden />
                {t("leaveNote")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  downloadCalendarEvent(
                    booking,
                    petName,
                    facilityName,
                    t,
                    locale,
                  )
                }
              >
                <CalendarPlus className="size-4" aria-hidden />
                {t("addToCalendar")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </article>
  );
}
