"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { systemPerformance } from "@/data/analytics";
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
  ResponsiveContainer,
} from "recharts";

export function SystemPerformanceMetrics() {
  const metrics = systemPerformance;

  // Calculate additional metrics
  const successRate = (
    (metrics.successfulRequests / metrics.totalRequests) *
    100
  ).toFixed(2);
  const failureRate = (
    (metrics.failedRequests / metrics.totalRequests) *
    100
  ).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  System Uptime
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {metrics.systemUptime}%
                  </h3>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This month
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                <Activity className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Response Time
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {metrics.averageResponseTime}ms
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Average</p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                }}
              >
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Error Rate
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {metrics.errorRate}%
                  </h3>
                  <span className="inline-flex items-center text-xs font-medium text-success">
                    Low
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {metrics.failedRequests.toLocaleString()} errors
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                }}
              >
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Active Users
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {metrics.activeUsers.toLocaleString()}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {metrics.totalSessions.toLocaleString()} sessions
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                }}
              >
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Uptime Monitoring Chart */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            System Uptime Monitoring
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Weekly uptime percentage tracking
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.uptimeTrend}>
                <defs>
                  <linearGradient id="colorUptime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <YAxis
                  domain={[99, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 4px 16px -2px rgba(0, 0, 0, 0.1)",
                  }}
                  formatter={(value: number) => [`${value}%`, "Uptime"]}
                />
                <Area
                  type="monotone"
                  dataKey="uptime"
                  stroke="#10b981"
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
                className="text-center p-3 rounded-lg bg-muted/50"
              >
                <p className="text-xs text-muted-foreground">{week.date}</p>
                <p className="text-xl font-bold text-success mt-1">
                  {week.uptime}%
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Tracking */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Error Distribution
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Weekly error count tracking
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.errorTrend}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 4px 16px -2px rgba(0, 0, 0, 0.1)",
                    }}
                  />
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
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Request Statistics
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Total requests and success rate
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Total Requests */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Total Requests</span>
                  <span className="text-2xl font-bold">
                    {(metrics.totalRequests / 1000000).toFixed(2)}M
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-primary rounded-full h-3"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              {/* Successful Requests */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium">Successful</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold">
                      {(metrics.successfulRequests / 1000000).toFixed(2)}M
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({successRate}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-success rounded-full h-3"
                    style={{ width: `${successRate}%` }}
                  />
                </div>
              </div>

              {/* Failed Requests */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium">Failed</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold">
                      {metrics.failedRequests.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({failureRate}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-destructive rounded-full h-3"
                    style={{ width: `${failureRate}%` }}
                  />
                </div>
              </div>

              {/* Additional Stats */}
              <div className="pt-4 mt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Success Rate</span>
                  <Badge variant="default" className="text-xs">
                    {successRate}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Error Rate</span>
                  <Badge variant="secondary" className="text-xs">
                    {metrics.errorRate}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                }}
              >
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Page Load Time</p>
                <p className="text-2xl font-bold">{metrics.pageLoadTime}s</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">API Response</p>
                <p className="text-2xl font-bold">
                  {metrics.apiResponseTime}ms
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                }}
              >
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Session</p>
                <p className="text-2xl font-bold">
                  {metrics.averageSessionDuration}m
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                }}
              >
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">
                  {(metrics.totalSessions / 1000).toFixed(1)}K
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Status */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            System Health Status
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Current status of all system components
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-xl bg-success/10 border border-success/20">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
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

            <div className="p-4 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3 mb-3">
                <Activity className="h-5 w-5 text-primary" />
                <h4 className="font-semibold">Performance Metrics</h4>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center justify-between">
                  <span>CPU Usage</span>
                  <span className="font-medium">42%</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Memory Usage</span>
                  <span className="font-medium">58%</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Network I/O</span>
                  <span className="font-medium">156 MB/s</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Disk Usage</span>
                  <span className="font-medium">67%</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
