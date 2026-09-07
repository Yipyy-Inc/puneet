"use client";

import Link from "next/link";
import { ChevronRight, Landmark } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuickBooksConnection } from "@/lib/quickbooks/connection-store";
import { withPeriod } from "@/lib/quickbooks/format";
import { cn } from "@/lib/utils";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// The row inside Settings → Integrations → Accounting. Status only; every
// action lives on the integration's own page.
const FACILITY_ID = "11";
const QUICKBOOKS_HREF = "/facility/dashboard/settings/integrations/quickbooks";

const STATUS_KEY = {
  disconnected: "qbNotConnected",
  connected: "connected",
  expired: "qbExpired",
  outage: "qbPaused",
} as const;

export function QuickBooksSettingsEntry() {
  const t = useSettingsText().section("integrations");
  const connection = useQuickBooksConnection({ facilityId: FACILITY_ID });
  const connected = connection.status === "connected";
  const needsAttention =
    connection.status === "expired" || connection.status === "outage";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
      <span className="bg-success flex size-10 shrink-0 items-center justify-center rounded-xl text-white">
        <Landmark className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* french-ok: a product name, like "Yipyy Pay" below */}
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
            {t(STATUS_KEY[connection.status])}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          {connected && connection.companyName
            ? `${t("syncingTo")} ${withPeriod(connection.companyName)}`
            : t("qbHelp")}
        </p>
      </div>

      <Button asChild variant={connected ? "outline" : "default"} size="sm">
        <Link href={QUICKBOOKS_HREF}>
          {connected || needsAttention ? t("manage") : t("setUp")}
          <ChevronRight className="ml-1 size-4" />
        </Link>
      </Button>
    </div>
  );
}
