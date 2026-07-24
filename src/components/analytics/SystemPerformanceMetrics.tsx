"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { systemPerformance } from "@/data/analytics";
import { resourceUtilizations } from "@/data/system-health";
import {
  Activity,
  Clock,
  AlertCircle,
  CheckCircle2,
  Users,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
import { formatCount, formatPercent, formatCompactNumber } from "@/lib/format";

export function SystemPerformanceMetrics() {
  const metrics = systemPerformance;

  // Live resource usage from the system-health records (never hardcoded).
  const resourceUsage = (type: "CPU" | "Memory" | "Disk" | "Network") => {
    const r = resourceUtilizations.find((x) => x.resourceType === type);
    if (!r) return "—";
    return r.unit === "%" ? `${r.current}%` : `${r.current} ${r.unit}`;
  };

  // Calculate additional metrics
  const successRate =
    (metrics.successfulRequests / metrics.totalRequests) * 100;
  const failureRate = (metrics.failedRequests / metrics.totalRequests) * 100;

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  System Uptime
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {formatPercent(metrics.systemUptime)}
                  </h3>
                  <CheckCircle2 className="text-success size-5" />
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  This month
                </p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                <Activity className="size-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Response Time
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {metrics.averageResponseTime}ms
                  </h3>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">Average</p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                }}
              >
                <Clock className="size-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Error Rate
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {formatPercent(metrics.errorRate)}
                  </h3>
                  <span className="text-success inline-flex items-center text-xs font-medium">
                    Low
                  </span>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {formatCount(metrics.failedRequests)} errors
                </p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                }}
              >
                <AlertCircle className="size-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Active Users
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {formatCount(metrics.activeUsers)}
                  </h3>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {formatCount(metrics.totalSessions)} sessions
                </p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                }}
              >
                <Users className="size-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Uptime Monitoring Chart */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            System Uptime Monitoring
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Weekly uptime percentage tracking
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.uptimeTrend}>
                <defs>
                  <linearGradient id="colorUptime" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={chartColor(0)}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={chartColor(0)}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={axisTick}
                  label={axisLabel("Week", "x")}
                />
                <YAxis
                  domain={[99, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={axisTick}
                  tickFormatter={tickFmt("percent")}
                  label={axisLabel("Uptime", "y")}
                />
                <Tooltip content={<ReportTooltip format="percent" />} />
                <Legend {...legendProps} />
                <Area
                  type="monotone"
                  dataKey="uptime"
                  name="Uptime"
                  stroke={chartColor(0)}
                  strokeWidth={3}
                  fill="url(#colorUptime)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-4">
            {metrics.uptimeTrend.map((week, index) => (
              <div
                key={index}
                className="bg-muted/50 rounded-lg p-3 text-center"
              >
                <p className="text-muted-foreground text-xs">{week.date}</p>
                <p className="text-success mt-1 text-xl font-bold">
                  {formatPercent(week.uptime)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Tracking */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Error Distribution
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Weekly error count tracking
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.errorTrend}>
                  <CartesianGrid {...gridProps} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={axisTick}
                    label={axisLabel("Week", "x")}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={axisTick}
                    tickFormatter={tickFmt("compactNumber")}
                    label={axisLabel("Errors", "y")}
                  />
                  <Tooltip content={<ReportTooltip format="number" />} />
                  <Legend {...legendProps} />
                  {/* Red is semantic here — an error/critical series. */}
                  <Bar
                    dataKey="errors"
                    fill="#ef4444"
                    radius={[8, 8, 0, 0]}
                    name="Errors"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Request Statistics */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Request Statistics
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Total requests and success rate
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Total Requests */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Total Requests</span>
                  <span className="text-2xl font-bold">
                    {formatCompactNumber(metrics.totalRequests)}
                  </span>
                </div>
                <div className="bg-muted h-3 w-full rounded-full">
                  <div
                    className="bg-primary h-3 rounded-full"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              {/* Successful Requests */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-success size-4" />
                    <span className="text-sm font-medium">Successful</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold">
                      {formatCompactNumber(metrics.successfulRequests)}
                    </span>
                    <span className="text-muted-foreground ml-2 text-sm">
                      ({formatPercent(successRate, 2)})
                    </span>
                  </div>
                </div>
                <div className="bg-muted h-3 w-full rounded-full">
                  <div
                    className="bg-success h-3 rounded-full"
                    style={{ width: `${successRate}%` }}
                  />
                </div>
              </div>

              {/* Failed Requests */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="text-destructive size-4" />
                    <span className="text-sm font-medium">Failed</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold">
                      {formatCount(metrics.failedRequests)}
                    </span>
                    <span className="text-muted-foreground ml-2 text-sm">
                      ({formatPercent(failureRate, 2)})
                    </span>
                  </div>
                </div>
                <div className="bg-muted h-3 w-full rounded-full">
                  <div
                    className="bg-destructive h-3 rounded-full"
                    style={{ width: `${failureRate}%` }}
                  />
                </div>
              </div>

              {/* Additional Stats */}
              <div className="border-border mt-4 space-y-3 border-t pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Success Rate</span>
                  <Badge variant="default" className="text-xs">
                    {formatPercent(successRate, 2)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Error Rate</span>
                  <Badge variant="secondary" className="text-xs">
                    {formatPercent(metrics.errorRate)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex size-12 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                }}
              >
                <Zap className="size-6 text-white" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Page Load Time</p>
                <p className="text-2xl font-bold">{metrics.pageLoadTime}s</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex size-12 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                <Activity className="size-6 text-white" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">API Response</p>
                <p className="text-2xl font-bold">
                  {metrics.apiResponseTime}ms
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex size-12 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                }}
              >
                <Users className="size-6 text-white" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Avg Session</p>
                <p className="text-2xl font-bold">
                  {metrics.averageSessionDuration}m
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex size-12 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                }}
              >
                <CheckCircle2 className="size-6 text-white" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total Sessions</p>
                <p className="text-2xl font-bold">
                  {formatCompactNumber(metrics.totalSessions)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Status */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            System Health Status
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Current status of all system components
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border-success/20 bg-success/10 rounded-xl border p-4">
              <div className="mb-3 flex items-center gap-3">
                <CheckCircle2 className="text-success size-5" />
                <h4 className="font-semibold">Operational</h4>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center justify-between">
                  <span>Database Cluster</span>
                  <Badge variant="default" className="text-xs">
                    100%
                  </Badge>
                </li>
                <li className="flex items-center justify-between">
                  <span>API Gateway</span>
                  <Badge variant="default" className="text-xs">
                    99.9%
                  </Badge>
                </li>
                <li className="flex items-center justify-between">
                  <span>Authentication Service</span>
                  <Badge variant="default" className="text-xs">
                    100%
                  </Badge>
                </li>
                <li className="flex items-center justify-between">
                  <span>Payment Gateway</span>
                  <Badge variant="default" className="text-xs">
                    99.8%
                  </Badge>
                </li>
              </ul>
            </div>

            <div className="bg-muted/50 rounded-xl p-4">
              <div className="mb-3 flex items-center gap-3">
                <Activity className="text-primary size-5" />
                <h4 className="font-semibold">Performance Metrics</h4>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center justify-between">
                  <span>CPU Usage</span>
                  <span className="font-medium">{resourceUsage("CPU")}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Memory Usage</span>
                  <span className="font-medium">{resourceUsage("Memory")}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Network I/O</span>
                  <span className="font-medium">
                    {resourceUsage("Network")}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Disk Usage</span>
                  <span className="font-medium">{resourceUsage("Disk")}</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
