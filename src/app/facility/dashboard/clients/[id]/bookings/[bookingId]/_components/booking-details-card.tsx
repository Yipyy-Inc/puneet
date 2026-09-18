"use client";

import { CalendarDays, LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCalendarDayLong, formatTimeOfDay } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { Booking } from "@/types/booking";

// ============================================================================
// The booking's own facts: its service, its two days and their times, the
// room and what the owner asked for. Moved out of the page as it was
// translated — its dates were American English whatever the viewer read, and
// its times the raw "14:00" the row stores.
// ============================================================================

export function BookingDetailsCard({
  booking,
  serviceLabel,
  onEarlyCheckout,
}: {
  booking: Booking;
  serviceLabel: string;
  /** Offered while a boarding stay is under way. */
  onEarlyCheckout?: () => void;
}) {
  const { t, locale } = useStaffText("bookingDetail");
  const day = (value: string, time?: string) => (
    <>
      {formatCalendarDayLong(value, locale)}
      {time && (
        <span className="text-ink-tertiary ml-1 text-xs tabular-nums">
          {formatTimeOfDay(time, locale)}
        </span>
      )}
    </>
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-ink-tertiary flex items-center gap-2 text-xs font-bold tracking-[.06em] uppercase">
          <CalendarDays className="size-4" />
          {t("detailsTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        <dl className="space-y-3 text-sm">
          <Row label={t("detailsService")}>{serviceLabel}</Row>
          <Row label={t("detailsCheckIn")}>
            {day(booking.startDate, booking.checkInTime)}
          </Row>
          <Row label={t("detailsCheckOut")}>
            {day(booking.endDate, booking.checkOutTime)}
          </Row>
          {onEarlyCheckout && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={onEarlyCheckout}>
                <LogOut className="size-4" />
                {t("earlyCheckout")}
              </Button>
            </div>
          )}
          {booking.kennel && (
            <Row label={t("detailsRoom")}>{booking.kennel}</Row>
          )}
          {booking.specialRequests && (
            <div className="border-line border-t pt-3">
              <dt className="text-ink-tertiary mb-1 text-xs">
                {t("detailsRequests")}
              </dt>
              <dd className="text-body-ink text-sm">
                {booking.specialRequests}
              </dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
      <dt className="text-ink-tertiary">{label}</dt>
      <dd className="text-body-ink min-w-0 text-right font-semibold">
        {children}
      </dd>
    </div>
  );
}
