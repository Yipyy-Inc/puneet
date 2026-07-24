"use client";

import type { ReactNode } from "react";
import { Download, Inbox, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  KpiTile,
  type KpiTone,
} from "@/components/facility/dashboard/kpi-tile";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import type { Delta } from "@/lib/format";
import {
  ReportRangePicker,
  formatRangeLabel,
  type ReportRange,
} from "./report-range-picker";

export interface ReportKpi {
  label: string;
  /** Preformatted headline value (use @/lib/format helpers). */
  value: string;
  icon: LucideIcon;
  tone?: KpiTone;
  /** Period-over-period delta vs the previous equal-length window. */
  delta?: Delta;
  hint?: string;
}

export interface ReportShellProps {
  /** Optional — omit when the host (e.g. a dialog) already renders a title. */
  title?: string;
  subtitle?: string;
  range: ReportRange;
  onRangeChange: (range: ReportRange) => void;
  /** Wire to a real export (never a no-op). Omit to hide the button. */
  onExport?: () => void;
  /** Headline KPI row rendered above the report body. */
  kpis?: ReportKpi[];
  /** Render the empty state instead of children when the range truly has no data. */
  isEmpty?: boolean;
  /** e.g. "No transactions in this period" — the active range is appended. */
  emptyTitle?: string;
  emptyIcon?: LucideIcon;
  children: ReactNode;
}

/**
 * Standard report chrome: a header (title + visible range picker + export
 * button), a KPI row with period-over-period deltas, and a real empty state
 * that shows the active range — used by every report for a consistent,
 * professional presentation in the Yipyy design language.
 */
export function ReportShell({
  title,
  subtitle,
  range,
  onRangeChange,
  onExport,
  kpis,
  isEmpty,
  emptyTitle = "No data in this period",
  emptyIcon = Inbox,
  children,
}: ReportShellProps) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {title && (
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          )}
          {subtitle && (
            <p className="text-muted-foreground mt-0.5 text-sm">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <ReportRangePicker value={range} onChange={onRangeChange} />
          {onExport && (
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={onExport}
            >
              <Download className="mr-1.5 size-3.5" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* KPI row */}
      {kpis && kpis.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiTile
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              icon={kpi.icon}
              tone={kpi.tone}
              delta={kpi.delta}
              hint={kpi.hint}
            />
          ))}
        </div>
      )}

      {/* Body */}
      {isEmpty ? (
        <TableEmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={formatRangeLabel(range)}
        />
      ) : (
        children
      )}
    </div>
  );
}
