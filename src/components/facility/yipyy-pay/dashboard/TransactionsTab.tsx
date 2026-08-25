"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  CreditCard,
  Coins,
  Loader2,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  useTransactions,
  type Takings,
  type TakingsBreakdown,
} from "@/lib/api/yipyy-pay-transactions";
import { TransactionsTable } from "./TransactionsTable";

// ============================================================================
// What the facility took, and every transaction behind it.
//
// ── IT READS THE LEDGER, NOT CLOVER ───────────────────────────────────────
//
// The full reasoning is in the route. The short version: Clover cannot say that
// a payment was for a boarding stay, or name the customer or the pet, and its
// 16-request-per-second token is the same one the sweep needs to keep this
// ledger true. So the sweep pulls Clover in and this reads what it pulled.
//
// ── GROSS AND NET ARE BOTH ON SCREEN, ALWAYS ──────────────────────────────
//
// Measured on this facility's own data the day this was built:
//
//   7 Aug   gross 62.00    refunded 62.00    net 0.00
//   8 Aug   gross 312.51   refunded 312.51   net 0.00
//
// A net-only headline renders both of those as a day nobody came in. They were
// days when six hundred pounds of card payments were taken and handed back,
// which is a completely different thing to know about your business.
// ============================================================================

type RangeKey = "today" | "7d" | "30d" | "mtd";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "mtd", label: "This month" },
];

/**
 * A half-open window, in the browser's local day.
 *
 * `to` is the START of tomorrow rather than the end of today, so a payment
 * taken at 23:59:59.4 cannot fall outside a window that claims to include it.
 * The SERVER buckets by the facility's timezone; this only has to bound the
 * query, and bounding it slightly wide is harmless where bounding it short
 * would silently drop the most recent sale.
 */
function windowFor(key: RangeKey): { from: string; to: string } {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const tomorrow = new Date(startOfToday);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const from = new Date(startOfToday);
  if (key === "7d") from.setDate(from.getDate() - 6);
  if (key === "30d") from.setDate(from.getDate() - 29);
  if (key === "mtd") from.setDate(1);

  return { from: from.toISOString(), to: tomorrow.toISOString() };
}

const SERVICE_LABELS: Record<string, string> = {
  boarding: "Boarding",
  daycare: "Daycare",
  grooming: "Grooming",
  training: "Training",
  retail: "Retail",
  vet: "Vet",
  other: "Other",
};

const CHANNEL_LABELS: Record<string, string> = {
  in_person: "In person",
  online: "Online",
  other: "Cash & other",
};

/**
 * A service's display name.
 *
 * The fallback is not decoration. Facilities invent their own services, and the
 * `owner` fixture already carries `yodas-splash` and `paws-express` — a naive
 * `charAt(0).toUpperCase()` renders those as "Yodas-splash", which looks like a
 * bug in the dashboard rather than a name somebody chose.
 */
function label(map: Record<string, string>, key: string | null | undefined) {
  if (!key) return "Other";
  const known = map[key];
  if (known) return known;
  return key
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function TransactionsTab() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [kind, setKind] = useState<"sales" | "refunds" | "clover" | null>(null);
  const [offset, setOffset] = useState(0);

  const bounds = useMemo(() => windowFor(range), [range]);
  const { data, isPending, isFetching, error } = useTransactions({
    ...bounds,
    kind,
    offset,
  });

  function pick(next: RangeKey) {
    setRange(next);
    // A new period is a new list. Staying on page 4 of the last one would show
    // an empty table and read as "no transactions".
    setOffset(0);
  }

  function filter(next: typeof kind) {
    setKind((current) => (current === next ? null : next));
    setOffset(0);
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-6">
          <TriangleAlert className="size-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">The payments could not be read.</p>
            <p className="text-muted-foreground text-sm">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const takings = data?.takings ?? null;

  return (
    <div className="space-y-6">
      {/* ── The period ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {RANGES.map((entry) => (
            <Button
              key={entry.key}
              size="sm"
              variant={range === entry.key ? "default" : "outline"}
              className={cn(
                range === entry.key &&
                  "bg-emerald-600 text-white hover:bg-emerald-700",
              )}
              onClick={() => pick(entry.key)}
            >
              {entry.label}
            </Button>
          ))}
        </div>
        {/* Says which way it is loading. A spinner where the numbers are would
            replace figures somebody is reading; this sits beside them. */}
        {isFetching && !isPending && (
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Loader2 className="size-3.5 animate-spin" />
            Updating
          </span>
        )}
      </div>

      <TakingsRow takings={takings} loading={isPending} />

      {takings && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Breakdown
            title="By service"
            hint="What the money was for. Clover cannot answer this — the booking can."
            rows={takings.byService}
            nameOf={(row) => label(SERVICE_LABELS, row.service)}
            total={takings.net}
          />
          <Breakdown
            title="How it was taken"
            hint="Card present, online, or neither."
            rows={takings.byChannel}
            nameOf={(row) => label(CHANNEL_LABELS, row.channel)}
            total={takings.net}
          />
        </div>
      )}

      {/* ── The transactions ───────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">Show</span>
          {(
            [
              { key: "sales", label: "Sales" },
              { key: "refunds", label: "Refunds" },
              { key: "clover", label: "Clover only" },
            ] as const
          ).map((entry) => (
            <Badge
              key={entry.key}
              variant={kind === entry.key ? "default" : "outline"}
              className="cursor-pointer select-none"
              onClick={() => filter(entry.key)}
            >
              {entry.label}
            </Badge>
          ))}
          {kind && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => filter(kind)}
            >
              <RotateCcw className="size-3" />
              Clear
            </Button>
          )}
          {/* The filters narrow the LIST, never the totals above. A day's
              takings do not change because you asked to see the refunds. */}
          <span className="text-muted-foreground ml-auto text-xs">
            {kind ? "Filtering the list only — totals cover the period" : null}
          </span>
        </div>

        <TransactionsTable
          transactions={data?.transactions ?? []}
          loading={isPending}
          total={data?.total ?? 0}
          offset={offset}
          limit={data?.limit ?? 50}
          onOffset={setOffset}
        />
      </div>
    </div>
  );
}

function TakingsRow({
  takings,
  loading,
}: {
  takings: Takings | null;
  loading: boolean;
}) {
  if (loading || !takings) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {[0, 1, 2, 3].map((n) => (
          <div
            key={n}
            data-slot="skeleton"
            className="bg-muted/50 h-[116px] animate-pulse rounded-xl"
          />
        ))}
      </div>
    );
  }

  const refunded = takings.refunded > 0;

  return (
    // Two across until the viewport is genuinely wide. These tiles sit in the
    // settings CONTENT column, not the page, so `xl:grid-cols-4` gave each about
    // 135px - enough to clip a five-figure total, which is the one number on
    // this screen that must never be half-shown.
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <KpiTile
        label="Processed"
        value={formatCurrency(takings.gross)}
        hint={`${takings.sales} sale${takings.sales === 1 ? "" : "s"}`}
        icon={Banknote}
        tone="emerald"
        // Net is the trail rather than the headline: a refunded day and a quiet
        // day share a net and share nothing else.
        trail={[
          { label: "Net of refunds", value: formatCurrency(takings.net) },
        ]}
      />
      <KpiTile
        label="Tips"
        value={formatCurrency(takings.tips)}
        hint="After refunds"
        icon={Coins}
        tone="indigo"
      />
      <KpiTile
        label="Refunded"
        value={formatCurrency(takings.refunded)}
        hint={`${takings.refunds} refund${takings.refunds === 1 ? "" : "s"}`}
        icon={RotateCcw}
        tone={refunded ? "amber" : "slate"}
      />
      <KpiTile
        label="Through Clover"
        value={formatCurrency(takings.cloverGross)}
        hint={`${takings.cloverSales} card payment${takings.cloverSales === 1 ? "" : "s"}`}
        icon={CreditCard}
        tone="violet"
        // A failed payment is never a `payments` row — this count comes from
        // `payment_intents`, which is the only place one exists. Surfaced only
        // when there is one, because a permanent "0 failed" is noise.
        alert={
          takings.failed > 0
            ? {
                label: `${takings.failed} declined or failed`,
                tone: "amber",
              }
            : undefined
        }
      />
    </div>
  );
}

function Breakdown({
  title,
  hint,
  rows,
  nameOf,
  total,
}: {
  title: string;
  hint: string;
  rows: TakingsBreakdown[];
  nameOf: (row: TakingsBreakdown) => string;
  total: number;
}) {
  // Bars are drawn against the largest ROW, not the total: at four services the
  // biggest would otherwise fill a third of its track and every other line
  // would be a stub.
  const largest = Math.max(...rows.map((row) => Math.abs(row.net)), 1);
  const meaningful = rows.filter((row) => row.sales > 0 || row.net !== 0);

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-muted-foreground text-xs/relaxed">{hint}</p>
        </div>

        {meaningful.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            Nothing taken in this period.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {meaningful.map((row) => {
              const name = nameOf(row);
              const share = total > 0 ? (row.net / total) * 100 : 0;
              return (
                <li key={name} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{name}</span>
                    <span className="text-muted-foreground shrink-0 font-[tabular-nums]">
                      {formatCurrency(row.net)}
                      <span className="ml-2 text-xs opacity-70">
                        {row.sales}
                      </span>
                    </span>
                  </div>
                  {/* Width uses the ABSOLUTE value so a big reversal draws a
                      big bar, and the COLOUR carries the sign. Emerald at full
                      width for money that went out was the first version, and
                      it read as the best-performing row on the card. */}
                  <div
                    className="bg-muted h-1.5 overflow-hidden rounded-full"
                    role="presentation"
                  >
                    <div
                      className={cn(
                        "h-full rounded-full",
                        row.net < 0 ? "bg-amber-500" : "bg-emerald-500",
                      )}
                      style={{
                        width: `${Math.max(2, (Math.abs(row.net) / largest) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    {row.net < 0
                      ? "refunded more than taken"
                      : share > 0
                        ? `${share.toFixed(0)}% of takings`
                        : "—"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
