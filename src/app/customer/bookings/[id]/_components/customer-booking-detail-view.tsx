"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CircleAlert,
  CircleHelp,
  Clock,
  Mail,
  Phone,
  QrCode,
  Receipt,
  RotateCcw,
  X,
  XCircle,
} from "lucide-react";

import { GroomingCheckInButton } from "@/components/grooming/GroomingCheckInButton";
import { BookingNoteDialog } from "@/components/customer/BookingNoteDialog";
import { CancelBookingDialog } from "@/components/customer/CancelBookingDialog";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PetAvatar } from "@/components/ui/pet-avatar";
import { RouteState } from "@/components/ui/route-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useHydrated } from "@/hooks/use-hydrated";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import { customerBookingQueries } from "@/lib/api/customer-bookings";
import { useCustomerFacility as useMyFacility } from "@/lib/api/customer-facility";
import { formatBookingRef } from "@/lib/booking-id";
import {
  bookingTiming,
  isAwaitingConfirmation,
  isCustomerCancellable,
} from "@/lib/bookings/booking-timing";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import {
  formatDateLong,
  formatTime,
  formatTimeOfDay,
  formatWeightFromLb,
} from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import { localToday } from "@/lib/vaccinations";
import type { Booking } from "@/types/booking";

import { BookingMoneyCard } from "./booking-money-card";
import { BookingNotesCard } from "./booking-notes-card";
import { YipyyGoOwnerCard } from "./yipyy-go-owner-card";

// ============================================================================
// One of the customer's bookings, from Postgres.
//
// It read the client's whole history to find one booking; showed money from
// a fixture invoice real bookings never carry, so no price appeared; answered
// an estimate with two toasts that changed nothing; decided "today" by UTC; and
// offered "Message us" into a fixture inbox. Now: the booking by its ref, its
// real price and balance, the facility's own phone and email, Cancel, notes
// and "Ask to change dates" that are rows, and the arrival-day tools on the
// booking's own day.
// ============================================================================

const FINISHED = new Set(["completed", "cancelled", "declined", "no_show"]);

export function CustomerBookingDetailView({ refParam }: { refParam: string }) {
  const { t, fill, locale } = useCustomerText("bookingDetail");
  const hydrated = useHydrated();
  const today = hydrated ? localToday() : "";
  const ref = /^\d{1,12}$/.test(refParam) ? Number(refParam) : -1;

  const { client: customer } = useCurrentCustomer();
  const facility = useMyFacility();
  const query = useQuery({
    ...customerBookingQueries.detail(ref),
    enabled: ref > 0,
  });

  const [cancelOpen, setCancelOpen] = useState(false);
  const [noteKind, setNoteKind] = useState<"note" | "change_dates" | null>(
    null,
  );

  if (ref <= 0 || query.data === null) {
    return (
      <RouteState
        surface="card"
        pose="confused"
        icon={CircleHelp}
        inkClassName="text-ink-secondary"
        title={t("notFound")}
        description={t("notFoundText")}
        action={{ label: t("backToBookings"), href: "/customer/bookings" }}
      />
    );
  }
  if (query.isError) {
    return (
      <RouteState
        surface="card"
        pose="error"
        icon={CircleAlert}
        inkClassName="text-destructive"
        title={t("loadFailedTitle")}
        description={t("loadFailedText")}
        action={{
          label: t("tryAgain"),
          onClick: () => void query.refetch(),
        }}
      />
    );
  }
  if (query.isPending || !today) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-64 rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-36 w-full rounded-3xl" />
      </div>
    );
  }

  const booking: Booking = query.data;
  const petId = Array.isArray(booking.petId) ? booking.petId[0] : booking.petId;
  const pet = customer?.pets.find((p) => p.id === petId);
  const petName = pet?.name ?? t("petFallback");
  const service = serviceTypeLabel(locale, booking.service);
  const timing = bookingTiming(booking, today);
  const awaiting = isAwaitingConfirmation(booking);
  const finished = FINISHED.has(booking.status);
  const cancellable = isCustomerCancellable(booking, today);
  const multiDay = booking.endDate && booking.endDate !== booking.startDate;
  const cancellation = booking.cancellation;

  const at = (day: string, time?: string) =>
    time
      ? fill("dateAtTime", {
          date: formatDateLong(day, locale),
          time: formatTimeOfDay(time, locale),
        })
      : formatDateLong(day, locale);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 md:p-6">
      <Button variant="ghost" asChild className="-ml-2">
        <Link href="/customer/bookings">
          <ArrowLeft className="size-4" aria-hidden />
          {t("backToBookings")}
        </Link>
      </Button>

      <PageHeader
        title={fill("pageTitle", { service, pet: petName })}
        description={formatBookingRef(booking.id)}
        inline={<StatusBadge type="status" value={booking.status} />}
      />

      {awaiting && booking.status !== "estimate_sent" && (
        <Notice icon={<Clock className="size-4" />} title={t("awaitingTitle")}>
          {fill("awaitingBody", {
            facility: facility?.name ?? t("theFacility"),
          })}
        </Notice>
      )}
      {booking.status === "estimate_sent" && (
        <Notice
          icon={<Receipt className="size-4" />}
          title={t("estimateTitle")}
          action={
            <Button variant="outline" asChild>
              <Link href="/customer/estimates">{t("seeEstimates")}</Link>
            </Button>
          }
        >
          {t("estimateSentBody")}
        </Notice>
      )}
      {booking.status === "cancelled" && (
        <Notice
          icon={
            cancellation?.late ? (
              <AlertTriangle className="text-warning size-4" />
            ) : (
              <XCircle className="size-4" />
            )
          }
          title={
            cancellation?.by === "customer"
              ? cancellation.withdrawal
                ? t("youWithdrew")
                : t("youCancelled")
              : t("cancelledTitle")
          }
        >
          {cancellation?.at &&
            `${formatDateLong(cancellation.at, locale)}, ${formatTime(cancellation.at, locale)}. `}
          {cancellation?.late &&
            (cancellation.feePercentage
              ? fill("cancelledLateFee", { fee: cancellation.feePercentage })
              : t("cancelledLateNoFee"))}
          {booking.cancellationReason && cancellation?.by !== "customer" && (
            <> {booking.cancellationReason}</>
          )}
        </Notice>
      )}

      <section className="bg-card border-line shadow-card rounded-3xl border p-5">
        <div className="flex items-center gap-4">
          <PetAvatar name={petName} src={pet?.imageUrl} size="lg" />
          <div className="min-w-0">
            <p className="text-body-ink text-[15px] font-semibold">{petName}</p>
            {pet && (
              <p className="text-ink-secondary text-[13.5px]">
                {[
                  pet.breed,
                  pet.sex === "male"
                    ? t("sexMale")
                    : pet.sex === "female"
                      ? t("sexFemale")
                      : null,
                  pet.weight ? formatWeightFromLb(pet.weight, locale) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        </div>
        <dl className="mt-4 space-y-1.5 text-[14.5px]">
          <Row
            label={multiDay ? t("checkIn") : t("date")}
            value={at(booking.startDate, booking.checkInTime)}
          />
          {multiDay ? (
            <Row
              label={t("checkOut")}
              value={at(booking.endDate, booking.checkOutTime)}
            />
          ) : (
            booking.checkInTime &&
            booking.checkOutTime && (
              <Row
                label={t("time")}
                value={`${formatTimeOfDay(booking.checkInTime, locale)} – ${formatTimeOfDay(booking.checkOutTime, locale)}`}
              />
            )
          )}
          {booking.kennel && <Row label={t("room")} value={booking.kennel} />}
          {facility?.name && <Row label={t("where")} value={facility.name} />}
        </dl>
        {booking.specialRequests && (
          <div className="border-line mt-4 border-t pt-3">
            <p className="text-ink-tertiary text-[12px] font-bold tracking-[.06em] uppercase">
              {t("specialRequests")}
            </p>
            <p className="text-body-ink mt-1 text-[14.5px]">
              {booking.specialRequests}
            </p>
          </div>
        )}
      </section>

      {timing === "today" && !finished && (
        <section className="bg-card border-line shadow-card space-y-3 rounded-3xl border p-5">
          <h2 className="text-heading text-[17px] font-bold">
            {t("todayTitle")}
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/customer/bookings/${booking.id}/check-in-qr`}>
                <QrCode className="size-4" aria-hidden />
                {t("showCode")}
              </Link>
            </Button>
          </div>
          {booking.service === "grooming" &&
            (booking.serviceType === "salon" || !booking.serviceType) &&
            booking.status === "confirmed" && (
              <GroomingCheckInButton bookingId={String(booking.id)} />
            )}
        </section>
      )}

      {booking.yipyyGo?.requirement && !finished && (
        <YipyyGoOwnerCard
          bookingRef={booking.id}
          requirement={booking.yipyyGo.requirement}
        />
      )}

      <BookingMoneyCard booking={booking} />

      <BookingNotesCard
        bookingRef={booking.id}
        canWrite={!finished}
        onNote={setNoteKind}
      />

      <div className="flex flex-wrap gap-2 pt-1">
        {cancellable && (
          <Button variant="outline" onClick={() => setCancelOpen(true)}>
            <X className="size-4" aria-hidden />
            {awaiting ? t("withdrawRequest") : t("cancelBooking")}
          </Button>
        )}
        {facility?.phone && (
          <Button variant="outline" asChild>
            <a href={`tel:${facility.phone}`}>
              <Phone className="size-4" aria-hidden />
              {fill("callFacility", { facility: facility.name })}
            </a>
          </Button>
        )}
        {facility?.email && (
          <Button variant="outline" asChild>
            <a href={`mailto:${facility.email}`}>
              <Mail className="size-4" aria-hidden />
              {t("emailFacility")}
            </a>
          </Button>
        )}
        {booking.status === "completed" && (
          <Button asChild>
            <Link href="/customer/bookings/new">
              <RotateCcw className="size-4" aria-hidden />
              {t("bookAgain")}
            </Link>
          </Button>
        )}
      </div>

      <CancelBookingDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        booking={booking}
        petName={petName}
      />
      <BookingNoteDialog
        open={noteKind !== null}
        onOpenChange={(open) => {
          if (!open) setNoteKind(null);
        }}
        kind={noteKind ?? "note"}
        booking={booking}
        petName={petName}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="text-body-ink text-right font-medium">{value}</dd>
    </div>
  );
}

// A white card with a hairline, the glyph in its own ink — §6 rule 2 allows
// no tint behind the words.
function Notice({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-line bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="text-ink-secondary mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-body-ink text-sm font-semibold">{title}</p>
          {children && <p className="text-ink-secondary text-sm">{children}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
