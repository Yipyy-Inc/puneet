"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, ColumnDef } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
import {
  TrendingUp,
  Target,
  DollarSign,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  promotionPerformance,
  discountImpactMetrics,
  redemptionTrends,
} from "@/data/promotions";

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

export function PerformanceMetrics() {
  const [activeTab, setActiveTab] = useState("promo-effectiveness");

  // Calculate aggregate metrics
  const totalROI =
    promotionPerformance.reduce((sum, p) => sum + p.roi, 0) /
    promotionPerformance.length;
  const totalConversionRate =
    promotionPerformance.reduce((sum, p) => sum + p.conversionRate, 0) /
    promotionPerformance.length;
  const totalRevenue = promotionPerformance.reduce(
    (sum, p) => sum + p.totalRevenue,
    0
  );
  const totalDiscount = promotionPerformance.reduce(
    (sum, p) => sum + p.totalDiscount,
    0
  );

  // Statistics Cards
  const statsCards = [
    {
      title: "Average ROI",
      value: `${totalROI.toFixed(1)}%`,
      subtitle: "Return on investment",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      trend: "+12.5%",
      trendUp: true,
    },
    {
      title: "Conversion Rate",
      value: `${totalConversionRate.toFixed(1)}%`,
      subtitle: "Click to redemption",
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      trend: "+8.3%",
      trendUp: true,
    },
    {
      title: "Total Revenue",
      value: `$${(totalRevenue / 1000).toFixed(1)}K`,
      subtitle: "From promotions",
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      trend: "+15.7%",
      trendUp: true,
    },
    {
      title: "Total Discount",
      value: `$${(totalDiscount / 1000).toFixed(1)}K`,
      subtitle: "Given to customers",
      icon: BarChart3,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      trend: "-3.2%",
      trendUp: false,
    },
  ];

  // Promo Effectiveness columns
  const effectivenessColumns: ColumnDef<Record<string, unknown>>[] = [
    {
      key: "promoCode",
      label: "Promo Details",
      render: (promo: Record<string, unknown>) => (
        <div className="space-y-1">
          <div className="font-medium text-sm">{String(promo.promoCode)}</div>
          <div className="text-xs text-muted-foreground line-clamp-1">
            {String(promo.promoName)}
          </div>
          <Badge
            variant={promo.scope === "system-wide" ? "default" : "secondary"}
            className="text-xs"
          >
            {String(promo.scope)}
          </Badge>
        </div>
      ),
    },
    {
      key: "conversionRate",
      label: "Performance",
      render: (promo: Record<string, unknown>) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {String(promo.conversionRate)}%
            </span>
            <span className="text-xs text-muted-foreground">conversion</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {String(promo.clickThroughRate)}%
            </span>
            <span className="text-xs text-muted-foreground">CTR</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {String(promo.redemptions)} redemptions
          </div>
        </div>
      ),
    },
    {
      key: "roi",
      label: "Revenue & ROI",
      render: (promo: Record<string, unknown>) => (
        <div className="space-y-1">
          <div className="text-sm font-medium text-green-600">
            ${(promo.totalRevenue as number).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            -${(promo.totalDiscount as number).toLocaleString()} discount
          </div>
          <Badge variant="default" className="text-xs">
            {(promo.roi as number).toFixed(1)}% ROI
          </Badge>
        </div>
      ),
    },
    {
      key: "newCustomers",
      label: "Customers",
      render: (promo: Record<string, unknown>) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {String(promo.newCustomers)} new
          </div>
          <div className="text-xs text-muted-foreground">
            {String(promo.returningCustomers)} returning
          </div>
          <div className="text-xs text-muted-foreground">
            ${(promo.averageOrderValue as number).toFixed(2)} AOV
          </div>
        </div>
      ),
    },
  ];

  // Discount Impact columns
  const impactColumns: ColumnDef<Record<string, unknown>>[] = [
    {
      key: "period",
      label: "Period",
      render: (metric: Record<string, unknown>) => (
        <div className="font-medium text-sm">{String(metric.period)}</div>
      ),
    },
    {
      key: "totalBookings",
      label: "Bookings",
      render: (metric: Record<string, unknown>) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {String(metric.totalBookings)}
          </div>
          <div className="text-xs text-muted-foreground">
            {String(metric.discountedBookings)} with discount (
            {String(metric.discountRate)}%)
          </div>
        </div>
      ),
    },
    {
      key: "totalRevenue",
      label: "Revenue",
      render: (metric: Record<string, unknown>) => (
        <div className="space-y-1">
          <div className="text-sm font-medium text-green-600">
            ${(metric.totalRevenue as number).toLocaleString()}
          </div>
          <div className="text-xs text-orange-600">
            -${(metric.totalDiscounts as number).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            ${(metric.netRevenue as number).toLocaleString()} net
          </div>
        </div>
      ),
    },
    {
      key: "revenueImpact",
      label: "Impact",
      render: (metric: Record<string, unknown>) => (
        <div className="space-y-1">
          <Badge
            variant={
              (metric.revenueImpact as number) < 0 ? "destructive" : "default"
            }
            className="text-xs"
          >
            {((metric.revenueImpact as number) > 0 ? "+" : "") +
              String(metric.revenueImpact)}
            %
          </Badge>
          <div className="text-xs text-muted-foreground">
            ${(metric.averageDiscount as number).toFixed(2)} avg
          </div>
        </div>
      ),
    },
  ];

  // Prepare chart data
  const revenueVsDiscountData = promotionPerformance.map((p) => ({
    name: p.promoCode,
    revenue: p.totalRevenue,
    discount: p.totalDiscount,
    net: p.netRevenue,
  }));

  const conversionData = promotionPerformance.map((p) => ({
    name: p.promoCode,
    ctr: p.clickThroughRate,
    conversion: p.conversionRate,
  }));

  const customerTypeData = promotionPerformance.map((p) => ({
    name: p.promoCode,
    new: p.newCustomers,
    returning: p.returningCustomers,
  }));

  const roiPieData = promotionPerformance.slice(0, 5).map((p) => ({
    name: p.promoCode,
    value: p.roi,
  }));

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trendUp ? ArrowUp : ArrowDown;
          return (
            <div
              key={stat.title}
              className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    stat.trendUp ? "text-green-600" : "text-red-600"
                  }`}
                >
                  <TrendIcon className="h-3 w-3" />
                  {stat.trend}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="promo-effectiveness" className="gap-2">
            <Activity className="h-4 w-4" />
            Effectiveness
          </TabsTrigger>
          <TabsTrigger value="revenue-analysis" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Revenue Analysis
          </TabsTrigger>
          <TabsTrigger value="discount-impact" className="gap-2">
            <PieChartIcon className="h-4 w-4" />
            Discount Impact
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="promo-effectiveness"
          className="space-y-4 overflow-x-hidden"
        >
          <div className="border rounded-lg p-4 bg-card">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">
                Promotion Effectiveness Metrics
              </h3>
              <p className="text-sm text-muted-foreground">
                Track CTR, conversion rates, and ROI for all promotions
              </p>
            </div>
            <DataTable
              data={
                promotionPerformance as unknown as Record<string, unknown>[]
              }
              columns={effectivenessColumns}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="text-sm font-semibold mb-4">
                Conversion Rate Analysis
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={conversionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="ctr"
                    fill="#3b82f6"
                    name="CTR %"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    dataKey="conversion"
                    fill="#8b5cf6"
                    name="Conversion %"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="border rounded-lg p-4 bg-card">
              <h3 className="text-sm font-semibold mb-4">ROI Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={roiPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value.toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {roiPieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="revenue-analysis"
          className="space-y-4 overflow-x-hidden"
        >
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="text-sm font-semibold mb-4">
              Revenue vs Discount Analysis
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={revenueVsDiscountData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="revenue"
                  fill="#10b981"
                  name="Total Revenue"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="discount"
                  fill="#f59e0b"
                  name="Discount Given"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="net"
                  fill="#3b82f6"
                  name="Net Revenue"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="border rounded-lg p-4 bg-card">
            <h3 className="text-sm font-semibold mb-4">
              Redemption Trends (7 Days)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={redemptionTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="redemptions"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.6}
                  name="Redemptions"
                />
                <Area
                  type="monotone"
                  dataKey="newCustomers"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                  name="New Customers"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="border rounded-lg p-4 bg-card">
            <h3 className="text-sm font-semibold mb-4">Customer Acquisition</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={customerTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="new"
                  fill="#10b981"
                  name="New Customers"
                  stackId="a"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="returning"
                  fill="#3b82f6"
                  name="Returning Customers"
                  stackId="a"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent
          value="discount-impact"
          className="space-y-4 overflow-x-hidden"
        >
          <div className="border rounded-lg p-4 bg-card">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">
                Discount Impact on Revenue
              </h3>
              <p className="text-sm text-muted-foreground">
                Monitor how discounts affect overall revenue and booking
                patterns
              </p>
            </div>
            <DataTable
              data={
                discountImpactMetrics as unknown as Record<string, unknown>[]
              }
              columns={impactColumns}
            />
          </div>

          <div className="border rounded-lg p-4 bg-card">
            <h3 className="text-sm font-semibold mb-4">Revenue Impact Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={discountImpactMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="totalRevenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Total Revenue"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="netRevenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Net Revenue"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="totalDiscounts"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Total Discounts"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="text-sm font-semibold mb-4">
                Discount Rate Trend
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={discountImpactMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="discountRate"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.6}
                    name="Discount Rate %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="border rounded-lg p-4 bg-card">
              <h3 className="text-sm font-semibold mb-4">Booking Volume</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={discountImpactMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar
                    dataKey="discountedBookings"
                    fill="#8b5cf6"
                    name="With Discount"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    dataKey="totalBookings"
                    fill="#3b82f6"
                    name="Total Bookings"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
