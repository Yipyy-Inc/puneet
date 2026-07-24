"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserPlus,
  DollarSign,
  Repeat,
  PawPrint,
  UserX,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  chartColor,
  axisTick,
  gridProps,
  legendProps,
  axisLabel,
  ReportTooltip,
  tickFmt,
} from "@/components/reports/chart-kit";
import { formatCount, formatCurrency, formatPercent } from "@/lib/format";
import {
  clientMetrics,
  clientTrends,
  topClientsBySpend,
  clientBase,
  retentionCurve,
} from "@/lib/report-data-sources";
import {
  ReportRangePicker,
  defaultReportRange,
  formatRangeLabel,
  type ReportRange,
} from "@/components/reports/report-range-picker";

function fmtPeriod(p: string): string {
  if (/^\d{4}-\d{2}$/.test(p)) {
    const [y, m] = p.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", {
      month: "short",
    });
  }
  return p.length > 7 ? p.slice(5) : p;
}

export function CustomerAcquisitionMetrics() {
  const [range, setRange] = useState<ReportRange>(() =>
    defaultReportRange("365d"),
  );
  const rangeLabel = formatRangeLabel(range);

  const metrics = clientMetrics(range);
  const trends = clientTrends(range, { granularity: "month" });
  const topClients = topClientsBySpend(range, 8);
  const base = clientBase();
  const retention = retentionCurve();

  const kpis = [
    {
      label: "New Clients",
      value: formatCount(metrics.newClients),
      hint: "First purchase, last 12 mo",
      icon: UserPlus,
      gradient: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    },
    {
      label: "Active Clients",
      value: formatCount(metrics.activeClients),
      hint: `${formatCount(metrics.returningClients)} returning`,
      icon: Users,
      gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    },
    {
      label: "Avg Lifetime Value",
      value: formatCurrency(metrics.avgLtv),
      hint: "Sum of client's transactions",
      icon: DollarSign,
      gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
    },
    {
      label: "Retention Rate",
      value: formatPercent(metrics.retentionRate),
      hint: "Returning share of active",
      icon: Repeat,
      gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    },
  ];

  const acquisition = metrics.acquisitionBySource;
  const trendsHaveData = trends.some(
    (t) => t.newClients + t.returningClients > 0,
  );

  return (
    <div className="space-y-6">
      {/* Date-range control — drives acquisition/trends/top-client tiles. Client
          base + retention curve are roster-wide snapshots (no range). */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Customer Acquisition
          </h2>
          <p className="text-muted-foreground text-sm">{rangeLabel}</p>
        </div>
        <ReportRangePicker value={range} onChange={setRange} />
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="shadow-card border-0">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-muted-foreground mb-1 text-sm font-medium">
                    {kpi.label}
                  </p>
                  <h3 className="text-2xl font-bold tracking-tight">
                    {kpi.value}
                  </h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {kpi.hint}
                  </p>
                </div>
                <div
                  className="flex size-11 items-center justify-center rounded-xl"
                  style={{ background: kpi.gradient }}
                >
                  <kpi.icon className="size-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* New vs returning over time */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              New vs Returning Clients
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Monthly acquisition split, from transaction history
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {!trendsHaveData ? (
                <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                  No client activity in this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends}>
                    <CartesianGrid {...gridProps} />
                    <XAxis
                      dataKey="period"
                      tick={axisTick}
                      tickFormatter={fmtPeriod}
                      label={axisLabel("Month", "x")}
                    />
                    <YAxis
                      tick={axisTick}
                      allowDecimals={false}
                      tickFormatter={tickFmt("compactNumber")}
                      label={axisLabel("Clients", "y")}
                    />
                    <Tooltip content={<ReportTooltip format="number" />} />
                    <Legend {...legendProps} />
                    <Bar
                      dataKey="newClients"
                      name="New"
                      stackId="c"
                      fill={chartColor(0)}
                    />
                    <Bar
                      dataKey="returningClients"
                      name="Returning"
                      stackId="c"
                      fill={chartColor(1)}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Acquisition by source */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Acquisition by Source
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Inferred from each client&apos;s first transaction
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {acquisition.length === 0 ? (
                <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                  No acquisitions in this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={acquisition}
                      dataKey="clients"
                      nameKey="source"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={2}
                    >
                      {acquisition.map((s, i) => (
                        <Cell key={s.source} fill={chartColor(i)} />
                      ))}
                    </Pie>
                    <Tooltip content={<ReportTooltip format="number" />} />
                    <Legend {...legendProps} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top clients by spend */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Top Clients by Spend
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Highest-value clients, last 12 months
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {topClients.length === 0 ? (
                <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                  No client spend in this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topClients} layout="vertical">
                    <CartesianGrid {...gridProps} vertical horizontal={false} />
                    <XAxis
                      type="number"
                      tick={axisTick}
                      tickFormatter={tickFmt("compactCurrency")}
                      label={axisLabel("Spend", "x")}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={axisTick}
                      width={110}
                    />
                    <Tooltip content={<ReportTooltip format="currency" />} />
                    <Legend {...legendProps} />
                    <Bar
                      dataKey="spend"
                      name="Total Spend"
                      fill={chartColor(0)}
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Client base composition */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Client Base</CardTitle>
            <p className="text-muted-foreground text-sm">
              Roster composition &amp; engagement
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <Users className="text-muted-foreground size-4" />
                  <span className="text-muted-foreground text-xs">
                    Total Clients
                  </span>
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {formatCount(base.totalClients)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatCount(base.activeClients)} active ·{" "}
                  {formatCount(base.inactiveClients)} inactive
                </p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <PawPrint className="text-muted-foreground size-4" />
                  <span className="text-muted-foreground text-xs">
                    Pets / Client
                  </span>
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {base.avgPetsPerClient}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatCount(base.totalPets)} pets total
                </p>
              </div>
            </div>

            {/* Active vs inactive bar */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active share</span>
                <span className="font-medium">
                  {formatPercent(
                    base.totalClients > 0
                      ? (base.activeClients / base.totalClients) * 100
                      : 0,
                  )}
                </span>
              </div>
              <div className="bg-muted flex h-3 w-full overflow-hidden rounded-full">
                <div
                  className="h-3"
                  style={{
                    width: `${base.totalClients > 0 ? (base.activeClients / base.totalClients) * 100 : 0}%`,
                    backgroundColor: chartColor(1),
                  }}
                />
              </div>
            </div>

            {/* Retention curve — cumulative share who visited within N days */}
            <div className="mt-4">
              <p className="text-muted-foreground mb-1 text-xs">
                Client retention curve (of clients with a recorded visit)
              </p>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={retention}>
                    <defs>
                      <linearGradient id="retCurve" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={chartColor(3)}
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor={chartColor(3)}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="window" tick={axisTick} />
                    <YAxis
                      tick={axisTick}
                      domain={[0, 100]}
                      tickFormatter={tickFmt("percent")}
                      width={38}
                    />
                    <Tooltip content={<ReportTooltip format="percent" />} />
                    <Area
                      type="monotone"
                      dataKey="percentage"
                      name="Visited within"
                      stroke={chartColor(3)}
                      fill="url(#retCurve)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reactivation opportunities */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <UserX className="size-4" />
            Reactivation Opportunities
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Clients with no visit in 60+ days — worth a win-back nudge
          </p>
        </CardHeader>
        <CardContent>
          {base.reactivation.length === 0 ? (
            <div className="text-muted-foreground py-6 text-center text-sm">
              No lapsed clients — everyone has visited recently.
            </div>
          ) : (
            <div className="space-y-2">
              {base.reactivation.map((c) => (
                <div
                  key={c.id}
                  className="bg-muted/30 hover:bg-muted/50 flex items-center justify-between gap-4 rounded-xl p-3 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="text-muted-foreground text-xs">
                      Last visit{" "}
                      {new Date(c.lastVisit + "T00:00:00").toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={c.daysSince >= 180 ? "destructive" : "secondary"}
                  >
                    {formatCount(c.daysSince)} days ago
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
