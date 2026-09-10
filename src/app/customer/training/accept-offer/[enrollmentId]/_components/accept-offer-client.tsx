"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlarmClock,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  GraduationCap,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trainingQueries } from "@/lib/api/training";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import {
  formatDateLong,
  formatDuration,
  formatMoney,
  formatTimeOfDay,
  formatWeekday,
} from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";
import type { AppLocale } from "@/lib/language-settings";
import type {
  TrainingEnrollment,
  WaitlistOffer,
} from "@/lib/training-enrollment";

interface Props {
  enrollmentId: string;
}

// A hand-rolled 12-hour clock, an en-US date and an English "2h 5m" lived
// here. They are formatTimeOfDay, formatDateLong and formatDuration now —
// "14 h 30" and "2 h 05" in French (§5q).
function formatRemaining(ms: number, locale: AppLocale): string {
  return formatDuration(Math.max(0, Math.floor(ms / 60_000)), locale);
}

export function AcceptOfferClient({ enrollmentId }: Props) {
  const { t, fill, locale } = useCustomerText("training");
  const queryClient = useQueryClient();
  const { data: enrollments = [] } = useQuery(
    trainingQueries.allSeriesEnrollments(),
  );
  const { data: seriesList = [] } = useQuery(trainingQueries.series());

  const enrollment = useMemo(
    () => enrollments.find((e) => e.id === enrollmentId),
    [enrollments, enrollmentId],
  );
  const series = useMemo(
    () =>
      enrollment
        ? seriesList.find((s) => s.id === enrollment.seriesId)
        : undefined,
    [seriesList, enrollment],
  );

  const [submitting, setSubmitting] = useState(false);
  // Tick once per minute so the "expires in" line stays honest while the
  // confirmation page is open.
  const [, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const nowMs = Date.now();

  function updateOfferInCaches(
    update: (e: TrainingEnrollment) => TrainingEnrollment,
  ) {
    const cache = queryClient.getQueryCache();
    cache
      .findAll({ queryKey: ["training", "series-enrollments"] })
      .forEach((query) => {
        queryClient.setQueryData<TrainingEnrollment[]>(
          query.queryKey,
          (prev = []) =>
            prev.map((e) => (e.id === enrollmentId ? update(e) : e)),
        );
      });
    cache.findAll({ queryKey: ["training", "series"] }).forEach((query) => {
      const key = query.queryKey;
      if (key[3] !== "enrollments") return;
      queryClient.setQueryData<TrainingEnrollment[]>(key, (prev = []) =>
        prev.map((e) => (e.id === enrollmentId ? update(e) : e)),
      );
    });
  }

  if (!enrollment || !series) {
    return (
      <CenteredCard>
        <div className="space-y-3 text-center">
          <AlarmClock className="text-muted-foreground/40 mx-auto size-10" />
          <h1 className="text-lg font-semibold">{t("offerNotFound")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("offerNotFoundBody")}
          </p>
          <Button asChild variant="outline" className="mt-2">
            <Link href="/customer/training">
              <ArrowLeft className="mr-1.5 size-4" />
              {t("offerBackToPortal")}
            </Link>
          </Button>
        </div>
      </CenteredCard>
    );
  }

  const offer = enrollment.offer;
  const offerState = describeOfferState(offer, nowMs);
  // Capture identifiers so the closure below doesn't have to re-narrow
  // `enrollment` (TypeScript drops the narrowing across the function
  // boundary, and the early return above already guards against undefined).
  const confirmedPetName = enrollment.petName;
  const confirmedSeriesName = enrollment.seriesName;

  function handleConfirm() {
    if (!offer || offer.outcome !== "active") return;
    setSubmitting(true);
    const nowISO = new Date().toISOString();
    updateOfferInCaches((e) => ({
      ...e,
      status: "enrolled",
      enrollmentDate: nowISO.slice(0, 10),
      paymentStatus: e.paymentStatus === "unpaid" ? "deposit" : e.paymentStatus,
      offer: e.offer
        ? {
            ...e.offer,
            outcome: "accepted",
            acceptedAtISO: nowISO,
          }
        : undefined,
      updatedAt: nowISO,
    }));
    toast.success(
      fill("offerYoureInToast", {
        pet: confirmedPetName,
        series: confirmedSeriesName,
      }),
      {
        description: t("offerConfirmationEmail"),
        duration: 6_000,
      },
    );
    setSubmitting(false);
  }

  // Already accepted view.
  if (offer?.outcome === "accepted" || enrollment.status === "enrolled") {
    return (
      <CenteredCard>
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="size-6" />
            </div>
            <h1 className="text-xl font-semibold">{t("offerYoureIn")}</h1>
            <p className="text-muted-foreground text-sm">
              {fill("offerEnrolledSeeYou", {
                pet: enrollment.petName,
                series: enrollment.seriesName,
                date: formatDateLong(series.startDate, locale),
              })}
            </p>
          </div>
          <SeriesSummary enrollment={enrollment} series={series} />
          <Button asChild className="w-full">
            <Link href="/customer/training">
              <ArrowLeft className="mr-1.5 size-4" />
              {t("offerOpenPortal")}
            </Link>
          </Button>
        </div>
      </CenteredCard>
    );
  }

  // Expired / cancelled view.
  if (!offer || offer.outcome === "expired" || offer.outcome === "cancelled") {
    return (
      <CenteredCard>
        <div className="space-y-3 text-center">
          <AlarmClock className="mx-auto size-10 text-rose-500" />
          <h1 className="text-lg font-semibold">{t("offerClosed")}</h1>
          <p className="text-muted-foreground text-sm">
            {offer?.outcome === "cancelled"
              ? t("offerCancelledBody")
              : t("offerExpiredBody")}
          </p>
          <Button asChild variant="outline">
            <Link href="/customer/training">
              <ArrowLeft className="mr-1.5 size-4" />
              {t("offerBackToPortal")}
            </Link>
          </Button>
        </div>
      </CenteredCard>
    );
  }

  // Active offer — the main confirm view.
  return (
    <div className="mx-auto w-full max-w-xl space-y-4 p-4 sm:p-6">
      <div className="space-y-1.5 text-center">
        <Badge
          variant="outline"
          className="gap-1 border-amber-200 bg-amber-50 text-amber-800"
        >
          <Sparkles className="size-3" />
          {fill("offerSpotOpened", { pet: enrollment.petName })}
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("offerConfirmTitle")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {rich(t("offerHolding"), {
            series: (
              <span className="text-foreground font-medium">
                {enrollment.seriesName}
              </span>
            ),
            remaining: (
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  offerState.urgent ? "text-rose-700" : "text-amber-700",
                )}
              >
                {formatRemaining(offerState.remainingMs, locale)}
              </span>
            ),
          })}
        </p>
      </div>

      <SeriesSummary enrollment={enrollment} series={series} />

      {/* "Payment step" — full payment integration is out of scope for the
          mock, so we surface a clear summary + a single confirm button. The
          enrollment details are already pre-filled. */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start gap-2">
            <CreditCard className="mt-0.5 size-4 shrink-0 text-indigo-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t("offerPayment")}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {enrollment.paymentStatus === "deposit"
                  ? fill("offerDepositDue", {
                      amount: formatMoney(
                        series.enrollmentRules.depositRequired,
                        locale,
                      ),
                    })
                  : enrollment.paymentStatus === "paid"
                    ? t("offerPaymentOnFile")
                    : fill("offerFullTuition", {
                        amount: formatMoney(
                          series.enrollmentRules.fullPaymentAmount,
                          locale,
                        ),
                      })}
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <CheckCircle2 className="mr-1.5 size-4" />
            {t("offerConfirmButton")}
          </Button>
          <p className="text-muted-foreground text-center text-[11px]">
            {fill("offerByConfirming", { pet: enrollment.petName })}
          </p>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-center text-[11px]">
        {t("offerNotTheRightTime")}
      </p>
    </div>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md p-4 sm:p-6">
      <Card>
        <CardContent className="p-5">{children}</CardContent>
      </Card>
    </div>
  );
}

function SeriesSummary({
  enrollment,
  series,
}: {
  enrollment: TrainingEnrollment;
  series: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    numberOfWeeks: number;
    instructorName: string;
    location: string;
    startDate: string;
    seriesName: string;
  };
}) {
  const { t, fill, locale } = useCustomerText("training");
  return (
    <Card>
      <CardContent className="space-y-2 p-4 text-sm">
        <p className="text-base font-semibold">{enrollment.seriesName}</p>
        <ul className="space-y-1.5 text-slate-700">
          <li className="flex items-center gap-2">
            <CalendarDays className="text-muted-foreground size-4" />
            <span>
              {rich(t("offerStarts"), {
                date: (
                  <span className="font-semibold">
                    {formatDateLong(series.startDate, locale)}
                  </span>
                ),
              })}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Clock className="text-muted-foreground size-4" />
            <span>
              {fill("offerEveryWeekday", {
                day: formatWeekday(series.dayOfWeek, locale, "long"),
              })}{" "}
              · {formatTimeOfDay(series.startTime, locale)}
              {series.numberOfWeeks > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  ·{" "}
                  {fill(
                    series.numberOfWeeks === 1 ? "offerWeekOne" : "offerWeeks",
                    { n: series.numberOfWeeks },
                  )}
                </span>
              )}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <GraduationCap className="text-muted-foreground size-4" />
            <span>{series.instructorName}</span>
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="text-muted-foreground size-4" />
            <span>{series.location}</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

function describeOfferState(
  offer: WaitlistOffer | undefined,
  nowMs: number,
): { remainingMs: number; urgent: boolean } {
  if (!offer || offer.outcome !== "active") {
    return { remainingMs: 0, urgent: false };
  }
  const expiresMs = new Date(offer.expiresAtISO).getTime();
  const remainingMs = Math.max(0, expiresMs - nowMs);
  return {
    remainingMs,
    urgent: remainingMs <= 60 * 60 * 1000, // last hour
  };
}
