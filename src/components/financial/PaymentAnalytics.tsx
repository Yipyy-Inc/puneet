"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { paymentAnalytics } from "@/data/transactions";
import { DollarSign, TrendingUp, CreditCard, Activity } from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export function PaymentAnalytics() {
  const analytics = paymentAnalytics;

  // Prepare chart data
  const methodChartData = analytics.paymentMethodBreakdown.map((method) => ({
    name: method.method.replace("_", " "),
    value: method.count,
    volume: method.volume,
  }));

  const providerChartData = analytics.providerBreakdown.map((provider) => ({
    name: provider.provider,
    transactions: provider.count,
    volume: provider.volume,
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics.totalVolume.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: ${analytics.averageTransactionValue.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics.successRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.successfulTransactions} / {analytics.totalTransactions}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Failed Transactions
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analytics.failedTransactions}
            </div>
            <p className="text-xs text-muted-foreground">
              {(
                (analytics.failedTransactions / analytics.totalTransactions) *
                100
              ).toFixed(1)}
              % failure rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.pendingTransactions}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Payment Method Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>
              Transaction distribution by payment method
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={methodChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                >
                  {methodChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Provider Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Provider Performance</CardTitle>
            <CardDescription>Transaction volume by provider</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={providerChartData}>
                <XAxis
                  dataKey="name"
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
                    "Volume",
                  ]}
                />
                <Bar
                  dataKey="volume"
                  fill="hsl(var(--primary))"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment Method Details</CardTitle>
            <CardDescription>
              Volume and count by payment method
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.paymentMethodBreakdown.map((method) => {
                const percentage =
                  (method.count / analytics.totalTransactions) * 100;
                return (
                  <div key={method.method}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize">
                        {method.method.replace("_", " ")}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {method.count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="h-2 bg-muted rounded-full overflow-hidden flex-1 mr-4">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold">
                        ${method.volume.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Provider Statistics</CardTitle>
            <CardDescription>Performance metrics by provider</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.providerBreakdown.map((provider) => (
                <div key={provider.provider} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {provider.provider}
                    </span>
                    <span className="text-sm text-green-600">
                      {provider.successRate}% success
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Transactions:{" "}
                      </span>
                      <span className="font-semibold">{provider.count}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Volume: </span>
                      <span className="font-semibold">
                        ${provider.volume.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
