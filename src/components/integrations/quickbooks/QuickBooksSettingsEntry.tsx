"use client";

import Link from "next/link";
import { ChevronRight, Landmark } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuickBooksConnection } from "@/lib/quickbooks/connection-store";
import { cn } from "@/lib/utils";

// The row inside Settings → Integrations → Accounting. Status only; every
// action lives on the integration's own page.
const FACILITY_ID = "11";
const QUICKBOOKS_HREF = "/facility/dashboard/settings/integrations/quickbooks";

const STATUS_LABEL = {
  disconnected: "Not connected",
  connected: "Connected",
  expired: "Connection expired",
  outage: "Sync paused",
} as const;

export function QuickBooksSettingsEntry() {
  const connection = useQuickBooksConnection({ facilityId: FACILITY_ID });
  const connected = connection.status === "connected";
  const needsAttention =
    connection.status === "expired" || connection.status === "outage";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-green-700 text-white shadow-sm">
        <Landmark className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">QuickBooks Online</span>
          <Badge
            variant="outline"
            className={cn(
              "gap-1",
              connected &&
                "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
              needsAttention &&
                "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
              !connected &&
                !needsAttention &&
                "border-muted bg-muted text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                connected && "bg-emerald-500",
                needsAttention && "bg-amber-500",
                !connected && !needsAttention && "bg-muted-foreground",
              )}
            />
            {STATUS_LABEL[connection.status]}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          {/* No trailing period appended — company names routinely end in one
              ("… Inc."), and the doubled dot looks like a typo. */}
          {connected && connection.companyName
            ? `Syncing to ${connection.companyName}`
            : "Sync sales, payments and refunds straight to your accountant's books."}
        </p>
      </div>

      <Button asChild variant={connected ? "outline" : "default"} size="sm">
        <Link href={QUICKBOOKS_HREF}>
          {connected || needsAttention ? "Manage" : "Set up"}
          <ChevronRight className="ml-1 size-4" />
        </Link>
      </Button>
    </div>
  );
}
