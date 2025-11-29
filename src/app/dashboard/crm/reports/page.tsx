"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Download,
  Calendar,
  Target,
  ArrowUpRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  leads,
  LeadSource,
  leadSourceLabels,
  pipelineStageLabels,
  pipelineStageOrder,
} from "@/data/crm/leads";
import { getWonDeals, getLostDeals, getActiveDeals } from "@/data/crm/deals";
import { salesTeamMembers, getTeamTotalRevenue } from "@/data/crm/sales-team";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<
    "week" | "month" | "quarter" | "year"
  >("month");

  // Lead source data
  const leadsBySource = Object.entries(
    leads.reduce(
      (acc, lead) => {
        acc[lead.source] = (acc[lead.source] || 0) + 1;
        return acc;
      },
      {} as Record<LeadSource, number>,
    ),
  ).map(([source, count]) => ({
    name: leadSourceLabels[source as LeadSource],
    value: count,
  }));

  // Lead status data
  const leadsByStatus = pipelineStageOrder.map((stage) => ({
    name: pipelineStageLabels[stage],
    stage,
    count: leads.filter((l) => l.status === stage).length,
    value: leads
      .filter((l) => l.status === stage)
      .reduce((sum, l) => sum + l.estimatedAnnualValue, 0),
  }));

  // Sales rep performance
  const repPerformance = salesTeamMembers
    .filter((m) => m.status === "active")
    .map((member) => ({
      name: member.name.split(" ")[0],
      revenue: member.performance.totalRevenue,
      deals: member.performance.dealsWon,
      conversion: member.performance.conversionRate,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Monthly pipeline data (mock)
  const monthlyData = [
    { month: "Jan", leads: 8, won: 2, lost: 1, value: 45000 },
    { month: "Feb", leads: 12, won: 4, lost: 2, value: 78000 },
    { month: "Mar", leads: 10, won: 3, lost: 1, value: 62000 },
    { month: "Apr", leads: 15, won: 5, lost: 3, value: 95000 },
    { month: "May", leads: 18, won: 6, lost: 2, value: 120000 },
    { month: "Jun", leads: 14, won: 4, lost: 2, value: 85000 },
  ];

  // Win/Loss data
  const wonDeals = getWonDeals();
  const lostDeals = getLostDeals();
  const activeDealsCount = getActiveDeals().length;
  const totalRevenue = getTeamTotalRevenue();

  const winRate =
    wonDeals.length + lostDeals.length > 0
      ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100
      : 0;

  const avgDealSize =
    wonDeals.length > 0
      ? wonDeals.reduce((sum, d) => sum + d.estimatedAnnualValue, 0) /
        wonDeals.length
      : 0;

  // Conversion funnel data
  const funnelData = [
    { stage: "New Leads", count: leads.length, percentage: 100 },
    {
      stage: "Contacted",
      count: leads.filter((l) =>
        [
          "contacted",
          "demo_scheduled",
          "demo_completed",
          "proposal_sent",
          "negotiation",
          "closed_won",
        ].includes(l.status),
      ).length,
      percentage: 0,
    },
    {
      stage: "Demo",
      count: leads.filter((l) =>
        [
          "demo_completed",
          "proposal_sent",
          "negotiation",
          "closed_won",
        ].includes(l.status),
      ).length,
      percentage: 0,
    },
    {
      stage: "Proposal",
      count: leads.filter((l) =>
        ["proposal_sent", "negotiation", "closed_won"].includes(l.status),
      ).length,
      percentage: 0,
    },
    {
      stage: "Won",
      count: leads.filter((l) => l.status === "closed_won").length,
      percentage: 0,
    },
  ].map((item, index, arr) => ({
    ...item,
    percentage:
      arr[0].count > 0 ? Math.round((item.count / arr[0].count) * 100) : 0,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Reports</h1>
          <p className="text-muted-foreground">
            Analyze your sales performance and pipeline metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={dateRange}
            onValueChange={(v) => setDateRange(v as typeof dateRange)}
          >
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalRevenue.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              12.5% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deals Won
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wonDeals.length}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              {winRate.toFixed(1)}% win rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Deal Size
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.round(avgDealSize).toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              8.3% increase
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Deals
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDealsCount}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              In pipeline
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline Analysis</TabsTrigger>
          <TabsTrigger value="sources">Lead Sources</TabsTrigger>
          <TabsTrigger value="performance">Rep Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Pipeline by Stage */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Leads by Pipeline Stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leadsByStatus} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        fontSize={12}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="#8884d8"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {funnelData.map((item) => (
                    <div key={item.stage} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.stage}</span>
                        <span className="font-medium">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-8 bg-muted rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pipeline Value by Stage */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">
                  Pipeline Value by Stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={leadsByStatus.filter(
                        (s) => s.stage !== "closed_lost",
                      )}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis
                        fontSize={12}
                        tickFormatter={(v) => `$${v / 1000}k`}
                      />
                      <Tooltip
                        formatter={(v: number) => [
                          `$${v.toLocaleString()}`,
                          "Value",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sources" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Lead Sources Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Leads by Source</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={leadsBySource}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {leadsBySource.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Source Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Source Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leadsBySource
                    .sort((a, b) => b.value - a.value)
                    .map((source, index) => {
                      const sourceLeads = leads.filter(
                        (l) => leadSourceLabels[l.source] === source.name,
                      );
                      const wonFromSource = sourceLeads.filter(
                        (l) => l.status === "closed_won",
                      ).length;
                      const conversionRate =
                        sourceLeads.length > 0
                          ? (
                              (wonFromSource / sourceLeads.length) *
                              100
                            ).toFixed(1)
                          : 0;

                      return (
                        <div
                          key={source.name}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                            <div>
                              <div className="font-medium text-sm">
                                {source.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {source.value} leads
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-sm">
                              {conversionRate}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Conversion
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Rep Revenue */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revenue by Sales Rep</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={repPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis
                        fontSize={12}
                        tickFormatter={(v) => `$${v / 1000}k`}
                      />
                      <Tooltip
                        formatter={(v: number) => [
                          `$${v.toLocaleString()}`,
                          "Revenue",
                        ]}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="#00C49F"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Rep Conversion Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Conversion Rate by Rep
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={repPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        formatter={(v: number) => [`${v}%`, "Conversion Rate"]}
                      />
                      <Bar
                        dataKey="conversion"
                        fill="#8884d8"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Sales Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {repPerformance.map((rep, index) => (
                    <div
                      key={rep.name}
                      className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                    >
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0
                            ? "bg-yellow-100 text-yellow-700"
                            : index === 1
                              ? "bg-gray-100 text-gray-700"
                              : index === 2
                                ? "bg-amber-100 text-amber-700"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{rep.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {rep.deals} deals closed
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          ${rep.revenue.toLocaleString()}
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            rep.conversion >= 40
                              ? "bg-green-100 text-green-800"
                              : rep.conversion >= 30
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }
                        >
                          {rep.conversion}% conversion
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6 mt-6">
          <div className="grid gap-6">
            {/* Monthly Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Monthly Lead & Deal Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="leads"
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={{ fill: "#8884d8" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="won"
                        stroke="#00C49F"
                        strokeWidth={2}
                        dot={{ fill: "#00C49F" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="lost"
                        stroke="#FF8042"
                        strokeWidth={2}
                        dot={{ fill: "#FF8042" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis
                        fontSize={12}
                        tickFormatter={(v) => `$${v / 1000}k`}
                      />
                      <Tooltip
                        formatter={(v: number) => [
                          `$${v.toLocaleString()}`,
                          "Revenue",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#00C49F"
                        fill="#00C49F"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
