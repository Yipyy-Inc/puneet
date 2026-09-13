"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Clock, LoaderCircle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RouteState } from "@/components/ui/route-state";
import { FormStatusChip } from "@/components/yipyygo/form-status-chip";
import type { YipyyGoArrival } from "@/lib/api/mappers/yipyy-go";
import { yipyyGoQueries } from "@/lib/api/yipyy-go";
import { formatList, formatTime } from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import { useStaffText } from "@/lib/staff/use-staff-text";

import { PresenceChip } from "./status-chips";

// Today’s arrivals at this facility (yipyy_go_arrivals), or those matching
// what the desk typed: a client’s or a pet’s name, or a booking number. The
// page this replaces searched src/data/bookings, pinned to fixture facility 11.
export function ArrivalList({
  query,
  onOpen,
}: {
  query: string;
  onOpen: (arrival: YipyyGoArrival) => void;
}) {
  const { t, fill, locale } = useStaffText("kiosk");
  const arrivals = useQuery(yipyyGoQueries.arrivals(query));

  if (arrivals.isPending) {
    return (
      <RouteState
        surface="card"
        pose="loading"
        icon={LoaderCircle}
        inkClassName="text-primary"
        title={t("loadingArrivals")}
        description={t("description")}
        spin
      />
    );
  }
  if (arrivals.isError) {
    return (
      <RouteState
        surface="card"
        pose="error"
        icon={CircleAlert}
        inkClassName="text-destructive"
        title={t("arrivalsFailedTitle")}
        description={t("arrivalsFailedText")}
        action={{
          label: t("loadArrivalsAgain"),
          onClick: () => void arrivals.refetch(),
        }}
      />
    );
  }
  if (arrivals.data.length === 0) {
    return query ? (
      <RouteState
        surface="card"
        pose="searching"
        icon={Search}
        inkClassName="text-ink-secondary"
        title={fill("noMatchTitle", { query })}
        description={t("noMatchText")}
      />
    ) : (
      <RouteState
        surface="card"
        pose="waiting"
        icon={Clock}
        inkClassName="text-ink-secondary"
        title={t("noArrivalsTitle")}
        description={t("noArrivalsText")}
      />
    );
  }

  return (
    <ul className="space-y-2">
      {arrivals.data.map((arrival) => {
        const pets = formatList(
          arrival.pets.map((pet) => pet.name),
          locale,
        );
        return (
          <li
            key={arrival.bookingRef}
            className="border-line bg-card flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border px-4 py-3"
          >
            <div className="min-w-0 flex-[1_1_260px] space-y-1.5">
              <p className="text-body-ink text-[15px] font-semibold">
                {arrival.clientName
                  ? fill("petsWith", { pets, client: arrival.clientName })
                  : pets}
              </p>
              <p className="text-ink-secondary text-[13.5px] tabular-nums">
                {[
                  serviceTypeLabel(locale, arrival.service),
                  formatTime(arrival.startAt, locale),
                  fill("bookingNumber", { ref: arrival.bookingRef }),
                ].join(" · ")}
              </p>
              <div className="flex flex-wrap gap-2">
                {arrival.requirement && (
                  <FormStatusChip
                    status={arrival.formStatus}
                    mandatory={arrival.requirement === "mandatory"}
                  />
                )}
                <PresenceChip presence={arrival.presence} />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => onOpen(arrival)}
              disabled={
                arrival.presence === "on-site" ||
                arrival.presence === "departed"
              }
            >
              {fill("startCheckIn", { pets })}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
