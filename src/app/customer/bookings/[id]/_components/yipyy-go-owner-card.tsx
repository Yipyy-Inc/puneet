"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CircleAlert,
  CircleCheck,
  Clock3,
  FileText,
  QrCode,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { customerYipyyGoBookingQueries } from "@/lib/api/customer-yipyy-go";
import type { YipyyGoSubmissionStatus } from "@/lib/api/mappers/yipyy-go";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatDateLong, formatMoney, formatTime } from "@/lib/i18n/format";

// ============================================================================
// The pre-arrival form on the owner's booking page.
//
// Each dog on the booking, where its form stands, and the one next step — to
// start it, carry on, or change what was sent while it is still open. The
// facility's request for changes is quoted, what the forms put on the bill is
// listed, and the owner reaches their check-in code from here.
//
// It replaces a card that read a fixture form store and drew a QR code from a
// token that only existed in that browser. The code is not drawn inline any
// more: showing a code issues a new one, so it waits for the owner to ask.
// ============================================================================

type Chip = {
  variant: "confirmed" | "pending" | "overdue";
  icon: typeof CircleCheck;
  key: string;
};

const CHIP: Record<YipyyGoSubmissionStatus | "not_started", Chip> = {
  not_started: { variant: "pending", icon: Clock3, key: "ygStatusNotStarted" },
  draft: { variant: "pending", icon: Clock3, key: "ygStatusDraft" },
  changes_requested: {
    variant: "overdue",
    icon: CircleAlert,
    key: "ygStatusChangesRequested",
  },
  submitted: {
    variant: "confirmed",
    icon: CircleCheck,
    key: "ygStatusSubmitted",
  },
  approved: {
    variant: "confirmed",
    icon: CircleCheck,
    key: "ygStatusApproved",
  },
  completed_by_staff: {
    variant: "confirmed",
    icon: CircleCheck,
    key: "ygStatusCompletedByStaff",
  },
};

interface Props {
  bookingRef: number;
  requirement: "mandatory" | "optional";
}

export function YipyyGoOwnerCard({ bookingRef, requirement }: Props) {
  const { t, fill, locale } = useCustomerText("bookingDetail");
  const { data, error, isPending } = useQuery(
    customerYipyyGoBookingQueries.booking(bookingRef),
  );

  if (isPending) {
    return (
      <section
        aria-busy="true"
        aria-label={t("ygLoading")}
        className="border-line bg-card shadow-card space-y-3 rounded-2xl border p-5"
      >
        <Skeleton className="h-5 w-40 rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </section>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <CircleAlert aria-hidden />
        <AlertTitle>{t("ygLoadFailedTitle")}</AlertTitle>
        <AlertDescription>{t("ygLoadFailed")}</AlertDescription>
      </Alert>
    );
  }

  const anyOpen = data.pets.some((pet) => pet.editable);
  const onBill = data.charges.filter((charge) => charge.onBill);

  return (
    <section
      aria-labelledby="yipyy-go-owner-title"
      className="border-line bg-card shadow-card space-y-4 rounded-2xl border p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2
            id="yipyy-go-owner-title"
            className="text-heading text-[17px] font-bold"
          >
            {t("ygTitle")}
          </h2>
          <p className="text-ink-tertiary mt-0.5 text-[13.5px]">
            {data.deadline && anyOpen
              ? fill("ygOpenUntil", {
                  date: formatDateLong(data.deadline, locale),
                  time: formatTime(data.deadline, locale),
                })
              : t("ygClosed")}
          </p>
        </div>
        <p className="text-ink-secondary text-[13.5px] font-semibold">
          {requirement === "mandatory" ? t("ygRequired") : t("ygOptional")}
        </p>
      </div>

      <ul className="divide-line divide-y">
        {data.pets.map((pet) => {
          const status = pet.submission?.status ?? "not_started";
          const chip = CHIP[status];
          const Icon = chip.icon;
          const action =
            status === "not_started"
              ? "ygStart"
              : status === "submitted"
                ? "ygEdit"
                : "ygContinue";
          return (
            <li key={pet.ref} className="flex min-h-12 flex-col gap-2 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-body-ink truncate text-[15px] font-semibold">
                    {pet.name}
                  </span>
                  <Badge variant={chip.variant}>
                    <Icon aria-hidden />
                    {t(chip.key)}
                  </Badge>
                </div>
                {pet.editable && (
                  <Button variant="outline" asChild>
                    <Link
                      href={`/customer/bookings/${bookingRef}/yipyygo-form?pet=${pet.ref}`}
                    >
                      <FileText aria-hidden />
                      {fill(action, { pet: pet.name })}
                    </Link>
                  </Button>
                )}
              </div>
              {status === "changes_requested" &&
                pet.submission?.changesMessage && (
                  <p className="text-body-ink text-[14.5px]">
                    {fill("ygChangesAsked", {
                      message: pet.submission.changesMessage,
                    })}
                  </p>
                )}
            </li>
          );
        })}
      </ul>

      {onBill.length > 0 && (
        <div className="space-y-1">
          <p className="text-ink-tertiary text-[12px] font-bold tracking-[.06em] uppercase">
            {t("ygOnBill")}
          </p>
          <ul className="space-y-1">
            {onBill.map((charge) => (
              <li
                key={charge.key}
                className="text-body-ink flex justify-between gap-3 text-[14.5px] tabular-nums"
              >
                <span className="min-w-0 truncate">
                  {charge.name} × {charge.quantity}
                </span>
                <span>
                  {formatMoney(charge.unitPrice * charge.quantity, locale)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.booking.tipAmount !== null && data.booking.tipAmount > 0 && (
        <p className="text-ink-secondary text-[14.5px] tabular-nums">
          {fill("ygTipPledged", {
            amount: formatMoney(data.booking.tipAmount, locale),
          })}
        </p>
      )}

      <Button variant="outline" asChild>
        <Link href={`/customer/bookings/${bookingRef}/check-in-qr`}>
          <QrCode aria-hidden />
          {t("ygShowCode")}
        </Link>
      </Button>
    </section>
  );
}
