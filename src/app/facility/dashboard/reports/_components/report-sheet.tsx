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
  TriangleAlert,
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
import { BUILTIN_SERVICE_COLORS } from "@/lib/operations-calendar";
import {
  useFacilityReport,
  type CancelledData,
  type CustomerValueData,
  type OccupancyData,
  type ReportDataset,
  type RevenueByLocationData,
  type RevenueByServiceData,
  type TotalRevenueData,
} from "@/lib/api/facility-reports";
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

/**
 * A service's chart colour.
 *
 * The fixture selectors returned `color` on every row because they looked it up
 * through `getAllServiceModules()`. Postgres returns data, not presentation, so
 * the same lookup happens here against the one map the calendar already uses -
 * which keeps a service the same colour on both screens rather than by
 * coincidence.
 */
function withColor<T extends { service: string }>(
  row: T,
): T & { color: string } {
  return {
    ...row,
    color: BUILTIN_SERVICE_COLORS[row.service] ?? "#6b7280",
  };
}

// Branches have no fixed palette the way built-in services do -- this report
// only ever gets a name back from the RPC, not a location's real color -- so
// bars are colored by position instead.
const LOCATION_PALETTE = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#8b5cf6",
];

function withLocationColor<T>(row: T, index: number): T & { color: string } {
  return { ...row, color: LOCATION_PALETTE[index % LOCATION_PALETTE.length] };
}

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

function buildRevenueView(d: RevenueByServiceData): ReportView {
  const cur = d.current.map(withColor);
  const prev = d.previous.map(withColor);
  const staffData = d.hours.map(withColor);

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
          Booked Hours by Service
        </p>
        <div className="space-y-0.5">
          <div className="text-muted-foreground grid grid-cols-3 gap-3 border-b px-2 pb-2 text-xs font-semibold">
            <span className="col-span-2">Service</span>
            <span className="text-right">Hours</span>
          </div>
          {staffData.map((row) => (
            <div
              key={row.service}
              className="hover:bg-muted/30 grid grid-cols-3 items-center gap-3 rounded-md px-2 py-2.5"
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
      "Share %":
        curRevenue > 0 ? Math.round((r.revenue / curRevenue) * 1000) / 10 : 0,
    })),
    isEmpty: cur.length === 0,
    emptyTitle: "No revenue in this period",
  };
}

// ── Revenue by location ─────────────────────────────────────────────────────

function buildRevenueByLocationView(d: RevenueByLocationData): ReportView {
  const cur = d.current.map(withLocationColor);
  const prev = d.previous;

  const sum = (
    rows: { revenue: number; bookings: number }[],
    key: "revenue" | "bookings",
  ) => rows.reduce((s, r) => s + r[key], 0);
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
        title="Revenue by Location"
        subtitle="Booked revenue by branch in the selected period"
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
              dataKey="location"
              tick={axisTick}
              label={axisLabel("Location", "x")}
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
                <Cell key={row.location} fill={row.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ReportChartCard>
    </div>
  );

  return {
    kpis,
    body,
    exportData: cur.map((r) => ({
      Location: r.location,
      Revenue: r.revenue,
      Bookings: r.bookings,
      "Avg / Booking": r.bookings > 0 ? r.revenue / r.bookings : 0,
      "Share %":
        curRevenue > 0 ? Math.round((r.revenue / curRevenue) * 1000) / 10 : 0,
    })),
    isEmpty: cur.length === 0,
    emptyTitle: "No revenue in this period",
  };
}

// ── Occupancy ────────────────────────────────────────────────────────────────

function buildOccupancyView(d: OccupancyData): ReportView {
  const data = d.current;
  const prev = d.previous;

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

// ── Cancellations ────────────────────────────────────────────
//
// `buildNoShowView` used to live here and shared this table's shape. It is
// GONE rather than converted, and the report is marked unimplemented: there is
// no `no_show` booking status and no dated no-show event anywhere in the
// schema. `clients.no_show_count` is a lifetime counter - three, across two
// clients - with no date on any of them, so "no-shows in this period" cannot
// be asked. The fixture answered it by inventing dates.
//
// Recording a no-show is a feature somebody has to build. Marking it
// unimplemented says that; converting it would have said the opposite.

function buildCancellationView(d: CancelledData): ReportView {
  const data = d.current;
  const totalRefunds = data.reduce((sum, r) => sum + r.refundAmount, 0);
  const prevRefunds = d.previousRefunds;

  const kpis: ReportKpi[] = [
    {
      label: "Cancellations",
      value: formatCount(data.length),
      icon: CalendarCheck,
      tone: "amber",
      delta: computeDelta(data.length, d.previousCount),
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
      Reason: d.reason ?? "",
      Refund: d.refundAmount,
    })),
    isEmpty: data.length === 0,
    emptyTitle: "No cancellations in this period",
  };
}

// ── Customer Value ────────────────────────────────────────────────────────────

function buildCustomerView(d: CustomerValueData): ReportView {
  // Average order value is DERIVED here rather than returned, so it cannot
  // disagree with the two numbers it comes from.
  const data = d.customers.map((c) => ({
    ...c,
    averageOrderValue: c.totalBookings > 0 ? c.totalSpent / c.totalBookings : 0,
  }));
  const avgLtv =
    data.length > 0
      ? data.reduce((sum, c) => sum + c.totalSpent, 0) / data.length
      : 0;

  const kpis: ReportKpi[] = [
    {
      label: "Active Clients",
      value: formatCount(d.activeClients),
      icon: Users,
      tone: "indigo",
      delta: computeDelta(d.activeClients, d.prevActiveClients),
      hint: "vs. prev. period",
    },
    {
      label: "New Clients",
      value: formatCount(d.newClients),
      icon: Users,
      tone: "emerald",
      delta: computeDelta(d.newClients, d.prevNewClients),
      hint: "vs. prev. period",
    },
    {
      label: "Avg Spend",
      value: formatCurrency(avgLtv),
      icon: DollarSign,
      tone: "violet",
      hint: "per active client",
    },
  ];

  const columns: ColumnDef<(typeof data)[number]>[] = [
    {
      accessorKey: "name",
      header: "Client",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.name}</p>
          <p className="text-muted-foreground text-xs">
            {row.original.email ?? ""}
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
      accessorKey: "lastVisit",
      header: "Last Visit",
      cell: ({ row }) =>
        row.original.lastVisit
          ? new Date(row.original.lastVisit).toLocaleDateString()
          : "N/A",
    },
  ];

  return {
    kpis,
    body: (
      <DataTable
        columns={columns}
        data={data}
        searchColumn="name"
        searchPlaceholder="Search clients..."
      />
    ),
    exportData: data.map((c) => ({
      Client: c.name,
      Email: c.email ?? "",
      Bookings: c.totalBookings,
      "Total Spent": c.totalSpent,
      AOV: c.averageOrderValue,
      "Last Visit": c.lastVisit ?? "",
    })),
    isEmpty: data.length === 0,
    emptyTitle: "No client activity in this period",
  };
}

// ── Total Revenue (full financial report) ───────────────────────────────────

function buildTotalRevenueView(d: TotalRevenueData): ReportView {
  // It used to delegate the whole view to `RevenueReportBody` from
  // components/financial, which reads `@/data/*` and is shared with two other
  // screens. Converting THAT is a separate job with its own blast radius, so
  // this view is built here from the ledger instead.
  const net = d.gross - d.refunded;

  const kpis: ReportKpi[] = [
    {
      label: "Gross Takings",
      value: formatCurrency(d.gross),
      icon: DollarSign,
      tone: "emerald",
      delta: computeDelta(d.gross, d.prevGross),
      hint: "vs. prev. period",
    },
    {
      label: "Refunded",
      value: formatCurrency(d.refunded),
      icon: DollarSign,
      tone: d.refunded > 0 ? "amber" : "slate",
      hint: "returned to customers",
    },
    {
      // Net is what the Reports KPI tile shows, so the two agree by
      // construction rather than by coincidence. Gross alone would disagree
      // with the tile above and both would be right, which is worse than one
      // of them being wrong.
      label: "Net",
      value: formatCurrency(net),
      icon: DollarSign,
      tone: "indigo",
      hint: `${formatCount(d.transactions)} payments`,
    },
  ];

  const body = (
    <ReportChartCard
      title="Takings by Day"
      subtitle="Gross taken and refunded, per day"
      height={300}
      isEmpty={d.daily.length === 0}
      emptyMessage="No payments in this period"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={d.daily}
          margin={{ top: 8, right: 16, bottom: 24, left: 8 }}
        >
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="date"
            tick={axisTick}
            label={axisLabel("Date", "x")}
          />
          <YAxis
            tick={axisTick}
            tickFormatter={tickFmt("compactCurrency")}
            label={axisLabel("Amount", "y")}
          />
          <Tooltip content={<ReportTooltip format="currency" />} />
          <Legend {...legendProps} />
          <Area
            type="monotone"
            dataKey="gross"
            name="Taken"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.18}
          />
          <Area
            type="monotone"
            dataKey="refunded"
            name="Refunded"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.18}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ReportChartCard>
  );

  return {
    kpis,
    body,
    exportData: d.daily.map((row) => ({
      Date: row.date,
      Gross: row.gross,
      Refunded: row.refunded,
      Net: row.net,
      Payments: row.transactions,
    })),
    isEmpty: d.transactions === 0,
    emptyTitle: "No transactions in this period",
  };
}

/**
 * The dataset arrives as `ReportDataset`, a union. Each case narrows it to the
 * shape its own builder needs.
 *
 * The cast is contained to this one function ON PURPOSE: the RPC returns
 * `jsonb`, so there is no type the database can hand back that TypeScript would
 * narrow on its own. Doing it here means exactly one place has to be right, and
 * every builder below is fully typed.
 */
function buildView(
  reportId: string,
  data: ReportDataset | null,
): ReportView | null {
  if (!data) return null;
  switch (reportId) {
    case "total-revenue":
      return buildTotalRevenueView(data as TotalRevenueData);
    case "revenue-by-service":
      return buildRevenueView(data as RevenueByServiceData);
    case "revenue-by-location":
      return buildRevenueByLocationView(data as RevenueByLocationData);
    case "occupancy-report":
      return buildOccupancyView(data as OccupancyData);
    case "cancelled-bookings":
      return buildCancellationView(data as CancelledData);
    case "customer-value":
      return buildCustomerView(data as CustomerValueData);
    default:
      return null;
  }
}

// ── Sheet ──────────────────────────────────────────────────────
//
// `SampleNotice` and `FIXTURE_FACILITY_ID` used to live here. Both are gone,
// and their removal condition was stated when they were added: the notice went
// when the last `buildXView` stopped importing `@/data/*`, and the constant
// went with the last fixture call. There is no `@/data/*` import left in this
// file.

export function ReportSheet({
  report,
  facilityName,
  onClose,
}: {
  report: ReportWithCategory | null;
  /**
   * The facility's NAME, for the error message. Not its id - the route resolves
   * that from the SESSION, so a report cannot be asked for on behalf of a
   * business the viewer does not administer. Passing the id here would have
   * been an id the server must not trust.
   */
  facilityName: string;
  onClose: () => void;
}) {
  const [range, setRange] = useState<ReportRange>(() =>
    defaultReportRange("90d"),
  );
  const [showExport, setShowExport] = useState(false);

  // `enabled` inside the hook rather than a conditional call: the sheet is
  // mounted with `report === null` whenever it is closed.
  const { data, isPending, error } = useFacilityReport(
    report?.implemented ? report.id : null,
    range.from,
    range.to,
  );

  const view = report?.implemented
    ? buildView(report.id, data?.data ?? null)
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
            {!report ? null : !report.implemented ? (
              <ComingSoon name={report.name} description={report.description} />
            ) : error ? (
              // Said, not swallowed. An empty report and a report that could not
              // be read look identical, and only one of them means "no business
              // in this period".
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    This report could not be read for {facilityName}.
                  </p>
                  <p className="text-muted-foreground text-xs/relaxed">
                    {error.message}
                  </p>
                </div>
              </div>
            ) : isPending || !view ? (
              <div
                data-slot="skeleton"
                className="bg-muted/50 h-[420px] animate-pulse rounded-xl"
              />
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
