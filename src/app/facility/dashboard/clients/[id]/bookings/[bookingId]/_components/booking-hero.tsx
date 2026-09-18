"use client";

import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";

import {
  BookingActionBar,
  type BookingActionHandlers,
} from "@/components/bookings/booking-actions/BookingActionBar";
import { BookingStatusMenu } from "@/components/bookings/booking-actions/BookingStatusMenu";
import { NotesButton } from "@/components/shared/NotesButton";
import { TagsButton } from "@/components/shared/TagsButton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BookingAction } from "@/lib/bookings/booking-lifecycle";
import { formatCalendarDayLong, formatDateShort } from "@/lib/i18n/format";
import { usePortalHref } from "@/lib/nav/use-portal-href";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { Booking } from "@/types/booking";

// ============================================================================
// The top of the booking page: its number, its status and what can be done
// with it now, its days, and — for someone who may see money — its total.
// Moved out of the page as it was translated ("3 nights", the dates, "From
// Estimate").
// ============================================================================

export function BookingHero({
  booking,
  bookingRef,
  serviceLabel,
  nights,
  sourceEstimateId,
  total,
  actions,
  handlers,
  petLabel,
}: {
  booking: Booking;
  bookingRef: string;
  serviceLabel: string;
  nights: number;
  sourceEstimateId?: string;
  /** The formatted total, or null for someone who may not see booking money
   *  (§3C — omitted, not greyed). */
  total: string | null;
  actions: BookingAction[];
  handlers: BookingActionHandlers;
  petLabel: string | null;
}) {
  const { fill, locale } = useStaffText("bookingDetail");
  const { href } = usePortalHref();
  const oneDay = booking.startDate === booking.endDate;

  return (
    <div className="border-line bg-card rounded-3xl border p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            {/* §5r: a booking reference never passes through the locale
                layer. */}
            <PageHeader title={bookingRef} />
            <BookingStatusMenu
              status={booking.status}
              actions={actions}
              handlers={handlers}
              petLabel={petLabel}
            />
            <TagsButton entityType="booking" entityId={booking.id} />
            <NotesButton entityType="booking" entityId={booking.id} />
            {sourceEstimateId && (
              <Link
                href={href(
                  `/facility/dashboard/estimates?q=${sourceEstimateId}`,
                )}
              >
                <Badge variant="outline" className="gap-1">
                  {fill("fromEstimate", { id: sourceEstimateId })}
                </Badge>
              </Link>
            )}
          </div>
          <div className="text-ink-secondary mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {oneDay
                ? formatCalendarDayLong(booking.startDate, locale)
                : `${formatDateShort(`${booking.startDate}T12:00:00`, locale)} → ${formatDateShort(`${booking.endDate}T12:00:00`, locale)}`}
            </span>
            {nights > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" />
                {fill(nights === 1 ? "nightsOne" : "nightsMany", {
                  n: nights,
                })}
              </span>
            )}
            <span>{serviceLabel}</span>
            {booking.kennel && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {booking.kennel}
              </span>
            )}
          </div>
        </div>
        {total !== null && (
          // On a phone the header wraps and this block starts its own line,
          // so it lines up on the left with everything above it.
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <p className="text-body-ink text-2xl font-bold tabular-nums">
              {total}
            </p>
            <StatusBadge type="status" value={booking.paymentStatus} />
          </div>
        )}
      </div>

      {/* The lifecycle's actions for this viewer — see the page's handlers. */}
      <BookingActionBar
        actions={actions}
        handlers={handlers}
        petLabel={petLabel}
      />
    </div>
  );
}
