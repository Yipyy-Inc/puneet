"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Circle,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { QuickBooksSync } from "@/lib/quickbooks-sync";

interface QuickBooksSyncPanelProps {
  sync?: QuickBooksSync;
  invoiceId?: string;
}

const statusConfig = {
  synced: {
    icon: CheckCircle2,
    label: "Synced",
    dotColor: "bg-emerald-500",
    textColor: "text-emerald-600",
    badgeBg: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    dotColor: "bg-amber-500",
    textColor: "text-amber-600",
    badgeBg: "bg-amber-50 border-amber-200 text-amber-700",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    dotColor: "bg-red-500",
    textColor: "text-red-600",
    badgeBg: "bg-red-50 border-red-200 text-red-700",
  },
  not_synced: {
    icon: Circle,
    label: "Not synced",
    dotColor: "bg-muted-foreground/40",
    textColor: "text-muted-foreground",
    badgeBg: "bg-muted border-border text-muted-foreground",
  },
};

const actionLabels: Record<string, string> = {
  invoice_created: "Invoice created in QuickBooks",
  payment_synced: "Payment synced",
  deposit_synced: "Deposit synced",
  refund_synced: "Refund synced",
  line_item_added: "Line item added",
  sync_failed: "Sync failed",
  manual_resync: "Manual resync",
};

function fmtTimestamp(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function QuickBooksSyncPanel({
  sync,
  invoiceId: _invoiceId,
}: QuickBooksSyncPanelProps) {
  const [resyncing, setResyncing] = useState(false);
  const status = sync?.status ?? "not_synced";
  const cfg = statusConfig[status];
  const historyCount = sync?.history.length ?? 0;

  const handleResync = async () => {
    setResyncing(true);
    await new Promise((r) => setTimeout(r, 800));
    setResyncing(false);
    toast.success("QuickBooks resync completed");
  };

  return (
    <div className="border-t pt-4">
      <Collapsible>
        <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg border px-4 py-2.5 transition-colors">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Landmark className="text-muted-foreground size-4" />
            QuickBooks Sync
            <span
              className={cn(
                "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                cfg.badgeBg,
              )}
            >
              <span className={cn("size-1.5 rounded-full", cfg.dotColor)} />
              {cfg.label}
            </span>
            {historyCount > 0 && (
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold">
                {historyCount}
              </span>
            )}
          </span>
          <ChevronDown className="text-muted-foreground size-4" />
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3">
          <div className="space-y-4 px-1">
            {/* Summary row */}
            {(sync?.quickbooksInvoiceId || sync?.lastSyncAt || sync?.error) && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
                {sync?.quickbooksInvoiceId && (
                  <span className="text-muted-foreground">
                    QB Invoice:{" "}
                    <span className="text-foreground font-mono font-medium">
                      {sync.quickbooksInvoiceId}
                    </span>
                  </span>
                )}
                {sync?.lastSyncAt && (
                  <span className="text-muted-foreground">
                    Last sync: {fmtTimestamp(sync.lastSyncAt)}
                  </span>
                )}
              </div>
            )}

            {/* Error */}
            {sync?.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {sync.error}
              </div>
            )}

            {/* Timeline */}
            {historyCount > 0 && (
              <div className="relative max-h-[300px] space-y-0 overflow-y-auto pl-4">
                {/* Vertical line */}
                <div className="bg-border absolute top-2 bottom-2 left-[7px] w-px" />

                {sync!.history.map((entry, idx) => {
                  const isFail = entry.action === "sync_failed";
                  return (
                    <div key={idx} className="relative flex gap-3 pb-3">
                      {/* Dot */}
                      <div
                        className={cn(
                          "relative z-10 mt-1.5 size-2 shrink-0 rounded-full ring-2 ring-white",
                          isFail ? "bg-red-500" : "bg-emerald-500",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium">
                          {actionLabels[entry.action] ?? entry.action}
                          {entry.amount != null && (
                            <span className="text-muted-foreground font-normal">
                              {" "}
                              — ${entry.amount.toFixed(2)}
                            </span>
                          )}
                        </p>
                        <p className="text-muted-foreground text-[10px]">
                          {fmtTimestamp(entry.timestamp)}
                          {entry.quickbooksRefId && (
                            <span className="font-mono">
                              {" "}
                              · {entry.quickbooksRefId}
                            </span>
                          )}
                        </p>
                        {entry.error && (
                          <p className="mt-0.5 text-[10px] text-red-600">
                            {entry.error}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {status === "not_synced" && (
              <p className="text-muted-foreground text-xs">
                No payments to sync yet
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-[11px]"
                onClick={handleResync}
                disabled={resyncing || status === "not_synced"}
              >
                <RefreshCw
                  className={cn("size-3", resyncing && "animate-spin")}
                />
                {resyncing ? "Syncing..." : "Resync"}
              </Button>
              {sync?.quickbooksInvoiceId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-[11px]"
                  onClick={() =>
                    toast.info("QuickBooks link — requires backend integration")
                  }
                >
                  <ExternalLink className="size-3" />
                  View in QuickBooks
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
