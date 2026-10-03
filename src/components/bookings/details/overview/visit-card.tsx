"use client";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useFindKennel } from "@/lib/api/boarding-rooms";
import { groomingQueries } from "@/lib/api/grooming";
import { detailsCard } from "@/lib/bookings/details/service-view";
import {
  formatCalendarDayLong,
  formatList,
  formatTimeOfDay,
  formatWeekdayDate,
} from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";

import { DetailsCard, DetailsCardHeader, DetailsRow } from "../details-card";
import type { BookingDetails } from "../use-booking-details";
import type { DetailDialog } from "../use-booking-handlers";
import type { ServiceFacts } from "../use-service-facts";

// ============================================================================
// The details card — "Stay", "Visit", "Appointment" or "Program" — with the
// rows the mock gives each service and the one action it carries: move the
// kennel, change the playgroup, reschedule. Every row is the record's; a fact
// the record does not have reads "—" rather than a guess.
// ============================================================================

const DASH = "—";

export function VisitCard({
  d,
  facts,
  openDialog,
  onReschedule,
}: {
  d: BookingDetails;
  facts: ServiceFacts;
  openDialog: (name: DetailDialog) => void;
  onReschedule?: () => void;
}) {
  const { t, fill, locale } = d.text;
  const { fill: kennelFill } = useStaffText("kennelMoves");
  const find = useFindKennel();
  const booking = d.booking;
  const client = d.client;
  // The client's passes, to say which one paid for a day of daycare.
  const packages = useQuery({
    ...groomingQueries.customerPackagesForClient(
      d.kind === "daycare" ? client?.id : undefined,
    ),
    enabled: d.kind === "daycare" && Boolean(client),
  });
  if (!booking || !client) return null;

  const card = detailsCard(d.kind);
  const time = (hhmm?: string) => (hhmm ? formatTimeOfDay(hhmm, locale) : "");
  const dayAndTime = (day: string, hhmm?: string) =>
    [formatWeekdayDate(`${day}T12:00:00`, locale), time(hhmm)]
      .filter(Boolean)
      .join(" · ");
  const closed = ["cancelled", "completed", "declined", "no_show"].includes(
    booking.status,
  );

  const action = (() => {
    if (closed) return null;
    if (card.action === "moveKennel" && d.permissions.canEditBooking) {
      // A confirmed stay with no kennel is FOUND one; one with a kennel moves.
      if (facts.stays.length > 0 && facts.kennelLabel) {
        return (
          <Button
            variant="quiet"
            size="bd-34"
            onClick={() => openDialog("moveKennel")}
          >
            {t("moveKennel")}
          </Button>
        );
      }
      if (booking.status === "confirmed") {
        return (
          <Button
            variant="quiet"
            size="bd-34"
            loading={find.isPending}
            onClick={() =>
              find.mutate(booking.id, {
                onSuccess: (kennel) =>
                  kennel
                    ? toast.success(
                        kennelFill("foundKennel", { pet: d.petName, kennel }),
                      )
                    : toast.error(
                        kennelFill("noFreeKennel", { pet: d.petName }),
                      ),
                onError: (error) =>
                  toast.error(kennelFill("findFailed", { pet: d.petName }), {
                    description: error.message,
                  }),
              })
            }
          >
            {t("findKennel")}
          </Button>
        );
      }
      return null;
    }
    if (card.action === "changeGroup" && d.departing) {
      return (
        <Button
          variant="quiet"
          size="bd-34"
          onClick={() => openDialog("changeGroup")}
        >
          {t("changeGroup")}
        </Button>
      );
    }
    if (card.action === "reschedule" && onReschedule) {
      return (
        <Button variant="quiet" size="bd-34" onClick={onReschedule}>
          {t("menuReschedule")}
        </Button>
      );
    }
    return null;
  })();

  const rows: [string, string][] = (() => {
    switch (d.kind) {
      case "boarding": {
        const nights = Math.max(
          0,
          Math.round(
            (Date.parse(`${booking.endDate}T00:00:00Z`) -
              Date.parse(`${booking.startDate}T00:00:00Z`)) /
              86_400_000,
          ),
        );
        return [
          [
            t("detailsCheckIn"),
            dayAndTime(booking.startDate, booking.checkInTime),
          ],
          [
            t("detailsCheckOut"),
            dayAndTime(booking.endDate, booking.checkOutTime),
          ],
          [t("rowKennel"), facts.kennelLabel ?? t("unassigned")],
          [t("rowNights"), String(nights)],
          [t("rowBookedBy"), bookedBy()],
        ];
      }
      case "daycare": {
        const pass = passFor();
        const pickups = [
          client.name,
          ...(client.additionalContacts ?? [])
            .filter((c) => c.tags?.includes("pickup"))
            .map((c) => c.name),
        ];
        return [
          [t("rowDropOff"), time(booking.checkInTime) || DASH],
          [t("rowPickUpBy"), time(booking.checkOutTime) || DASH],
          [
            t("rowPlaygroup"),
            facts.daycareVisit?.playGroup || t("notAssigned"),
          ],
          [t("rowPackage"), pass ?? DASH],
          [t("rowPickedUpBy"), formatList(pickups, locale, "disjunction")],
        ];
      }
      case "grooming": {
        const groom = facts.grooming;
        return [
          [t("rowDate"), formatCalendarDayLong(booking.startDate, locale)],
          [
            t("rowTime"),
            [time(booking.checkInTime), time(booking.checkOutTime)]
              .filter(Boolean)
              .join(" – ") || DASH,
          ],
          [t("rowGroomer"), groom?.stylistName || t("unassigned")],
          [t("rowTable"), facts.stationName ?? t("autoAssigned")],
          [
            t("rowPickup"),
            client.phone?.trim()
              ? fill("pickupTextWhenReady", { name: client.name })
              : t("pickupCallWhenReady"),
          ],
        ];
      }
      case "training": {
        const training = facts.training;
        const series = training?.series;
        const sessions = training?.sessions ?? [];
        const current = sessions.find(
          (s) => s.id === training?.currentSessionId,
        );
        const isToday = booking.startDate === d.logDay;
        const left = current
          ? sessions.filter((s) => s.number >= current.number).length
          : null;
        return [
          [
            t("rowProgram"),
            series
              ? fill("programSessions", {
                  name: series.name,
                  n: series.numberOfSessions,
                })
              : booking.serviceType || d.serviceLabel,
          ],
          [
            isToday ? t("rowToday") : t("rowSession"),
            current
              ? fill("sessionNumber", { n: current.number })
              : formatCalendarDayLong(booking.startDate, locale),
          ],
          [
            t("rowTrainer"),
            series?.trainerName || booking.assignedStaff || t("unassigned"),
          ],
          [t("rowLocation"), series?.locationName || DASH],
          [
            t("rowSessionsLeft"),
            left === null
              ? DASH
              : fill(isToday ? "sessionsLeftToday" : "sessionsLeft", {
                  n: left,
                }),
          ],
        ];
      }
      default:
        return [
          [t("rowDate"), formatCalendarDayLong(booking.startDate, locale)],
          [t("rowTime"), time(booking.checkInTime) || DASH],
          [t("rowBookedBy"), bookedBy()],
        ];
    }
  })();

  function bookedBy() {
    const who = facts.bookedBy?.who;
    if (!who) return DASH;
    return facts.bookedBy?.online ? fill("bookedOnline", { who }) : who;
  }

  function passFor(): string | null {
    for (const pkg of packages.data ?? []) {
      const used = pkg.redemptions.find((r) => r.bookingId === booking?.id);
      if (used) {
        return fill("passLeftAfter", {
          name: pkg.packageName,
          n: Math.max(0, pkg.passesTotal - used.passNumber),
        });
      }
    }
    return null;
  }

  return (
    <DetailsCard>
      <DetailsCardHeader
        title={t(`card${card.title[0].toUpperCase()}${card.title.slice(1)}`)}
      >
        {action}
      </DetailsCardHeader>
      <dl className="flex flex-col px-5 pt-2 pb-3.5">
        {rows.map(([label, value]) => (
          <DetailsRow key={label} label={label}>
            {value}
          </DetailsRow>
        ))}
        {booking.specialRequests ? (
          <DetailsRow label={t("detailsRequests")}>
            {booking.specialRequests}
          </DetailsRow>
        ) : null}
      </dl>
    </DetailsCard>
  );
}
