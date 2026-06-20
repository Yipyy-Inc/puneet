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
import { getDayName } from "@/lib/training-series";
import type {
  TrainingEnrollment,
  WaitlistOffer,
} from "@/lib/training-enrollment";

interface Props {
  enrollmentId: string;
}

function formatLongDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map((p) => Number(p));
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0 minutes";
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 1) return `${hours}h ${minutes}m`;
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export function AcceptOfferClient({ enrollmentId }: Props) {
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
          <h1 className="text-lg font-semibold">Offer not found</h1>
          <p className="text-muted-foreground text-sm">
            This confirmation link may have expired or been re-issued. Contact
            the facility if you think this is a mistake.
          </p>
          <Button asChild variant="outline" className="mt-2">
            <Link href="/customer/training">
              <ArrowLeft className="mr-1.5 size-4" />
              Back to your training portal
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
      `You're in! ${confirmedPetName} is enrolled in ${confirmedSeriesName}.`,
      {
        description: "We'll send a confirmation email shortly.",
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
            <h1 className="text-xl font-semibold">You&apos;re in!</h1>
            <p className="text-muted-foreground text-sm">
              {enrollment.petName} is enrolled in {enrollment.seriesName}. See
              you on {formatLongDate(series.startDate)}.
            </p>
          </div>
          <SeriesSummary enrollment={enrollment} series={series} />
          <Button asChild className="w-full">
            <Link href="/customer/training">
              <ArrowLeft className="mr-1.5 size-4" />
              Open your training portal
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
          <h1 className="text-lg font-semibold">This offer has closed</h1>
          <p className="text-muted-foreground text-sm">
            {offer?.outcome === "cancelled"
              ? "The facility cancelled this invitation. Reach out if you'd like to re-join the waitlist."
              : "The hold window expired before we heard back. The spot has moved to the next person on the list — but you can re-join the waitlist for the next opening."}
          </p>
          <Button asChild variant="outline">
            <Link href="/customer/training">
              <ArrowLeft className="mr-1.5 size-4" />
              Back to your training portal
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
          <Sparkles className="size-3" />A spot opened up for{" "}
          {enrollment.petName}
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">
          Confirm your enrollment
        </h1>
        <p className="text-muted-foreground text-sm">
          We&apos;re holding{" "}
          <span className="text-foreground font-medium">
            {enrollment.seriesName}
          </span>{" "}
          for you for{" "}
          <span
            className={cn(
              "font-semibold tabular-nums",
              offerState.urgent ? "text-rose-700" : "text-amber-700",
            )}
          >
            {formatRemaining(offerState.remainingMs)}
          </span>
          .
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
              <p className="text-sm font-semibold">Payment</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {enrollment.paymentStatus === "deposit"
                  ? `A $${series.enrollmentRules.depositRequired} deposit is due to confirm — the balance bills before the first session.`
                  : enrollment.paymentStatus === "paid"
                    ? "Your payment is already on file from the original signup."
                    : `Full tuition: $${series.enrollmentRules.fullPaymentAmount}. We'll send a payment link after you confirm.`}
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
            Confirm enrollment
          </Button>
          <p className="text-muted-foreground text-center text-[11px]">
            By confirming, {enrollment.petName} is enrolled in this series. You
            can manage everything from your customer portal afterwards.
          </p>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-center text-[11px]">
        Not the right time? Let the offer expire and the spot will move to the
        next person on the waitlist.
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
  return (
    <Card>
      <CardContent className="space-y-2 p-4 text-sm">
        <p className="text-base font-semibold">{enrollment.seriesName}</p>
        <ul className="space-y-1.5 text-slate-700">
          <li className="flex items-center gap-2">
            <CalendarDays className="text-muted-foreground size-4" />
            <span>
              Starts{" "}
              <span className="font-semibold">
                {formatLongDate(series.startDate)}
              </span>
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Clock className="text-muted-foreground size-4" />
            <span>
              {getDayName(series.dayOfWeek)}s · {formatTime12(series.startTime)}
              {series.numberOfWeeks > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  · {series.numberOfWeeks} weeks
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
