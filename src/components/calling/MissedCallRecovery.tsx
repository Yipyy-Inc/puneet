"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneForwarded, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeRecovery,
  computeWeeklyRecovery,
  type RecoveryWeek,
} from "@/lib/calling/call-metrics";
import type { CallLog } from "@/types/communications";

const TREND_WEEKS = 8;

// SVG plot geometry.
const W = 720;
const H = 168;
const PAD = { top: 22, right: 16, bottom: 26, left: 34 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

function rateColor(rate: number | null): string {
  if (rate === null) return "text-muted-foreground";
  if (rate >= 50) return "text-emerald-600";
  if (rate >= 25) return "text-amber-600";
  return "text-red-600";
}

function TrendChart({ weeks }: { weeks: RecoveryWeek[] }) {
  const n = weeks.length;
  const x = (i: number) => PAD.left + (n <= 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W);
  const y = (rate: number) => PAD.top + (1 - rate / 100) * PLOT_H;

  // Points that actually have data (weeks with missed calls).
  const pts = weeks
    .map((w, i) => (w.rate === null ? null : { i, cx: x(i), cy: y(w.rate), w }))
    .filter((p): p is { i: number; cx: number; cy: number; w: RecoveryWeek } => p !== null);

  const line = pts.map((p) => `${p.cx},${p.cy}`).join(" ");
  const area =
    pts.length > 1
      ? `${pts[0].cx},${PAD.top + PLOT_H} ${line} ${pts[pts.length - 1].cx},${PAD.top + PLOT_H}`
      : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" role="img" aria-label="Weekly recovery rate trend">
      <defs>
        <linearGradient id="recoveryArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y gridlines + labels at 0/25/50/75/100% */}
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(g)}
            y2={y(g)}
            className="stroke-border"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          <text x={PAD.left - 6} y={y(g) + 3} textAnchor="end" className="fill-muted-foreground text-[9px]">
            {g}%
          </text>
        </g>
      ))}

      {area && <polygon points={area} fill="url(#recoveryArea)" />}
      {pts.length > 1 && (
        <polyline
          points={line}
          fill="none"
          className="stroke-emerald-500"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {pts.map((p) => (
        <g key={p.i}>
          <circle cx={p.cx} cy={p.cy} r={3.5} className="fill-emerald-500" />
          <text
            x={p.cx}
            y={p.cy - 8}
            textAnchor="middle"
            className="fill-foreground text-[9px] font-semibold"
          >
            {Math.round(p.w.rate!)}%
          </text>
        </g>
      ))}

      {/* X axis week labels */}
      {weeks.map((w, i) => (
        <text
          key={w.weekStart}
          x={x(i)}
          y={H - 8}
          textAnchor="middle"
          className="fill-muted-foreground text-[9px]"
        >
          {w.label}
        </text>
      ))}
    </svg>
  );
}

export function MissedCallRecovery({
  periodLogs,
  trendLogs,
  periodLabel,
}: {
  /** Period + location filtered — drives the headline rate. */
  periodLogs: CallLog[];
  /** Location filtered only — drives the trailing weekly trend. */
  trendLogs: CallLog[];
  periodLabel: string;
}) {
  const stats = useMemo(() => computeRecovery(periodLogs), [periodLogs]);
  const weeks = useMemo(
    () => computeWeeklyRecovery(trendLogs, TREND_WEEKS, new Date()),
    [trendLogs],
  );

  // Direction: compare the first half of the weeks to the second half (robust
  // to the current in-progress week, whose follow-ups may not be done yet).
  const withData = weeks.filter((w) => w.rate !== null);
  const half = Math.max(1, Math.floor(withData.length / 2));
  const avgRate = (xs: RecoveryWeek[]) =>
    xs.reduce((s, w) => s + (w.rate ?? 0), 0) / xs.length;
  const direction =
    withData.length >= 2
      ? avgRate(withData.slice(withData.length - half)) - avgRate(withData.slice(0, half))
      : 0;
  const DirIcon = direction > 0 ? TrendingUp : direction < 0 ? TrendingDown : Minus;

  return (
    <Card className="border-2 border-emerald-500/30 bg-linear-to-br from-emerald-50/60 to-transparent dark:from-emerald-950/20">
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
              <PhoneForwarded className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">
                Missed Call Recovery Rate
              </p>
              <p className={cn("text-5xl/tight font-bold tabular-nums", rateColor(stats.rate))}>
                {stats.rate === null ? "—" : `${Math.round(stats.rate)}%`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{stats.recovered}</span> of{" "}
                <span className="font-semibold text-foreground">{stats.totalMissed}</span> missed
                calls called back &amp; converted to a booking · {periodLabel}
              </p>
            </div>
          </div>
          {withData.length >= 2 && (
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5",
                direction > 0
                  ? "border-emerald-300 text-emerald-700 dark:text-emerald-300"
                  : direction < 0
                    ? "border-red-300 text-red-700 dark:text-red-300"
                    : "text-muted-foreground",
              )}
            >
              <DirIcon className="size-3.5" />
              {direction > 0 ? "Improving" : direction < 0 ? "Declining" : "Flat"}
            </Badge>
          )}
        </div>

        <div className="mt-4 border-t pt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Weekly recovery trend · last {TREND_WEEKS} weeks
          </p>
          <TrendChart weeks={weeks} />
        </div>
      </CardContent>
    </Card>
  );
}
