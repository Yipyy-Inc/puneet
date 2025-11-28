"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/DataTable";
import { facilityPerformance } from "@/data/analytics";
import { TrendingUp, TrendingDown, DollarSign, Users, Star, Clock } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

export function FacilityPerformanceMetrics() {
  // Calculate system totals
  const totalRevenue = facilityPerformance.reduce((sum, f) => sum + f.totalRevenue, 0);
  const avgGrowth =
    facilityPerformance.reduce((sum, f) => sum + f.revenueGrowth, 0) /
    facilityPerformance.length;
  const avgSatisfaction =
    facilityPerformance.reduce((sum, f) => sum + f.customerSatisfaction, 0) /
    facilityPerformance.length;
  const avgNPS =
    facilityPerformance.reduce((sum, f) => sum + f.nps, 0) / facilityPerformance.length;

  // Prepare radar chart data
  const radarData = facilityPerformance.map((f) => ({
    facility: f.facilityName.split(" ")[0],
    efficiency: f.staffEfficiency,
    satisfaction: f.customerSatisfaction * 20, // Scale to 100
    quality: f.serviceQuality,
    retention: f.customerRetention,
  }));

  // Table columns
  const columns = [
    {
      key: "facilityName",
      label: "Facility",
      render: (item: any) => (
        <div className="font-medium">{item.facilityName}</div>
      ),
    },
    {
      key: "totalRevenue",
      label: "Revenue",
      render: (item: any) => (
        <span className="font-semibold">${(item.totalRevenue / 1000).toFixed(0)}K</span>
      ),
    },
    {
      key: "revenueGrowth",
      label: "Growth",
      render: (item: any) => (
        <div className="flex items-center gap-1">
          {item.revenueGrowth > 0 ? (
            <TrendingUp className="h-3 w-3 text-success" />
          ) : (
            <TrendingDown className="h-3 w-3 text-destructive" />
          )}
          <span className={item.revenueGrowth > 0 ? "text-success" : "text-destructive"}>
            {item.revenueGrowth > 0 ? "+" : ""}
            {item.revenueGrowth}%
          </span>
        </div>
      ),
    },
    {
      key: "staffEfficiency",
      label: "Staff Efficiency",
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <div className="w-20 bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2"
              style={{ width: `${item.staffEfficiency}%` }}
            />
          </div>
          <span className="text-sm">{item.staffEfficiency}%</span>
        </div>
      ),
    },
    {
      key: "customerSatisfaction",
      label: "Satisfaction",
      render: (item: any) => (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 text-warning fill-warning" />
          <span className="font-medium">{item.customerSatisfaction.toFixed(1)}</span>
        </div>
      ),
    },
    {
      key: "nps",
      label: "NPS",
      render: (item: any) => (
        <Badge variant={item.nps >= 70 ? "default" : "secondary"} className="text-xs">
          {item.nps}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Total Revenue
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    ${(totalRevenue / 1000).toFixed(0)}K
                  </h3>
                  <span className="inline-flex items-center text-xs font-medium text-success">
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                    +{avgGrowth.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Across all facilities
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                }}
              >
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Avg Growth Rate
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    +{avgGrowth.toFixed(1)}%
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Month-over-month
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Avg Satisfaction
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {avgSatisfaction.toFixed(1)}
                  </h3>
                  <Star className="h-5 w-5 text-warning fill-warning" />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Out of 5.0
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                }}
              >
                <Star className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Average NPS
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {avgNPS.toFixed(0)}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Net Promoter Score
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                }}
              >
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Comparison Chart */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Revenue by Facility
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Compare revenue performance across all facilities
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={facilityPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="facilityName"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  tickFormatter={(value) => `$${value / 1000}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 4px 16px -2px rgba(0, 0, 0, 0.1)",
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                />
                <Bar dataKey="totalRevenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Performance Radar Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Multi-Dimensional Performance
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Compare facilities across key performance indicators
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="facility"
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                  />
                  <Radar
                    name="Staff Efficiency"
                    dataKey="efficiency"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                  />
                  <Radar
                    name="Customer Satisfaction"
                    dataKey="satisfaction"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.2}
                  />
                  <Radar
                    name="Service Quality"
                    dataKey="quality"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.2}
                  />
                  <Radar
                    name="Retention"
                    dataKey="retention"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.2}
                  />
                  <Legend />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 4px 16px -2px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Growth Rate Comparison */}
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Growth Rate Comparison
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Monthly and yearly growth rates by facility
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facilityPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis
                    dataKey="facilityName"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    width={130}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 4px 16px -2px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value: number) => [`${value}%`, ""]}
                  />
                  <Legend />
                  <Bar
                    dataKey="monthlyGrowthRate"
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                    name="Monthly Growth"
                  />
                  <Bar
                    dataKey="revenueGrowth"
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                    name="Revenue Growth"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Table */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Facility Performance Details
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Comprehensive performance metrics for all facilities
          </p>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns as any}
            data={facilityPerformance as any}
          />
        </CardContent>
      </Card>

      {/* Detailed Performance Cards */}
      <div className="space-y-4">
        {facilityPerformance.map((facility) => (
          <Card key={facility.id} className="border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold">{facility.facilityName}</h4>
                  <p className="text-sm text-muted-foreground">
                    Period: {facility.period}
                  </p>
                </div>
                <Badge
                  variant={facility.revenueGrowth >= 12 ? "default" : "secondary"}
                  className="text-xs"
                >
                  {facility.revenueGrowth >= 12 ? "Top Performer" : "Good"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                  <p className="text-lg font-bold">
                    ${(facility.totalRevenue / 1000).toFixed(0)}K
                  </p>
                  <div className="flex items-center gap-1 text-xs text-success mt-0.5">
                    <TrendingUp className="h-3 w-3" />
                    +{facility.revenueGrowth}%
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Staff</p>
                  <p className="text-lg font-bold">{facility.employeeCount}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ${(facility.revenuePerEmployee / 1000).toFixed(1)}K/emp
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Efficiency</p>
                  <p className="text-lg font-bold">{facility.staffEfficiency}%</p>
                  <div className="w-full bg-muted rounded-full h-1 mt-1">
                    <div
                      className="bg-primary rounded-full h-1"
                      style={{ width: `${facility.staffEfficiency}%` }}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Satisfaction</p>
                  <div className="flex items-center gap-1">
                    <p className="text-lg font-bold">{facility.customerSatisfaction}</p>
                    <Star className="h-4 w-4 text-warning fill-warning" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Out of 5.0</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Retention</p>
                  <p className="text-lg font-bold">{facility.customerRetention}%</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    NPS: {facility.nps}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Response Time</p>
                  <div className="flex items-center gap-1">
                    <p className="text-lg font-bold">{facility.averageResponseTime}</p>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">hours avg</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
