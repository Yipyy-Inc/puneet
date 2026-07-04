"use client";

import Link from "next/link";
import { CreditCard, Settings2 } from "lucide-react";

import { useCloverConfig } from "@/lib/clover-config-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Featured "Payments" integration — the same treatment Twilio has for calling.
// Clover Fiserv is the PRIMARY (and, for Phase 1, only) payment processor. Full
// configuration lives in System Configuration → Payment Processing; this card
// surfaces status and links there so there's a single source of truth.
export function CloverIntegrationCard() {
  const cfg = useCloverConfig();

  return (
    <Card className="border-emerald-500/20">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-green-600 text-white shadow-sm">
            <CreditCard className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">
                Clover Fiserv
              </h2>
              <Badge variant="secondary">Payments · Primary</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Processes every subscription and customer card payment across
              Yipyy.
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "ml-auto gap-1",
              cfg.configured
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                : "border-muted bg-muted text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                cfg.configured ? "bg-emerald-500" : "bg-muted-foreground",
              )}
            />
            {cfg.configured ? "Connected" : "Not configured"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-300">
          <p className="font-medium">
            Phase 1: online credit card payments only.
          </p>
          <p>
            Applies to facilities paying Yipyy and customers paying facilities.
            Cash and bank-transfer workflows arrive in a later phase.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCell label="Environment">
            <span className="capitalize">{cfg.environment}</span>
          </SummaryCell>
          <SummaryCell label="Billing currency">{cfg.currency}</SummaryCell>
          <SummaryCell label="Payment methods">Card only</SummaryCell>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button asChild className="gap-2">
            <Link href="/dashboard/system-admin/system-config?tab=payment-processing">
              <Settings2 className="size-4" />
              Configure Payment Processing
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold">{children}</p>
    </div>
  );
}
