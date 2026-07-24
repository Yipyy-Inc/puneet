"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DollarSign,
  Landmark,
  HandCoins,
  Receipt,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { ExportReportModal } from "@/components/reports/ExportReportModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ReportChartCard,
  ReportTooltip,
  axisLabel,
  axisTick,
  chartColor,
  gridProps,
  legendProps,
  tickFmt,
} from "@/components/reports/chart-kit";
import { ReportShell, type ReportKpi } from "@/components/reports/report-shell";
import {
  defaultReportRange,
  previousWindow,
  type ReportRange,
} from "@/components/reports/report-range-picker";
import {
  revenueByPeriod,
  revenueByService,
  revenueSummary,
  paymentMethodBreakdown,
} from "@/lib/report-data-sources";
import type { DateRange, Granularity } from "@/types/facility-analytics";
import {
  formatCurrency,
  formatCount,
  formatPercent,
  computeDelta,
} from "@/lib/format";

export type RevenueSection =
  | "breakdown"
  | "trend"
  | "service"
  | "paymentMethods"
  | "dailyTable";

const ALL_SECTIONS: RevenueSection[] = [
  "breakdown",
  "trend",
  "service",
  "paymentMethods",
  "dailyTable",
];

const toDR = (r: ReportRange | DateRange): DateRange => ({
  from: r.from,
  to: r.to,
});

// ── KPI row (shared by standalone + facility route) ─────────────────────────

/** Headline revenue KPIs with period-over-period deltas. */
export function revenueKpis(range: DateRange): ReportKpi[] {
  const cur = revenueSummary(range);
  const iso = (v: string | Date) =>
    typeof v === "string" ? v : v.toISOString().split("T")[0];
  const prev = revenueSummary(
    previousWindow({ from: iso(range.from), to: iso(range.to) }),
  );
  return [
    {
      label: "Total Revenue",
      value: formatCurrency(cur.totalCollected),
      icon: DollarSign,
      tone: "emerald",
      delta: computeDelta(cur.totalCollected, prev.totalCollected),
      hint: "gross · vs. prev. period",
    },
    {
      label: "Net Revenue",
      value: formatCurrency(cur.netRevenue),
      icon: Landmark,
      tone: "indigo",
      delta: computeDelta(cur.netRevenue, prev.netRevenue),
      hint: "after refunds",
    },
    {
      label: "Tax Collected",
      value: formatCurrency(cur.tax),
      icon: Receipt,
      tone: "slate",
    },
    {
      label: "Tips Collected",
      value: formatCurrency(cur.tips),
      icon: HandCoins,
      tone: "amber",
    },
    {
      label: "Avg Transaction",
      value: formatCurrency(cur.avgTransaction),
      icon: DollarSign,
      tone: "violet",
      delta: computeDelta(cur.avgTransaction, prev.avgTransaction),
      hint: `${formatCount(cur.transactions)} txns`,
    },
  ];
}

/** Flat, export-ready daily rows (matches the on-screen daily table). */
export function revenueDailyRows(range: DateRange): Record<string, unknown>[] {
  return revenueByPeriod(range, { granularity: "day" })
    .filter((d) => d.transactions > 0)
    .map((d) => ({
      Date: d.period,
      Transactions: d.transactions,
      Subtotal: d.subtotal,
      Discounts: d.discounts,
      Tax: d.tax,
      Tips: d.tips,
      Refunds: d.refunds,
      Total: d.revenue,
    }));
}

// ── Sub-sections ─────────────────────────────────────────────────────────────

function RevenueBreakdown({ range }: { range: DateRange }) {
  const s = revenueSummary(range);
  const rows: { label: string; value: number; op: "+" | "-" | "=" }[] = [
    { label: "Subtotal (gross sales)", value: s.subtotal, op: "=" },
    { label: "Discounts", value: -s.discounts, op: "-" },
    { label: "Tax", value: s.tax, op: "+" },
    { label: "Tips", value: s.tips, op: "+" },
    { label: "Total Collected", value: s.totalCollected, op: "=" },
    { label: "Refunds", value: -s.refunds, op: "-" },
    { label: "Net Revenue", value: s.netRevenue, op: "=" },
  ];
  return (
    <Card className="gap-0 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Revenue Breakdown</h3>
          <p className="text-muted-foreground text-xs">
            Gross → net, per revenue-recognition rules
          </p>
        </div>
        {s.reconciled ? (
          <Badge
            variant="outline"
            className="gap-1 border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
          >
            <CheckCircle2 className="size-3.5" />
            Reconciled
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="gap-1 border-amber-500/40 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
          >
            <AlertTriangle className="size-3.5" />Δ{" "}
            {formatCurrency(Math.abs(s.totalCollected - s.rawTotal))}
          </Badge>
        )}
      </div>
      <div className="divide-y">
        {rows.map((r) => {
          const isTotal = r.op === "=" && r.label !== "Subtotal (gross sales)";
          return (
            <div
              key={r.label}
              className={cn(
                "flex items-center justify-between py-2 text-sm",
                isTotal && "font-semibold",
              )}
            >
              <span className={cn(!isTotal && "text-muted-foreground")}>
                {r.label}
              </span>
              <span
                className={cn(
                  "tabular-nums",
                  r.value < 0 && "text-red-600 dark:text-red-400",
                )}
              >
                {r.value < 0 ? "−" : ""}
                {formatCurrency(Math.abs(r.value))}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

function RevenueTrend({ range }: { range: DateRange }) {
  const [granularity, setGranularity] = useState<Granularity>("day");
  const data = revenueByPeriod(range, { granularity });
  const isEmpty = data.every((d) => d.revenue === 0);

  const toggle = (
    <div className="flex items-center gap-0.5 rounded-lg border p-0.5">
      {GRANULARITIES.map((g) => (
        <button
          key={g.value}
          onClick={() => setGranularity(g.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            granularity === g.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {g.label}
        </button>
      ))}
    </div>
  );

  return (
    <ReportChartCard
      title="Revenue Trend"
      subtitle="Total collected per period"
      actions={toggle}
      height={280}
      isEmpty={isEmpty}
      emptyMessage="No revenue in this period"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 24, left: 8 }}
        >
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="period"
            tick={axisTick}
            minTickGap={28}
            tickFormatter={(v: string) => (v.length > 7 ? v.slice(5) : v)}
            label={axisLabel(
              granularity === "month"
                ? "Month"
                : granularity === "week"
                  ? "Week"
                  : "Date",
              "x",
            )}
          />
          <YAxis
            tick={axisTick}
            tickFormatter={tickFmt("compactCurrency")}
            label={axisLabel("Revenue", "y")}
          />
          <Tooltip content={<ReportTooltip format="currency" />} />
          <Legend {...legendProps} />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ReportChartCard>
  );
}

function RevenueByServiceDonut({ range }: { range: DateRange }) {
  const data = revenueByService(range);
  return (
    <ReportChartCard
      title="Revenue by Service"
      subtitle="Booked service revenue by type (incl. bookings)"
      height={280}
      isEmpty={data.length === 0}
      emptyMessage="No revenue in this period"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="revenue"
            nameKey="service"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
          >
            {data.map((row) => (
              <Cell key={row.service} fill={row.color} />
            ))}
          </Pie>
          <Tooltip content={<ReportTooltip format="currency" />} />
          <Legend {...legendProps} />
        </PieChart>
      </ResponsiveContainer>
    </ReportChartCard>
  );
}

function PaymentMethods({ range }: { range: DateRange }) {
  const data = paymentMethodBreakdown(range);
  return (
    <ReportChartCard
      title="Payment Methods"
      subtitle="Tender mix from transaction payments"
      height={280}
      isEmpty={data.length === 0}
      emptyMessage="No payments in this period"
    >
      <div className="grid h-full grid-cols-1 items-center gap-4 sm:grid-cols-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="label"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={2}
            >
              {data.map((row, i) => (
                <Cell key={row.label} fill={chartColor(i)} />
              ))}
            </Pie>
            <Tooltip content={<ReportTooltip format="currency" />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-1.5">
          {data.map((row, i) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: chartColor(i) }}
                />
                {row.label}
              </span>
              <span className="tabular-nums">
                {formatCurrency(row.amount)}
                <span className="text-muted-foreground ml-1.5 text-xs">
                  {formatPercent(row.percentage)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </ReportChartCard>
  );
}

function DailyRevenueTable({ range }: { range: DateRange }) {
  const all = revenueByPeriod(range, { granularity: "day" });
  const data = all.filter((d) => d.transactions > 0);
  const summary = revenueSummary(range);

  const columns: ColumnDef<(typeof data)[number]>[] = [
    {
      accessorKey: "period",
      header: "Date",
      cell: ({ row }) => new Date(row.original.period).toLocaleDateString(),
    },
    { accessorKey: "transactions", header: "Txns" },
    {
      accessorKey: "subtotal",
      header: "Subtotal",
      cell: ({ row }) => formatCurrency(row.original.subtotal),
    },
    {
      accessorKey: "discounts",
      header: "Discounts",
      cell: ({ row }) => formatCurrency(row.original.discounts),
    },
    {
      accessorKey: "tax",
      header: "Tax",
      cell: ({ row }) => formatCurrency(row.original.tax),
    },
    {
      accessorKey: "tips",
      header: "Tips",
      cell: ({ row }) => formatCurrency(row.original.tips),
    },
    {
      accessorKey: "refunds",
      header: "Refunds",
      cell: ({ row }) => formatCurrency(row.original.refunds),
    },
    {
      accessorKey: "revenue",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-semibold tabular-nums">
          {formatCurrency(row.original.revenue)}
        </span>
      ),
    },
  ];

  return (
    <Card className="gap-0 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Revenue by Day</h3>
        <span className="text-muted-foreground text-xs tabular-nums">
          {formatCount(summary.transactions)} txns ·{" "}
          <span className="text-foreground font-semibold">
            {formatCurrency(summary.totalCollected)}
          </span>{" "}
          total
        </span>
      </div>
      <DataTable
        columns={columns}
        data={data}
        searchColumn="period"
        searchPlaceholder="Search by date..."
      />
    </Card>
  );
}

// ── Body (no shell — used inside hosts that provide their own chrome) ────────

export function RevenueReportBody({
  range,
  sections = ALL_SECTIONS,
}: {
  range: DateRange;
  sections?: RevenueSection[];
}) {
  const show = (s: RevenueSection) => sections.includes(s);
  return (
    <div className="space-y-4">
      {show("breakdown") && <RevenueBreakdown range={range} />}
      {show("trend") && <RevenueTrend range={range} />}
      <div
        className={cn(
          "grid gap-4",
          show("service") && show("paymentMethods") && "lg:grid-cols-2",
        )}
      >
        {show("service") && <RevenueByServiceDonut range={range} />}
        {show("paymentMethods") && <PaymentMethods range={range} />}
      </div>
      {show("dailyTable") && <DailyRevenueTable range={range} />}
    </div>
  );
}

// ── Standalone (own range picker + KPI row + export) ─────────────────────────

export function RevenueReport({
  sections,
  title,
  subtitle,
}: {
  sections?: RevenueSection[];
  title?: string;
  subtitle?: string;
}) {
  const [range, setRange] = useState<ReportRange>(() =>
    defaultReportRange("90d"),
  );
  const [showExport, setShowExport] = useState(false);
  const dr = toDR(range);
  const kpis = revenueKpis(dr);
  const summary = revenueSummary(dr);

  return (
    <>
      <ReportShell
        title={title}
        subtitle={subtitle}
        range={range}
        onRangeChange={setRange}
        onExport={() => setShowExport(true)}
        kpis={kpis}
        isEmpty={summary.transactions === 0}
        emptyTitle="No transactions in this period"
      >
        <RevenueReportBody range={dr} sections={sections} />
      </ReportShell>

      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent className="max-w-2xl">
          <ExportReportModal
            type="revenue-by-day"
            data={revenueDailyRows(dr)}
            onClose={() => setShowExport(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
