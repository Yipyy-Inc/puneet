"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Sparkles,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  clearCatalogWatch,
  newServiceMessage,
  newUnmappedItems,
  observeCatalog,
  useCatalogWatch,
} from "@/lib/quickbooks/catalog-watch";
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
import {
  clearQuickBooksMappings,
  useQuickBooksMappings,
} from "@/lib/quickbooks/mappings-store";
import { reconnectQuickBooks } from "@/lib/quickbooks/oauth-mock";
import { clearQuickBooksData } from "@/lib/quickbooks/qb-data-cache";
import { resetQuickBooksSetup } from "@/lib/quickbooks/setup-store";
import { useSyncJobs } from "@/lib/quickbooks/sync-engine";
import { useSyncedDocuments } from "@/lib/quickbooks/synced-documents-store";
import type { SyncLogStatus } from "@/lib/quickbooks/sync-log";
import { buildMappableGroups } from "@/lib/quickbooks/yipyy-catalog";

import { QuickBooksErrorPanel } from "./QuickBooksErrorPanel";
import { QuickBooksMappingScreen } from "./QuickBooksMappingScreen";
import { QuickBooksSyncLog } from "./QuickBooksSyncLog";

// ============================================================================
// The management dashboard (Phase 5.2) — what a connected facility sees.
//
// Every number is derived: counts of work from the sync queue, money from the
// synced-documents ledger. Nothing here is a stored total that could drift away
// from what actually happened.
// ============================================================================

/** The tiles and the log share ONE status vocabulary. An "errors" tile that
 *  filtered on a value the log did not use is how two filters drift apart. */
export type DashboardFilter = SyncLogStatus | "all";

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
                // The next connection re-baselines the catalog: everything
                // present then is "existing", not fifty new services.
                clearCatalogWatch(scope);
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

/**
 * "New service detected" (4E).
 *
 * A service created after setup has no mapping, so its revenue heads for the
 * catch-all account. That is recoverable but invisible, which is why it gets a
 * banner rather than sitting inside the mapping progress bar.
 */
function NewServiceBanner({
  scope,
  onMapNow,
}: {
  scope: QuickBooksScope;
  onMapNow: (groupKey: string) => void;
}) {
  const watch = useCatalogWatch(scope);
  const mappings = useQuickBooksMappings(scope);
  const groups = useMemo(() => buildMappableGroups(), []);

  // Recorded in an effect, not during render: this writes to a store, and the
  // first visit baselines the whole catalog.
  useEffect(() => {
    observeCatalog(
      scope,
      groups.flatMap((g) => g.items.map((i) => i.id)),
    );
  }, [scope, groups]);

  const fresh = newUnmappedItems(watch, groups, mappings);
  if (fresh.length === 0) return null;

  return (
    <Card className="border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20">
      <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
        <Sparkles className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="min-w-0 flex-1 text-sm text-amber-800 dark:text-amber-300">
          {newServiceMessage(fresh.map((f) => f.item))}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="border-amber-500/40 text-amber-700 dark:text-amber-300"
          onClick={() => onMapNow(fresh[0].groupKey)}
        >
          Map it now
        </Button>
      </CardContent>
    </Card>
  );
}

export function QuickBooksDashboard({ scope }: { scope: QuickBooksScope }) {
  const jobs = useSyncJobs(scope);
  const documents = useSyncedDocuments(scope);
  const metrics = buildDashboardMetrics(jobs, documents);
  const [filter, setFilter] = useState<DashboardFilter>("all");
  const [tab, setTab] = useState<"activity" | "mappings">("activity");
  const [expandGroup, setExpandGroup] = useState<string[]>([]);

  const toggle = (next: DashboardFilter) =>
    setFilter((current) => (current === next ? "all" : next));

  function openMappings(groupKey?: string) {
    setExpandGroup(groupKey ? [groupKey] : []);
    setTab("mappings");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <StatusBar scope={scope} />

      <QuickBooksErrorPanel scope={scope} onManageMappings={openMappings} />
      <NewServiceBanner scope={scope} onMapNow={openMappings} />

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
          onClick={() => toggle("failed")}
          active={filter === "failed"}
        />
        <KpiTile
          label="Last 30 days"
          value={formatMoney(metrics.last30DaysAmount)}
          hint={`${metrics.last30DaysCount} ${metrics.last30DaysCount === 1 ? "entry" : "entries"}`}
          icon={CalendarRange}
          tone="indigo"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="activity">Sync activity</TabsTrigger>
          <TabsTrigger value="mappings">Mappings</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "activity" ? (
        <QuickBooksSyncLog
          scope={scope}
          status={filter}
          onStatusChange={setFilter}
        />
      ) : (
        <QuickBooksMappingScreen
          // Remounted when a different group is targeted: `initialExpanded` is
          // an arrival state, and arriving twice should open twice.
          key={expandGroup.join(",")}
          scope={scope}
          mode="manage"
          initialExpanded={expandGroup}
        />
      )}
    </div>
  );
}
