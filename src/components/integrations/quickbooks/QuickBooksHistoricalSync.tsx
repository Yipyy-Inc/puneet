"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  History,
  Loader2,
  Pause,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { QuickBooksScope } from "@/lib/quickbooks/connection-store";
import {
  historicalEntryCount,
  historicalSummary,
  historicalWarning,
  isLargeRange,
  planBatches,
  type HistoricalRange,
} from "@/lib/quickbooks/historical-sync";
import {
  cancelHistoricalSync,
  dismissHistoricalRun,
  isHistoricalRunActive,
  runHistoricalSync,
  useHistoricalProgress,
} from "@/lib/quickbooks/historical-runner";

// ============================================================================
// Historical sync (3.6) — the back-catalogue, on the dashboard.
//
// Off by default and gated behind a toggle, because it is the one action here
// that writes a lot of documents into a live company at once. Everything about
// the layout is meant to slow the facility down at the size: the real count is
// shown before the button, the large-range warning is amber and names the
// accountant, and the run itself shows a paced progress bar rather than a
// spinner that hides how much is happening.
// ============================================================================

function todayISO(): string {
  // The picker works in local dates; the transaction filter is inclusive of the
  // whole "to" day, so "today" is safe as the default end.
  return new Date().toISOString().slice(0, 10);
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="bg-muted h-2 overflow-hidden rounded-full">
      <div
        style={{ width: `${pct}%` }}
        className="h-full rounded-full bg-emerald-500 transition-all"
      />
    </div>
  );
}

export function QuickBooksHistoricalSync({
  scope,
}: {
  scope: QuickBooksScope;
}) {
  const [enabled, setEnabled] = useState(false);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>(todayISO());
  const progress = useHistoricalProgress(scope);

  const range: HistoricalRange | null = from
    ? { from, to: to || todayISO() }
    : null;
  const count = useMemo(
    () => (range ? historicalEntryCount(range) : 0),
    [range],
  );
  const large = range ? isLargeRange(range) : false;
  const plan = useMemo(() => planBatches(count), [count]);

  const active = isHistoricalRunActive(scope);
  const finished =
    progress.status === "done" ||
    progress.status === "cancelled" ||
    progress.status === "paused";

  async function handleStart() {
    if (!range) return;
    await runHistoricalSync(scope, range);
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <div className="flex items-start gap-3">
          <History className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Sync past transactions</p>
            <p className="text-muted-foreground text-xs">
              Backfill sales from before you connected. Off by default — only
              new sales sync unless you turn this on.
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={active}
            aria-label="Enable historical sync"
          />
        </div>

        {enabled && (
          <div className="space-y-4 border-t pt-4">
            {/* ── Range ────────────────────────────────────────────────────── */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Sync from</Label>
                <DatePicker
                  value={from}
                  onValueChange={(v) => setFrom(v || "")}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <DatePicker value={to} onValueChange={(v) => setTo(v || "")} />
              </div>
            </div>

            {range && (
              <p className="text-muted-foreground text-xs">
                {historicalSummary(range, count)}
              </p>
            )}

            {/* ── The large-range warning ──────────────────────────────────── */}
            {range && large && count > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>{historicalWarning(range, count)}</p>
              </div>
            )}

            {/* ── Run / progress ───────────────────────────────────────────── */}
            {active || finished ? (
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    {progress.status === "running" && (
                      <Loader2 className="size-4 animate-spin text-emerald-600" />
                    )}
                    {progress.status === "done" && (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    )}
                    {progress.status === "paused" && (
                      <Pause className="size-4 text-amber-600" />
                    )}
                    {progress.status === "cancelled" && (
                      <X className="text-muted-foreground size-4" />
                    )}
                    {progress.status === "running" && "Syncing…"}
                    {progress.status === "cancelling" && "Stopping…"}
                    {progress.status === "done" && "Historical sync complete"}
                    {progress.status === "paused" && "Paused"}
                    {progress.status === "cancelled" && "Stopped"}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {progress.processed} / {progress.total}
                  </span>
                </div>

                <ProgressBar value={progress.processed} max={progress.total} />

                <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                  <span className="text-emerald-700 dark:text-emerald-400">
                    {progress.synced} synced
                  </span>
                  {progress.skipped > 0 && (
                    <span>{progress.skipped} already synced — skipped</span>
                  )}
                  {progress.failed > 0 && (
                    <span className="text-rose-700 dark:text-rose-400">
                      {progress.failed} failed
                    </span>
                  )}
                  {progress.status === "running" && (
                    <span>Throttled to ~{progress.ratePerMin}/min</span>
                  )}
                </div>

                {progress.status === "paused" && progress.pausedReason && (
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    {progress.pausedReason}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  {active ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={progress.status === "cancelling"}
                      onClick={() => cancelHistoricalSync(scope)}
                    >
                      Stop
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismissHistoricalRun(scope)}
                    >
                      Dismiss
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="sm"
                  disabled={!range || count === 0}
                  onClick={handleStart}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {large ? "Start historical sync" : "Sync these transactions"}
                </Button>
                {range && count > 0 && plan.estimatedMinutes > 0 && (
                  <span className="text-muted-foreground text-xs">
                    ~{plan.estimatedMinutes} min at the QuickBooks rate limit.
                  </span>
                )}
                {range && count === 0 && (
                  <span className="text-muted-foreground text-xs">
                    Nothing to sync in this range.
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
