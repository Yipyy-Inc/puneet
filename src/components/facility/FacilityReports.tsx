"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface FacilityReportsProps {
  facilityId: number;
  facilityName: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload?: { percentage: number };
  }>;
  label?: string;
}

const formatCurrencyValue = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm">{label}</p>
        {payload.map((entry, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}:{" "}
            {typeof entry.value === "number" &&
            entry.name.toLowerCase().includes("revenue")
              ? formatCurrencyValue(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm">{payload[0].name}</p>
        <p className="text-sm">{formatCurrencyValue(payload[0].value)}</p>
        <p className="text-xs text-muted-foreground">
          {payload[0].payload?.percentage}% of total
        </p>
      </div>
    );
  }
  return null;
};

const COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
];

// Mock data generator based on facility ID
const generateFacilityReportData = (facilityId: number) => {
  const baseMultiplier = 1 + (facilityId % 3) * 0.2;

  return {
    summary: {
      totalRevenue: Math.round(145000 * baseMultiplier),
      revenueGrowth: 12.5 + (facilityId % 5),
      totalBookings: Math.round(842 * baseMultiplier),
      bookingGrowth: 8.2 + (facilityId % 4),
      activeClients: Math.round(234 * baseMultiplier),
      clientGrowth: 15.3 - (facilityId % 3),
      avgBookingValue: Math.round(125 * baseMultiplier),
    },
    revenueByService: [
      {
        name: "Boarding",
        value: Math.round(52000 * baseMultiplier),
        percentage: 36,
      },
      {
        name: "Grooming",
        value: Math.round(38000 * baseMultiplier),
        percentage: 26,
      },
      {
        name: "Daycare",
        value: Math.round(31000 * baseMultiplier),
        percentage: 21,
      },
      {
        name: "Training",
        value: Math.round(24000 * baseMultiplier),
        percentage: 17,
      },
    ],
    monthlyRevenue: [
      {
        month: "Jun",
        revenue: Math.round(18500 * baseMultiplier),
        bookings: Math.round(120 * baseMultiplier),
      },
      {
        month: "Jul",
        revenue: Math.round(21200 * baseMultiplier),
        bookings: Math.round(138 * baseMultiplier),
      },
      {
        month: "Aug",
        revenue: Math.round(24800 * baseMultiplier),
        bookings: Math.round(152 * baseMultiplier),
      },
      {
        month: "Sep",
        revenue: Math.round(22100 * baseMultiplier),
        bookings: Math.round(145 * baseMultiplier),
      },
      {
        month: "Oct",
        revenue: Math.round(26500 * baseMultiplier),
        bookings: Math.round(168 * baseMultiplier),
      },
      {
        month: "Nov",
        revenue: Math.round(31900 * baseMultiplier),
        bookings: Math.round(185 * baseMultiplier),
      },
    ],
    bookingsByDay: [
      {
        day: "Mon",
        bookings: Math.round(98 * baseMultiplier),
        completed: Math.round(92 * baseMultiplier),
      },
      {
        day: "Tue",
        bookings: Math.round(112 * baseMultiplier),
        completed: Math.round(105 * baseMultiplier),
      },
      {
        day: "Wed",
        bookings: Math.round(125 * baseMultiplier),
        completed: Math.round(118 * baseMultiplier),
      },
      {
        day: "Thu",
        bookings: Math.round(118 * baseMultiplier),
        completed: Math.round(112 * baseMultiplier),
      },
      {
        day: "Fri",
        bookings: Math.round(156 * baseMultiplier),
        completed: Math.round(148 * baseMultiplier),
      },
      {
        day: "Sat",
        bookings: Math.round(142 * baseMultiplier),
        completed: Math.round(135 * baseMultiplier),
      },
      {
        day: "Sun",
        bookings: Math.round(91 * baseMultiplier),
        completed: Math.round(86 * baseMultiplier),
      },
    ],
    clientGrowth: [
      {
        month: "Jun",
        newClients: Math.round(28 * baseMultiplier),
        returning: Math.round(145 * baseMultiplier),
      },
      {
        month: "Jul",
        newClients: Math.round(35 * baseMultiplier),
        returning: Math.round(152 * baseMultiplier),
      },
      {
        month: "Aug",
        newClients: Math.round(42 * baseMultiplier),
        returning: Math.round(168 * baseMultiplier),
      },
      {
        month: "Sep",
        newClients: Math.round(38 * baseMultiplier),
        returning: Math.round(175 * baseMultiplier),
      },
      {
        month: "Oct",
        newClients: Math.round(45 * baseMultiplier),
        returning: Math.round(182 * baseMultiplier),
      },
      {
        month: "Nov",
        newClients: Math.round(52 * baseMultiplier),
        returning: Math.round(195 * baseMultiplier),
      },
    ],
    topClients: [
      {
        name: "Johnson Family",
        visits: 24,
        spent: Math.round(2850 * baseMultiplier),
      },
      {
        name: "Smith Household",
        visits: 18,
        spent: Math.round(2120 * baseMultiplier),
      },
      {
        name: "Williams Family",
        visits: 15,
        spent: Math.round(1890 * baseMultiplier),
      },
      {
        name: "Brown Residence",
        visits: 12,
        spent: Math.round(1560 * baseMultiplier),
      },
      {
        name: "Davis Family",
        visits: 11,
        spent: Math.round(1320 * baseMultiplier),
      },
    ],
    recentReports: [
      {
        id: 1,
        name: "Monthly Revenue Summary",
        type: "Financial",
        generatedAt: "Nov 26, 2025",
        status: "completed",
      },
      {
        id: 2,
        name: "Client Retention Analysis",
        type: "Customer",
        generatedAt: "Nov 24, 2025",
        status: "completed",
      },
      {
        id: 3,
        name: "Service Utilization Report",
        type: "Operations",
        generatedAt: "Nov 22, 2025",
        status: "completed",
      },
      {
        id: 4,
        name: "Staff Performance Review",
        type: "Performance",
        generatedAt: "Nov 20, 2025",
        status: "completed",
      },
    ],
    scheduledReports: [
      {
        id: 1,
        name: "Weekly Booking Summary",
        frequency: "Weekly",
        nextRun: "Dec 2, 2025",
        recipients: 2,
      },
      {
        id: 2,
        name: "Monthly Financial Report",
        frequency: "Monthly",
        nextRun: "Dec 1, 2025",
        recipients: 3,
      },
    ],
    bookingMetrics: {
      completionRate: 92.5,
      cancellationRate: 7.5,
      noShowRate: 2.1,
    },
  };
};

export function FacilityReports({
  facilityId,
  facilityName,
}: FacilityReportsProps) {
  const data = generateFacilityReportData(facilityId);

  const formatCurrency = formatCurrencyValue;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">
            Facility Reports & Analytics
          </h3>
          <p className="text-sm text-muted-foreground">
            Performance insights for {facilityName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" />
            Last 6 Months
          </Button>
          <Button size="sm" className="gap-2">
            <FileText className="h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(data.summary.totalRevenue)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span className="text-xs text-success font-medium">
                    +{data.summary.revenueGrowth.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                }}
              >
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold mt-1">
                  {data.summary.totalBookings}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span className="text-xs text-success font-medium">
                    +{data.summary.bookingGrowth.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                }}
              >
                <CalendarCheck className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Clients</p>
                <p className="text-2xl font-bold mt-1">
                  {data.summary.activeClients}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span className="text-xs text-success font-medium">
                    +{data.summary.clientGrowth.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl"
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

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  Avg. Booking Value
                </p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(data.summary.avgBookingValue)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Per transaction
                </p>
              </div>
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                }}
              >
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto bg-muted/50">
          <TabsTrigger
            value="overview"
            className="gap-2 data-[state=active]:shadow-sm"
          >
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="revenue"
            className="gap-2 data-[state=active]:shadow-sm"
          >
            <DollarSign className="h-4 w-4" />
            Revenue
          </TabsTrigger>
          <TabsTrigger
            value="bookings"
            className="gap-2 data-[state=active]:shadow-sm"
          >
            <CalendarCheck className="h-4 w-4" />
            Bookings
          </TabsTrigger>
          <TabsTrigger
            value="scheduled"
            className="gap-2 data-[state=active]:shadow-sm"
          >
            <Clock className="h-4 w-4" />
            Scheduled
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Revenue Trend Chart */}
            <Card className="border-0 shadow-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    Revenue & Bookings Trend
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Download className="h-4 w-4" />
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
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                      />
                      <XAxis
                        dataKey="month"
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        yAxisId="left"
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => `$${v / 1000}k`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
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
            <Card className="border-0 shadow-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    Revenue by Service
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] flex items-center">
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
                      <Tooltip content={<PieTooltip />} />
                      <Legend
                        formatter={(value) => (
                          <span className="text-sm">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Clients & Recent Reports */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top Clients */}
            <Card className="border-0 shadow-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Top Clients
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                  >
                    View All
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.topClients.map((client, index) => (
                    <div
                      key={client.name}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{client.name}</p>
                          <p className="text-xs text-muted-foreground">
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
            <Card className="border-0 shadow-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Recent Reports
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.recentReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{report.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {report.generatedAt}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {report.type}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Download className="h-4 w-4" />
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
          <Card className="border-0 shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Monthly Revenue Trend
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.monthlyRevenue}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="month"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v) => `$${v / 1000}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
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
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total (6 months)
                  </p>
                  <p className="text-lg font-bold">
                    {formatCurrency(
                      data.monthlyRevenue.reduce(
                        (sum, m) => sum + m.revenue,
                        0,
                      ),
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Monthly Average
                  </p>
                  <p className="text-lg font-bold">
                    {formatCurrency(
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
          <Card className="border-0 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Revenue Breakdown by Service
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenueByService} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                      horizontal={true}
                      vertical={false}
                    />
                    <XAxis
                      type="number"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v) => `$${v / 1000}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      width={80}
                    />
                    <Tooltip content={<CustomTooltip />} />
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
          <Card className="border-0 shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                  Bookings by Day of Week
                </CardTitle>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.bookingsByDay}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="day"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
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
              <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Peak Day</p>
                  <p className="text-lg font-bold">Friday</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Weekly Total</p>
                  <p className="text-lg font-bold">
                    {data.bookingsByDay.reduce((sum, d) => sum + d.bookings, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Daily Average</p>
                  <p className="text-lg font-bold">
                    {Math.round(
                      data.bookingsByDay.reduce(
                        (sum, d) => sum + d.bookings,
                        0,
                      ) / 7,
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Metrics */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-0 shadow-card">
              <CardContent className="p-5 text-center">
                <p className="text-xs text-muted-foreground">Completion Rate</p>
                <p className="text-3xl font-bold mt-2 text-success">
                  {data.bookingMetrics.completionRate}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  +2.3% from last month
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-card">
              <CardContent className="p-5 text-center">
                <p className="text-xs text-muted-foreground">
                  Cancellation Rate
                </p>
                <p className="text-3xl font-bold mt-2 text-warning">
                  {data.bookingMetrics.cancellationRate}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  -1.2% from last month
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-card">
              <CardContent className="p-5 text-center">
                <p className="text-xs text-muted-foreground">No-Show Rate</p>
                <p className="text-3xl font-bold mt-2">
                  {data.bookingMetrics.noShowRate}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  -0.5% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Client Growth Area Chart */}
          <Card className="border-0 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
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
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="month"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
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
          <Card className="border-0 shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Scheduled Reports
                </CardTitle>
                <Button size="sm" className="h-8 gap-1">
                  <Calendar className="h-3.5 w-3.5" />
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
                      className="flex items-center justify-between p-4 rounded-xl bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center w-10 h-10 rounded-xl"
                          style={{
                            background:
                              "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                          }}
                        >
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{report.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {report.frequency}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
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
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No scheduled reports</p>
                  <p className="text-sm">
                    Set up automated reports for this facility
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Report Generation */}
          <Card className="border-0 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Quick Report Generation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant="outline"
                  className="justify-start gap-2 h-auto py-3"
                >
                  <DollarSign className="h-4 w-4 text-success" />
                  <div className="text-left">
                    <p className="font-medium">Revenue Report</p>
                    <p className="text-xs text-muted-foreground">
                      Financial summary & trends
                    </p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2 h-auto py-3"
                >
                  <CalendarCheck className="h-4 w-4 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium">Booking Report</p>
                    <p className="text-xs text-muted-foreground">
                      Reservations & occupancy
                    </p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2 h-auto py-3"
                >
                  <Users className="h-4 w-4 text-purple-500" />
                  <div className="text-left">
                    <p className="font-medium">Client Report</p>
                    <p className="text-xs text-muted-foreground">
                      Customer analytics
                    </p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2 h-auto py-3"
                >
                  <BarChart3 className="h-4 w-4 text-orange-500" />
                  <div className="text-left">
                    <p className="font-medium">Performance Report</p>
                    <p className="text-xs text-muted-foreground">
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
