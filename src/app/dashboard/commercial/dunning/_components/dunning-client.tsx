"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  FileWarning,
  Mail,
  ShieldAlert,
} from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { dunningQueries } from "@/lib/api/dunning";
import type { DunningSequence } from "@/types/dunning";
import { DunningSequenceCard } from "./dunning-sequence-card";
import { formatDate, formatMoney } from "./dunning-utils";

const CADENCE = [
  { label: "Day 1", sub: "First reminder", icon: Mail },
  { label: "Day 7", sub: "Second notice", icon: Mail },
  { label: "Day 14", sub: "Final notice", icon: Mail },
  { label: "Suspend", sub: "Flagged", icon: ShieldAlert },
];

export function DunningClient() {
  const { data, isLoading } = useQuery(dunningQueries.state());

  const summary = data?.summary;
  const sequences = data?.sequences ?? [];
  const flags = data?.flags ?? [];

  function handleSendNow(seq: DunningSequence) {
    if (!seq.nextJob) return;
    toast.success(`${seq.nextJob.templateName} sent to ${seq.facilityName}`);
  }
  function handleSuspend(seq: DunningSequence) {
    toast.success(`${seq.facilityName} suspended for non-payment`);
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Dunning &amp; Collections
        </h1>
        <p className="text-muted-foreground">
          Automated overdue-invoice email sequence and suspension flagging.
        </p>
      </div>

      {/* Cadence explainer */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2">
          {CADENCE.map((stage, idx) => {
            const Icon = stage.icon;
            const isLast = idx === CADENCE.length - 1;
            return (
              <div key={stage.label} className="flex flex-1 items-center gap-2">
                <div className="flex flex-col items-center gap-1 text-center">
                  <span
                    className={
                      isLast
                        ? "flex size-9 items-center justify-center rounded-full bg-linear-to-br from-rose-500 to-pink-600 text-white"
                        : "flex size-9 items-center justify-center rounded-full bg-linear-to-br from-amber-400 to-orange-500 text-white"
                    }
                  >
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold">{stage.label}</p>
                    <p className="text-muted-foreground text-[10px]">
                      {stage.sub}
                    </p>
                  </div>
                </div>
                {!isLast && (
                  <div className="bg-border mt-[-18px] h-0.5 flex-1" />
                )}
              </div>
            );
          })}
        </div>
        <p className="text-muted-foreground mt-3 border-t pt-3 text-xs">
          Jobs are scheduled off each invoice&apos;s due date and are idempotent
          — every email fires exactly once per invoice. The Day-14 notice flags
          the facility for suspension.
        </p>
      </Card>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Overdue Invoices"
          value={summary?.overdueCount ?? 0}
          icon={FileWarning}
          tone="amber"
        />
        <KpiTile
          label="Emails Sent"
          value={summary?.sentCount ?? 0}
          hint="Across all sequences"
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiTile
          label="Scheduled"
          value={summary?.scheduledCount ?? 0}
          hint="Pending in queue"
          icon={Clock}
          tone="indigo"
        />
        <KpiTile
          label="Flagged for Suspension"
          value={summary?.flaggedCount ?? 0}
          icon={ShieldAlert}
          tone={(summary?.flaggedCount ?? 0) > 0 ? "rose" : "slate"}
          alert={
            (summary?.flaggedCount ?? 0) > 0
              ? { label: "Action needed", tone: "rose" }
              : undefined
          }
        />
      </div>

      {/* Flagged for suspension */}
      {flags.length > 0 && (
        <Card className="border-rose-500/20 p-0">
          <div className="flex items-center gap-2 border-b border-rose-500/20 bg-rose-500/5 px-4 py-3">
            <ShieldAlert className="size-4 text-rose-600 dark:text-rose-400" />
            <h2 className="text-sm font-semibold">
              Flagged for Suspension ({flags.length})
            </h2>
          </div>
          <div className="divide-y">
            {flags.map((flag) => (
              <div
                key={flag.invoiceId}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/facilities/${flag.facilityId}`}
                    className="font-medium hover:underline"
                  >
                    {flag.facilityName}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {flag.invoiceNumber} ·{" "}
                    {formatMoney(flag.amount, flag.currency)} ·{" "}
                    <span className="text-rose-600 dark:text-rose-400">
                      {flag.daysPastDue}d past due
                    </span>{" "}
                    · flagged {formatDate(flag.flaggedAt)}
                  </p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/facilities/${flag.facilityId}`}>
                    View facility
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Active sequences */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Active sequences</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-44 w-full rounded-xl" />
            ))}
          </div>
        ) : sequences.length === 0 ? (
          <Card className="text-muted-foreground p-8 text-center text-sm">
            No overdue invoices — nothing in the dunning queue.
          </Card>
        ) : (
          sequences.map((seq) => (
            <DunningSequenceCard
              key={seq.invoiceId}
              sequence={seq}
              onSendNow={handleSendNow}
              onSuspend={handleSuspend}
            />
          ))
        )}
      </div>
    </div>
  );
}
