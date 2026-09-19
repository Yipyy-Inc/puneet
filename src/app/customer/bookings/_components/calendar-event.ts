"use client";

import type { AppLocale } from "@/lib/language-settings";
import { serviceTypeLabel } from "@/lib/i18n/labels";

// What the calendar file needs from a booking — the real one or a fixture.
interface CalendarBooking {
  id: number;
  service: string;
  startDate: string;
  endDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
}

export function downloadCalendarEvent(
  booking: CalendarBooking,
  petName: string,
  facilityName: string | undefined,
  t: (key: string) => string,
  locale: AppLocale,
) {
  // The event lands in the customer's own calendar, in their language. The
  // ICS field names — SUMMARY, DESCRIPTION — are the format, not copy.
  const service = serviceTypeLabel(locale, booking.service);
  const facility = facilityName || t("facilityFallback");
  const startDateTime = new Date(
    `${booking.startDate}T${booking.checkInTime || "09:00"}`,
  );
  const endDateTime =
    booking.endDate && booking.checkOutTime
      ? new Date(`${booking.endDate}T${booking.checkOutTime}`)
      : new Date(startDateTime.getTime() + 60 * 60 * 1000);

  const formatICSDate = (date: Date) =>
    date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Yipyy//Booking//EN",
    "BEGIN:VEVENT",
    // french-ok: a machine identifier the calendar app matches on, never read
    `UID:booking-${booking.id}@yipyy.com`,
    `DTSTART:${formatICSDate(startDateTime)}`,
    `DTEND:${formatICSDate(endDateTime)}`,
    `SUMMARY:${service} — ${petName}`,
    `DESCRIPTION:${t("icsService")} ${service}\\n${t("icsPet")} ${petName}\\n${t("icsLocation")} ${facility}`,
    `LOCATION:${facility}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `booking-${booking.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
