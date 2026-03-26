"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { acquisitionMetrics } from "@/data/analytics";
import { TrendingUp, Users, DollarSign, Award } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#6366f1",
];

export function CustomerAcquisitionMetrics() {
  const metrics = acquisitionMetrics;

  // Calculate growth trend data
  const growthTrendData = [
    { month: "Jul", customers: 892, growth: 8.5 },
    { month: "Aug", customers: 956, growth: 7.2 },
    { month: "Sep", customers: 1045, growth: 9.3 },
    { month: "Oct", customers: 1087, growth: 4.0 },
    { month: "Nov", customers: 1250, growth: 15.0 },
  ];

  // Prepare channel breakdown for pie chart
  const channelData = metrics.channelBreakdown.map((channel) => ({
    name: channel.channel,
    value: channel.customers,
    percentage: channel.percentage,
  }));

  // Prepare LTV vs CAC comparison
  const ltvCacData = metrics.channelBreakdown.map((channel) => ({
    channel:
      channel.channel.length > 10
        ? channel.channel.slice(0, 10) + "..."
        : channel.channel,
    ltv: channel.ltv,
    cac: channel.cac,
    ratio: (channel.ltv / channel.cac).toFixed(1),
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Total New Customers
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {metrics.totalNewCustomers.toLocaleString()}
                  </h3>
                  <span className="text-success inline-flex items-center text-xs font-medium">
                    <TrendingUp className="mr-0.5 size-3" />+
                    {metrics.growthRate}%
                  </span>
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
                <Users className="size-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Avg Lifetime Value
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    ${metrics.averageLifetimeValue.toLocaleString()}
                  </h3>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Per customer
                </p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                <DollarSign className="size-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Monthly Growth
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    +{metrics.monthlyGrowthRate}%
                  </h3>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  vs last month
                </p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                }}
              >
                <TrendingUp className="size-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Retention Rate
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {metrics.averageRetentionRate}%
                  </h3>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Average across facilities
                </p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                }}
              >
                <Award className="size-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Growth Trend Chart */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Customer Acquisition Trend
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Monthly new customer sign-ups with growth rates
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthTrendData}>
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
                    yAxisId="left"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
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
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="customers"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    name="New Customers"
                    dot={{ fill: "#3b82f6", r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="growth"
                    stroke="#10b981"
                    strokeWidth={3}
                    name="Growth Rate %"
                    dot={{ fill: "#10b981", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Channel Distribution Pie Chart */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Acquisition Channels
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Customer distribution by acquisition source
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name ?? ""}: ${((percent ?? 0) * 100).toFixed(1)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {channelData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 4px 16px -2px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value: number | undefined) => [
                      (value || 0).toLocaleString(),
                      "Customers",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LTV vs CAC Analysis */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            LTV vs CAC by Channel
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Customer lifetime value compared to acquisition cost (higher ratio
            is better)
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ltvCacData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="channel"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 4px 16px -2px rgba(0, 0, 0, 0.1)",
                  }}
                  formatter={(value: number | undefined) => [
                    `$${value || 0}`,
                    "",
                  ]}
                />
                <Legend />
                <Bar
                  dataKey="ltv"
                  fill="#10b981"
                  name="Lifetime Value"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="cac"
                  fill="#f59e0b"
                  name="Acquisition Cost"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {ltvCacData.map((channel, index) => (
              <div
                key={index}
                className="bg-muted/50 rounded-lg p-3 text-center"
              >
                <p className="text-muted-foreground truncate text-xs">
                  {channel.channel}
                </p>
                <p className="mt-1 text-lg font-bold">{channel.ratio}:1</p>
                <p className="text-muted-foreground text-xs">LTV:CAC</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Channel Performance Details */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Channel Performance Details
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Detailed metrics for each acquisition channel
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.channelBreakdown.map((channel, index) => (
              <div
                key={index}
                className="bg-muted/30 hover:bg-muted/50 flex items-center gap-4 rounded-xl p-4 transition-colors"
              >
                <div
                  className="h-12 w-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h4 className="font-semibold">{channel.channel}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {channel.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {channel.customers.toLocaleString()} customers
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-right">
                  <div>
                    <p className="text-muted-foreground text-xs">CAC</p>
                    <p className="font-semibold">${channel.cac}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">LTV</p>
                    <p className="font-semibold">
                      ${channel.ltv.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">ROI</p>
                    <p className="text-success font-semibold">
                      {((channel.ltv / channel.cac - 1) * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
