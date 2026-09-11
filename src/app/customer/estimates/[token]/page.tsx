"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Moon,
  UserPlus,
  CalendarCheck,
  LogIn,
  Check,
} from "lucide-react";
import { useEstimate, useEstimateMutations } from "@/lib/api/estimates";
import { useCustomerFacility } from "@/lib/api/customer-facility";
import { EstimatePdfDownload } from "@/components/estimates/EstimatePdfDownload";
import { AcceptEstimateDialog } from "@/components/customer/estimates/AcceptEstimateDialog";
import { DeclineEstimateDialog } from "@/components/customer/estimates/DeclineEstimateDialog";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import {
  formatDateLong,
  formatList,
  formatMoney,
  formatPercent,
  formatTimeOfDay,
} from "@/lib/i18n/format";

export default function CustomerEstimateViewPage() {
  const params = useParams();
  const token = params.token as string;
  const { t, fill, locale } = useCustomerText("estimates");

  // The estimate behind this link, from Postgres — the customer's own, or
  // none (RLS). It was a lookup in `@/data/estimates`, which matched a real
  // link to nothing and seven invented ones to somebody else's quote.
  const { estimate, pending } = useEstimate(token);
  // And the business it came from, through the customer's own client row —
  // it named "Example Pet Care Facility" from `@/data/settings`.
  const facility = useCustomerFacility();
  const facilityName = facility?.name ?? "";
  const { respond } = useEstimateMutations();

  // Opening the link is what the business sees as "viewed". Once per visit;
  // the function ignores a second view and anything not open.
  const viewed = useRef(false);
  useEffect(() => {
    if (!estimate || viewed.current || estimate.status !== "sent") return;
    viewed.current = true;
    respond.mutate({ id: estimate.id, action: "view" });
  }, [estimate, respond]);

  const [acceptOpen, setAcceptOpen] = useState(false);
  const [justAccepted, setJustAccepted] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [justDeclined, setJustDeclined] = useState(false);

  if (pending) {
    return <div className="min-h-screen" aria-busy="true" />;
  }

  if (!estimate) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <PageHeader
          title={t("estimateNotFound")}
          description={t("linkExpiredOrInvalid")}
        />
      </div>
    );
  }

  // Portal login that returns the customer to this estimate after signing in.
  const loginHref = `/customer/auth/login?from=estimate&redirect=${encodeURIComponent(
    `/customer/estimates/${token}`,
  )}`;

  const isExpired =
    estimate.expiresAt && new Date(estimate.expiresAt) < new Date();
  // Awaiting the customer's response — Accept/Decline are available.
  const awaiting = estimate.status === "sent" && !justAccepted && !justDeclined;
  const nights =
    estimate.service === "boarding" && estimate.startDate && estimate.endDate
      ? Math.max(
          1,
          Math.round(
            (new Date(estimate.endDate).getTime() -
              new Date(estimate.startDate).getTime()) /
              86400000,
          ),
        )
      : null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        {/* Card */}
        <div className="overflow-hidden rounded-2xl border bg-white shadow-lg">
          {/* Header */}
          <div className="border-b bg-slate-50 px-6 py-5 text-center">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              {facilityName}
            </p>
            <h1 className="mt-2 text-xl font-bold text-slate-800">
              {fill("estimateFor", {
                pets:
                  estimate.petNames.length > 0
                    ? formatList(estimate.petNames, locale)
                    : (estimate.guestPetInfo?.name ?? t("yourPet")),
              })}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {fill("preparedBy", {
                name: estimate.createdBy,
                date: formatDateLong(estimate.createdAt, locale),
              })}
            </p>
            {isExpired && (
              <Badge className="mt-2 bg-red-100 text-red-700">
                {t("expired")}
              </Badge>
            )}
            <div className="mt-3">
              <EstimatePdfDownload estimate={estimate} variant="outline" />
            </div>
          </div>

          {/* Service details */}
          <div className="space-y-4 px-6 py-5">
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-800">
                {serviceTypeLabel(locale, estimate.service)}
                {estimate.serviceType && ` — ${estimate.serviceType}`}
              </p>
              <div className="text-muted-foreground mt-2 space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="size-3.5" />
                  <span>
                    {estimate.endDate && estimate.endDate !== estimate.startDate
                      ? fill("dateRange", {
                          start: formatDateLong(estimate.startDate, locale),
                          end: formatDateLong(estimate.endDate, locale),
                        })
                      : formatDateLong(estimate.startDate, locale)}
                  </span>
                </div>
                {estimate.checkInTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="size-3.5" />
                    <span>
                      {fill("checkInAt", {
                        time: formatTimeOfDay(estimate.checkInTime, locale),
                      })}
                      {estimate.checkOutTime &&
                        ` · ${fill("checkOutAt", {
                          time: formatTimeOfDay(estimate.checkOutTime, locale),
                        })}`}
                    </span>
                  </div>
                )}
                {nights && (
                  <div className="flex items-center gap-2">
                    <Moon className="size-3.5" />
                    <span>
                      {fill(nights === 1 ? "nightOne" : "nightMany", {
                        n: nights,
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Line items */}
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500 uppercase">
                {t("pricing")}
              </p>
              <div className="space-y-2">
                {estimate.lineItems.map((li, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <span className="font-medium">{li.label}</span>
                      {li.description && (
                        <span className="text-muted-foreground ml-1.5 text-xs">
                          {li.description}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold tabular-nums">
                      {formatMoney(li.total, locale)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-3 space-y-1 border-t pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("subtotal")}</span>
                  <span className="tabular-nums">
                    {formatMoney(estimate.subtotal, locale)}
                  </span>
                </div>
                {estimate.discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>{t("discount")}</span>
                    <span className="tabular-nums">
                      {formatMoney(-estimate.discount, locale)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {fill("taxAt", {
                      rate: formatPercent(estimate.taxRate * 100, locale),
                    })}
                  </span>
                  <span className="tabular-nums">
                    {formatMoney(estimate.taxAmount, locale)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 text-lg font-bold">
                  <span>{t("estimatedTotal")}</span>
                  <span className="tabular-nums">
                    {formatMoney(estimate.total, locale)}
                  </span>
                </div>
                {estimate.depositRequired && estimate.depositRequired > 0 && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span className="font-medium">{t("depositRequired")}</span>
                    <span className="font-semibold tabular-nums">
                      {formatMoney(estimate.depositRequired, locale)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Public note */}
            {estimate.publicNote && (
              <div className="rounded-xl bg-amber-50 px-4 py-3">
                <p className="text-sm/relaxed text-amber-800 italic">
                  &ldquo;{estimate.publicNote}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* CTA */}
          {!isExpired && (
            <div className="border-t bg-slate-50 px-6 py-5">
              <div className="space-y-3 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  {awaiting ? t("readyToAccept") : t("readyToBook")}
                </p>

                {/* Primary: Accept this estimate (awaiting response) */}
                {awaiting && (
                  <Button
                    className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600"
                    size="lg"
                    onClick={() => setAcceptOpen(true)}
                  >
                    <Check className="size-4" />
                    {t("acceptEstimate")}
                  </Button>
                )}

                {/* Book Now — pre-fills a booking from the estimate */}
                <Button
                  asChild
                  variant={awaiting ? "outline" : "default"}
                  className={
                    awaiting
                      ? "w-full gap-2"
                      : "w-full gap-2 bg-emerald-500 hover:bg-emerald-600"
                  }
                  size="lg"
                >
                  <Link
                    href={`/customer/bookings/new?fromEstimate=${estimate.id}&service=${estimate.service}&startDate=${estimate.startDate}&endDate=${estimate.endDate}&token=${token}`}
                  >
                    <CalendarCheck className="size-4" />
                    {t("bookNow")}
                  </Link>
                </Button>

                {awaiting && (
                  <button
                    type="button"
                    onClick={() => setDeclineOpen(true)}
                    className="text-muted-foreground w-full text-center text-xs hover:text-red-600"
                  >
                    {t("declineThisEstimate")}
                  </button>
                )}

                {estimate.accountCreated ? (
                  <>
                    {/* New auto-created account → set a password via the magic link */}
                    <Button asChild variant="outline" className="w-full gap-2">
                      <Link href={`/customer/estimates/${token}/setup`}>
                        <UserPlus className="size-4" />
                        {t("setUpAccountAndView")}
                      </Link>
                    </Button>
                    <p className="text-muted-foreground text-xs">
                      {t("alreadyHaveAccount")}{" "}
                      <Link
                        href={loginHref}
                        className="text-primary font-medium hover:underline"
                      >
                        <LogIn className="mr-1 inline-block size-3" />
                        {t("logIn")}
                      </Link>
                    </p>
                  </>
                ) : (
                  /* Existing account (spec 5.4) → log in to the portal; a
                     logged-in session lands straight on the estimate. */
                  <Button asChild variant="outline" className="w-full gap-2">
                    <Link href={loginHref}>
                      <LogIn className="size-4" />
                      {t("viewInYourAccount")}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-muted-foreground border-t px-6 py-4 text-center text-xs">
            {estimate.expiresAt && (
              <p>
                {fill("expiresOn", {
                  date: formatDateLong(estimate.expiresAt, locale),
                })}
              </p>
            )}
            <p className="mt-1">
              {fill("questionsCallOrEmail", {
                phone: facility?.phone ?? "",
                email: facility?.email ?? "",
              })}
            </p>
          </div>
        </div>
      </div>

      <AcceptEstimateDialog
        estimate={estimate}
        facilityName={facilityName}
        open={acceptOpen}
        onOpenChange={setAcceptOpen}
        onAccepted={() => setJustAccepted(true)}
      />

      <DeclineEstimateDialog
        estimate={estimate}
        facilityName={facilityName}
        open={declineOpen}
        onOpenChange={setDeclineOpen}
        onDeclined={() => setJustDeclined(true)}
      />
    </div>
  );
}
