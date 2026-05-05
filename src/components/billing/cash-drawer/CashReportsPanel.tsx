"use client";

import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { TrendingUp, AlertTriangle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  aggregateByPeriod,
  type PeriodBucket,
  SOURCE_LABELS,
  summarizeBySource,
} from "@/lib/cash-register";
import type { CapturedCashTxn, RegisterSession } from "@/data/cash-drawer";

interface Props {
  sessions: RegisterSession[];
  currencySymbol: string;
}

type Granularity = "day" | "week" | "month";

export function CashReportsPanel({ sessions, currencySymbol }: Props) {
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [drillKey, setDrillKey] = useState<string | null>(null);

  const buckets = useMemo(
    () => aggregateByPeriod(sessions, granularity),
    [sessions, granularity],
  );

  const drillBucket = drillKey
    ? buckets.find((b) => b.key === drillKey) ?? null
    : null;

  const totals = useMemo(() => {
    const cashCaptured = buckets.reduce((s, b) => s + b.cashCaptured, 0);
    const txnCount = buckets.reduce((s, b) => s + b.txnCount, 0);
    const variance = buckets.reduce((s, b) => s + b.variance, 0);
    const offDays = buckets.filter((b) => Math.abs(b.variance) >= 0.005).length;
    return { cashCaptured, txnCount, variance, offDays };
  }, [buckets]);

  const fmt = (n: number) => `${currencySymbol}${Math.abs(n).toFixed(2)}`;
  const fmtSigned = (n: number) =>
    n === 0 ? `±${currencySymbol}0.00` : `${n > 0 ? "+" : "-"}${fmt(n)}`;

  const columns: ColumnDef<PeriodBucket>[] = [
    {
      key: "label",
      label:
        granularity === "day"
          ? "Day"
          : granularity === "week"
            ? "Week"
            : "Month",
      defaultVisible: true,
      render: (b) => <span className="font-medium">{b.label}</span>,
    },
    {
      key: "txnCount",
      label: "Cash txns",
      defaultVisible: true,
      render: (b) => (
        <span className="text-sm tabular-nums">{b.txnCount}</span>
      ),
    },
    {
      key: "cashCaptured",
      label: "Cash captured",
      defaultVisible: true,
      sortable: true,
      sortValue: (b) => b.cashCaptured,
      render: (b) => (
        <span className="font-semibold tabular-nums text-emerald-700">
          {fmt(b.cashCaptured)}
        </span>
      ),
    },
    {
      key: "movementsNet",
      label: "Movements",
      defaultVisible: true,
      render: (b) => (
        <span
          className={cn(
            "tabular-nums text-sm",
            b.movementsNet < 0 && "text-rose-600",
            b.movementsNet > 0 && "text-emerald-600",
          )}
        >
          {fmtSigned(b.movementsNet)}
        </span>
      ),
    },
    {
      key: "variance",
      label: "Variance",
      defaultVisible: true,
      render: (b) => {
        const status =
          Math.abs(b.variance) < 0.005
            ? "balanced"
            : b.variance > 0
              ? "over"
              : "short";
        return (
          <Badge
            variant="outline"
            className={cn(
              "tabular-nums text-xs",
              status === "balanced" && "border-emerald-300 bg-emerald-50 text-emerald-700",
              status === "over" && "border-amber-300 bg-amber-50 text-amber-700",
              status === "short" && "border-rose-300 bg-rose-50 text-rose-700",
            )}
          >
            {status === "balanced" ? "Balanced" : fmtSigned(b.variance)}
          </Badge>
        );
      },
    },
    {
      key: "drill",
      label: "",
      defaultVisible: true,
      render: () => <ChevronRight className="size-4 text-muted-foreground" />,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Granularity tabs */}
      <Tabs
        value={granularity}
        onValueChange={(v) => setGranularity(v as Granularity)}
      >
        <TabsList>
          <TabsTrigger value="day">Daily</TabsTrigger>
          <TabsTrigger value="week">Weekly</TabsTrigger>
          <TabsTrigger value="month">Monthly</TabsTrigger>
        </TabsList>

        {/* Totals strip */}
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryTile
            label="Cash captured"
            value={fmt(totals.cashCaptured)}
            tone="emerald"
            icon={TrendingUp}
            hint={`${totals.txnCount} cash txns`}
          />
          <SummaryTile
            label="Total variance"
            value={fmtSigned(totals.variance)}
            tone={Math.abs(totals.variance) < 0.005 ? "emerald" : "amber"}
            icon={AlertTriangle}
            hint={`${totals.offDays} off-balance day${totals.offDays === 1 ? "" : "s"}`}
          />
          <SummaryTile
            label="Periods reported"
            value={String(buckets.length)}
            tone="indigo"
            icon={TrendingUp}
            hint={
              granularity === "day"
                ? "closed sessions"
                : granularity === "week"
                  ? "weeks with sales"
                  : "months with sales"
            }
          />
          <SummaryTile
            label="Avg per period"
            value={
              buckets.length > 0
                ? fmt(totals.cashCaptured / buckets.length)
                : fmt(0)
            }
            tone="violet"
            icon={TrendingUp}
            hint="cash captured"
          />
        </div>

        <TabsContent value={granularity} className="mt-4">
          <DataTable
            data={buckets}
            columns={columns}
            itemsPerPage={20}
            onRowClick={(b) => setDrillKey(b.key)}
            rowClassName={() => "cursor-pointer"}
          />
        </TabsContent>
      </Tabs>

      {/* Drill-down sheet */}
      <Sheet
        open={!!drillBucket}
        onOpenChange={(v) => {
          if (!v) setDrillKey(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {drillBucket && (
            <DrillContent
              bucket={drillBucket}
              currencySymbol={currencySymbol}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DrillContent({
  bucket,
  currencySymbol,
}: {
  bucket: PeriodBucket;
  currencySymbol: string;
}) {
  const fmt = (n: number) => `${currencySymbol}${Math.abs(n).toFixed(2)}`;
  const fmtSigned = (n: number) =>
    n === 0 ? `±${currencySymbol}0.00` : `${n > 0 ? "+" : "-"}${fmt(n)}`;

  const allTxns: CapturedCashTxn[] = bucket.sessions.flatMap(
    (s) => s.capturedTxns,
  );
  const sources = summarizeBySource(allTxns);

  return (
    <>
      <SheetHeader>
        <SheetTitle>{bucket.label}</SheetTitle>
        <SheetDescription>
          {bucket.sessions.length} session
          {bucket.sessions.length === 1 ? "" : "s"} · {bucket.txnCount} cash txns
          · {fmt(bucket.cashCaptured)} captured
        </SheetDescription>
      </SheetHeader>

      <div className="mt-4 space-y-4 px-1">
        {/* Source breakdown */}
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            By source
          </h4>
          <div className="space-y-1.5">
            {(["service", "retail", "deposit", "other"] as const).map((src) => {
              const v = sources[src];
              const pct = sources.total > 0 ? (v / sources.total) * 100 : 0;
              if (v === 0) return null;
              return (
                <div key={src} className="flex items-center gap-2 text-sm">
                  <span className="w-16 capitalize text-muted-foreground">
                    {SOURCE_LABELS[src]}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-muted">
                    <div
                      className="h-full rounded-sm bg-emerald-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                    {pct.toFixed(0)}%
                  </span>
                  <span className="w-20 text-right font-medium tabular-nums">
                    {fmt(v)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Per-session breakdown */}
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sessions in this period
          </h4>
          <ul className="space-y-2">
            {bucket.sessions.map((s) => (
              <li
                key={s.id}
                className="rounded-sm border px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {new Date(s.businessDate + "T00:00:00").toLocaleDateString(
                      "en-CA",
                      {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      },
                    )}
                  </span>
                  <span className="font-semibold tabular-nums text-emerald-700">
                    {fmt(s.cashCaptured)}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                  <span>{s.capturedTxns.length} txns</span>
                  <span>·</span>
                  <span>{s.opening.countedBy}</span>
                  <span>·</span>
                  <span
                    className={cn(
                      s.varianceStatus === "balanced" && "text-emerald-700",
                      s.varianceStatus === "over" && "text-amber-700",
                      s.varianceStatus === "short" && "text-rose-700",
                    )}
                  >
                    {s.variance != null
                      ? fmtSigned(s.variance)
                      : "—"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "emerald" | "amber" | "indigo" | "violet";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const toneCls = {
    emerald: "border-emerald-200 bg-emerald-50/60 text-emerald-700",
    amber: "border-amber-200 bg-amber-50/60 text-amber-700",
    indigo: "border-indigo-200 bg-indigo-50/60 text-indigo-700",
    violet: "border-violet-200 bg-violet-50/60 text-violet-700",
  }[tone];
  return (
    <div className={cn("rounded-md border px-3 py-2", toneCls)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider">
          {label}
        </span>
        <Icon className="size-3.5 opacity-70" />
      </div>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
      {hint && <p className="text-[10px] opacity-80">{hint}</p>}
    </div>
  );
}
