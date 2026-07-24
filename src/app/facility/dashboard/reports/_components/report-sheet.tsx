"use client";

import { useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  DollarSign,
  CalendarCheck,
  Users,
  BedDouble,
} from "lucide-react";
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
  generateNoShowReport,
  generateCancellationReport,
  getTopCustomers,
} from "@/data/reports";
import { getStaffTimeByService } from "@/lib/analytics-utils";
import {
  revenueByService,
  occupancy,
  clientMetrics,
  revenueSummary,
} from "@/lib/report-data-sources";
import {
  RevenueReportBody,
  revenueKpis,
  revenueDailyRows,
} from "@/components/financial/RevenueReport";
import type { DateRange } from "@/types/facility-analytics";
import { ExportReportModal } from "@/components/reports/ExportReportModal";
import { ReportShell, type ReportKpi } from "@/components/reports/report-shell";
import {
  ReportChartCard,
  ReportTooltip,
  axisLabel,
  axisTick,
  gridProps,
  legendProps,
  tickFmt,
} from "@/components/reports/chart-kit";
import {
  defaultReportRange,
  previousWindow,
  type ReportRange,
} from "@/components/reports/report-range-picker";
import {
  formatCurrency,
  formatCurrencyWhole,
  formatCount,
  formatPercent,
  computeDelta,
} from "@/lib/format";
import type { ReportEntry } from "./reports-hub";

type ReportWithCategory = ReportEntry & {
  categoryTier: "Essential" | "Beneficial";
};

/** Everything a report needs to render inside the shared ReportShell. */
interface ReportView {
  kpis: ReportKpi[];
  body: ReactNode;
  exportData: Record<string, unknown>[];
  isEmpty: boolean;
  emptyTitle: string;
}

const toDR = (r: ReportRange): DateRange => ({ from: r.from, to: r.to });

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
      <div className="border-muted-foreground/20 bg-muted/30 flex size-16 items-center justify-center rounded-2xl border-2 border-dashed">
        <Clock className="text-muted-foreground/50 size-7" />
      </div>
      <div className="space-y-1.5">
        <p className="text-lg font-semibold">{name}</p>
        <p className="text-muted-foreground max-w-xs text-sm">{description}</p>
      </div>
      <Badge variant="outline" className="px-3 py-1 text-xs font-medium">
        Coming Soon
      </Badge>
      <p className="text-muted-foreground/60 max-w-xs text-xs">
        This report is part of the upcoming Yipyy analytics suite and will be
        available in a future update.
      </p>
    </div>
  );
}

// ── Revenue by Service / Total Revenue ──────────────────────────────────────

function buildRevenueView(range: ReportRange, facilityId: number): ReportView {
  const cur = revenueByService(toDR(range));
  const prev = revenueByService(previousWindow(range));
  const staffData = getStaffTimeByService(facilityId, range.from, range.to);

  const sum = (rows: typeof cur, key: "revenue" | "bookings") =>
    rows.reduce((s, r) => s + r[key], 0);
  const curRevenue = sum(cur, "revenue");
  const prevRevenue = sum(prev, "revenue");
  const curBookings = sum(cur, "bookings");
  const prevBookings = sum(prev, "bookings");
  const curAov = curBookings > 0 ? curRevenue / curBookings : 0;
  const prevAov = prevBookings > 0 ? prevRevenue / prevBookings : 0;

  const kpis: ReportKpi[] = [
    {
      label: "Total Revenue",
      value: formatCurrency(curRevenue),
      icon: DollarSign,
      tone: "emerald",
      delta: computeDelta(curRevenue, prevRevenue),
      hint: "vs. prev. period",
    },
    {
      label: "Total Bookings",
      value: formatCount(curBookings),
      icon: CalendarCheck,
      tone: "indigo",
      delta: computeDelta(curBookings, prevBookings),
      hint: "vs. prev. period",
    },
    {
      label: "Avg / Booking",
      value: formatCurrency(curAov),
      icon: DollarSign,
      tone: "violet",
      delta: computeDelta(curAov, prevAov),
      hint: "vs. prev. period",
    },
  ];

  const body = (
    <div className="space-y-4">
      <ReportChartCard
        title="Revenue by Service"
        subtitle="Booked service revenue in the selected period"
        height={280}
        isEmpty={cur.length === 0}
        emptyMessage="No revenue in this period"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={cur}
            margin={{ top: 8, right: 16, bottom: 24, left: 8 }}
          >
            <CartesianGrid {...gridProps} />
            <XAxis
              dataKey="service"
              tick={axisTick}
              label={axisLabel("Service", "x")}
            />
            <YAxis
              tick={axisTick}
              tickFormatter={tickFmt("compactCurrency")}
              label={axisLabel("Revenue", "y")}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
              content={<ReportTooltip format="currency" />}
            />
            <Legend {...legendProps} />
            <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]}>
              {cur.map((row) => (
                <Cell key={row.service} fill={row.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ReportChartCard>

      {/* Staff time by service */}
      <div>
        <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-widest uppercase">
          Staff Time by Service
        </p>
        <div className="space-y-0.5">
          <div className="text-muted-foreground grid grid-cols-4 gap-3 border-b px-2 pb-2 text-xs font-semibold">
            <span className="col-span-2">Service</span>
            <span className="text-right">Hours</span>
            <span className="text-right">Staff</span>
          </div>
          {staffData.map((row) => (
            <div
              key={row.service}
              className="hover:bg-muted/30 grid grid-cols-4 items-center gap-3 rounded-md px-2 py-2.5"
            >
              <div className="col-span-2 flex items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                <span className="text-sm font-medium">{row.service}</span>
              </div>
              <span className="text-right text-sm tabular-nums">
                {formatCount(row.hours)}h
              </span>
              <span className="text-muted-foreground text-right text-sm">
                {formatCount(row.staffCount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return {
    kpis,
    body,
    exportData: cur.map((r) => ({
      Service: r.service,
      Revenue: r.revenue,
      Bookings: r.bookings,
      "Avg / Booking": r.bookings > 0 ? r.revenue / r.bookings : 0,
      "Share %": r.percentage,
    })),
    isEmpty: cur.length === 0,
    emptyTitle: "No revenue in this period",
  };
}

// ── Occupancy ────────────────────────────────────────────────────────────────

function buildOccupancyView(range: ReportRange): ReportView {
  const data = occupancy(toDR(range));
  const prev = occupancy(previousWindow(range));

  const avg = (rows: typeof data) =>
    rows.length > 0
      ? rows.reduce((s, d) => s + d.occupancyRate, 0) / rows.length
      : 0;
  const curAvg = avg(data);
  const prevAvg = avg(prev);
  const curRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const prevRevenue = prev.reduce((s, d) => s + d.revenue, 0);
  const peak = data.reduce((m, d) => Math.max(m, d.occupancyRate), 0);

  const kpis: ReportKpi[] = [
    {
      label: "Avg Occupancy",
      value: formatPercent(curAvg),
      icon: BedDouble,
      tone: "indigo",
      delta: computeDelta(curAvg, prevAvg),
      hint: "vs. prev. period",
    },
    {
      label: "Peak Occupancy",
      value: formatPercent(peak),
      icon: BedDouble,
      tone: "violet",
    },
    {
      label: "Boarding Revenue",
      value: formatCurrencyWhole(curRevenue),
      icon: DollarSign,
      tone: "emerald",
      delta: computeDelta(curRevenue, prevRevenue),
      hint: "vs. prev. period",
    },
  ];

  const columns: ColumnDef<(typeof data)[number]>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
    },
    {
      accessorKey: "occupancyRate",
      header: "Occupancy",
      cell: ({ row }) => formatPercent(row.original.occupancyRate),
    },
    {
      accessorKey: "occupied",
      header: "Occupied",
      cell: ({ row }) =>
        `${formatCount(row.original.occupied)} / ${formatCount(row.original.capacity)}`,
    },
    {
      accessorKey: "revenue",
      header: "Revenue",
      cell: ({ row }) => formatCurrency(row.original.revenue),
    },
  ];

  const hasData = data.some((d) => d.occupied > 0);
  const body = (
    <div className="space-y-4">
      <ReportChartCard
        title="Occupancy Rate"
        subtitle="Daily boarding kennel fill rate"
        height={260}
        isEmpty={!hasData}
        emptyMessage="No boarding occupancy in this period"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 24, left: 8 }}
          >
            <defs>
              <linearGradient id="occFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis
              dataKey="date"
              tick={axisTick}
              minTickGap={28}
              tickFormatter={(v: string) => v.slice(5)}
              label={axisLabel("Date", "x")}
            />
            <YAxis
              tick={axisTick}
              domain={[0, 100]}
              tickFormatter={tickFmt("percent")}
              label={axisLabel("Occupancy %", "y")}
            />
            <Tooltip content={<ReportTooltip format="percent" />} />
            <Legend {...legendProps} />
            <Area
              type="monotone"
              dataKey="occupancyRate"
              name="Occupancy"
              stroke="var(--chart-1)"
              fill="url(#occFill)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ReportChartCard>
      <DataTable
        columns={columns}
        data={data}
        searchColumn="date"
        searchPlaceholder="Search by date..."
      />
    </div>
  );

  return {
    kpis,
    body,
    exportData: data.map((d) => ({
      Date: d.date,
      "Occupancy %": d.occupancyRate,
      Occupied: d.occupied,
      Capacity: d.capacity,
      Revenue: d.revenue,
    })),
    isEmpty: !hasData,
    emptyTitle: "No boarding occupancy in this period",
  };
}

// ── No-Shows / Cancellations (shared table shape) ───────────────────────────

function buildNoShowView(range: ReportRange, facilityId: number): ReportView {
  const data = generateNoShowReport(facilityId, range.from, range.to);
  const prevWin = previousWindow(range);
  const prev = generateNoShowReport(facilityId, prevWin.from, prevWin.to);
  const totalLost = data.reduce((s, d) => s + d.revenue, 0);
  const prevLost = prev.reduce((s, d) => s + d.revenue, 0);

  const kpis: ReportKpi[] = [
    {
      label: "No-Shows",
      value: formatCount(data.length),
      icon: CalendarCheck,
      tone: "rose",
      delta: computeDelta(data.length, prev.length),
      hint: "vs. prev. period",
    },
    {
      label: "Lost Revenue",
      value: formatCurrency(totalLost),
      icon: DollarSign,
      tone: "amber",
      delta: computeDelta(totalLost, prevLost),
      hint: "vs. prev. period",
    },
  ];

  const columns: ColumnDef<(typeof data)[number]>[] = [
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
      cell: ({ row }) => formatCurrency(row.original.revenue),
    },
  ];

  return {
    kpis,
    body: (
      <DataTable
        columns={columns}
        data={data}
        searchColumn="clientName"
        searchPlaceholder="Search by client..."
      />
    ),
    exportData: data.map((d) => ({
      Date: d.date,
      Client: d.clientName,
      Pet: d.petName,
      Service: d.service,
      Time: d.scheduledTime,
      "Lost Revenue": d.revenue,
    })),
    isEmpty: data.length === 0,
    emptyTitle: "No no-shows in this period",
  };
}

function buildCancellationView(
  range: ReportRange,
  facilityId: number,
): ReportView {
  const data = generateCancellationReport(facilityId, range.from, range.to);
  const prevWin = previousWindow(range);
  const prev = generateCancellationReport(facilityId, prevWin.from, prevWin.to);
  const totalRefunds = data.reduce((s, d) => s + d.refundAmount, 0);
  const prevRefunds = prev.reduce((s, d) => s + d.refundAmount, 0);

  const kpis: ReportKpi[] = [
    {
      label: "Cancellations",
      value: formatCount(data.length),
      icon: CalendarCheck,
      tone: "amber",
      delta: computeDelta(data.length, prev.length),
      hint: "vs. prev. period",
    },
    {
      label: "Refunds Issued",
      value: formatCurrency(totalRefunds),
      icon: DollarSign,
      tone: "rose",
      delta: computeDelta(totalRefunds, prevRefunds),
      hint: "vs. prev. period",
    },
  ];

  const columns: ColumnDef<(typeof data)[number]>[] = [
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
      cell: ({ row }) => formatCurrency(row.original.refundAmount),
    },
  ];

  return {
    kpis,
    body: (
      <DataTable
        columns={columns}
        data={data}
        searchColumn="clientName"
        searchPlaceholder="Search by client..."
      />
    ),
    exportData: data.map((d) => ({
      Date: d.date,
      Client: d.clientName,
      Pet: d.petName,
      Service: d.service,
      Notice: d.advanceNotice,
      Reason: d.reason ?? "",
      Refund: d.refundAmount,
    })),
    isEmpty: data.length === 0,
    emptyTitle: "No cancellations in this period",
  };
}

// ── Customer Value ────────────────────────────────────────────────────────────

function buildCustomerView(range: ReportRange, facilityId: number): ReportView {
  const data = getTopCustomers(facilityId, 20, range.from, range.to);
  const cm = clientMetrics(toDR(range));
  const cmPrev = clientMetrics(previousWindow(range));

  const kpis: ReportKpi[] = [
    {
      label: "Active Clients",
      value: formatCount(cm.activeClients),
      icon: Users,
      tone: "indigo",
      delta: computeDelta(cm.activeClients, cmPrev.activeClients),
      hint: "vs. prev. period",
    },
    {
      label: "New Clients",
      value: formatCount(cm.newClients),
      icon: Users,
      tone: "emerald",
      delta: computeDelta(cm.newClients, cmPrev.newClients),
      hint: "vs. prev. period",
    },
    {
      label: "Avg LTV",
      value: formatCurrency(cm.avgLtv),
      icon: DollarSign,
      tone: "violet",
      delta: computeDelta(cm.avgLtv, cmPrev.avgLtv),
      hint: "vs. prev. period",
    },
  ];

  const columns: ColumnDef<(typeof data)[number]>[] = [
    {
      accessorKey: "client.name",
      header: "Client",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.client.name}</p>
          <p className="text-muted-foreground text-xs">
            {row.original.client.email}
          </p>
        </div>
      ),
    },
    { accessorKey: "totalBookings", header: "Bookings" },
    {
      accessorKey: "totalSpent",
      header: "Total Spent",
      cell: ({ row }) => formatCurrency(row.original.totalSpent),
    },
    {
      accessorKey: "averageOrderValue",
      header: "AOV",
      cell: ({ row }) => formatCurrency(row.original.averageOrderValue),
    },
    {
      accessorKey: "clv",
      header: "CLV (Est.)",
      cell: ({ row }) => (
        <span className="text-primary font-semibold">
          {formatCurrency(row.original.clv)}
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

  return {
    kpis,
    body: (
      <DataTable
        columns={columns}
        data={data}
        searchColumn="client.name"
        searchPlaceholder="Search clients..."
      />
    ),
    exportData: data.map((d) => ({
      Client: d.client.name,
      Email: d.client.email,
      Bookings: d.totalBookings,
      "Total Spent": d.totalSpent,
      AOV: d.averageOrderValue,
      CLV: d.clv,
      "Last Visit": d.lastBookingDate ?? "",
    })),
    isEmpty: data.length === 0,
    emptyTitle: "No client activity in this period",
  };
}

// ── Total Revenue (full financial report) ───────────────────────────────────

function buildTotalRevenueView(range: ReportRange): ReportView {
  const dr = toDR(range);
  const summary = revenueSummary(dr);
  return {
    kpis: revenueKpis(dr),
    body: <RevenueReportBody range={dr} />,
    exportData: revenueDailyRows(dr),
    isEmpty: summary.transactions === 0,
    emptyTitle: "No transactions in this period",
  };
}

function buildView(
  reportId: string,
  range: ReportRange,
  facilityId: number,
): ReportView | null {
  switch (reportId) {
    case "total-revenue":
      return buildTotalRevenueView(range);
    case "revenue-by-service":
      return buildRevenueView(range, facilityId);
    case "occupancy-report":
      return buildOccupancyView(range);
    case "no-shows":
      return buildNoShowView(range, facilityId);
    case "cancelled-bookings":
      return buildCancellationView(range, facilityId);
    case "customer-value":
      return buildCustomerView(range, facilityId);
    default:
      return null;
  }
}

// ── Sheet ─────────────────────────────────────────────────────────────────────

export function ReportSheet({
  report,
  facilityId,
  onClose,
}: {
  report: ReportWithCategory | null;
  facilityId: number;
  onClose: () => void;
}) {
  const [range, setRange] = useState<ReportRange>(() =>
    defaultReportRange("90d"),
  );
  const [showExport, setShowExport] = useState(false);

  const view =
    report?.implemented && report
      ? buildView(report.id, range, facilityId)
      : null;

  return (
    <>
      <Dialog open={!!report} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="flex max-h-[88vh] w-full max-w-3xl flex-col gap-0 overflow-hidden p-0">
          {/* Header */}
          <div className="shrink-0 border-b px-6 pt-6 pb-4">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {report?.name ?? ""}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {report?.description ?? ""}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {!report ? null : !view ? (
              <ComingSoon name={report.name} description={report.description} />
            ) : (
              <ReportShell
                range={range}
                onRangeChange={setRange}
                onExport={() => setShowExport(true)}
                kpis={view.kpis}
                isEmpty={view.isEmpty}
                emptyTitle={view.emptyTitle}
              >
                {view.body}
              </ReportShell>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent className="max-w-2xl">
          <ExportReportModal
            type={report?.id ?? ""}
            data={view?.exportData ?? []}
            onClose={() => setShowExport(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
