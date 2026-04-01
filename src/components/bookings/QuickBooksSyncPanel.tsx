"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Circle,
  RefreshCw,
  ExternalLink,
  DollarSign,
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
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
  },
  not_synced: {
    icon: Circle,
    label: "Not synced",
    color: "text-muted-foreground",
    bg: "bg-muted/30 border-border",
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
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function QuickBooksSyncPanel({
  sync,
  invoiceId,
}: QuickBooksSyncPanelProps) {
  const [resyncing, setResyncing] = useState(false);
  const status = sync?.status ?? "not_synced";
  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  const handleResync = async () => {
    setResyncing(true);
    // Simulate resync
    await new Promise((r) => setTimeout(r, 800));
    setResyncing(false);
    toast.success("QuickBooks resync completed");
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <DollarSign className="size-3.5" />
            QuickBooks Sync
          </CardTitle>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
              cfg.bg,
              cfg.color,
            )}
          >
            <StatusIcon className="size-3" />
            {cfg.label}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Summary */}
        <div className="space-y-1.5 text-sm">
          {sync?.quickbooksInvoiceId && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">QB Invoice</span>
              <span className="font-mono text-xs font-medium">
                {sync.quickbooksInvoiceId}
              </span>
            </div>
          )}
          {sync?.lastSyncAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last synced</span>
              <span className="text-xs">{fmtTimestamp(sync.lastSyncAt)}</span>
            </div>
          )}
          {sync?.error && (
            <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {sync.error}
            </div>
          )}
          {status === "not_synced" && (
            <p className="text-muted-foreground text-xs">
              No payments to sync yet
            </p>
          )}
        </div>

        {/* History */}
        {sync && sync.history.length > 0 && (
          <div className="mt-4">
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
              Sync History
            </p>
            <div className="space-y-2">
              {sync.history.map((entry, idx) => {
                const isFail = entry.action === "sync_failed";
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-start gap-2.5 rounded-lg border px-3 py-2",
                      isFail
                        ? "border-red-200 bg-red-50/50"
                        : "border-border bg-background",
                    )}
                  >
                    {isFail ? (
                      <XCircle className="mt-0.5 size-3.5 shrink-0 text-red-500" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                    )}
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
                          <span> · {entry.quickbooksRefId}</span>
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
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-[11px]"
            onClick={handleResync}
            disabled={resyncing || status === "not_synced"}
          >
            <RefreshCw className={cn("size-3", resyncing && "animate-spin")} />
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
      </CardContent>
    </Card>
  );
}
