"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { customReports } from "@/data/analytics";
import {
  FileText,
  Download,
  Calendar,
  Clock,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  PlayCircle,
  FileSpreadsheet,
  FileJson,
} from "lucide-react";

export function CustomReportsManager() {
  // Table columns
  const columns = [
    {
      key: "name",
      label: "Report Name",
      render: (item: any) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-xs text-muted-foreground line-clamp-1">
            {item.description}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (item: any) => {
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
            className={`text-xs ${colors[item.category] || ""}`}
          >
            {item.category}
          </Badge>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (item: any) => {
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
      render: (item: any) => {
        if (!item.schedule)
          return <span className="text-xs text-muted-foreground">Manual</span>;
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
      render: (item: any) => (
        <div className="text-xs text-muted-foreground">{item.lastRun}</div>
      ),
    },
    {
      key: "exportFormats",
      label: "Export",
      render: (item: any) => (
        <div className="flex gap-1">
          {item.exportFormats?.map((format: string) => {
            const icons: Record<string, any> = {
              PDF: FileText,
              Excel: FileSpreadsheet,
              CSV: FileSpreadsheet,
              JSON: FileJson,
            };
            const Icon = icons[format] || FileText;
            return (
              <div
                key={format}
                className="w-6 h-6 rounded flex items-center justify-center bg-muted"
                title={format}
              >
                <Icon className="h-3 w-3" />
              </div>
            );
          })}
        </div>
      ),
    },
  ];

  const renderActions = () => (
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* Header with Action */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Custom Reports</h3>
          <p className="text-sm text-muted-foreground">
            Manage and schedule custom report generation
          </p>
        </div>
        <Button className="gap-2">
          <FileText className="h-4 w-4" />
          Create New Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-lg"
                style={{
                  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                }}
              >
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold">{customReports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-lg"
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                <PlayCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">
                  {customReports.filter((r) => r.status === "Active").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-lg"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                }}
              >
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold">
                  {customReports.filter((r) => r.schedule).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-lg"
                style={{
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                }}
              >
                <Download className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Exports</p>
                <p className="text-2xl font-bold">148</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">All Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns as any}
            data={customReports as any}
            actions={renderActions}
          />
        </CardContent>
      </Card>

      {/* Report Details Cards */}
      <div className="space-y-4">
        {customReports.map((report) => (
          <Card key={report.id} className="border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold">{report.name}</h4>
                    <Badge
                      variant={report.status === "Active" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {report.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {report.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <PlayCircle className="h-4 w-4" />
                    Run Now
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Created By</p>
                  <p className="text-sm font-medium">{report.createdBy}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Created</p>
                  <p className="text-sm font-medium">{report.createdAt}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Last Run</p>
                  <p className="text-sm font-medium">{report.lastRun}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Frequency</p>
                  <p className="text-sm font-medium">
                    {report.schedule?.frequency || "Manual"}
                  </p>
                </div>
              </div>

              {report.schedule && (
                <div className="p-3 rounded-lg bg-muted/50 mb-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        <span className="text-muted-foreground">Next run:</span>{" "}
                        <span className="font-medium">{report.schedule.nextRun}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        <span className="text-muted-foreground">Recipients:</span>{" "}
                        <span className="font-medium">
                          {report.schedule.recipients.length}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Visualizations</p>
                  <div className="space-y-2">
                    {report.visualizations.map((viz, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 rounded bg-muted/30 text-xs"
                      >
                        <Badge variant="outline" className="text-[10px]">
                          {viz.type}
                        </Badge>
                        <span className="truncate">{viz.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Export Formats</p>
                  <div className="flex gap-2">
                    {report.exportFormats.map((format) => {
                      const icons: Record<string, any> = {
                        PDF: FileText,
                        Excel: FileSpreadsheet,
                        CSV: FileSpreadsheet,
                        JSON: FileJson,
                      };
                      const Icon = icons[format] || FileText;
                      return (
                        <div
                          key={format}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50"
                        >
                          <Icon className="h-4 w-4" />
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
