"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  WifiOff,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import {
  disconnectQuickBooks,
  useQuickBooksConnection,
  QUICKBOOKS_DISCONNECT_CONFIRMATION,
  QUICKBOOKS_EXPIRED_BANNER,
  type QuickBooksScope,
} from "@/lib/quickbooks/connection-store";
import {
  buildDashboardMetrics,
  formatMoney,
  timeAgo,
} from "@/lib/quickbooks/dashboard-metrics";
import { clearQuickBooksMappings } from "@/lib/quickbooks/mappings-store";
import { reconnectQuickBooks } from "@/lib/quickbooks/oauth-mock";
import { clearQuickBooksData } from "@/lib/quickbooks/qb-data-cache";
import { resetQuickBooksSetup } from "@/lib/quickbooks/setup-store";
import { useSyncJobs, type SyncJob } from "@/lib/quickbooks/sync-engine";
import { useSyncedDocuments } from "@/lib/quickbooks/synced-documents-store";

// ============================================================================
// The management dashboard (Phase 5.2) — what a connected facility sees.
//
// Every number is derived: counts of work from the sync queue, money from the
// synced-documents ledger. Nothing here is a stored total that could drift away
// from what actually happened.
// ============================================================================

export type DashboardFilter = "synced" | "pending" | "errors" | "all";

function StatusBar({ scope }: { scope: QuickBooksScope }) {
  const connection = useQuickBooksConnection(scope);
  const jobs = useSyncJobs(scope);
  const documents = useSyncedDocuments(scope);
  const metrics = buildDashboardMetrics(jobs, documents);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const healthy = connection.status === "connected";
  const expired = connection.status === "expired";

  async function handleReconnect() {
    setBusy(true);
    await reconnectQuickBooks(scope);
    setBusy(false);
  }

  return (
    <>
      <Card
        className={healthy ? "border-emerald-500/25" : "border-amber-500/40"}
      >
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-semibold">
              {healthy ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : expired ? (
                <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              ) : (
                <WifiOff className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              )}
              <span
                className={
                  healthy
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-amber-700 dark:text-amber-400"
                }
              >
                {/* No withPeriod here: this is a label, not a sentence, so the
                    name stands as the facility wrote it — "… Inc." keeps its
                    period and nothing gets appended. */}
                {healthy
                  ? `Connected to QuickBooks — ${connection.companyName ?? ""}`
                  : expired
                    ? "QuickBooks connection expired"
                    : "QuickBooks is unreachable"}
              </span>
            </p>

            <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              <span>Last synced: {timeAgo(connection.lastSyncAt)}</span>
              <span aria-hidden>·</span>
              <span>
                {metrics.syncedTodayCount}{" "}
                {metrics.syncedTodayCount === 1
                  ? "transaction"
                  : "transactions"}{" "}
                synced today
              </span>
              <span aria-hidden>|</span>
              <span>{formatMoney(metrics.syncedTodayAmount)} synced today</span>
            </p>

            {expired && (
              <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                {QUICKBOOKS_EXPIRED_BANNER}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {expired && (
              <Button size="sm" onClick={handleReconnect} disabled={busy}>
                {busy ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 size-3.5" />
                )}
                Reconnect
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(true)}
            >
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect QuickBooks?</AlertDialogTitle>
            <AlertDialogDescription>
              {QUICKBOOKS_DISCONNECT_CONFIRMATION}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                disconnectQuickBooks(scope);
                // The cached company and the setup answers belong to the
                // connection being released. The synced-documents ledger and
                // the sync queue are NOT cleared: they record what already
                // happened, and a disconnect doesn't un-post it.
                clearQuickBooksData(scope);
                clearQuickBooksMappings(scope);
                resetQuickBooksSetup(scope);
              }}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function statusLabel(job: SyncJob): { text: string; className: string } {
  switch (job.status) {
    case "synced":
      return {
        text: "Synced",
        className: "text-emerald-700 dark:text-emerald-400",
      };
    case "failed":
      return { text: "Failed", className: "text-rose-700 dark:text-rose-400" };
    case "ignored":
      return { text: "Ignored", className: "text-muted-foreground" };
    default:
      return {
        text: "Pending",
        className: "text-amber-700 dark:text-amber-400",
      };
  }
}

export function QuickBooksDashboard({ scope }: { scope: QuickBooksScope }) {
  const jobs = useSyncJobs(scope);
  const documents = useSyncedDocuments(scope);
  const metrics = buildDashboardMetrics(jobs, documents);
  const [filter, setFilter] = useState<DashboardFilter>("all");

  const toggle = (next: DashboardFilter) =>
    setFilter((current) => (current === next ? "all" : next));

  const visible = jobs.filter((j) => {
    if (filter === "all") return true;
    if (filter === "synced") return j.status === "synced";
    if (filter === "pending") return j.status === "pending";
    return j.status === "failed";
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <StatusBar scope={scope} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Synced today"
          value={metrics.syncedTodayCount}
          hint={formatMoney(metrics.syncedTodayAmount)}
          icon={CheckCircle2}
          tone="emerald"
          onClick={() => toggle("synced")}
          active={filter === "synced"}
        />
        <KpiTile
          label="Pending"
          value={metrics.pendingCount}
          hint={
            metrics.pendingCount === 0 ? "Nothing waiting" : "Waiting to send"
          }
          icon={Clock}
          tone="amber"
          onClick={() => toggle("pending")}
          active={filter === "pending"}
        />
        <KpiTile
          label="Errors"
          value={metrics.errorCount}
          hint={
            metrics.errorCount === 0
              ? "No failures"
              : "Payments were still taken"
          }
          icon={XCircle}
          // Red only when there is something wrong — a permanently red tile
          // stops meaning anything.
          tone={metrics.errorCount > 0 ? "rose" : "slate"}
          alert={
            metrics.errorCount > 0
              ? { label: "Needs attention", tone: "rose" }
              : undefined
          }
          onClick={() => toggle("errors")}
          active={filter === "errors"}
        />
        <KpiTile
          label="Last 30 days"
          value={formatMoney(metrics.last30DaysAmount)}
          hint={`${metrics.last30DaysCount} ${metrics.last30DaysCount === 1 ? "entry" : "entries"}`}
          icon={CalendarRange}
          tone="indigo"
        />
      </div>

      {/* A compact view of what the tiles filter. The full activity log —
          date range, client search, CSV export, per-row retry — is next. */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-3 border-b p-3">
            <p className="text-sm font-medium">
              {filter === "all"
                ? "Recent syncs"
                : filter === "synced"
                  ? "Synced"
                  : filter === "pending"
                    ? "Pending"
                    : "Errors"}
            </p>
            {filter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFilter("all")}
              >
                Clear filter
              </Button>
            )}
          </div>

          {visible.length === 0 ? (
            <p className="text-muted-foreground p-6 text-center text-sm">
              {jobs.length === 0
                ? "Nothing has synced yet. Completed sales will appear here."
                : "No entries match this filter."}
            </p>
          ) : (
            <ul className="divide-y">
              {visible.slice(0, 25).map((job) => {
                const status = statusLabel(job);
                return (
                  <li
                    key={job.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {job.description}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {formatMoney(job.amount)}
                    </span>
                    <span
                      className={`w-16 text-right text-xs font-medium ${status.className}`}
                    >
                      {status.text}
                    </span>
                    <span className="text-muted-foreground w-40 truncate text-right text-xs">
                      {job.quickBooksDocumentNumber ?? job.lastError ?? "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
