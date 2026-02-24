"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { revenueData, revenueTrends } from "@/data/revenue";
import { transactions } from "@/data/transactions";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import { TrendingUp, DollarSign, Users, CreditCard } from "lucide-react";

export function FinancialReports() {
  // Prepare revenue trend chart data
  const revenueTrendData = revenueTrends.map((trend) => ({
    month: new Date(trend.month).toLocaleDateString("en-US", {
      month: "short",
    }),
    total: trend.totalRevenue,
    subscription: trend.subscriptionRevenue,
    transaction: trend.transactionRevenue,
    module: trend.moduleRevenue,
  }));

  // Calculate growth metrics
  const currentMonth = revenueTrends[revenueTrends.length - 1];
  const previousMonth = revenueTrends[revenueTrends.length - 2];
  const monthOverMonthGrowth =
    ((currentMonth.totalRevenue - previousMonth.totalRevenue) /
      previousMonth.totalRevenue) *
    100;

  // Facility performance data
  const facilityPerformance = revenueData
    .map((facility) => ({
      name: facility.facilityName,
      revenue: facility.totalRevenue,
      growth: facility.growthRate,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Transaction statistics
  const successfulTransactions = transactions.filter(
    (t) => t.status === "success",
  );
  const totalTransactionRevenue = successfulTransactions.reduce(
    (sum, t) => sum + t.amount,
    0,
  );
  const averageTransactionValue =
    totalTransactionRevenue / successfulTransactions.length;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${currentMonth.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <span
                className={
                  monthOverMonthGrowth > 0 ? "text-green-600" : "text-red-600"
                }
              >
                {monthOverMonthGrowth > 0 ? "+" : ""}
                {monthOverMonthGrowth.toFixed(1)}%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Facilities
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMonth.activeFacilities}
            </div>
            <p className="text-xs text-muted-foreground">Revenue-generating</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Transaction
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${averageTransactionValue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per successful transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${monthOverMonthGrowth > 0 ? "text-green-600" : "text-red-600"}`}
            >
              {monthOverMonthGrowth > 0 ? "+" : ""}
              {monthOverMonthGrowth.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Month-over-month</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Trends</TabsTrigger>
          <TabsTrigger value="facilities">Facility Performance</TabsTrigger>
          <TabsTrigger value="breakdown">Revenue Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Over Time</CardTitle>
              <CardDescription>12-month revenue trend analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={revenueTrendData}>
                  <XAxis
                    dataKey="month"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [
                      `$${(value || 0).toLocaleString()}`,
                      "",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Total Revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="subscription"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Subscription"
                  />
                  <Line
                    type="monotone"
                    dataKey="transaction"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Transaction"
                  />
                  <Line
                    type="monotone"
                    dataKey="module"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Module"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  ${currentMonth.subscriptionRevenue.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {(
                    (currentMonth.subscriptionRevenue /
                      currentMonth.totalRevenue) *
                    100
                  ).toFixed(1)}
                  % of total revenue
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Transaction Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  ${currentMonth.transactionRevenue.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {(
                    (currentMonth.transactionRevenue /
                      currentMonth.totalRevenue) *
                    100
                  ).toFixed(1)}
                  % of total revenue
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Module Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  ${currentMonth.moduleRevenue.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {(
                    (currentMonth.moduleRevenue / currentMonth.totalRevenue) *
                    100
                  ).toFixed(1)}
                  % of total revenue
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="facilities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Facilities</CardTitle>
              <CardDescription>Ranked by total revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={facilityPerformance.slice(0, 10)}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [
                      `$${(value || 0).toLocaleString()}`,
                      "Revenue",
                    ]}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="hsl(var(--primary))"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Facility Growth Rates</CardTitle>
              <CardDescription>
                Month-over-month growth by facility
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {facilityPerformance.map((facility) => (
                  <div key={facility.name}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {facility.name}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          facility.growth > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {facility.growth > 0 ? "+" : ""}
                        {facility.growth}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${facility.growth > 0 ? "bg-green-500" : "bg-red-500"}`}
                          style={{
                            width: `${Math.min(Math.abs(facility.growth) * 10, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-24 text-right">
                        ${facility.revenue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Source</CardTitle>
                <CardDescription>Current month breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      label: "Subscription Revenue",
                      value: currentMonth.subscriptionRevenue,
                      color: "bg-green-500",
                    },
                    {
                      label: "Transaction Revenue",
                      value: currentMonth.transactionRevenue,
                      color: "bg-blue-500",
                    },
                    {
                      label: "Module Revenue",
                      value: currentMonth.moduleRevenue,
                      color: "bg-purple-500",
                    },
                  ].map((item) => {
                    const percentage =
                      (item.value / currentMonth.totalRevenue) * 100;
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            {item.label}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ${item.value.toLocaleString()} (
                            {percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Year-over-Year Comparison</CardTitle>
                <CardDescription>Revenue growth analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">
                        Total Revenue (Current)
                      </p>
                      <p className="text-2xl font-bold">
                        ${currentMonth.totalRevenue.toLocaleString()}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Growth Rate</p>
                      <p className="text-2xl font-bold text-green-600">
                        +{monthOverMonthGrowth.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Active Facilities</p>
                      <p className="text-2xl font-bold">
                        {currentMonth.activeFacilities}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
