"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calendar,
  CalendarDays,
  CalendarX,
  CircleAlert,
  Clock,
  Download,
  Hourglass,
  TrendingUp,
} from "lucide-react";

import { clientQueries } from "@/lib/api/client";
import { useFacilityProfile } from "@/lib/api/facility-profile";
import { useFacilitySettings } from "@/lib/api/facility-settings";
import { noteQueries } from "@/lib/api/notes";
import { useTagCatalogue } from "@/lib/api/tags";
import {
  bookingPageQueries,
  fetchAllBookingPages,
} from "@/lib/api/booking-page";
import type {
  BookingPageParams,
  BookingPageSort,
} from "@/lib/api/booking-page-params";
import { bookingTotals } from "@/lib/payments/booking-totals";
import type { TaxConfig } from "@/lib/settings/tax";
import { formatMoney } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { useShellText } from "@/lib/shell/use-shell-text";
import { useFieldMask } from "@/lib/staff/mask";
import { useAssignedScope } from "@/lib/facility-permissions";
import { useAppLocale } from "@/hooks/use-app-locale";
import { useTagsByEntity } from "@/hooks/use-tags-notes";
import { useLocationContext } from "@/hooks/use-location-context";
import { usePermission } from "@/hooks/use-facility-rbac";
import type { Booking } from "@/types/booking";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { BookingDateRangeFilter } from "@/components/bookings/BookingDateRangeFilter";
import { LocationFilterBanner } from "@/components/hq/LocationFilterBanner";
import { PageHeader } from "@/components/ui/page-header";
import { RouteState } from "@/components/ui/route-state";
import { SavedViews } from "@/components/ui/saved-views";
import { Skeleton } from "@/components/ui/skeleton";
import { bookingListColumns } from "./_components/booking-list-columns";
import { bookingListFilters } from "./_components/booking-list-filters";
import { exportBookingsToCSV } from "./_components/booking-list-export";

const PAGE_SIZE = 15;
// Stable while the page loads.
const NO_BOOKINGS: Booking[] = [];
/** The columns the server can order by; every other column is not sortable. */
const SERVER_SORTS: Record<string, BookingPageSort> = {
  id: "id",
  dates: "dates",
  status: "status",
};

/** A Date as its own YYYY-MM-DD, without a timezone shift. */
const dayOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ============================================================================
// The facility's bookings, a page of fifteen at a time.
//
// Shared by both portals: in the employee portal a row opens the booking
// inside the /employee shell, so its gates and scope apply there. The table
// asks /api/bookings/page in the viewer's scope — the chosen location when
// there are several, the viewer's own bookings when view_bookings is
// assigned_only — and the tiles come from /api/bookings/totals in that scope.
//
// ── 2026-09-19 ───────────────────────────────────────────────────────────
//
// The filters come from the database's enums (all twelve statuses, every
// service, the four payment states); the money column is what is still OWED,
// by the booking page's own arithmetic; every word, date and time is the
// reader's; a failed load says so instead of showing an empty table. The
// columns, filters and export live in `_components/`. A draft effect that
// read `booking_requests_schedule_draft` — a key nothing writes — went, with
// the edit modal and the localStorage request store only it could reach.
// ============================================================================
export default function FacilityBookingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const inEmployeePortal = pathname?.startsWith("/employee") ?? false;
  const { profile } = useFacilityProfile();

  const { t: formText } = useStaffText("yipyyGo");
  const t = useShellText("booking");
  const fill = (key: string, values: Record<string, string | number>) =>
    Object.entries(values).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      t(key),
    );
  const locale = useAppLocale();

  const { data: clientList = [] } = useQuery(clientQueries.all());
  const { data: bookingNoteCounts } = useQuery(noteQueries.counts("booking"));
  const clientById = useMemo(
    () => new Map(clientList.map((c) => [c.id, c])),
    [clientList],
  );
  const { currentLocationId, isHQView, isMultiLocation, locations } =
    useLocationContext();

  // Table 21 masking: booking $ hidden from staff without view_booking_financials;
  // the Revenue KPI is Manager+ (financial_view_revenue). Without the booking
  // financials, the money columns are OMITTED from the DOM, not just masked.
  const { maskAmount, canSee } = useFieldMask();
  const canSeeRevenue = usePermission("financial_view_revenue");
  const showMoney = canSee("booking_financials");
  // Section 8B: the viewer's own bookings when view_bookings is assigned_only.
  const assignedOnly = Boolean(useAssignedScope("view_bookings"));

  // What is owed, as the booking page and its checkout count it.
  const taxConfig = useFacilitySettings().settings.tax_config
    .value as TaxConfig;
  const moneyOf = (booking: Booking) => {
    const totals = bookingTotals(booking, taxConfig);
    return { balance: totals.balance, total: totals.total };
  };

  const locationId =
    isMultiLocation && !isHQView && currentLocationId
      ? currentLocationId
      : undefined;
  const [activeTab, setActiveTab] = useState("all");
  const [filterStart, setFilterStart] = useState<Date | null>(null);
  const [filterEnd, setFilterEnd] = useState<Date | null>(null);
  const [tablePage, setTablePage] = useState(1);
  const [tableSearch, setTableSearch] = useState("");
  const [tableFilters, setTableFilters] = useState<Record<string, string>>({});
  const [tableSort, setTableSort] = useState<{
    key: string | null;
    dir: "asc" | "desc";
  }>({ key: null, dir: "asc" });
  const selectTab = (key: string) => {
    setActiveTab(key);
    setTablePage(1);
  };
  const chosen = (key: string) =>
    tableFilters[key] && tableFilters[key] !== "all"
      ? tableFilters[key]
      : undefined;
  const pageParams: BookingPageParams = {
    page: tablePage,
    pageSize: PAGE_SIZE,
    q: tableSearch.trim() || undefined,
    status: chosen("status"),
    service: chosen("service"),
    paymentStatus: chosen("paymentStatus"),
    tagId: chosen("tag"),
    view: activeTab === "today" ? "today" : "all",
    from: filterStart ? dayOf(filterStart) : undefined,
    to: filterStart ? dayOf(filterEnd ?? filterStart) : undefined,
    locationId,
    assigned: assignedOnly || undefined,
    sort: tableSort.key ? SERVER_SORTS[tableSort.key] : undefined,
    dir: tableSort.dir,
  };
  const {
    data: pageData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    ...bookingPageQueries.page(pageParams),
    // The previous page stays on screen while the next one loads.
    placeholderData: (previous) => previous,
  });
  const { data: totals } = useQuery(
    bookingPageQueries.totals({ locationId, assigned: assignedOnly }),
  );
  const bookings = pageData?.bookings ?? NO_BOOKINGS;

  const totalBookings = totals?.total ?? 0;
  const todayCount = totals?.today ?? 0;

  const { tags: tagCatalogue } = useTagCatalogue();
  const { tagsFor } = useTagsByEntity();

  const columns = bookingListColumns({
    t,
    fill,
    formText,
    locale,
    clientById,
    noteCounts: bookingNoteCounts,
    locations: isMultiLocation && isHQView ? locations : undefined,
    showMoney,
    maskAmount,
    moneyOf,
  });
  const filters = bookingListFilters({
    t,
    locale,
    tags: tagCatalogue.filter((tag) => tag.type === "booking" && tag.isActive),
    tagsOf: (id) => tagsFor("booking", id),
    showMoney,
  });

  // An export holds everything the table matches, every page of it.
  const exportAll = async () => {
    try {
      exportBookingsToCSV(
        await fetchAllBookingPages({ ...pageParams, page: 1 }),
        clientById,
        t,
        moneyOf,
        showMoney,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="flex-1 space-y-5 p-4 pt-6">
      <div className="space-y-3">
        {/* §5b pattern 01 — one 32px title; Export stays a 40px outline
            control, because this header has no primary action. */}
        <PageHeader
          title={t("pageTitle")}
          description={profile.businessName}
          secondary={
            <Button variant="outline" onClick={() => void exportAll()}>
              <Download />
              {t("exportBookings")}
            </Button>
          }
        />
        <LocationFilterBanner />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiTile
          label={t("tileAll")}
          value={totalBookings}
          hint={t("tileAllHint")}
          icon={Calendar}
          tone="indigo"
          active={activeTab === "all"}
          onClick={() => selectTab("all")}
        />
        <KpiTile
          label={t("tileToday")}
          value={todayCount}
          hint={t("tileTodayHint")}
          icon={CalendarDays}
          tone="amber"
          active={activeTab === "today"}
          onClick={() => selectTab(activeTab === "today" ? "all" : "today")}
        />
        <KpiTile
          label={t("tileUpcoming")}
          value={totals?.upcoming ?? 0}
          hint={t("tileUpcomingHint")}
          icon={Hourglass}
          tone="violet"
        />
        <KpiTile
          label={t("tilePending")}
          value={totals?.pending ?? 0}
          hint={t("tilePendingHint")}
          icon={Clock}
          tone="rose"
        />
        {canSeeRevenue && (
          <KpiTile
            label={t("tileRevenue")}
            value={formatMoney(totals?.paidRevenue ?? 0, locale, {
              whole: true,
            })}
            hint={t("tileRevenueHint").replace(
              "{amount}",
              formatMoney(totals?.pendingRevenue ?? 0, locale, { whole: true }),
            )}
            icon={TrendingUp}
            tone="emerald"
          />
        )}
      </div>

      <div className="w-full">
        <div className="flex items-center gap-4 overflow-x-auto pb-1">
          <SavedViews
            views={[
              { key: "all", label: t("viewAll"), count: totalBookings },
              { key: "today", label: t("tileToday"), count: todayCount },
            ]}
            activeKey={activeTab}
            onSelect={selectTab}
          />
          <BookingDateRangeFilter
            rangeStart={filterStart}
            rangeEnd={filterEnd}
            onChange={(start, end) => {
              setFilterStart(start);
              setFilterEnd(end);
              setTablePage(1);
            }}
          />
        </div>
        <div className="mt-4">
          {isError && !pageData ? (
            <RouteState
              surface="card"
              pose="error"
              icon={CircleAlert}
              inkClassName="text-destructive"
              title={t("listLoadFailedTitle")}
              description={t("listLoadFailedBody")}
              action={{
                label: t("listTryAgain"),
                onClick: () => void refetch(),
              }}
            />
          ) : isLoading && !pageData ? (
            // The first page is on its way: rows the shape of the table, not
            // the table's "No data yet", which read as "you have no bookings".
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-[14px]" />
              ))}
            </div>
          ) : !isLoading && totals && totalBookings === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <div className="bg-muted mb-4 flex size-16 items-center justify-center rounded-2xl">
                  <CalendarX className="text-muted-foreground size-8" />
                </div>
                <h3 className="mb-1.5 text-base font-semibold">
                  {t("listEmptyTitle")}
                </h3>
                <p className="text-muted-foreground max-w-xs text-center text-sm">
                  {t("listEmptyBody")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <DataTable
              data={bookings as unknown as Record<string, unknown>[]}
              columns={
                columns as unknown as ColumnDef<Record<string, unknown>>[]
              }
              filters={filters}
              searchKey="id"
              searchPlaceholder={t("listSearchPlaceholder")}
              itemsPerPage={PAGE_SIZE}
              serverPaging={{
                total: pageData?.total ?? 0,
                page: tablePage,
                onPageChange: setTablePage,
                onSearchChange: setTableSearch,
                onFilterChange: setTableFilters,
                onSortChange: (key, dir) => setTableSort({ key, dir }),
              }}
              // §5n: the column choice and row height survive a reload. §5m:
              // the four fields a phone shows — identity, what, when, and
              // whether the pet is in the building.
              tableId="facility.bookings"
              cardColumns={["client", "service", "dates", "presence"]}
              onRowClick={(booking) =>
                router.push(
                  inEmployeePortal
                    ? `/employee/bookings/${booking.id}`
                    : `/facility/dashboard/clients/${booking.clientId}/bookings/${booking.id}`,
                )
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
