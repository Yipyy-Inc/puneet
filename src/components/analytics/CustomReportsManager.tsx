"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { customReports, CustomReport } from "@/data/analytics";
import { LucideIcon } from "lucide-react";
import {
  FileText,
  Download,
  Calendar,
  Clock,
  MoreHorizontal,
  PlayCircle,
  FileSpreadsheet,
  FileJson,
} from "lucide-react";

export function CustomReportsManager() {
  // Table columns
  const columns: ColumnDef<CustomReport & Record<string, unknown>>[] = [
    {
      key: "name",
      label: "Report Name",
      render: (item) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-muted-foreground line-clamp-1 text-xs">
            {item.description}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (item) => {
        const colors: Record<string, string> = {
          Financial: "bg-blue-100 text-blue-700",
          Operations: "bg-green-100 text-green-700",
          Customer: "bg-purple-100 text-purple-700",
          Performance: "bg-orange-100 text-orange-700",
          Custom: "bg-gray-100 text-gray-700",
        };
        return (
          <Badge
            variant="secondary"
            className={`text-xs ${colors[item.category] || ""} `}
          >
            {item.category}
          </Badge>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (item) => {
        const variants: Record<
          string,
          "default" | "secondary" | "outline" | "destructive"
        > = {
          Active: "default",
          Draft: "secondary",
          Scheduled: "outline",
          Archived: "destructive",
        };
        return (
          <Badge
            variant={variants[item.status] || "secondary"}
            className="text-xs"
          >
            {item.status}
          </Badge>
        );
      },
    },
    {
      key: "schedule",
      label: "Schedule",
      render: (item) => {
        if (!item.schedule)
          return <span className="text-muted-foreground text-xs">Manual</span>;
        return (
          <div className="text-xs">
            <div className="font-medium">{item.schedule.frequency}</div>
            <div className="text-muted-foreground">
              Next: {item.schedule.nextRun}
            </div>
          </div>
        );
      },
    },
    {
      key: "lastRun",
      label: "Last Run",
      render: (item) => (
        <div className="text-muted-foreground text-xs">{item.lastRun}</div>
      ),
    },
    {
      key: "exportFormats",
      label: "Export",
      render: (item) => (
        <div className="flex gap-1">
          {item.exportFormats?.map((format) => {
            const icons: Record<string, LucideIcon> = {
              PDF: FileText,
              Excel: FileSpreadsheet,
              CSV: FileSpreadsheet,
              JSON: FileJson,
            };
            const Icon = icons[format] || FileText;
            return (
              <div
                key={format}
                className="bg-muted flex size-6 items-center justify-center rounded-sm"
                title={format}
              >
                <Icon className="size-3" />
              </div>
            );
          })}
        </div>
      ),
    },
  ];

  const renderActions = () => (
    <Button variant="ghost" size="icon" className="size-8">
      <MoreHorizontal className="size-4" />
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* Header with Action */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Custom Reports</h3>
          <p className="text-muted-foreground text-sm">
            Manage and schedule custom report generation
          </p>
        </div>
        <Button className="gap-2">
          <FileText className="size-4" />
          Create New Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex size-10 items-center justify-center rounded-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                }}
              >
                <FileText className="size-5 text-white" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total Reports</p>
                <p className="text-2xl font-bold">{customReports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex size-10 items-center justify-center rounded-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                <PlayCircle className="size-5 text-white" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Active</p>
                <p className="text-2xl font-bold">
                  {customReports.filter((r) => r.status === "Active").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex size-10 items-center justify-center rounded-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                }}
              >
                <Calendar className="size-5 text-white" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Scheduled</p>
                <p className="text-2xl font-bold">
                  {customReports.filter((r) => r.schedule).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex size-10 items-center justify-center rounded-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                }}
              >
                <Download className="size-5 text-white" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Exports</p>
                <p className="text-2xl font-bold">148</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">All Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={customReports as (CustomReport & Record<string, unknown>)[]}
            actions={renderActions}
          />
        </CardContent>
      </Card>

      {/* Report Details Cards */}
      <div className="space-y-4">
        {customReports.map((report) => (
          <Card key={report.id} className="shadow-card border-0">
            <CardContent className="p-6">
              <div
                key={report.id}
                className="bg-card rounded-lg border p-4 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-3">
                      <h4 className="text-lg font-semibold">{report.name}</h4>
                      <Badge
                        variant={
                          report.status === "Active" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {report.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {report.category}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {report.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <PlayCircle className="size-4" />
                      Run
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">
                    Created By
                  </p>
                  <p className="text-sm font-medium">{report.createdBy}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">Created</p>
                  <p className="text-sm font-medium">{report.createdAt}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">Last Run</p>
                  <p className="text-sm font-medium">{report.lastRun}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">
                    Frequency
                  </p>
                  <p className="text-sm font-medium">
                    {report.schedule?.frequency || "Manual"}
                  </p>
                </div>
              </div>

              {report.schedule && (
                <div className="bg-muted/50 mb-4 flex gap-4 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="text-muted-foreground size-4" />
                    <span>
                      <span className="text-muted-foreground">Next run:</span>{" "}
                      <span className="font-medium">
                        {report.schedule.nextRun}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="text-muted-foreground size-4" />
                    <span>
                      <span className="text-muted-foreground">Recipients:</span>{" "}
                      <span className="font-medium">
                        {report.schedule.recipients.length}
                      </span>
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground mb-2 text-xs">
                    Visualizations
                  </p>
                  <div className="space-y-2">
                    {report.visualizations.map((viz, index) => (
                      <div
                        key={index}
                        className="bg-muted/50 flex items-center gap-2 rounded-sm p-2 text-xs"
                      >
                        <span className="font-medium">{viz.type}</span>
                        <span className="text-muted-foreground">-</span>
                        <span className="text-muted-foreground truncate">
                          {viz.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground mb-2 text-xs">
                    Export Formats
                  </p>
                  <div className="flex gap-2">
                    {report.exportFormats.map((format) => {
                      const icons: Record<string, LucideIcon> = {
                        PDF: FileText,
                        Excel: FileSpreadsheet,
                        CSV: FileSpreadsheet,
                        JSON: FileJson,
                      };
                      const Icon = icons[format] || FileText;
                      return (
                        <div
                          key={format}
                          className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2"
                        >
                          <Icon className="size-4" />
                          <span className="text-xs font-medium">{format}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
