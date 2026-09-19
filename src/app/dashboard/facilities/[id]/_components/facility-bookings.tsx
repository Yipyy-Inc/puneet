"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Loader2, Search } from "lucide-react";

import type { AdminFacilityBookingsPage } from "@/app/api/facilities/[id]/bookings/route";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAppLocale } from "@/hooks/use-app-locale";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatBookingRef } from "@/lib/booking-id";
import { formatDateTimeInZone, formatMoney } from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import { useShellText } from "@/lib/shell/use-shell-text";

// ============================================================================
// A facility's bookings, for Yipyy's own team.
//
// Read-only and paged: a busy facility has thousands, and the point is
// answering "what happened with #10896" on a support call, not running the
// facility's day. Times are the facility's own, not the reader's.
// ============================================================================

type Row = AdminFacilityBookingsPage["rows"][number];

export function FacilityBookings({ facilityId }: { facilityId: string }) {
  const t = useShellText("admin");
  const hydrated = useHydrated();
  const appLocale = useAppLocale();
  const locale = hydrated ? appLocale : "en";
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["admin", "facility", facilityId, "bookings", page, term],
    queryFn: async (): Promise<AdminFacilityBookingsPage> => {
      const search = new URLSearchParams({ page: String(page) });
      if (term) search.set("q", term);
      const response = await fetch(
        `/api/facilities/${facilityId}/bookings?${search}`,
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? t("bookingsLoadFailed"));
      }
      return (await response.json()) as AdminFacilityBookingsPage;
    },
  });

  const zone = query.data?.timezone ?? "UTC";
  const columns: ColumnDef<Row>[] = [
    {
      key: "ref",
      label: t("bookingsColRef"),
      sortable: true,
      render: (b) => (
        <Link
          href={`/dashboard/bookings/${b.ref}`}
          className="text-primary font-medium hover:underline"
        >
          {formatBookingRef(b.ref)}
        </Link>
      ),
    },
    {
      key: "clientName",
      label: t("bookingsColClient"),
      sortable: true,
      render: (b) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{b.clientName ?? "—"}</p>
          {b.petNames.length > 0 && (
            <p className="text-muted-foreground truncate text-xs">
              {b.petNames.join(", ")}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "service",
      label: t("bookingsColService"),
      sortable: true,
      render: (b) => serviceTypeLabel(locale, b.service),
    },
    {
      key: "startAt",
      label: t("bookingsColWhen"),
      sortable: true,
      render: (b) => formatDateTimeInZone(b.startAt, locale, zone),
    },
    {
      key: "status",
      label: t("bookingsColStatus"),
      sortable: true,
      render: (b) => <StatusBadge type="status" value={b.status} size="sm" />,
    },
    {
      key: "amountDue",
      label: t("bookingsColTotal"),
      sortable: true,
      align: "right",
      render: (b) => formatMoney(b.amountDue, locale),
    },
    {
      key: "amountPaid",
      label: t("bookingsColPaid"),
      sortable: true,
      align: "right",
      defaultVisible: false,
      render: (b) => formatMoney(b.amountPaid, locale),
    },
  ];

  const total = query.data?.total ?? 0;
  const pageSize = query.data?.pageSize ?? 25;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setTerm(q.trim());
        }}
      >
        <div className="relative w-full max-w-sm">
          <Search
            className="text-ink-tertiary absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder={t("bookingsFilterPlaceholder")}
            aria-label={t("bookingsFilterPlaceholder")}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          {t("bookingsFilterAction")}
        </Button>
      </form>

      {query.isError ? (
        <p className="text-destructive flex items-center gap-2 text-sm">
          <CircleAlert className="size-4" aria-hidden />
          {t("bookingsLoadFailed")}
        </p>
      ) : query.isPending ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {t("bookingsLoading")}
        </p>
      ) : (
        <>
          <DataTable data={query.data.rows} columns={columns} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-sm tabular-nums">
              {t("bookingsCount")
                .replace("{shown}", String(query.data.rows.length))
                .replace("{total}", String(total))}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("bookingsPrev")}
              </Button>
              <span className="text-muted-foreground text-sm tabular-nums">
                {t("bookingsPageOf")
                  .replace("{page}", String(page))
                  .replace("{last}", String(lastPage))}
              </span>
              <Button
                variant="outline"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("bookingsNext")}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
