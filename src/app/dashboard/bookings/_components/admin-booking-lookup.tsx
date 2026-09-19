"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Search, SearchX } from "lucide-react";

import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { RouteState } from "@/components/ui/route-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAppLocale } from "@/hooks/use-app-locale";
import { useHydrated } from "@/hooks/use-hydrated";
import { adminBookingQueries } from "@/lib/api/admin-bookings";
import { bookingRefCandidates, formatBookingRef } from "@/lib/booking-id";
import { formatDateLong } from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import { useShellText } from "@/lib/shell/use-shell-text";

// ============================================================================
// Find any facility's booking by its number.
//
// A facility calls about "booking #10896" and the admin portal had nowhere to
// type it. The number may be the displayed form or the bare ref; every match
// is listed with its facility, because the same ref can only ever be one
// booking but a typed number can mean two.
// ============================================================================

export function AdminBookingLookup({ initial }: { initial: string }) {
  const t = useShellText("admin");
  const hydrated = useHydrated();
  const appLocale = useAppLocale();
  const locale = hydrated ? appLocale : "en";
  const [q, setQ] = useState(initial);
  const valid = bookingRefCandidates(q).length > 0;
  const lookup = useQuery({
    ...adminBookingQueries.lookup(q.trim()),
    enabled: valid,
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-6">
      <PageHeader
        title={t("bookingsTitle")}
        description={t("bookingsDescription")}
      />
      <div className="relative max-w-md">
        <Search
          className="text-ink-tertiary absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          autoFocus
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={t("bookingsSearchPlaceholder")}
          aria-label={t("bookingsSearchPlaceholder")}
          className="pl-9"
        />
      </div>

      {!valid ? (
        <p className="text-ink-tertiary text-[13.5px]">
          {t("bookingsSearchHelp")}
        </p>
      ) : lookup.isError ? (
        <RouteState
          surface="card"
          pose="error"
          icon={CircleAlert}
          inkClassName="text-destructive"
          title={t("bookingsLoadFailed")}
          description={t("bookingsLoadFailedText")}
          action={{
            label: t("bookingsTryAgain"),
            onClick: () => void lookup.refetch(),
          }}
        />
      ) : lookup.isPending ? (
        <Skeleton className="h-20 w-full rounded-2xl" />
      ) : (lookup.data ?? []).length === 0 ? (
        <RouteState
          surface="card"
          pose="searching"
          icon={SearchX}
          inkClassName="text-ink-secondary"
          title={t("bookingsNoMatch").replace("{q}", q.trim())}
          description={t("bookingsNoMatchText")}
        />
      ) : (
        <ul className="space-y-2">
          {(lookup.data ?? []).map((b) => (
            <li key={b.ref}>
              <Link
                href={`/dashboard/bookings/${b.ref}`}
                className="bg-card border-line shadow-card hover:border-line-strong flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-body-ink text-[15px] font-semibold">
                    {formatBookingRef(b.ref)} · {b.facilityName}
                  </p>
                  <p className="text-ink-secondary text-[13.5px]">
                    {[
                      b.clientName,
                      serviceTypeLabel(locale, b.service),
                      formatDateLong(b.startAt, locale),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <StatusBadge type="status" value={b.status} size="sm" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
