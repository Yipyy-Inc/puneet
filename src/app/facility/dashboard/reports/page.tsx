"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  Download,
  FileText,
  BarChart3,
  AlertCircle,
  XCircle,
  Briefcase,
  Trophy,
  Plus,
  Settings,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef, FilterDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  calculateOccupancyRate,
  calculateAOV,
  calculateRetentionRate,
  getTopCustomers,
  calculateLabourCost,
  generateOccupancyReport,
  generateNoShowReport,
  generateCancellationReport,
  type OccupancyReportData,
  type NoShowReportData,
  type CancellationReportData,
  savedCustomReports,
} from "@/data/reports";
import { bookings } from "@/data/bookings";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CustomReportBuilder } from "@/components/reports/CustomReportBuilder";
import { ExportReportModal } from "@/components/reports/ExportReportModal";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState<{
    type: string;
    data: any[];
  } | null>(null);

  const facilityId = 1; // Mock facility ID

  // Calculate KPIs
  const occupancy = calculateOccupancyRate(facilityId, dateRange.start, dateRange.end);
  const aov = calculateAOV(facilityId, dateRange.start, dateRange.end);
  const retention = calculateRetentionRate(facilityId, 3);
  const totalBookings = bookings.filter(
    (b) =>
      b.facilityId === facilityId &&
      new Date(b.startDate) >= new Date(dateRange.start) &&
      new Date(b.startDate) <= new Date(dateRange.end)
  ).length;

  // Pre-built reports data
  const occupancyData = generateOccupancyReport(facilityId, dateRange.start, dateRange.end);
  const noShowData = generateNoShowReport(facilityId, dateRange.start, dateRange.end);
  const cancellationData = generateCancellationReport(facilityId, dateRange.start, dateRange.end);
  const topCustomersData = getTopCustomers(facilityId, 10);
  const labourData = calculateLabourCost(facilityId, dateRange.start, dateRange.end);

  // Occupancy Report Columns
  const occupancyColumns: ColumnDef<OccupancyReportData>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
    },
    {
      accessorKey: "occupancyRate",
      header: "Occupancy Rate",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-16">{row.original.occupancyRate.toFixed(1)}%</div>
          <div className="w-32 bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full"
              style={{ width: `${Math.min(row.original.occupancyRate, 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      accessorKey: "occupiedKennels",
      header: "Occupied",
      cell: ({ row }) => `${row.original.occupiedKennels} / ${row.original.totalKennels}`,
    },
    {
      accessorKey: "revenue",
      header: "Revenue",
      cell: ({ row }) => `$${row.original.revenue.toFixed(2)}`,
    },
  ];

  // No-Show Report Columns
  const noShowColumns: ColumnDef<NoShowReportData>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
    },
    {
      accessorKey: "clientName",
      header: "Client",
    },
    {
      accessorKey: "petName",
      header: "Pet",
    },
    {
      accessorKey: "service",
      header: "Service",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.service}
        </Badge>
      ),
    },
    {
      accessorKey: "scheduledTime",
      header: "Scheduled Time",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="destructive" className="capitalize">
          {row.original.status.replace("-", " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "revenue",
      header: "Lost Revenue",
      cell: ({ row }) => `$${row.original.revenue.toFixed(2)}`,
    },
  ];

  // Cancellation Report Columns
  const cancellationColumns: ColumnDef<CancellationReportData>[] = [
    {
      accessorKey: "date",
      header: "Booking Date",
      cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
    },
    {
      accessorKey: "clientName",
      header: "Client",
    },
    {
      accessorKey: "petName",
      header: "Pet",
    },
    {
      accessorKey: "service",
      header: "Service",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.service}
        </Badge>
      ),
    },
    {
      accessorKey: "advanceNotice",
      header: "Notice Period",
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => (
        <div className="max-w-xs truncate">{row.original.reason || "No reason provided"}</div>
      ),
    },
    {
      accessorKey: "refundAmount",
      header: "Refund",
      cell: ({ row }) => `$${row.original.refundAmount.toFixed(2)}`,
    },
  ];

  // Top Customers Columns
  const topCustomersColumns: ColumnDef<(typeof topCustomersData)[0]>[] = [
    {
      accessorKey: "client.name",
      header: "Client Name",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.client.name}</div>
          <div className="text-sm text-muted-foreground">{row.original.client.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "totalBookings",
      header: "Total Bookings",
    },
    {
      accessorKey: "totalSpent",
      header: "Total Spent",
      cell: ({ row }) => `$${row.original.totalSpent.toFixed(2)}`,
    },
    {
      accessorKey: "averageOrderValue",
      header: "Avg Order Value",
      cell: ({ row }) => `$${row.original.averageOrderValue.toFixed(2)}`,
    },
    {
      accessorKey: "avgMonthlySpend",
      header: "Avg Monthly",
      cell: ({ row }) => `$${row.original.avgMonthlySpend.toFixed(2)}`,
    },
    {
      accessorKey: "clv",
      header: "CLV (Est.)",
      cell: ({ row }) => (
        <span className="font-semibold text-primary">
          ${row.original.clv.toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: "lastBookingDate",
      header: "Last Visit",
      cell: ({ row }) =>
        row.original.lastBookingDate
          ? new Date(row.original.lastBookingDate).toLocaleDateString()
          : "N/A",
    },
  ];

  const handleExport = (type: string, data: any[]) => {
    setExportData({ type, data });
    setShowExportModal(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 border rounded-md"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 border rounded-md"
          />
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">For selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancy.rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {occupancy.occupiedDays} / {occupancy.totalCapacity} kennel-days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${aov.aov.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ${aov.totalRevenue.toFixed(2)} total revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{retention.rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {retention.returningClients} / {retention.totalClients} clients returning
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="occupancy" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="occupancy">
              <BarChart3 className="h-4 w-4 mr-2" />
              Occupancy
            </TabsTrigger>
            <TabsTrigger value="no-show">
              <AlertCircle className="h-4 w-4 mr-2" />
              No-Show
            </TabsTrigger>
            <TabsTrigger value="cancellation">
              <XCircle className="h-4 w-4 mr-2" />
              Cancellation
            </TabsTrigger>
            <TabsTrigger value="labour">
              <Briefcase className="h-4 w-4 mr-2" />
              Labour Cost
            </TabsTrigger>
            <TabsTrigger value="top-customers">
              <Trophy className="h-4 w-4 mr-2" />
              Top Customers
            </TabsTrigger>
            <TabsTrigger value="custom">
              <Settings className="h-4 w-4 mr-2" />
              Custom Reports
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Occupancy Report */}
        <TabsContent value="occupancy" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Occupancy Report</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Daily kennel occupancy rates and revenue
                  </p>
                </div>
                <Button onClick={() => handleExport("occupancy", occupancyData)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={occupancyColumns}
                data={occupancyData}
                searchColumn="date"
                searchPlaceholder="Search by date..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* No-Show Report */}
        <TabsContent value="no-show" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>No-Show Report</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Clients who didn't show up for appointments
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total Lost Revenue:</span>
                    <span className="ml-2 font-semibold text-destructive">
                      ${noShowData.reduce((sum, d) => sum + d.revenue, 0).toFixed(2)}
                    </span>
                  </div>
                  <Button onClick={() => handleExport("no-show", noShowData)}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={noShowColumns}
                data={noShowData}
                searchColumn="clientName"
                searchPlaceholder="Search by client..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cancellation Report */}
        <TabsContent value="cancellation" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cancellation Report</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Booking cancellations with reasons and refund details
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total Refunds:</span>
                    <span className="ml-2 font-semibold text-destructive">
                      ${cancellationData.reduce((sum, d) => sum + d.refundAmount, 0).toFixed(2)}
                    </span>
                  </div>
                  <Button onClick={() => handleExport("cancellation", cancellationData)}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={cancellationColumns}
                data={cancellationData}
                searchColumn="clientName"
                searchPlaceholder="Search by client..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Labour Cost Report */}
        <TabsContent value="labour" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Labour Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${labourData.totalCost.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {labourData.totalHours} hours worked
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Labour Percentage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{labourData.labourPercentage.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">Of total revenue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Hourly Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${labourData.avgHourlyRate.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Across all staff</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Period Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${labourData.revenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total period revenue</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Staff Cost Breakdown</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Individual staff labour costs
                  </p>
                </div>
                <Button onClick={() => handleExport("labour", labourData.staffBreakdown)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {labourData.staffBreakdown.map((staff, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{staff.staffName}</div>
                      <div className="text-sm text-muted-foreground">{staff.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${staff.totalCost.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">
                        {staff.hoursWorked}h × ${staff.hourlyRate}/h
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Customers / CLV Report */}
        <TabsContent value="top-customers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Customers & Customer Lifetime Value</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your most valuable customers and their spending patterns
                  </p>
                </div>
                <Button onClick={() => handleExport("top-customers", topCustomersData)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={topCustomersColumns}
                data={topCustomersData}
                searchColumn="client.name"
                searchPlaceholder="Search by client..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Reports */}
        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Custom Reports</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create and manage custom reports with your own fields and filters
                  </p>
                </div>
                <Button onClick={() => setShowCustomBuilder(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Custom Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {savedCustomReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{report.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {report.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 ml-8">
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Data Source:</span>{" "}
                          <Badge variant="outline" className="ml-1 capitalize">
                            {report.dataSource}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Fields:</span> {report.selectedFields.length}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Filters:</span> {report.filters.length}
                        </div>
                        {report.schedule?.enabled && (
                          <Badge variant="secondary" className="text-xs">
                            Scheduled {report.schedule.frequency}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        alert(`Running report "${report.name}"... Report generated successfully!`);
                      }}>
                        <FileText className="h-4 w-4 mr-2" />
                        Run
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setShowCustomBuilder(true);
                        alert(`Edit settings for report "${report.name}"`);
                      }}>
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Custom Report Builder Modal */}
      <Dialog open={showCustomBuilder} onOpenChange={setShowCustomBuilder}>
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
          <CustomReportBuilder onClose={() => setShowCustomBuilder(false)} />
        </DialogContent>
      </Dialog>

      {/* Export Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
          {exportData && (
            <ExportReportModal
              type={exportData.type}
              data={exportData.data}
              onClose={() => {
                setShowExportModal(false);
                setExportData(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

