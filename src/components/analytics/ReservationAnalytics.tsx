"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { systemReservationMetrics } from "@/data/analytics";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export function ReservationAnalytics() {
  const metrics = systemReservationMetrics;

  // Calculate additional metrics
  const pendingRate = (
    (metrics.pendingReservations / metrics.totalReservations) *
    100
  ).toFixed(1);
  const totalProcessed =
    metrics.completedReservations + metrics.cancelledReservations;

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Total Reservations
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {metrics.totalReservations.toLocaleString()}
                  </h3>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  This month
                </p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                }}
              >
                <Calendar className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Completed
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {metrics.completedReservations.toLocaleString()}
                  </h3>
                  <span className="text-success inline-flex items-center text-xs font-medium">
                    {metrics.completionRate}%
                  </span>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Success rate
                </p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Cancelled
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {metrics.cancelledReservations.toLocaleString()}
                  </h3>
                  <span className="text-destructive inline-flex items-center text-xs font-medium">
                    {metrics.cancellationRate}%
                  </span>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Cancellation rate
                </p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                }}
              >
                <XCircle className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Total Revenue
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    ${(metrics.totalRevenue / 1000).toFixed(0)}K
                  </h3>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Avg ${metrics.averageBookingValue}/booking
                </p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                }}
              >
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reservation Trends Chart */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Reservation Trends
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Monthly reservation and cancellation patterns
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.trends}>
                <defs>
                  <linearGradient
                    id="colorReservations"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="colorCancellations"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
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
                <Legend />
                <Area
                  type="monotone"
                  dataKey="reservations"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fill="url(#colorReservations)"
                  name="Reservations"
                />
                <Area
                  type="monotone"
                  dataKey="cancellations"
                  stroke="#ef4444"
                  strokeWidth={3}
                  fill="url(#colorCancellations)"
                  name="Cancellations"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Peak Usage Times */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Peak Usage Times
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Most popular booking time slots
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.peakUsageTimes} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis
                    dataKey="timeSlot"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    width={80}
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
                    dataKey="reservations"
                    fill="#8b5cf6"
                    radius={[0, 8, 8, 0]}
                    name="Reservations"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Reservation Status Breakdown */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Status Distribution
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Current reservation status breakdown
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Completed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-success size-4" />
                    <span className="font-medium">Completed</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">
                      {metrics.completedReservations.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground ml-2 text-sm">
                      ({metrics.completionRate}%)
                    </span>
                  </div>
                </div>
                <div className="bg-muted h-2 w-full rounded-full">
                  <div
                    className="bg-success h-2 rounded-full transition-all"
                    style={{ width: `${metrics.completionRate}%` }}
                  />
                </div>
              </div>

              {/* Cancelled */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="text-destructive size-4" />
                    <span className="font-medium">Cancelled</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">
                      {metrics.cancelledReservations.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground ml-2 text-sm">
                      ({metrics.cancellationRate}%)
                    </span>
                  </div>
                </div>
                <div className="bg-muted h-2 w-full rounded-full">
                  <div
                    className="bg-destructive h-2 rounded-full transition-all"
                    style={{ width: `${metrics.cancellationRate}%` }}
                  />
                </div>
              </div>

              {/* Pending */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="text-warning size-4" />
                    <span className="font-medium">Pending</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">
                      {metrics.pendingReservations.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground ml-2 text-sm">
                      ({pendingRate}%)
                    </span>
                  </div>
                </div>
                <div className="bg-muted h-2 w-full rounded-full">
                  <div
                    className="bg-warning h-2 rounded-full transition-all"
                    style={{ width: `${pendingRate}%` }}
                  />
                </div>
              </div>

              {/* Summary Stats */}
              <div className="border-border mt-4 space-y-3 border-t pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Processed</span>
                  <span className="font-semibold">
                    {totalProcessed.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Avg Booking Value
                  </span>
                  <span className="font-semibold">
                    ${metrics.averageBookingValue}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Revenue</span>
                  <span className="text-success font-semibold">
                    ${metrics.totalRevenue.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Performance Summary */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Year-Over-Year Comparison
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Reservation performance across 12 months
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.trends}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
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
                <Legend />
                <Line
                  type="monotone"
                  dataKey="reservations"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Reservations"
                  dot={{ fill: "#3b82f6", r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="cancellations"
                  stroke="#ef4444"
                  strokeWidth={3}
                  name="Cancellations"
                  dot={{ fill: "#ef4444", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
