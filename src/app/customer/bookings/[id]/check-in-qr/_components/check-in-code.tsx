"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CircleAlert,
  CircleHelp,
  LoaderCircle,
  QrCode,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { RouteState } from "@/components/ui/route-state";
import { CheckInQRCode } from "@/components/yipyygo/CheckInQRCode";
import {
  customerYipyyGoBookingQueries,
  useIssueCheckInPass,
  type YipyyGoRequestError,
} from "@/lib/api/customer-yipyy-go";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import {
  formatDateLong,
  formatList,
  formatTime,
  formatTimeOfDay,
} from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import { calendarDay } from "@/lib/yipyy-go/owner-form";

// ============================================================================
// The code an owner shows at the desk (§5s).
//
// The page it replaces looked the booking up in src/data/bookings, so a real
// booking had no code; drew a token that a Map in that one browser made, so
// no other device could read it; and said the code was also in the
// confirmation email and an SMS reminder, which carry none.
//
// Opening the page asks the server for a code
// (/api/customer/yipyy-go/bookings/[ref]/check-in-pass): it mints one, keeps
// only its hash, and answers the kiosk link the QR code carries. Each opening
// replaces the last code, and the page says so.
// ============================================================================

const status = (error: unknown) =>
  (error as YipyyGoRequestError | null)?.status;

export function CheckInCode({ bookingRef }: { bookingRef: number }) {
  const { t, fill, locale } = useCustomerText("yipyygo");
  const booking = useQuery(customerYipyyGoBookingQueries.booking(bookingRef));
  const issue = useIssueCheckInPass(bookingRef);
  const { mutate } = issue;
  const bookingHref = `/customer/bookings/${bookingRef}`;

  // One code per opening. The ref holds through the development double
  // mount, which would otherwise make two codes and void the first.
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    mutate();
  }, [mutate]);

  let body;
  if (
    [403, 404].includes(status(issue.error) ?? 0) ||
    status(booking.error) === 404
  ) {
    body = (
      <RouteState
        surface="card"
        pose="confused"
        icon={CircleHelp}
        inkClassName="text-ink-secondary"
        title={t("bookingNotFound")}
        description={t("notFoundText")}
        action={{ label: t("backToBookings"), href: "/customer/bookings" }}
      />
    );
  } else if (status(issue.error) === 422) {
    body = (
      <RouteState
        surface="card"
        pose="sleeping"
        icon={QrCode}
        inkClassName="text-ink-secondary"
        title={t("qrNotArrivingTitle")}
        description={t("qrNotArrivingText")}
        action={{ label: t("qrBackToBooking"), href: bookingHref }}
      />
    );
  } else if (issue.isError || booking.isError) {
    body = (
      <RouteState
        surface="card"
        pose="error"
        icon={CircleAlert}
        inkClassName="text-destructive"
        title={t("qrFailedTitle")}
        description={t("qrFailedText")}
        action={{
          label: t("qrMakeAgain"),
          onClick: () => {
            if (booking.isError) void booking.refetch();
            mutate();
          },
        }}
      />
    );
  } else if (!issue.data || !booking.data) {
    body = (
      <RouteState
        surface="card"
        pose="loading"
        icon={LoaderCircle}
        inkClassName="text-primary"
        title={t("qrMakingTitle")}
        description={t("qrMakingText")}
        spin
      />
    );
  } else {
    const stay = booking.data.booking;
    const until = new Date(issue.data.expiresAt);
    body = (
      <>
        <header className="space-y-3">
          <Button variant="ghost" asChild className="-ml-3">
            <Link href={bookingHref}>
              <ArrowLeft aria-hidden />
              {t("qrBackToBooking")}
            </Link>
          </Button>
          <PageHeader
            title={t("qrTitle")}
            description={fill("formFor", {
              service: serviceTypeLabel(locale, stay.service),
              date: formatDateLong(calendarDay(stay.startDate), locale),
            })}
          />
        </header>
        <section
          aria-label={t("qrTitle")}
          className="border-line bg-card shadow-card flex flex-col items-center gap-4 rounded-2xl border p-[22px] text-center"
        >
          <CheckInQRCode
            url={issue.data.url}
            label={fill("qrCodeLabel", { id: bookingRef })}
            size={240}
          />
          <div className="space-y-1">
            <p className="text-body-ink text-[15px] font-semibold tabular-nums">
              {fill("qrBookingNumber", { id: bookingRef })}
            </p>
            {stay.checkInTime && (
              <p className="text-ink-secondary text-[13.5px] tabular-nums">
                {fill("qrArrivalTime", {
                  time: formatTimeOfDay(stay.checkInTime, locale),
                })}
              </p>
            )}
          </div>
          <p className="text-body-ink max-w-[46ch] text-[14.5px] text-pretty">
            {fill("qrStaffWillScan", {
              pets: formatList(
                booking.data.pets.map((pet) => pet.name),
                locale,
              ),
            })}
          </p>
          <p className="text-ink-tertiary max-w-[46ch] text-[13px] text-pretty">
            {fill("qrValidUntil", {
              date: formatDateLong(until, locale),
              time: formatTime(until, locale),
            })}
          </p>
        </section>
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 px-4 py-6">{body}</div>
  );
}
