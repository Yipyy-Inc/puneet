"use client";

import { BarChart3, Download, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface DailyOperationsSummary {
  dateLabel: string;
  bookingsScheduled: number;
  checkedIn: number;
  checkedOut: number;
  cancelled: number;
  tasksDue: number;
  overdueTasks: number;
  facilityEvents: number;
}

interface TaskCompletionMetric {
  staffName: string;
  completedCount: number;
  withNoteCount: number;
  withPhotoCount: number;
}

interface OverdueTrackingSummary {
  overdueOpen: number;
  escalationOpen: number;
  managerAlerts: number;
}

interface UtilizationMetric {
  key: string;
  label: string;
  eventCount: number;
  scheduledMinutes: number;
  utilizationPercent: number;
}

interface CalendarAuditReportItem {
  id: string;
  action: string;
  actorName: string;
  actorRole: string;
  timestamp: string;
  details: Record<string, string | number | boolean | null | undefined>;
}

interface OperationsCalendarReportsPanelProps {
  open: boolean;
  canViewReports: boolean;
  dailySummary: DailyOperationsSummary;
  taskCompletionMetrics: TaskCompletionMetric[];
  overdueSummary: OverdueTrackingSummary;
  serviceUtilization: UtilizationMetric[];
  resourceUtilization: UtilizationMetric[];
  auditEntries: CalendarAuditReportItem[];
  onExportReport: (
    scope:
      | "daily-ops"
      | "task-completion"
      | "overdue"
      | "service-utilization"
      | "resource-utilization"
      | "audit-log",
  ) => void;
  onClose: () => void;
}

function formatMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatPercent(value: number): string {
  return `${Math.max(0, Math.min(999, Math.round(value)))}%`;
}

export function OperationsCalendarReportsPanel({
  open,
  canViewReports,
  dailySummary,
  taskCompletionMetrics,
  overdueSummary,
  serviceUtilization,
  resourceUtilization,
  auditEntries,
  onExportReport,
  onClose,
}: OperationsCalendarReportsPanelProps) {
  if (!open) {
    return null;
  }

  if (!canViewReports) {
    return (
      <Card className="border-amber-200 bg-amber-50/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-amber-900">
            <Shield className="size-4" />
            Reports Restricted
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-amber-900">
          <p>
            Manager or admin access is required for reporting and audit views.
          </p>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close reports
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 bg-white/95">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base text-slate-900">
            <BarChart3 className="size-4 text-slate-700" />
            Operations Reports
          </CardTitle>
          <Button size="sm" variant="outline" onClick={onClose}>
            Hide reports
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Daily Operations ({dailySummary.dateLabel})
            </h3>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => onExportReport("daily-ops")}
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Bookings"
              value={dailySummary.bookingsScheduled}
            />
            <MetricCard label="Checked-in" value={dailySummary.checkedIn} />
            <MetricCard label="Checked-out" value={dailySummary.checkedOut} />
            <MetricCard label="Cancelled" value={dailySummary.cancelled} />
            <MetricCard label="Tasks due" value={dailySummary.tasksDue} />
            <MetricCard
              label="Overdue tasks"
              value={dailySummary.overdueTasks}
            />
            <MetricCard
              label="Facility events"
              value={dailySummary.facilityEvents}
            />
          </div>
        </section>

        <Separator />

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Task Completion by Staff
            </h3>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => onExportReport("task-completion")}
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
          </div>
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            {taskCompletionMetrics.length === 0 && (
              <p className="text-xs text-slate-500">
                No task completions recorded for current report window.
              </p>
            )}
            {taskCompletionMetrics.slice(0, 8).map((metric) => (
              <div
                key={metric.staffName}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">
                    {metric.staffName}
                  </p>
                  <p className="text-xs text-slate-500">
                    Notes {metric.withNoteCount} | Photos{" "}
                    {metric.withPhotoCount}
                  </p>
                </div>
                <Badge variant="outline">{metric.completedCount}</Badge>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Missed and Overdue Tracking
            </h3>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => onExportReport("overdue")}
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <MetricCard
              label="Overdue open"
              value={overdueSummary.overdueOpen}
            />
            <MetricCard
              label="Escalations open"
              value={overdueSummary.escalationOpen}
            />
            <MetricCard
              label="Manager alerts"
              value={overdueSummary.managerAlerts}
            />
          </div>
        </section>

        <Separator />

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Service Utilization
            </h3>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => onExportReport("service-utilization")}
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
          </div>
          <UtilizationList
            rows={serviceUtilization}
            emptyLabel="No service utilization data available."
          />
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Resource Utilization
            </h3>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => onExportReport("resource-utilization")}
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
          </div>
          <UtilizationList
            rows={resourceUtilization}
            emptyLabel="No resource utilization data available."
          />
        </section>

        <Separator />

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Immutable Audit Trail
            </h3>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => onExportReport("audit-log")}
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
          </div>
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            {auditEntries.length === 0 && (
              <p className="text-xs text-slate-500">
                No audit entries captured yet in this session.
              </p>
            )}
            {auditEntries.slice(0, 12).map((entry) => (
              <div
                key={entry.id}
                className="rounded-md border border-slate-200 bg-white p-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <p className="font-medium text-slate-900">
                    {entry.action.replace(/_/g, " ")}
                  </p>
                  <p className="text-slate-500">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
                <p className="mt-1 text-slate-600">
                  {entry.actorName} ({entry.actorRole})
                </p>
                <p className="mt-1 wrap-break-word text-slate-500">
                  {JSON.stringify(entry.details)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2">
      <p className="text-[11px] tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <p className="text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function UtilizationList({
  rows,
  emptyLabel,
}: {
  rows: UtilizationMetric[];
  emptyLabel: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      {rows.length === 0 && (
        <p className="text-xs text-slate-500">{emptyLabel}</p>
      )}
      {rows.slice(0, 8).map((row) => (
        <div
          key={row.key}
          className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-2 text-sm"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{row.label}</p>
            <p className="text-xs text-slate-500">
              {row.eventCount} events | {formatMinutes(row.scheduledMinutes)}
            </p>
          </div>
          <Badge variant="outline">
            {formatPercent(row.utilizationPercent)}
          </Badge>
        </div>
      ))}
    </div>
  );
}
