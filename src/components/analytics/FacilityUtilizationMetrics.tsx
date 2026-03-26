"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { facilityUtilization, utilizationComparison } from "@/data/analytics";
import { Building2, TrendingUp, BarChart3, Award } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export function FacilityUtilizationMetrics() {
  const comparison = utilizationComparison;
  const systemAvg = comparison.systemAverage;

  // Prepare radar chart data for facility comparison
  const radarData = comparison.facilities.map((facility) => ({
    facility: facility.facilityName.split(" ")[0], // First word only
    utilization: facility.utilizationRate,
    occupancy: facility.occupancyRate,
    efficiency: facility.efficiency,
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
                  System Average
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {systemAvg.toFixed(1)}%
                  </h3>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Utilization rate
                </p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                }}
              >
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Top Performer
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-lg font-bold tracking-tight">
                    {comparison.topPerformer}
                  </h3>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {comparison.facilities[0].utilizationRate}% utilization
                </p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                <Award className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Total Facilities
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {facilityUtilization.length}
                  </h3>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Active locations
                </p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                }}
              >
                <Building2 className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Avg Efficiency
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {(
                      comparison.facilities.reduce(
                        (sum, f) => sum + f.efficiency,
                        0,
                      ) / comparison.facilities.length
                    ).toFixed(1)}
                    %
                  </h3>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Resource efficiency
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

      {/* Facility Comparison Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Utilization Rate Comparison */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Utilization Rate Comparison
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Compare facility utilization across locations
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparison.facilities} layout="vertical">
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
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis
                    dataKey="facilityName"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 4px 16px -2px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value: number | undefined) => [
                      `${value || 0}%`,
                      "",
                    ]}
                  />
                  <Bar
                    dataKey="utilizationRate"
                    fill="#3b82f6"
                    radius={[0, 8, 8, 0]}
                    name="Utilization Rate"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Multi-Metric Radar Chart */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Performance Radar
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Multi-dimensional performance comparison
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
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
                    name="Utilization"
                    dataKey="utilization"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="Occupancy"
                    dataKey="occupancy"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="Efficiency"
                    dataKey="efficiency"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.3}
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
      </div>

      {/* Detailed Facility Metrics */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Facility Utilization Details
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Comprehensive utilization metrics by facility
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {facilityUtilization.map((facility) => (
              <div
                key={facility.id}
                className="bg-muted/30 hover:bg-muted/50 rounded-xl p-4 transition-colors"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h4 className="text-lg font-semibold">
                      {facility.facilityName}
                    </h4>
                    <p className="text-muted-foreground text-sm">
                      Capacity: {facility.totalCapacity} units
                    </p>
                  </div>
                  <Badge
                    variant={
                      facility.utilizationRate >= 80 ? "default" : "secondary"
                    }
                    className="text-xs"
                  >
                    {facility.utilizationRate >= 80 ? "High" : "Moderate"}{" "}
                    Utilization
                  </Badge>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground text-xs">Utilization</p>
                    <p className="text-xl font-bold">
                      {facility.utilizationRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Occupancy</p>
                    <p className="text-xl font-bold">
                      {facility.occupancyRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Efficiency</p>
                    <p className="text-xl font-bold">
                      {facility.resourceEfficiency}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Avg Occupancy
                    </p>
                    <p className="text-xl font-bold">
                      {facility.averageOccupancy}/{facility.totalCapacity}
                    </p>
                  </div>
                </div>

                {/* Utilization Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Hours Utilization
                    </span>
                    <span className="font-medium">
                      {facility.bookedHours} / {facility.availableHours} hours
                    </span>
                  </div>
                  <div className="bg-muted h-3 w-full rounded-full">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        facility.utilizationRate >= 80
                          ? "bg-success"
                          : facility.utilizationRate >= 60
                            ? "bg-warning"
                            : "bg-destructive"
                      } `}
                      style={{ width: `${facility.utilizationRate}%` }}
                    />
                  </div>
                </div>

                {/* Weekly Trend Mini Chart */}
                <div className="border-border mt-4 border-t pt-4">
                  <p className="text-muted-foreground mb-2 text-xs">
                    Weekly Trend
                  </p>
                  <div className="h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={facility.utilizationTrend}>
                        <Line
                          type="monotone"
                          dataKey="rate"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            border: "none",
                            borderRadius: "8px",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                          }}
                          formatter={(value: number | undefined) => [
                            `${value || 0}%`,
                            "Rate",
                          ]}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resource Allocation Summary */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Total Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-4xl font-bold">
                {facilityUtilization.reduce(
                  (sum, f) => sum + f.totalCapacity,
                  0,
                )}
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                Total system capacity (units)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-4xl font-bold">
                {facilityUtilization
                  .reduce((sum, f) => sum + f.bookedHours, 0)
                  .toLocaleString()}
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                Booked hours this month
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Peak Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-4xl font-bold">
                {Math.max(...facilityUtilization.map((f) => f.peakOccupancy))}
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                Highest occupancy reached
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
