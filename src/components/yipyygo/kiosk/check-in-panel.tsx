"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
} from "lucide-react";

import { CheckedIn } from "@/components/icons/yipyy-icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RouteState } from "@/components/ui/route-state";
import type { YipyyGoArrival } from "@/lib/api/mappers/yipyy-go";
import { yipyyGoQueries, type StaffYipyyGoBooking } from "@/lib/api/yipyy-go";
import { formatList, formatTime } from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import { useStaffText } from "@/lib/staff/use-staff-text";

import { PetCheckSection, SATISFIED, type PetCheck } from "./pet-check";
import { PresenceChip } from "./status-chips";
import { useKioskCheckIn, type KioskFailure } from "./use-kiosk-check-in";

const FAILURE_KEYS: Record<Exclude<KioskFailure, "reason_required">, string> = {
  needs_kennel: "errorNeedsKennel",
  not_allowed: "errorNotAllowed",
  cannot_now: "errorCannotNow",
  no_writer: "errorNoWriter",
  failed: "errorFailed",
};

const UNCHECKED: PetCheck = {
  medicationsConfirmed: false,
  belongingsConfirmed: false,
  overrideReason: "",
};

// One booking at the desk: every dog on it, then one check-in for all of them.
export function CheckInPanel({
  bookingRef,
  source,
  onBack,
}: {
  bookingRef: number;
  source: "code" | "search";
  onBack: () => void;
}) {
  const { t } = useStaffText("kiosk");
  const booking = useQuery(yipyyGoQueries.booking(bookingRef));
  const arrivals = useQuery(yipyyGoQueries.arrivals(String(bookingRef)));
  const arrival = arrivals.data?.find((row) => row.bookingRef === bookingRef);

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="-ml-3">
        <ArrowLeft aria-hidden />
        {t("backToArrivals")}
      </Button>
      {booking.isPending ? (
        <RouteState
          surface="card"
          pose="loading"
          icon={LoaderCircle}
          inkClassName="text-primary"
          title={t("loadingBooking")}
          description={t("description")}
          spin
        />
      ) : booking.isError ? (
        <RouteState
          surface="card"
          pose="error"
          icon={CircleAlert}
          inkClassName="text-destructive"
          title={t("bookingFailedTitle")}
          description={t("errorFailed")}
          action={{
            label: t("loadBookingAgain"),
            onClick: () => void booking.refetch(),
          }}
        />
      ) : (
        <BookingCheckIn
          data={booking.data}
          arrival={arrival}
          source={source}
          onBack={onBack}
        />
      )}
    </div>
  );
}

function BookingCheckIn({
  data,
  arrival,
  source,
  onBack,
}: {
  data: StaffYipyyGoBooking;
  arrival: YipyyGoArrival | undefined;
  source: "code" | "search";
  onBack: () => void;
}) {
  const { t, fill, locale } = useStaffText("kiosk");
  const run = useKioskCheckIn(data.booking.ref, data.booking.service);
  const [checks, setChecks] = useState<Record<number, PetCheck>>({});
  const [tried, setTried] = useState(false);
  const required =
    data.requirement === null ? null : data.requirement === "mandatory";
  const pets = formatList(
    data.pets.map((pet) => pet.name),
    locale,
  );
  const checkOf = (ref: number) => checks[ref] ?? UNCHECKED;
  const needsReason = (pet: StaffYipyyGoBooking["pets"][number]) =>
    required === true && !SATISFIED.has(pet.submission?.status ?? "");
  const reasonMissing = (pet: StaffYipyyGoBooking["pets"][number]) =>
    (tried || run.failure === "reason_required") &&
    needsReason(pet) &&
    !checkOf(pet.ref).overrideReason.trim();

  if (run.done) {
    return (
      <RouteState
        surface="card"
        pose="success"
        icon={CircleCheck}
        inkClassName="text-success"
        title={fill("checkedInTitle", { pets })}
        description={t("checkedInText")}
        action={{ label: t("backToArrivals"), onClick: onBack }}
      />
    );
  }

  const send = () => {
    setTried(true);
    if (
      data.pets.some(
        (pet) => needsReason(pet) && !checkOf(pet.ref).overrideReason.trim(),
      )
    )
      return;
    void run.checkIn(
      data.pets.map((pet) => {
        const check = checkOf(pet.ref);
        return {
          petRef: pet.ref,
          medicationsConfirmed: check.medicationsConfirmed,
          belongingsConfirmed: check.belongingsConfirmed,
          ...(needsReason(pet)
            ? { overrideReason: check.overrideReason.trim() }
            : {}),
        };
      }),
      source,
    );
  };

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h2 className="text-heading text-[22px] font-bold text-balance">
          {arrival?.clientName
            ? fill("petsWith", { pets, client: arrival.clientName })
            : pets}
        </h2>
        <p className="text-ink-secondary text-[14.5px] tabular-nums">
          {[
            serviceTypeLabel(locale, data.booking.service),
            formatTime(data.booking.startAt, locale),
            fill("bookingNumber", { ref: data.booking.ref }),
          ].join(" · ")}
        </p>
        {arrival && <PresenceChip presence={arrival.presence} />}
      </header>

      {data.pets.map((pet) => (
        <PetCheckSection
          key={pet.ref}
          pet={pet}
          required={required}
          check={checkOf(pet.ref)}
          reasonMissing={reasonMissing(pet)}
          onChange={(next) =>
            setChecks((current) => ({
              ...current,
              [pet.ref]: { ...checkOf(pet.ref), ...next },
            }))
          }
        />
      ))}

      {run.failure && run.failure !== "reason_required" && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{fill("notCheckedInTitle", { pets })}</AlertTitle>
          <AlertDescription>{t(FAILURE_KEYS[run.failure])}</AlertDescription>
        </Alert>
      )}

      {arrival?.presence === "on-site" ? (
        <p className="text-ink-secondary text-[14.5px]">
          {t("alreadyCheckedIn")}
        </p>
      ) : (
        <Button
          size="prominent"
          onClick={send}
          loading={run.pending}
          className="w-full sm:w-auto"
        >
          <CheckedIn aria-hidden />
          {fill("checkIn", { pets })}
        </Button>
      )}
    </div>
  );
}
