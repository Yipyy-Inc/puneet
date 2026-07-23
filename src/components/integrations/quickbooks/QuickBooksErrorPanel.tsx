"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Loader2,
  MinusCircle,
  RefreshCw,
  Settings2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useQuickBooksConnection,
  type QuickBooksScope,
} from "@/lib/quickbooks/connection-store";
import { formatMoney } from "@/lib/quickbooks/dashboard-metrics";
import { reconnectQuickBooks } from "@/lib/quickbooks/oauth-mock";
import {
  errorBannerMessage,
  failedSyncEntries,
  IGNORE_REASONS,
  type FailedSyncEntry,
} from "@/lib/quickbooks/sync-errors";
import { markIgnored, retry, useSyncJobs } from "@/lib/quickbooks/sync-engine";

// ============================================================================
// The error panel (Phase 5.4 / 4D).
//
// Failures reach a facility as a red banner and nothing else — no email, no
// blocked checkout — so this panel is the entire recovery path. It is built
// around one idea: say what went wrong in words the reader already knows, then
// put the fix next to it.
//
// "Ignore" requires a reason. Silently dropping a transaction out of the queue
// is how a facility ends up with books that don't reconcile and no record of
// why, so the reason is stored on the job and shown in the log.
// ============================================================================

const CUSTOM_REASON = "__custom__";

function IgnoreDialog({
  entry,
  onOpenChange,
  onConfirm,
}: {
  entry: FailedSyncEntry | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}) {
  const [choice, setChoice] = useState<string>(IGNORE_REASONS[0]);
  const [custom, setCustom] = useState("");

  const reason = choice === CUSTOM_REASON ? custom.trim() : choice;

  return (
    <Dialog open={Boolean(entry)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ignore this transaction?</DialogTitle>
          <DialogDescription>
            It stops retrying and is marked as ignored in the sync log. Nothing
            is sent to QuickBooks, so you&rsquo;ll need to enter it yourself if
            it belongs in your books.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Reason (required)</Label>
            <Select value={choice} onValueChange={setChoice}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IGNORE_REASONS.map((r) => (
                  <SelectItem key={r} value={r} className="text-sm">
                    {r}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_REASON} className="text-sm">
                  Something else…
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {choice === CUSTOM_REASON && (
            <Textarea
              autoFocus
              rows={3}
              placeholder="Why is this being ignored?"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="text-sm"
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            // No reason, no ignore — the record is the point.
            disabled={reason.length === 0}
            onClick={() => onConfirm(reason)}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Ignore transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function QuickBooksErrorPanel({
  scope,
  onManageMappings,
}: {
  scope: QuickBooksScope;
  /** Sends the facility to the mapping tab — the fix for a mapping failure. */
  onManageMappings: () => void;
}) {
  const connection = useQuickBooksConnection(scope);
  const jobs = useSyncJobs(scope);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [ignoring, setIgnoring] = useState<FailedSyncEntry | null>(null);

  const entries = useMemo(
    () => failedSyncEntries(jobs, connection.status === "expired"),
    [jobs, connection.status],
  );

  if (entries.length === 0) return null;

  const retryable = entries.filter((e) => e.error.retryable);

  async function handleRetry(entry: FailedSyncEntry) {
    setBusy(entry.job.id);
    await retry(scope, entry.job.id);
    setBusy(null);
  }

  async function handleRetryAll() {
    setBusy("__all__");
    // Sequential: five parallel posts to the same company is how a rate limit
    // turns one recoverable failure into five.
    for (const entry of retryable) {
      await retry(scope, entry.job.id);
    }
    setBusy(null);
  }

  async function handleReconnect() {
    setBusy("__reconnect__");
    await reconnectQuickBooks(scope);
    setBusy(null);
  }

  return (
    <>
      <Card className="border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/20">
        <CardContent className="space-y-3 py-4">
          {/* ── Banner ───────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <AlertTriangle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <p className="min-w-0 flex-1 text-sm font-semibold text-rose-800 dark:text-rose-300">
              {errorBannerMessage(entries.length)}
              <span className="ml-2 font-normal text-rose-700/80 dark:text-rose-400/80">
                These payments were taken successfully — only the bookkeeping
                entry is missing.
              </span>
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen((v) => !v)}
              className="border-rose-500/40 text-rose-700 dark:text-rose-300"
            >
              {open ? "Hide errors" : "Review errors"}
              <ChevronDown
                data-open={open}
                className="ml-1 size-3.5 transition-transform data-[open=false]:-rotate-90"
              />
            </Button>
          </div>

          {open && (
            <div className="space-y-3">
              {retryable.length > 1 && (
                <div className="flex items-center gap-3 border-t border-rose-500/20 pt-3">
                  <Button
                    size="sm"
                    disabled={busy !== null}
                    onClick={handleRetryAll}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {busy === "__all__" ? (
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 size-3.5" />
                    )}
                    Retry all {retryable.length}
                  </Button>
                  <p className="text-muted-foreground text-xs">
                    Duplicates are skipped — retrying one would post the same
                    revenue twice.
                  </p>
                </div>
              )}

              <ul className="divide-y divide-rose-500/15 border-t border-rose-500/20">
                {entries.map((entry) => (
                  <li
                    key={entry.job.id}
                    className="flex flex-wrap items-start gap-x-4 gap-y-2 py-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium">
                        <span className="truncate">
                          {entry.job.clientName ?? "Walk-in"}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {entry.job.serviceSummary ?? entry.job.description}
                        </span>
                        <span className="tabular-nums">
                          {formatMoney(entry.job.amount)}
                        </span>
                      </p>
                      {/* The raw error stays reachable on hover: a bookkeeper
                          calling support needs it, everyone else does not. */}
                      <p
                        className="text-xs text-rose-800/90 dark:text-rose-300/90"
                        title={entry.error.raw}
                      >
                        {entry.error.reason}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        {entry.job.attemptCount}{" "}
                        {entry.job.attemptCount === 1 ? "attempt" : "attempts"}{" "}
                        · last tried {entry.job.updatedAt.slice(0, 10)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {entry.error.remedy === "map" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={onManageMappings}
                        >
                          <Settings2 className="mr-1 size-3" />
                          Fix mapping
                        </Button>
                      )}
                      {entry.error.remedy === "reconnect" && (
                        <Button
                          size="sm"
                          className="h-7 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                          disabled={busy !== null}
                          onClick={handleReconnect}
                        >
                          {busy === "__reconnect__" ? (
                            <Loader2 className="mr-1 size-3 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-1 size-3" />
                          )}
                          Reconnect
                        </Button>
                      )}
                      {entry.error.retryable && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={busy !== null}
                          onClick={() => handleRetry(entry)}
                        >
                          {busy === entry.job.id ? (
                            <Loader2 className="mr-1 size-3 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-1 size-3" />
                          )}
                          Retry
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground h-7 text-xs"
                        onClick={() => setIgnoring(entry)}
                      >
                        <MinusCircle className="mr-1 size-3" />
                        Ignore
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <IgnoreDialog
        // Remounted per row so the reason never carries over from the last one.
        key={ignoring?.job.id ?? "none"}
        entry={ignoring}
        onOpenChange={(next) => {
          if (!next) setIgnoring(null);
        }}
        onConfirm={(reason) => {
          if (ignoring) markIgnored(scope, ignoring.job.id, reason);
          setIgnoring(null);
        }}
      />
    </>
  );
}
