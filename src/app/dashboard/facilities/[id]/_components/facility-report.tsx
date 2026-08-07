"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import {
  CalendarCheck,
  CalendarX,
  DollarSign,
  Loader2,
  Users,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { ReportChartCard } from "@/components/reports/chart-kit";
import { formatCount, formatCurrency, formatPercent } from "@/lib/format";
import type { FacilityReport } from "@/lib/api/facility-report";

// ============================================================================
// How this facility is actually trading.
//
// The third of the five "nothing stores this yet" tabs to get a real source —
// and the only one where the claim had stopped being true: bookings and
// payments were already real tables, and nothing had put them together.
//
// ── THE NUMBERS ARE NOT THE OBVIOUS ONES ──────────────────────────────────
//
// Revenue excludes tips, money is dated by the booking it paid for rather than
// by when the payment row was written, and grouping is by `service` rather than
// `service_type`. Each of those changes the answer; the header of
// 20260807620000 says why for each.
//
// ── CANCELLATION IS A TILE, NOT A FOOTNOTE ────────────────────────────────
//
// The demo facility cancels most of what it books. A tab that showed "97
// bookings" and moved on would be describing a business that does not exist,
// so the rate is on the front row and turns amber past a quarter. It is the
// first thing a platform operator would want to ask an account about.
// ============================================================================

// recharts is heavy and this is the only part of the tab that needs it, so
// opening the Reports tab is what loads it. Named export, destructured — a
// default import here resolves to the module object and renders nothing.
const FacilityReportChart = dynamic(
  () =>
    import("./facility-report-chart").then((module) => ({
      default: module.FacilityReportChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Drawing…
      </div>
    ),
  },
);

const RANGES = [
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last 12 months" },
];

/** Service slugs are lower-case identifiers; titles are for reading. */
function serviceName(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function FacilityReport({ facilityId }: { facilityId: string }) {
  const [months, setMonths] = useState("6");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "facility", facilityId, "report", months],
    queryFn: async (): Promise<FacilityReport> => {
      const response = await fetch(
        `/api/facilities/${facilityId}/report?months=${months}`,
      );
      if (!response.ok) throw new Error("Could not build this report.");
      return (await response.json()) as FacilityReport;
    },
  });

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Building the report…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-destructive p-6 text-sm">
        Could not build this facility&apos;s report. Try again.
      </p>
    );
  }

  const { totals } = data;
  const cancellationRate =
    totals.bookings > 0 ? totals.cancelled / totals.bookings : 0;
  const nothingHappened = totals.bookings === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Dated by when the service happened, not when the card was charged.
          Revenue excludes tips — those belong to the staff who earned them.
        </p>
        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="w-44" aria-label="Reporting range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Revenue"
          value={formatCurrency(totals.revenueCents / 100)}
          hint={
            totals.tipsCents > 0
              ? `plus ${formatCurrency(totals.tipsCents / 100)} in tips`
              : "no tips recorded"
          }
          icon={DollarSign}
          tone="emerald"
        />
        <KpiTile
          label="Bookings"
          value={formatCount(totals.bookings)}
          hint={`${formatCount(totals.completed)} completed`}
          icon={CalendarCheck}
          tone="indigo"
        />
        <KpiTile
          label="Cancelled"
          value={formatPercent(cancellationRate * 100)}
          hint={`${formatCount(totals.cancelled)} of ${formatCount(totals.bookings)}`}
          icon={CalendarX}
          tone={cancellationRate >= 0.25 ? "amber" : "slate"}
          alert={
            cancellationRate >= 0.25
              ? { label: "Worth asking about", tone: "amber" }
              : undefined
          }
        />
        <KpiTile
          label="Clients who booked"
          value={formatCount(totals.activeClients)}
          hint={`${formatCount(totals.newClients)} joined in this period`}
          icon={Users}
          tone="violet"
        />
      </div>

      <ReportChartCard
        title="Bookings and revenue by service month"
        subtitle="Cancellations are stacked into each month's bar"
        height={300}
        isEmpty={nothingHappened}
        emptyMessage="No bookings fall in this period"
      >
        <FacilityReportChart months={data.months} />
      </ReportChartCard>

      <Card className="gap-0 p-4">
        <h3 className="mb-3 text-sm font-semibold">By service</h3>
        {data.services.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No bookings fall in this period, so there is nothing to break down.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs">
                  <th className="pb-2 font-medium">Service</th>
                  <th className="pb-2 text-right font-medium">Bookings</th>
                  <th className="pb-2 text-right font-medium">Cancelled</th>
                  <th className="pb-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.services.map((service) => (
                  <tr key={service.service} className="border-b last:border-0">
                    <td className="py-2 font-medium">
                      {serviceName(service.service)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatCount(service.bookings)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {service.cancelled > 0 ? (
                        <span className="text-amber-700 dark:text-amber-400">
                          {formatCount(service.cancelled)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatCurrency(service.revenueCents / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totals.outstandingCents > 0 && (
          <p className="text-muted-foreground mt-3 text-xs">
            {formatCurrency(totals.outstandingCents / 100)} is still owed across
            bookings that were not cancelled.
          </p>
        )}
      </Card>
    </div>
  );
}
