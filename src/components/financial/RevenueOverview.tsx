"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { revenueData, revenueTrends } from "@/data/revenue";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function RevenueOverview() {
  // Calculate totals
  const currentMonth = revenueData.reduce((sum, facility) => {
    return (
      sum +
      facility.subscriptionRevenue +
      facility.transactionRevenue +
      facility.moduleRevenue
    );
  }, 0);

  const previousMonth =
    revenueTrends[revenueTrends.length - 2]?.totalRevenue || 0;
  const monthOverMonthChange =
    ((currentMonth - previousMonth) / previousMonth) * 100;

  const totalMRR = revenueData.reduce(
    (sum, facility) => sum + facility.subscriptionRevenue,
    0,
  );
  const totalARR = totalMRR * 12;

  const averageRevenuePerFacility = currentMonth / revenueData.length;

  // Prepare chart data
  const chartData = revenueTrends.map((trend) => ({
    month: new Date(trend.month).toLocaleDateString("en-US", {
      month: "short",
    }),
    revenue: trend.totalRevenue,
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${currentMonth.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {monthOverMonthChange > 0 ? (
                <span className="flex items-center text-green-600">
                  <TrendingUp className="mr-1 h-3 w-3" />+
                  {monthOverMonthChange.toFixed(1)}% from last month
                </span>
              ) : (
                <span className="flex items-center text-red-600">
                  <TrendingDown className="mr-1 h-3 w-3" />
                  {monthOverMonthChange.toFixed(1)}% from last month
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Recurring Revenue
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalMRR.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              ARR: ${totalARR.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Revenue/Facility
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${averageRevenuePerFacility.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {revenueData.length} facilities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Facilities
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenueData.length}</div>
            <p className="text-xs text-muted-foreground">
              Revenue-generating locations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>
            Monthly revenue over the past 12 months
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
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
                formatter={(value: number) => [
                  `$${value.toLocaleString()}`,
                  "Revenue",
                ]}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown</CardTitle>
          <CardDescription>Current month revenue by source</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                label: "Subscription Revenue",
                value: revenueData.reduce(
                  (sum, f) => sum + f.subscriptionRevenue,
                  0,
                ),
                color: "bg-blue-500",
              },
              {
                label: "Transaction Revenue",
                value: revenueData.reduce(
                  (sum, f) => sum + f.transactionRevenue,
                  0,
                ),
                color: "bg-green-500",
              },
              {
                label: "Module Revenue",
                value: revenueData.reduce((sum, f) => sum + f.moduleRevenue, 0),
                color: "bg-purple-500",
              },
            ].map((item) => {
              const percentage = (item.value / currentMonth) * 100;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-sm text-muted-foreground">
                      ${item.value.toLocaleString()} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
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
    </div>
  );
}
