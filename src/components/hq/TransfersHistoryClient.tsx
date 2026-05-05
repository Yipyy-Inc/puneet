"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Download,
  Search,
  ChevronRight,
  TrendingUp,
  Hourglass,
  CalendarRange,
  DollarSign,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { BookingTransfer, Location } from "@/types/location";
import {
  locationStyles,
  styleFromKey,
  type LocationColorClasses,
} from "@/lib/hq/location-styles";

interface Props {
  transfers: BookingTransfer[];
  locations: Location[];
}

const STATUS_META: Record<
  BookingTransfer["status"],
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    chip: string;
    dot: string;
  }
> = {
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    chip: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  pending_approval: {
    label: "Pending approval",
    icon: Clock,
    chip: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    chip: "bg-sky-500/10 text-sky-700 border-sky-500/30 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    chip: "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

function formatDt(iso: string) {
  return new Date(iso).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function bucketByRecency(iso: string, today: Date): "today" | "yesterday" | "week" | "older" {
  const d = new Date(iso);
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const t = d.getTime();
  if (t >= startOfToday) return "today";
  if (t >= startOfToday - dayMs) return "yesterday";
  if (t >= startOfToday - 7 * dayMs) return "week";
  return "older";
}

const BUCKETS: { key: "today" | "yesterday" | "week" | "older"; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This week" },
  { key: "older", label: "Earlier" },
];

export function TransfersHistoryClient({ transfers, locations }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingTransfer["status"] | "all">("all");

  const getLocation = (id: string) => locations.find((l) => l.id === id);

  const filtered = useMemo(() => {
    const find = (id: string) => locations.find((l) => l.id === id);
    return transfers.filter((t) => {
      const from = find(t.fromLocationId);
      const to = find(t.toLocationId);
      const matchesSearch =
        !search ||
        String(t.bookingId).includes(search) ||
        t.initiatedBy.toLowerCase().includes(search.toLowerCase()) ||
        from?.name.toLowerCase().includes(search.toLowerCase()) ||
        to?.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.reason ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [transfers, search, statusFilter, locations]);

  const counts = {
    all: transfers.length,
    completed: transfers.filter((t) => t.status === "completed").length,
    pending_approval: transfers.filter((t) => t.status === "pending_approval").length,
    approved: transfers.filter((t) => t.status === "approved").length,
    rejected: transfers.filter((t) => t.status === "rejected").length,
  };

  // Aggregate flow matrix
  const flow = useMemo(() => {
    const result: Record<string, Record<string, { count: number; volume: number }>> = {};
    locations.forEach((from) => {
      result[from.id] = {};
      locations.forEach((to) => {
        result[from.id][to.id] = { count: 0, volume: 0 };
      });
    });
    transfers.forEach((t) => {
      if (!result[t.fromLocationId]?.[t.toLocationId]) return;
      result[t.fromLocationId][t.toLocationId].count += 1;
      result[t.fromLocationId][t.toLocationId].volume += Math.abs(t.priceDelta);
    });
    return result;
  }, [transfers, locations]);

  const maxFlowCount = Math.max(
    1,
    ...Object.values(flow).flatMap((row) => Object.values(row).map((c) => c.count)),
  );

  // Stats
  const totalAdjusted = transfers.reduce((sum, t) => sum + Math.abs(t.priceDelta), 0);
  const completedTransfers = transfers.filter(
    (t) => t.status === "completed" && t.completedAt,
  );
  const avgProcessingMin = (() => {
    if (completedTransfers.length === 0) return 0;
    const sum = completedTransfers.reduce((acc, t) => {
      const start = new Date(t.initiatedAt).getTime();
      const end = new Date(t.completedAt!).getTime();
      return acc + (end - start) / 60000;
    }, 0);
    return Math.round(sum / completedTransfers.length);
  })();
  const successRate = transfers.length === 0
    ? 0
    : Math.round(
        (transfers.filter((t) => t.status === "completed" || t.status === "approved").length /
          transfers.length) *
          100,
      );

  const grouped = useMemo(() => {
    const today = new Date();
    const out: Record<"today" | "yesterday" | "week" | "older", BookingTransfer[]> = {
      today: [],
      yesterday: [],
      week: [],
      older: [],
    };
    [...filtered]
      .sort((a, b) => +new Date(b.initiatedAt) - +new Date(a.initiatedAt))
      .forEach((t) => out[bucketByRecency(t.initiatedAt, today)].push(t));
    return out;
  }, [filtered]);

  return (
    <div className="flex-1 space-y-7 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/facility/hq/overview">
            <Button variant="ghost" size="icon" className="size-9">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
              <Link href="/facility/hq/overview" className="hover:text-foreground transition-colors">
                HQ
              </Link>
              <ChevronRight className="size-3" />
              <span>Transfer History</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Transfer History</h1>
            <p className="text-muted-foreground text-sm">
              All inter-location booking moves · {transfers.length} total · {counts.pending_approval} awaiting approval
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => toast.success("Transfer log exported")}
          >
            <Download className="size-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Headline KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Total Transfers"
          value={counts.all.toString()}
          caption={`${counts.pending_approval} pending`}
          icon={ArrowLeftRight}
          tone="sky"
        />
        <KpiTile
          label="Success Rate"
          value={`${successRate}%`}
          caption={`${counts.completed} completed`}
          icon={TrendingUp}
          tone="emerald"
        />
        <KpiTile
          label="Avg Processing"
          value={`${avgProcessingMin}m`}
          caption="initiation to completion"
          icon={Hourglass}
          tone="violet"
        />
        <KpiTile
          label="Price Adjusted"
          value={`$${totalAdjusted.toFixed(0)}`}
          caption="across all transfers"
          icon={DollarSign}
          tone="amber"
        />
      </div>

      {/* Flow matrix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Network className="size-4" />
            Inter-Location Flow
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            Volume of transfers from each origin to each destination
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="bg-muted/30 text-muted-foreground rounded-tl-lg border-b border-r px-3 py-2 text-left text-[10px] font-semibold tracking-wider uppercase">
                    From → To
                  </th>
                  {locations.map((loc, i) => {
                    const s = locationStyles(loc);
                    return (
                      <th
                        key={loc.id}
                        className={cn(
                          "bg-muted/30 border-b px-3 py-2 text-center text-[10px] font-semibold tracking-wider uppercase",
                          i < locations.length - 1 && "border-r",
                          i === locations.length - 1 && "rounded-tr-lg",
                        )}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={cn(
                              "flex size-6 items-center justify-center rounded-md text-[10px] text-white",
                              s.bg,
                            )}
                          >
                            {loc.shortCode}
                          </span>
                          <span className={cn("text-[10px]", s.text)}>
                            {loc.name.split("–")[1]?.trim() ?? loc.name}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {locations.map((from, ri) => {
                  const fromS = locationStyles(from);
                  return (
                    <tr key={from.id}>
                      <th
                        className={cn(
                          "bg-muted/15 border-r px-3 py-3 text-left",
                          ri < locations.length - 1 && "border-b",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "flex size-6 items-center justify-center rounded-md text-[10px] text-white",
                              fromS.bg,
                            )}
                          >
                            {from.shortCode}
                          </span>
                          <span className={cn("text-[11px] font-semibold", fromS.text)}>
                            {from.name.split("–")[1]?.trim() ?? from.name}
                          </span>
                        </div>
                      </th>
                      {locations.map((to, ci) => {
                        const cell = flow[from.id]?.[to.id];
                        const count = cell?.count ?? 0;
                        const volume = cell?.volume ?? 0;
                        const isSelf = from.id === to.id;
                        const intensity = count / maxFlowCount;
                        const toS = locationStyles(to);
                        return (
                          <td
                            key={to.id}
                            className={cn(
                              "px-3 py-3 text-center",
                              ci < locations.length - 1 && "border-r",
                              ri < locations.length - 1 && "border-b",
                            )}
                          >
                            {isSelf ? (
                              <span className="text-muted-foreground/50">—</span>
                            ) : count === 0 ? (
                              <span className="text-muted-foreground/40">·</span>
                            ) : (
                              <div
                                className={cn(
                                  "mx-auto flex w-fit flex-col items-center gap-0.5 rounded-lg px-2.5 py-1",
                                  toS.bgSoft,
                                  intensity > 0.5 && toS.bgSofter,
                                )}
                              >
                                <span className={cn("text-sm font-bold tabular-nums", toS.text)}>
                                  {count}
                                </span>
                                {volume > 0 && (
                                  <span className="text-muted-foreground text-[9px] tabular-nums">
                                    ${volume.toFixed(0)} adj.
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Filter strip */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search booking, staff, location, reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { v: "all", label: `All · ${counts.all}` },
              { v: "completed", label: `Completed · ${counts.completed}` },
              { v: "pending_approval", label: `Pending · ${counts.pending_approval}` },
              { v: "approved", label: `Approved · ${counts.approved}` },
              { v: "rejected", label: `Rejected · ${counts.rejected}` },
            ] as const
          ).map((s) => (
            <button
              key={s.v}
              onClick={() => setStatusFilter(s.v as BookingTransfer["status"] | "all")}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                statusFilter === s.v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline groups */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12">
            <ArrowLeftRight className="text-muted-foreground/40 size-10" />
            <p className="text-muted-foreground text-sm">No transfers match your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {BUCKETS.map((b) => {
            const list = grouped[b.key];
            if (!list.length) return null;
            return (
              <section key={b.key} className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarRange className="text-muted-foreground size-3.5" />
                  <h3 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                    {b.label}
                  </h3>
                  <span className="text-muted-foreground text-[11px]">· {list.length}</span>
                  <div className="bg-border ml-2 h-px flex-1" />
                </div>
                <div className="space-y-2.5">
                  {list.map((t) => {
                    const from = getLocation(t.fromLocationId);
                    const to = getLocation(t.toLocationId);
                    const fromS = from ? locationStyles(from) : styleFromKey("sky");
                    const toS = to ? locationStyles(to) : styleFromKey("sky");
                    return (
                      <TransferCard
                        key={t.id}
                        transfer={t}
                        from={from}
                        to={to}
                        fromS={fromS}
                        toS={toS}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KpiTile({
  label,
  value,
  caption,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  caption: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "sky" | "violet" | "emerald" | "amber";
}) {
  const s = styleFromKey(tone);
  return (
    <Card className="overflow-hidden">
      <CardContent className="relative pt-4 pb-4">
        <div className={cn("absolute inset-0 bg-linear-to-br opacity-50", s.gradFrom, s.gradTo)} />
        <div className="relative flex items-start justify-between gap-2">
          <div>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            <p className="text-muted-foreground text-[11px]">{caption}</p>
          </div>
          <div className={cn("flex size-9 items-center justify-center rounded-xl", s.bgSoft)}>
            <Icon className={cn("size-4.5", s.text)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TransferCard({
  transfer,
  from,
  to,
  fromS,
  toS,
}: {
  transfer: BookingTransfer;
  from: Location | undefined;
  to: Location | undefined;
  fromS: LocationColorClasses;
  toS: LocationColorClasses;
}) {
  const meta = STATUS_META[transfer.status];
  const StatusIcon = meta.icon;

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {/* Left side: route + details */}
          <div className="flex items-start gap-3">
            {/* Route visualization */}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-xl text-[10px] font-bold text-white shadow-sm",
                  fromS.bg,
                )}
              >
                {from?.shortCode ?? "??"}
              </div>
              <div className="flex flex-col items-center">
                <ArrowRight className="text-muted-foreground size-4" />
                <div className="bg-border h-px w-5" />
              </div>
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-xl text-[10px] font-bold text-white shadow-sm",
                  toS.bg,
                )}
              >
                {to?.shortCode ?? "??"}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">Booking #{transfer.bookingId}</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                    meta.chip,
                  )}
                >
                  <StatusIcon className="size-2.5" />
                  {meta.label}
                </span>
                {transfer.requiresCustomerApproval && !transfer.customerApprovedAt && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
                    <AlertTriangle className="size-2.5" />
                    Awaiting customer
                  </span>
                )}
              </div>
              <p className="text-muted-foreground mt-1 text-[11px]">
                <span className={cn("font-semibold", fromS.text)}>{from?.name}</span>
                {" → "}
                <span className={cn("font-semibold", toS.text)}>{to?.name}</span>
              </p>
              <p className="text-muted-foreground text-[11px]">
                {transfer.initiatedBy} · {formatDt(transfer.initiatedAt)}
              </p>
              {transfer.reason && (
                <p className="text-muted-foreground mt-1 max-w-md text-[11px] italic">
                  &quot;{transfer.reason}&quot;
                </p>
              )}
            </div>
          </div>

          {/* Right side: pricing + actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] capitalize">
                {transfer.pricingPolicy === "keep_original" ? "Price kept" : "Price updated"}
              </Badge>
              {transfer.priceDelta !== 0 && (
                <span
                  className={cn(
                    "text-xs font-semibold tabular-nums",
                    transfer.priceDelta > 0 ? "text-amber-600" : "text-emerald-600",
                  )}
                >
                  {transfer.priceDelta > 0 ? "+" : ""}${transfer.priceDelta.toFixed(2)}
                </span>
              )}
            </div>

            <div className="flex gap-1.5">
              {transfer.status === "pending_approval" && (
                <>
                  <Button
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => toast.success(`Transfer #${transfer.bookingId} approved`)}
                  >
                    <CheckCircle2 className="size-3" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive h-7 gap-1 text-xs"
                    onClick={() => toast.info(`Transfer #${transfer.bookingId} rejected`)}
                  >
                    <XCircle className="size-3" />
                    Reject
                  </Button>
                </>
              )}
              {transfer.status === "approved" && (
                <Button
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => toast.success(`Transfer #${transfer.bookingId} finalized`)}
                >
                  <CheckCircle2 className="size-3" />
                  Finalize
                </Button>
              )}
            </div>
          </div>
        </div>

        {(transfer.completedAt || transfer.customerApprovedAt) && (
          <>
            <Separator className="my-3" />
            <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-[11px]">
              {transfer.customerApprovedAt && (
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-sky-500" />
                  Customer approved · {formatDt(transfer.customerApprovedAt)}
                </span>
              )}
              {transfer.completedAt && (
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-emerald-500" />
                  Completed · {formatDt(transfer.completedAt)}
                </span>
              )}
              {transfer.customerNotified && (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3" />
                  Customer notified
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
