"use client";

import {
  formatCalendarDayLong,
  formatDuration,
  formatStayRange,
  formatTimeOfDay,
} from "@/lib/i18n/format";

import type { BookingDetails } from "../use-booking-details";
import type { ServiceFacts } from "../use-service-facts";

// ============================================================================
// The header's second line, by service, as the mock words it:
//
//   Boarding   Sep 21–30, 2026        9 nights · Suite 02
//   Daycare    Wed, Sep 30, 2026      Full day · 7:45 AM – 6:00 PM
//   Grooming   Thu, Oct 1, 2026 · 10:00 AM   2h 30m · with Maya R. · Table 2
//   Training   Wed, Sep 30, 2026 · 4:00 PM   Puppy Basics · Session 3 of 6 · with Alex T.
//
// Every part comes from the record; a part it does not have is left out
// rather than guessed. Dates and times through `Intl` (§5q).
// ============================================================================

function nightsBetween(start: string, end: string) {
  const ms =
    new Date(`${end}T00:00:00Z`).getTime() -
    new Date(`${start}T00:00:00Z`).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function useWhenAndMeta(d: BookingDetails, facts: ServiceFacts) {
  const { fill, locale } = d.text;
  const booking = d.booking;
  if (!booking) return { when: "", meta: "" };

  const time = (hhmm?: string) => (hhmm ? formatTimeOfDay(hhmm, locale) : "");
  const day = formatCalendarDayLong(booking.startDate, locale);
  const join = (parts: (string | null | undefined | false)[]) =>
    parts.filter(Boolean).join(" · ");

  switch (d.kind) {
    case "boarding": {
      const nights = nightsBetween(booking.startDate, booking.endDate);
      return {
        when: formatStayRange(booking.startDate, booking.endDate, locale),
        meta: join([
          nights > 0 &&
            fill(nights === 1 ? "nightsOne" : "nightsMany", { n: nights }),
          facts.kennelLabel ?? booking.kennel,
        ]),
      };
    }
    case "daycare": {
      const from = time(booking.checkInTime);
      const to = time(booking.checkOutTime);
      return {
        when: day,
        meta: join([
          booking.serviceType,
          from && to ? `${from} – ${to}` : from || to,
        ]),
      };
    }
    case "grooming": {
      const groom = facts.grooming;
      const minutes =
        (groom?.serviceDurationMin ?? 0) +
        d.lineItems
          .filter((l) => l.kind === "add_on")
          .reduce((sum, l) => sum + (l.durationMin ?? 0) * l.quantity, 0);
      return {
        when: join([day, time(booking.checkInTime)]),
        meta: join([
          minutes > 0 && formatDuration(minutes, locale),
          groom?.stylistName &&
            fill("withStaffName", { name: groom.stylistName }),
          facts.stationName,
        ]),
      };
    }
    case "training": {
      const series = facts.training?.series;
      const current = facts.training?.sessions.find(
        (s) => s.id === facts.training?.currentSessionId,
      );
      return {
        when: join([day, time(booking.checkInTime)]),
        meta: join([
          series?.name ?? booking.serviceType,
          series &&
            current &&
            fill("sessionOf", {
              n: current.number,
              total: series.numberOfSessions,
            }),
          (series?.trainerName ?? booking.assignedStaff) &&
            fill("withStaffName", {
              name: series?.trainerName ?? booking.assignedStaff ?? "",
            }),
        ]),
      };
    }
    default:
      return {
        when: join([day, time(booking.checkInTime)]),
        meta: join([booking.serviceType]),
      };
  }
}
