"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Calendar,
  Database,
  PlayCircle,
  Filter,
  Group,
  ArrowUpDown,
  Trash2,
  Plus,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { formatCount } from "@/lib/format";
import {
  getSource,
  runReport,
  buildReportCsv,
  type ReportFrequency,
} from "@/lib/report-data-sources";
import {
  useSavedReports,
  deleteSavedReport,
  markReportRun,
  type SavedReport,
} from "@/lib/saved-reports-store";

/** Path to the live Report Builder that assembles + saves reports. */
const BUILDER_HREF = "/dashboard/reports/custom";

interface ManagerRow extends Record<string, unknown> {
  id: string;
  name: string;
  sourceLabel: string;
  columnsCount: number;
  filtersCount: number;
  rowCount: number;
  scheduled: boolean;
  frequency: ReportFrequency;
  format: string;
  lastRun: string;
  saved: SavedReport;
}

function toRow(report: SavedReport): ManagerRow {
  const src = getSource(report.config.sourceId);
  // runReport is memoized in the data-source layer, so a preview count per
  // report is cheap and reflects the real rows the export would contain.
  const result = runReport(report.config);
  return {
    id: report.id,
    name: report.name,
    sourceLabel: src?.label ?? report.config.sourceId,
    columnsCount: report.config.columns.length,
    filtersCount: report.config.filters.length,
    rowCount: result.total,
    scheduled: report.config.schedule.frequency !== "once",
    frequency: report.config.schedule.frequency,
    format: report.config.schedule.exportFormat.toUpperCase(),
    lastRun: report.lastRun
      ? new Date(report.lastRun).toLocaleString()
      : "Never",
    saved: report,
  };
}

/** Download the report's live rows as a real CSV and stamp its last-run time. */
function exportReport(report: SavedReport) {
  const result = runReport(report.config);
  if (result.rows.length === 0) {
    toast.error("This report has no rows for the current data.");
    return;
  }
  const csv = buildReportCsv(result);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${report.name.replace(/\s+/g, "_").toLowerCase() || "report"}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
  markReportRun(report.id);
  toast.success(`Exported ${formatCount(result.rows.length)} rows to CSV.`);
}

export function CustomReportsManager() {
  const router = useRouter();
  const saved = useSavedReports();
  const rows = saved.map(toRow);

  const totalRuns = saved.filter((r) => r.lastRun).length;
  const scheduledCount = rows.filter((r) => r.scheduled).length;
  const sourceCount = new Set(saved.map((r) => r.config.sourceId)).size;

  const columns: ColumnDef<ManagerRow>[] = [
    {
      key: "name",
      label: "Report Name",
      render: (item) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-muted-foreground line-clamp-1 text-xs">
            {item.sourceLabel} · {formatCount(item.columnsCount)} columns
          </div>
        </div>
      ),
    },
    {
      key: "rowCount",
      label: "Rows",
      render: (item) => (
        <span className="text-sm tabular-nums">
          {formatCount(item.rowCount)}
        </span>
      ),
    },
    {
      key: "frequency",
      label: "Schedule",
      render: (item) =>
        item.scheduled ? (
          <Badge variant="outline" className="text-xs capitalize">
            {item.frequency}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">Manual</span>
        ),
    },
    {
      key: "format",
      label: "Format",
      render: (item) => (
        <Badge variant="secondary" className="text-xs">
          {item.format}
        </Badge>
      ),
    },
    {
      key: "lastRun",
      label: "Last Run",
      render: (item) => (
        <span className="text-muted-foreground text-xs">{item.lastRun}</span>
      ),
    },
  ];

  const renderActions = (item: ManagerRow) => (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        title="Export CSV"
        onClick={() => exportReport(item.saved)}
      >
        <Download className="size-4" />
        <span className="sr-only">Export {item.name}</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        title="Delete report"
        onClick={() => {
          deleteSavedReport(item.id);
          toast.success("Report deleted.");
        }}
      >
        <Trash2 className="size-4" />
        <span className="sr-only">Delete {item.name}</span>
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Action */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Custom Reports</h3>
          <p className="text-muted-foreground text-sm">
            Saved reports assembled in the Report Builder — run and export real
            data
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href={BUILDER_HREF}>
            <Plus className="size-4" />
            Create New Report
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: "Saved Reports",
            value: formatCount(saved.length),
            icon: FileText,
            gradient: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
          },
          {
            label: "Scheduled",
            value: formatCount(scheduledCount),
            icon: Calendar,
            gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
          },
          {
            label: "Data Sources",
            value: formatCount(sourceCount),
            icon: Database,
            gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          },
          {
            label: "Times Run",
            value: formatCount(totalRuns),
            icon: PlayCircle,
            gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          },
        ].map((card) => (
          <Card key={card.label} className="shadow-card border-0">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex size-10 items-center justify-center rounded-lg"
                  style={{ background: card.gradient }}
                >
                  <card.icon className="size-5 text-white" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">{card.label}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reports Table */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">All Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={rows}
            actions={renderActions}
            emptyState={{
              icon: FileText,
              title: "No saved reports yet",
              description:
                "Build a report in the Report Builder and click Save Report — it will appear here to run and export.",
              action: {
                label: "Open Report Builder",
                onClick: () => router.push(BUILDER_HREF),
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Report Details Cards */}
      {rows.length > 0 && (
        <div className="space-y-4">
          {rows.map((report) => (
            <Card key={report.id} className="shadow-card border-0">
              <CardContent className="p-6">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h4 className="text-lg font-semibold">{report.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {report.sourceLabel}
                      </Badge>
                      {report.scheduled && (
                        <Badge
                          variant="secondary"
                          className="text-xs capitalize"
                        >
                          {report.frequency}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {formatCount(report.rowCount)} rows ·{" "}
                      {formatCount(report.columnsCount)} columns ·{" "}
                      {formatCount(report.filtersCount)} filters
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => exportReport(report.saved)}
                    >
                      <Download className="size-4" />
                      Export CSV
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="gap-2">
                      <Link href={BUILDER_HREF}>
                        <PlayCircle className="size-4" />
                        Open in Builder
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
                      <Database className="size-3" /> Source
                    </p>
                    <p className="text-sm font-medium">{report.sourceLabel}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
                      <Filter className="size-3" /> Filters
                    </p>
                    <p className="text-sm font-medium">
                      {formatCount(report.filtersCount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
                      <Group className="size-3" /> Grouped by
                    </p>
                    <p className="text-sm font-medium">
                      {report.saved.config.groupField || "None"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
                      <ArrowUpDown className="size-3" /> Sorted by
                    </p>
                    <p className="text-sm font-medium">
                      {report.saved.config.sortField
                        ? `${report.saved.config.sortField} (${report.saved.config.sortDir})`
                        : "None"}
                    </p>
                  </div>
                </div>

                <div className="text-muted-foreground mt-4 text-xs">
                  Last run: {report.lastRun}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
