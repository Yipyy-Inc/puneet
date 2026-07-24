"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { facilitiesQueries } from "@/lib/api/facilities";
import { GenerateReportModal } from "@/components/facility/GenerateReportModal";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Users,
  CalendarCheck,
  BarChart3,
  Clock,
  ArrowUpRight,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  axisLabel,
  axisTick,
  gridProps,
  legendProps,
  ReportTooltip,
  tickFmt,
} from "@/components/reports/chart-kit";
import {
  formatCount,
  formatCurrency,
  formatCurrencyWhole,
  formatPercent,
} from "@/lib/format";

interface FacilityReportsProps {
  facilityId: number;
  facilityName: string;
}

const COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
];

export function FacilityReports({
  facilityId,
  facilityName,
}: FacilityReportsProps) {
  const [rangeMonths, setRangeMonths] = useState(6);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const { data, isLoading } = useQuery(
    facilitiesQueries.report(facilityId, rangeMonths),
  );

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="bg-muted h-9 w-72 animate-pulse rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-muted h-28 animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="bg-muted h-80 animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">
            Facility Reports & Analytics
          </h3>
          <p className="text-muted-foreground text-sm">
            Performance insights for {facilityName}
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={String(rangeMonths)}
            onValueChange={(v) => setRangeMonths(Number(v))}
          >
            <SelectTrigger className="h-8 w-[180px] gap-2">
              <Calendar className="size-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 30 days</SelectItem>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setReportModalOpen(true)}
          >
            <FileText className="size-4" />
            Generate Report
          </Button>
        </div>
      </div>

      <GenerateReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        facilityId={facilityId}
        facilityName={facilityName}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs">Total Revenue</p>
                <p className="mt-1 text-2xl font-bold">
                  {formatCurrencyWhole(data.summary.totalRevenue)}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <TrendingUp className="text-success size-3" />
                  <span className="text-success text-xs font-medium">
                    +{formatPercent(data.summary.revenueGrowth)}
                  </span>
                </div>
              </div>
              <div
                className="flex size-10 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                }}
              >
                <DollarSign className="size-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs">Total Bookings</p>
                <p className="mt-1 text-2xl font-bold">
                  {formatCount(data.summary.totalBookings)}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <TrendingUp className="text-success size-3" />
                  <span className="text-success text-xs font-medium">
                    +{formatPercent(data.summary.bookingGrowth)}
                  </span>
                </div>
              </div>
              <div
                className="flex size-10 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                }}
              >
                <CalendarCheck className="size-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs">Active Clients</p>
                <p className="mt-1 text-2xl font-bold">
                  {formatCount(data.summary.activeClients)}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <TrendingUp className="text-success size-3" />
                  <span className="text-success text-xs font-medium">
                    +{formatPercent(data.summary.clientGrowth)}
                  </span>
                </div>
              </div>
              <div
                className="flex size-10 items-center justify-center rounded-xl"
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

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs">
                  Avg. Booking Value
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {formatCurrencyWhole(data.summary.avgBookingValue)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Per transaction
                </p>
              </div>
              <div
                className="flex size-10 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                }}
              >
                <BarChart3 className="size-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-muted/50 grid h-auto w-full grid-cols-4">
          <TabsTrigger
            value="overview"
            className="gap-2 data-[state=active]:shadow-sm"
          >
            <BarChart3 className="size-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="revenue"
            className="gap-2 data-[state=active]:shadow-sm"
          >
            <DollarSign className="size-4" />
            Revenue
          </TabsTrigger>
          <TabsTrigger
            value="bookings"
            className="gap-2 data-[state=active]:shadow-sm"
          >
            <CalendarCheck className="size-4" />
            Bookings
          </TabsTrigger>
          <TabsTrigger
            value="scheduled"
            className="gap-2 data-[state=active]:shadow-sm"
          >
            <Clock className="size-4" />
            Scheduled
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Revenue Trend Chart */}
            <Card className="shadow-card border-0">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <TrendingUp className="text-muted-foreground size-4" />
                    Revenue & Bookings Trend
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="size-8">
                    <Download className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.monthlyRevenue}>
                      <defs>
                        <linearGradient
                          id="colorRevenue"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#22c55e"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#22c55e"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="colorBookings"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid {...gridProps} />
                      <XAxis
                        dataKey="month"
                        tick={axisTick}
                        label={axisLabel("Month", "x")}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={axisTick}
                        tickFormatter={tickFmt("compactCurrency")}
                        label={axisLabel("Revenue", "y")}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={axisTick}
                        tickFormatter={tickFmt("compactNumber")}
                        label={axisLabel("Bookings", "y")}
                      />
                      <Tooltip
                        content={
                          <ReportTooltip
                            format={{ revenue: "currency", bookings: "number" }}
                          />
                        }
                      />
                      <Legend {...legendProps} />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="bookings"
                        name="Bookings"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorBookings)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Revenue by Service Pie Chart */}
            <Card className="shadow-card border-0">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <BarChart3 className="text-muted-foreground size-4" />
                    Revenue by Service
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="size-8">
                    <Download className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex h-[280px] items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.revenueByService}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {data.revenueByService.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<ReportTooltip format="currency" />} />
                      <Legend {...legendProps} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Clients & Recent Reports */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top Clients */}
            <Card className="shadow-card border-0">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Users className="text-muted-foreground size-4" />
                    Top Clients
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                  >
                    View All
                    <ArrowUpRight className="size-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.topClients.map((client, index) => (
                    <div
                      key={client.name}
                      className="hover:bg-muted/50 flex items-center justify-between rounded-lg p-2 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full text-xs font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{client.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {client.visits} visits
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatCurrency(client.spent)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Reports */}
            <Card className="shadow-card border-0">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="text-muted-foreground size-4" />
                    Recent Reports
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.recentReports.map((report) => (
                    <div
                      key={report.id}
                      className="bg-muted/50 hover:bg-muted flex items-center justify-between rounded-lg p-3 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 flex size-9 items-center justify-center rounded-lg">
                          <FileText className="text-primary size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{report.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {report.generatedAt}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {report.type}
                        </Badge>
                        <Button variant="ghost" size="icon" className="size-8">
                          <Download className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="mt-4 space-y-4">
          {/* Revenue Line Chart */}
          <Card className="shadow-card border-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <TrendingUp className="text-muted-foreground size-4" />
                  Monthly Revenue Trend
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <FileSpreadsheet className="size-3.5" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.monthlyRevenue}>
                    <CartesianGrid {...gridProps} />
                    <XAxis
                      dataKey="month"
                      tick={axisTick}
                      label={axisLabel("Month", "x")}
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
                      stroke="#22c55e"
                      strokeWidth={3}
                      dot={{ fill: "#22c55e", strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <div>
                  <p className="text-muted-foreground text-xs">
                    Total (6 months)
                  </p>
                  <p className="text-lg font-bold">
                    {formatCurrencyWhole(
                      data.monthlyRevenue.reduce(
                        (sum, m) => sum + m.revenue,
                        0,
                      ),
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-xs">
                    Monthly Average
                  </p>
                  <p className="text-lg font-bold">
                    {formatCurrencyWhole(
                      data.monthlyRevenue.reduce(
                        (sum, m) => sum + m.revenue,
                        0,
                      ) / 6,
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Service Bar Chart */}
          <Card className="shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <BarChart3 className="text-muted-foreground size-4" />
                Revenue Breakdown by Service
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenueByService} layout="vertical">
                    <CartesianGrid {...gridProps} />
                    <XAxis
                      type="number"
                      tick={axisTick}
                      tickFormatter={tickFmt("compactCurrency")}
                      label={axisLabel("Revenue", "x")}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={axisTick}
                      width={80}
                      label={axisLabel("Service", "y")}
                    />
                    <Tooltip content={<ReportTooltip format="currency" />} />
                    <Legend {...legendProps} />
                    <Bar dataKey="value" name="Revenue" radius={[0, 4, 4, 0]}>
                      {data.revenueByService.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="mt-4 space-y-4">
          {/* Bookings by Day Chart */}
          <Card className="shadow-card border-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <CalendarCheck className="text-muted-foreground size-4" />
                  Bookings by Day of Week
                </CardTitle>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Printer className="size-3.5" />
                  Print
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.bookingsByDay}>
                    <CartesianGrid {...gridProps} />
                    <XAxis
                      dataKey="day"
                      tick={axisTick}
                      label={axisLabel("Day", "x")}
                    />
                    <YAxis
                      tick={axisTick}
                      tickFormatter={tickFmt("compactNumber")}
                      label={axisLabel("Bookings", "y")}
                    />
                    <Tooltip content={<ReportTooltip format="number" />} />
                    <Legend {...legendProps} />
                    <Bar
                      dataKey="bookings"
                      name="Total Bookings"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="completed"
                      name="Completed"
                      fill="#22c55e"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4 text-center">
                <div>
                  <p className="text-muted-foreground text-xs">Peak Day</p>
                  <p className="text-lg font-bold">Friday</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Weekly Total</p>
                  <p className="text-lg font-bold">
                    {formatCount(
                      data.bookingsByDay.reduce(
                        (sum, d) => sum + d.bookings,
                        0,
                      ),
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Daily Average</p>
                  <p className="text-lg font-bold">
                    {formatCount(
                      Math.round(
                        data.bookingsByDay.reduce(
                          (sum, d) => sum + d.bookings,
                          0,
                        ) / 7,
                      ),
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Metrics */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="shadow-card border-0">
              <CardContent className="p-5 text-center">
                <p className="text-muted-foreground text-xs">Completion Rate</p>
                <p className="text-success mt-2 text-3xl font-bold">
                  {formatPercent(data.bookingMetrics.completionRate)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  +2.3% from last month
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-card border-0">
              <CardContent className="p-5 text-center">
                <p className="text-muted-foreground text-xs">
                  Cancellation Rate
                </p>
                <p className="text-warning mt-2 text-3xl font-bold">
                  {formatPercent(data.bookingMetrics.cancellationRate)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  -1.2% from last month
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-card border-0">
              <CardContent className="p-5 text-center">
                <p className="text-muted-foreground text-xs">No-Show Rate</p>
                <p className="mt-2 text-3xl font-bold">
                  {formatPercent(data.bookingMetrics.noShowRate)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  -0.5% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Client Growth Area Chart */}
          <Card className="shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Users className="text-muted-foreground size-4" />
                Client Growth Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.clientGrowth}>
                    <defs>
                      <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#8b5cf6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#8b5cf6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorReturning"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#22c55e"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#22c55e"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...gridProps} />
                    <XAxis
                      dataKey="month"
                      tick={axisTick}
                      label={axisLabel("Month", "x")}
                    />
                    <YAxis
                      tick={axisTick}
                      tickFormatter={tickFmt("compactNumber")}
                      label={axisLabel("Clients", "y")}
                    />
                    <Tooltip content={<ReportTooltip format="number" />} />
                    <Legend {...legendProps} />
                    <Area
                      type="monotone"
                      dataKey="newClients"
                      name="New Clients"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorNew)"
                    />
                    <Area
                      type="monotone"
                      dataKey="returning"
                      name="Returning"
                      stroke="#22c55e"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorReturning)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Tab */}
        <TabsContent value="scheduled" className="mt-4 space-y-4">
          <Card className="shadow-card border-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="text-muted-foreground size-4" />
                  Scheduled Reports
                </CardTitle>
                <Button size="sm" className="h-8 gap-1">
                  <Calendar className="size-3.5" />
                  Schedule New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.scheduledReports.length > 0 ? (
                <div className="space-y-3">
                  {data.scheduledReports.map((report) => (
                    <div
                      key={report.id}
                      className="bg-muted/50 flex items-center justify-between rounded-xl p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex size-10 items-center justify-center rounded-xl"
                          style={{
                            background:
                              "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                          }}
                        >
                          <FileText className="size-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{report.name}</p>
                          <div className="mt-1 flex items-center gap-3">
                            <span className="text-muted-foreground flex items-center gap-1 text-xs">
                              <Clock className="size-3" />
                              {report.frequency}
                            </span>
                            <span className="text-muted-foreground flex items-center gap-1 text-xs">
                              <Users className="size-3" />
                              {report.recipients} recipients
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-xs">
                          Next: {report.nextRun}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground py-8 text-center">
                  <Clock className="mx-auto mb-3 size-12 opacity-50" />
                  <p>No scheduled reports</p>
                  <p className="text-sm">
                    Set up automated reports for this facility
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Report Generation */}
          <Card className="shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Quick Report Generation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant="outline"
                  className="h-auto justify-start gap-2 py-3"
                >
                  <DollarSign className="text-success size-4" />
                  <div className="text-left">
                    <p className="font-medium">Revenue Report</p>
                    <p className="text-muted-foreground text-xs">
                      Financial summary & trends
                    </p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto justify-start gap-2 py-3"
                >
                  <CalendarCheck className="size-4 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium">Booking Report</p>
                    <p className="text-muted-foreground text-xs">
                      Reservations & occupancy
                    </p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto justify-start gap-2 py-3"
                >
                  <Users className="size-4 text-purple-500" />
                  <div className="text-left">
                    <p className="font-medium">Client Report</p>
                    <p className="text-muted-foreground text-xs">
                      Customer analytics
                    </p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto justify-start gap-2 py-3"
                >
                  <BarChart3 className="size-4 text-orange-500" />
                  <div className="text-left">
                    <p className="font-medium">Performance Report</p>
                    <p className="text-muted-foreground text-xs">
                      Staff & service metrics
                    </p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
