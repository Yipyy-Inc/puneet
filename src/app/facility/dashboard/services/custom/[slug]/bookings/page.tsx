"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useCustomServices } from "@/hooks/use-custom-services";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { useCreateBookingFromModal } from "@/components/bookings/use-create-booking";
import { useFacilityProfile } from "@/lib/api/facility-profile";
import { bookingPageQueries } from "@/lib/api/booking-page";
import { clientQueries } from "@/lib/api/client";
import { formatCalendarDayLong, formatMoney } from "@/lib/i18n/format";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import { CalendarDays, Plus } from "lucide-react";

// ============================================================================
// A custom module's own bookings.
//
// ── WHAT THIS REPLACED ────────────────────────────────────────────────────
//
// Seven invented ones. `MOCK_BOOKINGS` named Sarah Johnson, Tom Williams,
// Emma Davis and four more, with pets, durations, statuses and amounts, dated
// March 2026 — rendered as this facility's own work. Beside them, a "New
// Booking" button with no onClick and a "View" on every row with no onClick:
// the only two ways to find out the rows were not real were to click.
//
// `bookings.service` is text and holds a custom module's slug, so its
// bookings are a query. Paged and bounded (check:unbounded-booking-reads):
// a module's screen shows recent work, not every booking ever taken.
// ============================================================================

const PAGE_SIZE = 25;

export default function CustomServiceBookingsPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const { getModuleBySlug } = useCustomServices();
  const serviceModule = getModuleBySlug(slug ?? "");
  const locale = useShellLocale();
  const t = useShellText("booking");
  const fill = (key: string, values: Record<string, string | number>) =>
    Object.entries(values).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      t(key),
    );

  const { openBookingModal } = useBookingModal();
  const { profile } = useFacilityProfile();
  const { data: clients = [] } = useQuery(clientQueries.all());
  const handleCreateBooking = useCreateBookingFromModal();

  const [page, setPage] = useState(1);
  const {
    data: pageData,
    isPending,
    isError,
    refetch,
  } = useQuery({
    ...bookingPageQueries.page({
      service: slug ?? "",
      page,
      pageSize: PAGE_SIZE,
    }),
    enabled: !!slug,
    placeholderData: (previous) => previous,
  });

  if (!serviceModule) return null;

  const bookings = pageData?.bookings ?? [];
  const total = pageData?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clientById = new Map(clients.map((c) => [c.id, c]));

  // The module this page is about, ready to change: the wizard opens on it
  // and still offers everything else (see FacilityHeader).
  const openWizard = () =>
    openBookingModal({
      clients,
      facilityName: profile.businessName,
      onCreateBooking: handleCreateBooking,
      preSelectedService: slug,
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t("moduleBookingsTitle")}</h2>
          <p className="text-muted-foreground text-sm">
            {fill("moduleBookingsFor", { module: serviceModule.name })}
          </p>
        </div>
        <Button className="gap-2" onClick={openWizard}>
          <Plus className="size-4" />
          {t("newBooking")}
        </Button>
      </div>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <CalendarDays className="size-5" />
            {t("moduleBookingsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="space-y-2" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-muted-foreground text-sm">
                {t("moduleBookingsLoadFailed")}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
              >
                {t("moduleBookingsTryAgain")}
              </Button>
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-muted-foreground text-sm">
                {fill("moduleBookingsEmpty", { module: serviceModule.name })}
              </p>
              <Button variant="outline" size="sm" onClick={openWizard}>
                <Plus className="mr-2 size-4" />
                {t("newBooking")}
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                      {t("date")}
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                      {t("client")}
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                      {t("modulePet")}
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                      {t("status")}
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                      {t("amount")}
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                      {t("moduleActions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bookings.map((booking) => {
                    const client = clientById.get(booking.clientId);
                    const pet = client?.pets.find(
                      (p) => p.id === booking.petId,
                    );
                    return (
                      <tr
                        key={booking.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium tabular-nums">
                              {formatCalendarDayLong(booking.startDate, locale)}
                            </p>
                            {booking.checkInTime && (
                              <p className="text-muted-foreground text-xs tabular-nums">
                                {booking.checkInTime}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {client?.name ?? "—"}
                        </td>
                        <td className="text-muted-foreground px-4 py-3">
                          {pet?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge type="status" value={booking.status} />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                          {formatMoney(
                            booking.amountDue ?? booking.totalCost,
                            locale,
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link
                              href={`/facility/dashboard/clients/${booking.clientId}/bookings/${booking.id}`}
                            >
                              {t("moduleBookingsView")}
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {lastPage > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-muted-foreground text-xs tabular-nums">
                {fill("moduleBookingsRange", {
                  first: (page - 1) * PAGE_SIZE + 1,
                  last: Math.min(page * PAGE_SIZE, total),
                  total,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t("previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= lastPage}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                >
                  {t("next")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
