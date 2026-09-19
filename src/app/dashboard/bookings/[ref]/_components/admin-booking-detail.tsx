"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, CircleAlert, CircleHelp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { RouteState } from "@/components/ui/route-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAppLocale } from "@/hooks/use-app-locale";
import { useHydrated } from "@/hooks/use-hydrated";
import { adminBookingQueries } from "@/lib/api/admin-bookings";
import { formatBookingRef } from "@/lib/booking-id";
import { formatDateTimeInZone, formatMoney } from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import { useShellText } from "@/lib/shell/use-shell-text";

// ============================================================================
// One booking, from any facility, read-only — for Yipyy's own team.
//
// Everything a support call needs: whose it is, at which facility, what it
// costs, what was added, what was paid and how, and where it stands. Nothing
// here changes the booking; a superadmin who must change one does it in the
// facility's own screens, where the facility's rules apply.
// ============================================================================

export function AdminBookingDetailView({ refParam }: { refParam: string }) {
  const t = useShellText("admin");
  const hydrated = useHydrated();
  const appLocale = useAppLocale();
  const locale = hydrated ? appLocale : "en";
  const ref = /^\d{1,12}$/.test(refParam) ? Number(refParam) : -1;
  const query = useQuery({
    ...adminBookingQueries.detail(ref),
    enabled: ref > 0,
    retry: (count, error) =>
      (error as { status?: number }).status !== 404 && count < 2,
  });

  const notFound =
    ref <= 0 || (query.error as { status?: number } | null)?.status === 404;
  if (notFound) {
    return (
      <RouteState
        surface="card"
        pose="confused"
        icon={CircleHelp}
        inkClassName="text-ink-secondary"
        title={t("bookingNotFound")}
        description={t("bookingNotFoundText")}
        action={{ label: t("bookingsBack"), href: "/dashboard/bookings" }}
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
        title={t("bookingsLoadFailed")}
        description={t("bookingsLoadFailedText")}
        action={{
          label: t("bookingsTryAgain"),
          onClick: () => void query.refetch(),
        }}
      />
    );
  }
  if (query.isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-64 rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>
    );
  }

  const b = query.data;
  const money = (v: number) => formatMoney(v, locale);
  // On the facility's clock: a booking at 08:00 in Montréal is 08:00,
  // wherever the person reading it sits.
  const when = (iso: string) =>
    formatDateTimeInZone(iso, locale, b.facility.timezone);
  const balance = Math.max(0, b.amountDue - b.amountPaid);
  // A method nobody named reads as the ledger has it, never as a key.
  const methodLabel = (method: string) => {
    const key = `method_${method}`;
    const label = t(key);
    return label === key ? method : label;
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4 md:p-6">
      <Button variant="ghost" asChild className="-ml-2">
        <Link href="/dashboard/bookings">
          <ArrowLeft className="size-4" aria-hidden />
          {t("bookingsBack")}
        </Link>
      </Button>
      <PageHeader
        title={`${formatBookingRef(b.ref)} · ${serviceTypeLabel(locale, b.serviceType || b.service)}`}
        description={b.facility.name}
        inline={<StatusBadge type="status" value={b.status} />}
        secondary={
          <Button variant="outline" asChild>
            <Link href={`/dashboard/facilities/${b.facility.id}?tab=bookings`}>
              <Building2 className="size-4" aria-hidden />
              {t("bookingOpenFacility")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Section title={t("bookingWho")}>
          <Row label={t("bookingClient")} value={b.client.name ?? "—"} />
          <Row label={t("bookingEmail")} value={b.client.email ?? "—"} />
          <Row label={t("bookingPhone")} value={b.client.phone ?? "—"} />
          <Row
            label={t("bookingPets")}
            value={b.pets.length > 0 ? b.pets.join(", ") : "—"}
          />
        </Section>
        <Section title={t("bookingWhen")}>
          <Row label={t("bookingStarts")} value={when(b.startAt)} />
          <Row label={t("bookingEnds")} value={when(b.endAt)} />
          <Row label={t("bookingMade")} value={when(b.createdAt)} />
          {b.specialRequests && (
            <Row label={t("bookingRequests")} value={b.specialRequests} />
          )}
        </Section>
      </div>

      <Section title={t("bookingMoney")}>
        <Row label={t("bookingPrice")} value={money(b.totalCost)} />
        {b.discount > 0 && (
          <Row label={t("bookingDiscount")} value={`−${money(b.discount)}`} />
        )}
        {b.lines.map((line, i) => (
          <Row
            key={i}
            label={
              line.quantity > 1 ? `${line.name} × ${line.quantity}` : line.name
            }
            value={money(line.price)}
          />
        ))}
        <Row label={t("bookingTotal")} value={money(b.amountDue)} strong />
        <Row label={t("bookingPaid")} value={money(b.amountPaid)} />
        <Row label={t("bookingBalance")} value={money(balance)} strong />
      </Section>

      <Section title={t("bookingPayments")}>
        {b.payments.length === 0 ? (
          <p className="text-ink-tertiary text-[13.5px]">
            {t("bookingNoPayments")}
          </p>
        ) : (
          b.payments.map((p, i) => (
            <Row
              key={i}
              label={`${when(p.at)} · ${methodLabel(p.method)}${p.cardLast4 ? ` · ${p.cardBrand ?? ""} ···${p.cardLast4}` : ""}`}
              value={
                p.tip > 0
                  ? `${money(p.amount)} (${t("bookingTip").replace("{amount}", money(p.tip))})`
                  : money(p.amount)
              }
            />
          ))
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border-line shadow-card rounded-3xl border p-5">
      <h2 className="text-heading text-[17px] font-bold">{title}</h2>
      <dl className="mt-3 space-y-1.5 text-[14.5px]">{children}</dl>
    </section>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-secondary min-w-0">{label}</dt>
      <dd
        className={`text-body-ink text-right tabular-nums ${strong ? "font-semibold" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
