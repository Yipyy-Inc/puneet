"use client";

import { Calendar, Dog, GraduationCap, Home, Scissors } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { bookings } from "@/data/bookings";
import type { Pet } from "@/types/pet";

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

export function getStatusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return <Badge variant="default">Confirmed</Badge>;
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "request_submitted":
      return <Badge variant="secondary">Request Submitted</Badge>;
    case "waitlisted":
      return <Badge variant="outline">Waitlisted</Badge>;
    case "completed":
      return <Badge variant="outline">Completed</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export function getPaymentBadge(paymentStatus: string | undefined) {
  switch (paymentStatus) {
    case "paid":
      return (
        <Badge
          variant="outline"
          className="h-5 border-emerald-300 bg-emerald-50 px-1.5 text-[10px] text-emerald-700"
        >
          Paid
        </Badge>
      );
    case "pending":
      return (
        <Badge
          variant="outline"
          className="h-5 border-amber-300 bg-amber-50 px-1.5 text-[10px] text-amber-700"
        >
          Payment due
        </Badge>
      );
    case "refunded":
      return (
        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
          Refunded
        </Badge>
      );
    default:
      return null;
  }
}

export function formatDate(dateString: string, isMounted: boolean) {
  if (!isMounted) return dateString;
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
) {
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
    `UID:booking-${booking.id}@yipyy.com`,
    `DTSTART:${formatICSDate(startDateTime)}`,
    `DTEND:${formatICSDate(endDateTime)}`,
    `SUMMARY:${booking.service.charAt(0).toUpperCase() + booking.service.slice(1)} - ${petName}`,
    `DESCRIPTION:Service: ${booking.service}\\nPet: ${petName}\\nLocation: ${facilityName || "Facility"}`,
    `LOCATION:${facilityName || "Facility"}`,
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
