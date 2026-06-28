"use client";

import { toast } from "sonner";
import { Clock, FileText, Pencil, Play, Plus, Trash2 } from "lucide-react";

import { getSource } from "@/lib/report-data-sources";
import {
  deleteSavedReport,
  markReportRun,
  useSavedReports,
  type SavedReport,
} from "@/lib/saved-reports-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SavedReportsListProps {
  onNew: () => void;
  onRun: (report: SavedReport) => void;
  onEdit: (report: SavedReport) => void;
}

export function SavedReportsList({
  onNew,
  onRun,
  onEdit,
}: SavedReportsListProps) {
  const reports = useSavedReports();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {reports.length} saved report{reports.length === 1 ? "" : "s"}
        </p>
        <Button onClick={onNew}>
          <Plus className="mr-2 size-4" />
          New Report
        </Button>
      </div>

      {reports.length === 0 ? (
        <div className="bg-card flex flex-col items-center rounded-xl border px-6 py-14 text-center">
          <FileText className="text-muted-foreground size-8" />
          <p className="mt-3 text-sm font-medium">No saved reports yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Build one in the Report Builder and click Save Report.
          </p>
          <Button className="mt-4" onClick={onNew}>
            <Plus className="mr-2 size-4" />
            Create a report
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => {
            const src = getSource(r.config.sourceId);
            return (
              <div
                key={r.id}
                className="bg-card flex flex-col rounded-xl border p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {src?.label ?? r.config.sourceId} ·{" "}
                      {r.config.columns.length} columns
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0 text-[10px] capitalize"
                  >
                    {r.config.schedule.frequency}
                  </Badge>
                </div>

                <div className="text-muted-foreground mt-3 space-y-1 text-xs">
                  <p className="flex items-center gap-1.5">
                    <Clock className="size-3" />
                    Last run:{" "}
                    {r.lastRun ? new Date(r.lastRun).toLocaleString() : "Never"}
                  </p>
                  <p>Export: {r.config.schedule.exportFormat.toUpperCase()}</p>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => {
                      markReportRun(r.id);
                      onRun(r);
                    }}
                  >
                    <Play className="mr-1 size-3.5" />
                    Run
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label="Edit report"
                    onClick={() => onEdit(r)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label="Delete report"
                    onClick={() => {
                      deleteSavedReport(r.id);
                      toast.success(`“${r.name}” deleted`);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
