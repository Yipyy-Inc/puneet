"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CreditCard, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================================
// Yipyy Pay's footprint on the Integrations page: one line.
//
// ── WHY IT SHRANK ────────────────────────────────────────────────────────
//
// The whole connect flow used to live here — a green Clover-branded card with
// four numbered steps, a merchant id, an environment badge, a terminal list and
// a disconnect dialog — sitting between Twilio SMS and SendGrid Email.
//
// Payment processing is not an integration in the sense the rest of that page
// means. It decides where a business's revenue lands. It now has its own
// section under Financial, and what remains here is a signpost: is it on, and
// where do I go.
//
// ── IT READS /status, NOT THE FULL OVERVIEW ──────────────────────────────
//
// Deliberately the cheaper call. This tile renders on a page nobody opened to
// think about payments, and pulling a merchant profile, ten days of ledger rows
// and a location list to draw one badge would be a page-load cost paid by
// everyone editing their SMS settings.
// ============================================================================

interface CloverStatus {
  ambiguous?: boolean;
  connected?: boolean;
  status?: "pending" | "connected" | "revoked" | "error" | "none";
  configured: boolean;
}

const HREF = "/facility/dashboard/settings?section=yipyy-pay";

export function YipyyPayStatusTile() {
  const { data, isPending } = useQuery({
    queryKey: ["clover", "connection"],
    queryFn: async (): Promise<CloverStatus> => {
      const response = await fetch("/api/payments/clover/status");
      if (!response.ok) throw new Error("Could not read the connection.");
      return (await response.json()) as CloverStatus;
    },
    refetchOnWindowFocus: true,
  });

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 p-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20 dark:text-sky-400">
          <CreditCard className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">Yipyy Pay</p>
            {isPending ? (
              <Skeleton className="h-5 w-20" />
            ) : !data?.configured ? (
              <Badge variant="outline" className="gap-1">
                <TriangleAlert className="size-3" />
                Unavailable
              </Badge>
            ) : data.connected ? (
              <Badge variant="success">Connected</Badge>
            ) : data.status === "error" ? (
              <Badge variant="destructive">Needs attention</Badge>
            ) : (
              <Badge variant="outline">Not set up</Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm/relaxed">
            Card payments, tips and payouts. Managed under Financial → Payments
            &amp; Billing.
          </p>
        </div>

        <Button asChild variant="outline" size="sm">
          <Link href={HREF}>
            {data?.connected ? "Manage" : "Set up"}
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
