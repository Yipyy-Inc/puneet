"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Clock } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  generateOccupancyReport,
  generateNoShowReport,
  generateCancellationReport,
  getTopCustomers,
  type OccupancyReportData,
  type NoShowReportData,
  type CancellationReportData,
} from "@/data/reports";
import {
  getRevenueByService,
  getStaffTimeByService,
} from "@/lib/analytics-utils";
import { ExportReportModal } from "@/components/reports/ExportReportModal";
import type { ReportEntry } from "./reports-hub";

type ReportWithCategory = ReportEntry & { categoryTier: "Essential" | "Beneficial" };

// ── Coming Soon ───────────────────────────────────────────────────────────────

function ComingSoon({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-24 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/30">
        <Clock className="size-7 text-muted-foreground/50" />
      </div>
      <div className="space-y-1.5">
        <p className="text-lg font-semibold">{name}</p>
        <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
      </div>
      <Badge variant="outline" className="px-3 py-1 text-xs font-medium">
        Coming Soon
      </Badge>
      <p className="max-w-xs text-xs text-muted-foreground/60">
        This report is part of the upcoming Yipyy analytics suite and will be
        available in a future update.
      </p>
    </div>
  );
}

// ── Revenue by Service ────────────────────────────────────────────────────────

function RevenueContent({ facilityId }: { facilityId: number }) {
  const revenueData = getRevenueByService(facilityId);
  const staffData = getStaffTimeByService(facilityId);
  const totalRevenue = revenueData.reduce((s, r) => s + r.revenue, 0);
  const totalBookings = revenueData.reduce((s, r) => s + r.bookings, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Total Revenue",
            value: `$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          },
          { label: "Total Bookings", value: totalBookings.toString() },
          {
            label: "Avg / Booking",
            value: `$${totalBookings > 0 ? (totalRevenue / totalBookings).toFixed(2) : "0.00"}`,
          },
        ].map((tile) => (
          <div
            key={tile.label}
            className="rounded-lg border bg-card p-3 text-center"
          >
            <p className="text-xs text-muted-foreground">{tile.label}</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums">{tile.value}</p>
          </div>
        ))}
      </div>

      {/* Distribution bar */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Revenue Distribution
        </p>
        <div className="flex h-4 overflow-hidden rounded-full">
          {revenueData.map((row) => {
            const pct =
              totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0;
            return pct >= 1 ? (
              <div
                key={row.service}
                className="transition-all"
                style={{ width: `${pct}%`, backgroundColor: row.color }}
                title={`${row.service}: ${pct.toFixed(0)}%`}
              />
            ) : null;
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-3">
          {revenueData.map((row) => (
            <span key={row.service} className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full inline-block"
                style={{ backgroundColor: row.color }}
              />
              <span className="text-xs text-muted-foreground">
                {row.service}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Revenue table */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          By Service
        </p>
        <div className="space-y-0.5">
          <div className="grid grid-cols-5 gap-3 border-b pb-2 px-2 text-xs font-semibold text-muted-foreground">
            <span className="col-span-2">Service</span>
            <span className="text-right">Revenue</span>
            <span className="text-right">Bookings</span>
            <span className="text-right">Avg</span>
          </div>
          {revenueData.map((row) => {
            const pct =
              totalRevenue > 0
                ? Math.round((row.revenue / totalRevenue) * 100)
                : 0;
            return (
              <div
                key={row.service}
                className="grid grid-cols-5 items-center gap-3 rounded-md px-2 py-2.5 hover:bg-muted/30"
              >
                <div className="col-span-2 flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="text-sm font-medium">{row.service}</span>
                  <span className="text-xs text-muted-foreground">{pct}%</span>
                </div>
                <span className="text-right text-sm tabular-nums">
                  ${row.revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-right text-sm tabular-nums">
                  {row.bookings}
                </span>
                <span className="text-right text-sm tabular-nums text-muted-foreground">
                  ${row.avgPerBooking.toFixed(2)}
                </span>
              </div>
            );
          })}
          <Separator className="my-1" />
          <div className="grid grid-cols-5 gap-3 px-2 pt-1 text-sm font-semibold">
            <span className="col-span-2">Total</span>
            <span className="text-right tabular-nums">
              ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-right tabular-nums">{totalBookings}</span>
            <span />
          </div>
        </div>
      </div>

      {/* Staff time */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Staff Time by Service
        </p>
        <div className="space-y-0.5">
          <div className="grid grid-cols-4 gap-3 border-b pb-2 px-2 text-xs font-semibold text-muted-foreground">
            <span className="col-span-2">Service</span>
            <span className="text-right">Hours</span>
            <span className="text-right">Staff</span>
          </div>
          {staffData.map((row) => (
            <div
              key={row.service}
              className="grid grid-cols-4 items-center gap-3 rounded-md px-2 py-2.5 hover:bg-muted/30"
            >
              <div className="col-span-2 flex items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                <span className="text-sm font-medium">{row.service}</span>
              </div>
              <span className="text-right text-sm tabular-nums">{row.hours}h</span>
              <span className="text-right text-sm text-muted-foreground">
                {row.staffCount}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full">
          {staffData.map((row) =>
            row.percentage >= 1 ? (
              <div
                key={row.service}
                style={{
                  width: `${row.percentage}%`,
                  backgroundColor: row.color,
                }}
              />
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}

// ── Occupancy ─────────────────────────────────────────────────────────────────

function OccupancyContent({
  facilityId,
  start,
  end,
}: {
  facilityId: number;
  start: string;
  end: string;
}) {
  const data = generateOccupancyReport(facilityId, start, end);
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const avgOccupancy =
    data.length > 0
      ? data.reduce((s, d) => s + d.occupancyRate, 0) / data.length
      : 0;

  const columns: ColumnDef<OccupancyReportData>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
    },
    {
      accessorKey: "occupancyRate",
      header: "Occupancy",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="w-12 text-sm tabular-nums">
            {row.original.occupancyRate.toFixed(1)}%
          </span>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary"
              style={{
                width: `${Math.min(row.original.occupancyRate, 100)}%`,
              }}
            />
          </div>
        </div>
      ),
    },
    {
      accessorKey: "occupiedKennels",
      header: "Occupied",
      cell: ({ row }) =>
        `${row.original.occupiedKennels} / ${row.original.totalKennels}`,
    },
    {
      accessorKey: "revenue",
      header: "Revenue",
      cell: ({ row }) => `$${row.original.revenue.toFixed(2)}`,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Avg Occupancy", value: `${avgOccupancy.toFixed(1)}%` },
          { label: "Total Revenue", value: `$${totalRevenue.toFixed(0)}` },
          { label: "Days in Range", value: data.length.toString() },
        ].map((t) => (
          <div key={t.label} className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">{t.label}</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums">{t.value}</p>
          </div>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={data}
        searchColumn="date"
        searchPlaceholder="Search by date..."
      />
    </div>
  );
}

// ── No-Shows ──────────────────────────────────────────────────────────────────

function NoShowContent({
  facilityId,
  start,
  end,
}: {
  facilityId: number;
  start: string;
  end: string;
}) {
  const data = generateNoShowReport(facilityId, start, end);
  const totalLost = data.reduce((s, d) => s + d.revenue, 0);

  const columns: ColumnDef<NoShowReportData>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
    },
    { accessorKey: "clientName", header: "Client" },
    { accessorKey: "petName", header: "Pet" },
    {
      accessorKey: "service",
      header: "Service",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.service}
        </Badge>
      ),
    },
    { accessorKey: "scheduledTime", header: "Time" },
    {
      accessorKey: "revenue",
      header: "Lost Revenue",
      cell: ({ row }) => `$${row.original.revenue.toFixed(2)}`,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
        <span className="text-sm font-medium text-destructive">
          Total Lost Revenue:
        </span>
        <span className="text-sm font-bold text-destructive">
          ${totalLost.toFixed(2)}
        </span>
        <span className="ml-1 text-xs text-muted-foreground">
          across {data.length} no-show{data.length !== 1 ? "s" : ""}
        </span>
      </div>
      <DataTable
        columns={columns}
        data={data}
        searchColumn="clientName"
        searchPlaceholder="Search by client..."
      />
    </div>
  );
}

// ── Cancelled Bookings ────────────────────────────────────────────────────────

function CancellationContent({
  facilityId,
  start,
  end,
}: {
  facilityId: number;
  start: string;
  end: string;
}) {
  const data = generateCancellationReport(facilityId, start, end);
  const totalRefunds = data.reduce((s, d) => s + d.refundAmount, 0);

  const columns: ColumnDef<CancellationReportData>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
    },
    { accessorKey: "clientName", header: "Client" },
    { accessorKey: "petName", header: "Pet" },
    {
      accessorKey: "service",
      header: "Service",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.service}
        </Badge>
      ),
    },
    { accessorKey: "advanceNotice", header: "Notice" },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => (
        <span className="block max-w-[180px] truncate text-sm">
          {row.original.reason || "No reason provided"}
        </span>
      ),
    },
    {
      accessorKey: "refundAmount",
      header: "Refund",
      cell: ({ row }) => `$${row.original.refundAmount.toFixed(2)}`,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-50 px-3 py-2.5 dark:bg-orange-950/20">
        <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
          Total Refunds Issued:
        </span>
        <span className="text-sm font-bold text-orange-700 dark:text-orange-400">
          ${totalRefunds.toFixed(2)}
        </span>
        <span className="ml-1 text-xs text-muted-foreground">
          across {data.length} cancellation{data.length !== 1 ? "s" : ""}
        </span>
      </div>
      <DataTable
        columns={columns}
        data={data}
        searchColumn="clientName"
        searchPlaceholder="Search by client..."
      />
    </div>
  );
}

// ── Customer Value ────────────────────────────────────────────────────────────

function CustomerValueContent({ facilityId }: { facilityId: number }) {
  const data = getTopCustomers(facilityId, 20);
  type CustomerRow = (typeof data)[0];

  const columns: ColumnDef<CustomerRow>[] = [
    {
      accessorKey: "client.name",
      header: "Client",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.client.name}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.client.email}
          </p>
        </div>
      ),
    },
    { accessorKey: "totalBookings", header: "Bookings" },
    {
      accessorKey: "totalSpent",
      header: "Total Spent",
      cell: ({ row }) => `$${row.original.totalSpent.toFixed(2)}`,
    },
    {
      accessorKey: "averageOrderValue",
      header: "AOV",
      cell: ({ row }) => `$${row.original.averageOrderValue.toFixed(2)}`,
    },
    {
      accessorKey: "clv",
      header: "CLV (Est.)",
      cell: ({ row }) => (
        <span className="font-semibold text-primary">
          ${row.original.clv.toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: "lastBookingDate",
      header: "Last Visit",
      cell: ({ row }) =>
        row.original.lastBookingDate
          ? new Date(row.original.lastBookingDate).toLocaleDateString()
          : "N/A",
    },
  ];

  const totalLTV = data.reduce((s, d) => s + d.clv, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Clients Shown", value: data.length.toString() },
          {
            label: "Total Revenue",
            value: `$${data.reduce((s, d) => s + d.totalSpent, 0).toFixed(0)}`,
          },
          { label: "Combined CLV", value: `$${totalLTV.toFixed(0)}` },
        ].map((t) => (
          <div key={t.label} className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">{t.label}</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums">{t.value}</p>
          </div>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={data}
        searchColumn="client.name"
        searchPlaceholder="Search clients..."
      />
    </div>
  );
}

// ── Sheet ─────────────────────────────────────────────────────────────────────

const RANGE_REPORTS = new Set([
  "occupancy-report",
  "no-shows",
  "cancelled-bookings",
]);

export function ReportSheet({
  report,
  facilityId,
  onClose,
}: {
  report: ReportWithCategory | null;
  facilityId: number;
  onClose: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )
    .toISOString()
    .split("T")[0];

  const [dateRange, setDateRange] = useState({ start: monthStart, end: today });
  const [showExport, setShowExport] = useState(false);

  const showDatePicker =
    report?.implemented && RANGE_REPORTS.has(report?.id ?? "");

  function renderContent() {
    if (!report) return null;
    if (!report.implemented) {
      return (
        <ComingSoon name={report.name} description={report.description} />
      );
    }
    switch (report.id) {
      case "revenue-by-service":
      case "total-revenue":
        return <RevenueContent facilityId={facilityId} />;
      case "occupancy-report":
        return (
          <OccupancyContent
            facilityId={facilityId}
            start={dateRange.start}
            end={dateRange.end}
          />
        );
      case "no-shows":
        return (
          <NoShowContent
            facilityId={facilityId}
            start={dateRange.start}
            end={dateRange.end}
          />
        );
      case "cancelled-bookings":
        return (
          <CancellationContent
            facilityId={facilityId}
            start={dateRange.start}
            end={dateRange.end}
          />
        );
      case "customer-value":
        return <CustomerValueContent facilityId={facilityId} />;
      default:
        return (
          <ComingSoon name={report.name} description={report.description} />
        );
    }
  }

  return (
    <>
      <Dialog open={!!report} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="flex max-h-[88vh] w-full max-w-3xl flex-col gap-0 overflow-hidden p-0">
          {/* Header */}
          <div className="shrink-0 border-b px-6 pb-4 pt-6">
            <DialogHeader>
              <DialogTitle className="text-lg">{report?.name ?? ""}</DialogTitle>
              <DialogDescription className="text-xs">
                {report?.description ?? ""}
              </DialogDescription>
            </DialogHeader>

            {(showDatePicker || report?.implemented) && (
              <div className="mt-3 flex items-center gap-2">
                {showDatePicker && (
                  <>
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) =>
                        setDateRange((r) => ({ ...r, start: e.target.value }))
                      }
                      className="h-8 w-[140px] text-xs"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) =>
                        setDateRange((r) => ({ ...r, end: e.target.value }))
                      }
                      className="h-8 w-[140px] text-xs"
                    />
                  </>
                )}
                {report?.implemented && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto h-8"
                    onClick={() => setShowExport(true)}
                  >
                    <Download className="mr-1.5 size-3.5" />
                    Export
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {renderContent()}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent className="max-w-2xl">
          <ExportReportModal
            type={report?.id ?? ""}
            data={[]}
            onClose={() => setShowExport(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
