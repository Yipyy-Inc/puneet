"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BookingTransfer, Location } from "@/types/location";

interface Props {
  transfers: BookingTransfer[];
  locations: Location[];
}

const STATUS_META: Record<
  BookingTransfer["status"],
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700 border-emerald-300",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    className: "bg-sky-50 text-sky-700 border-sky-300",
  },
  pending_approval: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-50 text-amber-700 border-amber-300",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-rose-50 text-rose-700 border-rose-300",
  },
};

export function TransferImpactClient({ transfers, locations }: Props) {
  const stats = useMemo(() => {
    const completed = transfers.filter((t) => t.status === "completed");
    const totalDelta = completed.reduce((sum, t) => sum + t.priceDelta, 0);
    const positive = completed.filter((t) => t.priceDelta > 0).length;
    const negative = completed.filter((t) => t.priceDelta < 0).length;
    return {
      total: transfers.length,
      completed: completed.length,
      pending: transfers.filter((t) => t.status === "pending_approval").length,
      rejected: transfers.filter((t) => t.status === "rejected").length,
      totalDelta,
      positive,
      negative,
      retentionRate: completed.length > 0 ? 100 : 0, // mock — all retained for now
    };
  }, [transfers]);

  // Flow chart data — count transfers between location pairs
  const flowMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    locations.forEach((from) => {
      matrix[from.id] = {};
      locations.forEach((to) => {
        matrix[from.id][to.id] = 0;
      });
    });
    transfers
      .filter((t) => t.status === "completed" || t.status === "approved")
      .forEach((t) => {
        if (matrix[t.fromLocationId]?.[t.toLocationId] !== undefined) {
          matrix[t.fromLocationId][t.toLocationId] += 1;
        }
      });
    return matrix;
  }, [transfers, locations]);

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      {/* Header */}
      <div>
        <Link
          href="/facility/hq/reports"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
        >
          <ArrowLeft className="size-3" />
          All HQ Reports
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ArrowLeftRight className="size-6 text-emerald-600" />
          Transfer Impact Report
        </h1>
        <p className="text-muted-foreground text-sm">
          Every booking that moved between locations — revenue impact, customer
          retention, and which locations rescue which.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={ArrowLeftRight}
          label="Total transfers"
          value={stats.total.toLocaleString()}
          sub={`${stats.completed} completed · ${stats.pending} pending`}
        />
        <StatTile
          icon={DollarSign}
          label="Net revenue impact"
          value={`${stats.totalDelta >= 0 ? "+" : ""}$${stats.totalDelta.toLocaleString()}`}
          sub={`${stats.positive} up · ${stats.negative} down`}
          accent={
            stats.totalDelta >= 0
              ? "text-emerald-600 bg-emerald-100"
              : "text-rose-600 bg-rose-100"
          }
        />
        <StatTile
          icon={Users}
          label="Customer retention"
          value={`${stats.retentionRate}%`}
          sub="Stayed after transfer"
          accent="text-sky-600 bg-sky-100"
        />
        <StatTile
          icon={stats.totalDelta >= 0 ? TrendingUp : TrendingDown}
          label="Avg delta per transfer"
          value={
            stats.completed > 0
              ? `$${(stats.totalDelta / stats.completed).toFixed(0)}`
              : "$0"
          }
          sub="When pricing applied"
          accent="text-violet-600 bg-violet-100"
        />
      </div>

      {/* Flow matrix */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Transfer Flow Matrix</CardTitle>
          <p className="text-muted-foreground text-xs">
            Reads as: row → column. So &ldquo;Plateau row, Laval column&rdquo;
            shows transfers that moved from Plateau to Laval.
          </p>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 text-left font-semibold">
                    From ↓ / To →
                  </th>
                  {locations.map((loc) => (
                    <th
                      key={loc.id}
                      className="px-4 py-2 text-center font-semibold"
                      style={{ color: loc.color }}
                    >
                      {loc.shortCode}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-right font-semibold">
                    Total Out
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {locations.map((from) => {
                  const totalOut = locations.reduce(
                    (sum, to) => sum + (flowMatrix[from.id]?.[to.id] ?? 0),
                    0,
                  );
                  return (
                    <tr key={from.id} className="hover:bg-muted/30">
                      <td
                        className="px-4 py-2.5 text-left font-semibold"
                        style={{ color: from.color }}
                      >
                        {from.shortCode}
                      </td>
                      {locations.map((to) => {
                        const v = flowMatrix[from.id]?.[to.id] ?? 0;
                        const isSelf = from.id === to.id;
                        return (
                          <td
                            key={to.id}
                            className={cn(
                              "px-4 py-2.5 text-center tabular-nums",
                              isSelf && "text-muted-foreground/30",
                              !isSelf && v > 0 && "font-bold",
                            )}
                          >
                            {isSelf ? "—" : v}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2.5 text-right tabular-nums font-bold">
                        {totalOut}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t bg-muted/20">
                  <td className="px-4 py-2.5 text-left font-semibold">
                    Total In
                  </td>
                  {locations.map((to) => {
                    const totalIn = locations.reduce(
                      (sum, from) => sum + (flowMatrix[from.id]?.[to.id] ?? 0),
                      0,
                    );
                    return (
                      <td
                        key={to.id}
                        className="px-4 py-2.5 text-center font-bold tabular-nums"
                      >
                        {totalIn}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5 text-right" />
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detailed log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detailed transfer log</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">Date</th>
                  <th className="px-4 py-2 font-semibold">Booking</th>
                  <th className="px-4 py-2 font-semibold">From → To</th>
                  <th className="px-4 py-2 font-semibold">Reason</th>
                  <th className="px-4 py-2 font-semibold">Authorized by</th>
                  <th className="px-4 py-2 text-right font-semibold">
                    Revenue Δ
                  </th>
                  <th className="px-4 py-2 text-center font-semibold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transfers.map((t) => {
                  const from = locations.find((l) => l.id === t.fromLocationId);
                  const to = locations.find((l) => l.id === t.toLocationId);
                  const meta = STATUS_META[t.status];
                  const StatusIcon = meta.icon;
                  return (
                    <tr key={t.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs">
                        {new Date(t.initiatedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        <p className="text-muted-foreground text-[10px]">
                          {new Date(t.initiatedAt).toLocaleTimeString(
                            undefined,
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">
                        #{t.bookingId}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: from?.color }}
                          >
                            {from?.shortCode}
                          </span>
                          <ArrowLeftRight className="text-muted-foreground size-3" />
                          <span
                            className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: to?.color }}
                          >
                            {to?.shortCode}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[280px]">
                        {t.reason ?? <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs">{t.initiatedBy}</td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right text-xs tabular-nums font-semibold",
                          t.priceDelta > 0 && "text-emerald-600",
                          t.priceDelta < 0 && "text-rose-600",
                        )}
                      >
                        {t.priceDelta === 0
                          ? "$0"
                          : `${t.priceDelta > 0 ? "+" : ""}$${t.priceDelta}`}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant="outline"
                          className={cn("gap-1 text-[10px]", meta.className)}
                        >
                          <StatusIcon className="size-3" />
                          {meta.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-emerald-600 bg-emerald-100",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-lg",
            accent,
          )}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
            {label}
          </p>
          <p className="text-xl font-bold tabular-nums">{value}</p>
          <p className="text-muted-foreground text-[10px]">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}
