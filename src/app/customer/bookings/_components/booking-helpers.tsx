"use client";

import { Calendar, Dog, GraduationCap, Home, Scissors } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { bookings } from "@/data/bookings";
import type { Pet } from "@/types/pet";
import type { AppLocale } from "@/lib/language-settings";
import { formatDateLong } from "@/lib/i18n/format";
import { serviceTypeLabel, statusLabel } from "@/lib/i18n/labels";

export type Booking = (typeof bookings)[number];

export function ServiceIcon({
  service,
  className,
}: {
  service: string;
  className?: string;
}) {
  switch (service.toLowerCase()) {
    case "grooming":
      return <Scissors className={className} />;
    case "daycare":
      return <Dog className={className} />;
    case "boarding":
      return <Home className={className} />;
    case "training":
      return <GraduationCap className={className} />;
    default:
      return <Calendar className={className} />;
  }
}

// The words come from `messages.status` by the enum the booking carries;
// only the VARIANT is decided here. A status nobody mapped still gets words,
// never the raw `request_submitted`.
const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  confirmed: "default",
  pending: "secondary",
  request_submitted: "secondary",
  waitlisted: "outline",
  completed: "outline",
  cancelled: "destructive",
};

export function getStatusBadge(status: string, locale: AppLocale) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "default"}>
      {statusLabel(locale, status)}
    </Badge>
  );
}

export function getPaymentBadge(
  paymentStatus: string | undefined,
  t: (key: string) => string,
) {
  switch (paymentStatus) {
    case "paid":
      return (
        <Badge
          variant="outline"
          className="h-5 border-emerald-300 bg-emerald-50 px-1.5 text-[10px] text-emerald-700"
        >
          {t("paymentPaid")}
        </Badge>
      );
    case "pending":
      return (
        <Badge
          variant="outline"
          className="h-5 border-amber-300 bg-amber-50 px-1.5 text-[10px] text-amber-700"
        >
          {t("paymentDue")}
        </Badge>
      );
    case "refunded":
      return (
        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
          {t("paymentRefunded")}
        </Badge>
      );
    default:
      return null;
  }
}

export function formatDate(
  dateString: string,
  isMounted: boolean,
  locale: AppLocale,
) {
  if (!isMounted) return dateString;
  return formatDateLong(dateString, locale);
}

export function getPetForBooking(
  booking: Booking,
  pets: Pet[],
): Pet | undefined {
  const petId = Array.isArray(booking.petId) ? booking.petId[0] : booking.petId;
  return pets.find((p) => p.id === petId);
}

export function downloadCalendarEvent(
  booking: Booking,
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
