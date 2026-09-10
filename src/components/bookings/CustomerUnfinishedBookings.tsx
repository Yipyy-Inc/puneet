"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Clock,
  Scissors,
  Home,
  GraduationCap,
  Calendar,
  Dog,
  Inbox,
} from "lucide-react";
import type {
  UnfinishedBooking,
  AbandonmentStep,
} from "@/types/unfinished-booking";
import { ABANDONMENT_STEP_LABELS } from "@/data/unfinished-bookings";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import type { AppLocale } from "@/lib/language-settings";
import {
  formatDateLong,
  formatPercent,
  formatRelative,
} from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import { rich } from "@/lib/i18n/rich";

interface Props {
  bookings: UnfinishedBooking[];
}

function getServiceIcon(service?: string) {
  switch (service?.toLowerCase()) {
    case "grooming":
      return Scissors;
    case "boarding":
      return Home;
    case "training":
      return GraduationCap;
    case "daycare":
      return Dog;
    default:
      return Calendar;
  }
}

function ProgressBar({ step }: { step: AbandonmentStep }) {
  const { t, locale } = useCustomerText("bookings");
  // The PROGRESS still comes from the table; the words come from the
  // catalogue, keyed by the step the record carries.
  const { progress } = ABANDONMENT_STEP_LABELS[step];
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {rich(t("leftAt"), {
            step: (
              <span className="text-foreground font-medium">
                {t(`abandon_${step}`)}
              </span>
            ),
          })}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {formatPercent(progress, locale)}
        </span>
      </div>
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div
          className="h-full rounded-full bg-linear-to-r from-amber-400 to-amber-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * "Started 2 hours ago" · "Started Sep 1, 2026".
 *
 * This was the SIXTH hand-rolled relative clock in the customer portal, and
 * the worst: it measured from a hard-coded `new Date("2026-04-11")`, so every
 * "Started N days ago" was counted from that April morning rather than from
 * now. It is formatRelative against the real clock, and past 24 hours — §5q —
 * it is a date.
 */
function startedLabel(
  iso: string,
  locale: AppLocale,
  fill: (key: string, values: Record<string, string | number>) => string,
): string {
  const withinADay =
    Math.abs(Date.now() - new Date(iso).getTime()) < 24 * 60 * 60 * 1000;
  return withinADay
    ? fill("startedRelative", { when: formatRelative(iso, locale) })
    : fill("startedOn", { date: formatDateLong(iso, locale) });
}

function formatDate(iso: string, locale: AppLocale): string {
  return formatDateLong(iso + "T00:00:00", locale);
}

export function CustomerUnfinishedBookings({ bookings }: Props) {
  // Above the empty-state return, so the hook order is the same either way.
  const { t, fill, locale } = useCustomerText("bookings");
  if (bookings.length === 0) {
    return (
      <div className="py-16 text-center">
        <Inbox className="text-muted-foreground mx-auto mb-4 size-12" />
        <h3 className="mb-2 text-lg font-semibold">{t("noUnfinishedTitle")}</h3>
        <p className="text-muted-foreground text-sm">{t("noUnfinishedBody")}</p>
      </div>
    );
  }

  // A species the record carries as a word — "dog" — reads in the reader's
  // language; one nobody mapped reads as the record has it.
  const speciesLabel = (species: string) => {
    const key = `species_${species.toLowerCase()}`;
    const label = t(key);
    return label === key ? species : label;
  };

  return (
    <div className="space-y-4">
      {/* Contextual nudge */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/20">
        <Clock className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          {rich(t(bookings.length === 1 ? "unfinishedOne" : "unfinishedMany"), {
            count: <span className="font-semibold">{bookings.length}</span>,
          })}
        </p>
      </div>

      <div className="grid gap-4">
        {bookings.map((booking) => {
          const ServiceIcon = getServiceIcon(booking.service);

          return (
            <Card
              key={booking.id}
              className="overflow-hidden transition-shadow hover:shadow-md"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  {/* Service icon + info */}
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                      <ServiceIcon className="size-5 text-amber-600" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">
                          {booking.service
                            ? serviceTypeLabel(locale, booking.service)
                            : t("reservationFallback")}
                          {booking.serviceType && (
                            <span className="text-muted-foreground ml-1 font-normal">
                              · {booking.serviceType.replace(/_/g, " ")}
                            </span>
                          )}
                        </h3>
                        <Badge
                          variant="outline"
                          className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                        >
                          {t("unfinishedBadge")}
                        </Badge>
                      </div>

                      {booking.petName && (
                        <p className="text-muted-foreground text-sm">
                          {rich(t("forPet"), {
                            pet: (
                              <span className="text-foreground font-medium">
                                {booking.petName}
                              </span>
                            ),
                          })}
                          {booking.petType && (
                            <span> · {speciesLabel(booking.petType)}</span>
                          )}
                        </p>
                      )}

                      {booking.requestedStartDate && (
                        <p className="text-muted-foreground flex items-center gap-1 text-sm">
                          <Calendar className="size-3.5" />
                          {formatDate(booking.requestedStartDate, locale)}
                          {booking.requestedEndDate &&
                            booking.requestedEndDate !==
                              booking.requestedStartDate && (
                              <>
                                {" "}
                                → {formatDate(booking.requestedEndDate, locale)}
                              </>
                            )}
                        </p>
                      )}

                      <ProgressBar step={booking.abandonmentStep} />

                      <p className="text-muted-foreground text-xs">
                        {startedLabel(booking.abandonedAt, locale, fill)}
                      </p>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="shrink-0">
                    <Button asChild size="sm" className="gap-1.5">
                      <Link
                        href={`/customer/bookings/new?resumeBooking=${booking.id}`}
                      >
                        {t("resumeBooking")}
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
