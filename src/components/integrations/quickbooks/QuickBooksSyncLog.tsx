"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Loader2,
  MinusCircle,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useQuickBooksConnection,
  type QuickBooksScope,
} from "@/lib/quickbooks/connection-store";
import { formatMoney } from "@/lib/quickbooks/dashboard-metrics";
import {
  applySyncLogFilters,
  archivedRows,
  buildSyncLog,
  buildSyncLogCsv,
  quickBooksDocumentUrl,
  RETENTION_MONTHS,
  serviceTypeOptions,
  withinRetention,
  type SyncLogFilters,
  type SyncLogRow,
  type SyncLogStatus,
} from "@/lib/quickbooks/sync-log";
import { retry, useSyncJobs } from "@/lib/quickbooks/sync-engine";
import { useSyncedDocuments } from "@/lib/quickbooks/synced-documents-store";
import { downloadReportCsv } from "@/lib/report-export";

// ============================================================================
// The sync activity log (Phase 5.3).
//
// A facility should be able to answer "did that payment reach my books?" without
// leaving Yipyy and without trusting a summary number. Every row therefore shows
// the Yipyy side and the QuickBooks side together, and links out to the
// document itself.
// ============================================================================

const ALL_SERVICES = "__all__";

function StatusPill({ status }: { status: SyncLogStatus }) {
  if (status === "synced")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="size-3.5" />
        Synced ✓
      </span>
    );
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 dark:text-rose-400">
        <XCircle className="size-3.5" />
        Failed ✗
      </span>
    );
  if (status === "ignored")
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs font-medium">
        <MinusCircle className="size-3.5" />
        Ignored
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
      <Clock className="size-3.5" />
      Pending…
    </span>
  );
}

export function QuickBooksSyncLog({
  scope,
  status,
  onStatusChange,
}: {
  scope: QuickBooksScope;
  /** Owned by the dashboard so the KPI tiles and this dropdown are the SAME
   *  control — two independent status filters would silently disagree. */
  status: SyncLogStatus | "all";
  onStatusChange: (next: SyncLogStatus | "all") => void;
}) {
  const connection = useQuickBooksConnection(scope);
  const jobs = useSyncJobs(scope);
  const documents = useSyncedDocuments(scope);
  const [filters, setFilters] = useState<SyncLogFilters>({});
  const [retrying, setRetrying] = useState<string | null>(null);

  const allRows = useMemo(
    () => buildSyncLog(jobs, documents),
    [jobs, documents],
  );
  const visibleRows = useMemo(() => withinRetention(allRows), [allRows]);
  const archived = useMemo(() => archivedRows(allRows), [allRows]);
  const active = useMemo<SyncLogFilters>(
    () => ({ ...filters, status }),
    [filters, status],
  );
  const rows = useMemo(
    () => applySyncLogFilters(visibleRows, active),
    [visibleRows, active],
  );
  const services = useMemo(
    () => serviceTypeOptions(visibleRows),
    [visibleRows],
  );

  const set = (patch: Partial<SyncLogFilters>) =>
    setFilters((f) => ({ ...f, ...patch }));

  async function handleRetry(row: SyncLogRow) {
    setRetrying(row.jobId);
    await retry(scope, row.jobId);
    setRetrying(null);
  }

  function handleExport() {
    // Everything, archived rows included — the export is the only way to reach
    // entries older than the retention window.
    downloadReportCsv(
      `quickbooks-sync-log-${new Date().toISOString().slice(0, 10)}`,
      buildSyncLogCsv(applySyncLogFilters(allRows, active)),
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-0">
        {/* ── Filters ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-end gap-3 border-b p-4">
          <div className="space-y-1">
            <Label className="text-[11px]">From</Label>
            <DatePicker
              value={filters.from}
              onValueChange={(v) => set({ from: v || undefined })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">To</Label>
            <DatePicker
              value={filters.to}
              onValueChange={(v) => set({ to: v || undefined })}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => onStatusChange(v as SyncLogStatus | "all")}
            >
              <SelectTrigger className="h-9 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="synced">Synced</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="ignored">Ignored</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Service type</Label>
            <Select
              value={filters.serviceType ?? ALL_SERVICES}
              onValueChange={(v) =>
                set({ serviceType: v === ALL_SERVICES ? undefined : v })
              }
            >
              <SelectTrigger className="h-9 w-44 text-xs">
                <SelectValue placeholder="All services" />
              </SelectTrigger>
              <SelectContent>
                {/* A sentinel, never "" — an empty SelectItem value throws. */}
                <SelectItem value={ALL_SERVICES}>All services</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Amount</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="Min"
                className="h-9 w-20 text-xs"
                value={filters.minAmount ?? ""}
                onChange={(e) =>
                  set({
                    minAmount:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  })
                }
              />
              <span className="text-muted-foreground text-xs">–</span>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="Max"
                className="h-9 w-20 text-xs"
                value={filters.maxAmount ?? ""}
                onChange={(e) =>
                  set({
                    maxAmount:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="min-w-40 flex-1 space-y-1">
            <Label className="text-[11px]">Client or pet</Label>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
              <Input
                placeholder="Search…"
                className="h-9 pl-7 text-xs"
                value={filters.search ?? ""}
                onChange={(e) => set({ search: e.target.value || undefined })}
              />
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1.5 size-3.5" />
            Export log
          </Button>
        </div>

        {/* ── Rows ─────────────────────────────────────────────────────── */}
        {rows.length === 0 ? (
          <p className="text-muted-foreground p-8 text-center text-sm">
            {allRows.length === 0
              ? "Nothing has synced yet. Completed sales appear here as they're sent."
              : "No entries match these filters."}
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((row) => (
              <li
                key={row.jobId}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm"
              >
                <div className="w-28 shrink-0">
                  <p className="tabular-nums">{row.occurredAt.slice(0, 10)}</p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {row.occurredAt.slice(11, 16)}
                  </p>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {row.clientName}
                    {row.petName && (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        · {row.petName}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {row.serviceSummary}
                  </p>
                </div>

                <p className="w-20 shrink-0 text-right tabular-nums">
                  {formatMoney(row.amount)}
                </p>

                <div className="w-28 shrink-0">
                  <StatusPill status={row.status} />
                </div>

                <div className="w-56 shrink-0 text-right">
                  {row.documentNumber ? (
                    <a
                      href={quickBooksDocumentUrl(
                        row.quickBooksDocumentId,
                        connection.realmId,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-sky-700 underline underline-offset-4 dark:text-sky-400"
                    >
                      {row.documentNumber}
                      <ExternalLink className="size-3" />
                    </a>
                  ) : row.status === "failed" ? (
                    <span
                      className="text-muted-foreground truncate text-xs"
                      title={row.error}
                    >
                      {row.error ?? "Failed"}
                    </span>
                  ) : row.status === "ignored" ? (
                    <span
                      className="text-muted-foreground truncate text-xs italic"
                      title={row.ignoredReason}
                    >
                      {row.ignoredReason ?? "Ignored"}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </div>

                <div className="w-20 shrink-0 text-right">
                  {row.status === "failed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={retrying === row.jobId}
                      onClick={() => handleRetry(row)}
                    >
                      {retrying === row.jobId ? (
                        <Loader2 className="mr-1 size-3 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-1 size-3" />
                      )}
                      Retry
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* ── Retention ────────────────────────────────────────────────── */}
        <div className="text-muted-foreground border-t px-4 py-3 text-xs">
          Showing the last {RETENTION_MONTHS} months.
          {archived.length > 0 ? (
            <>
              {" "}
              {archived.length === 1
                ? "1 older entry is archived — it's"
                : `${archived.length} older entries are archived — they're`}{" "}
              included in the exported CSV.
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
