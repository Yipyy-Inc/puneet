"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeOutcomeBreakdown,
  OUTCOME_KEYS,
  type OutcomeKey,
} from "@/lib/calling/call-metrics";
import type { CallLog } from "@/types/communications";

const OUTCOME_META: Record<OutcomeKey, { label: string; color: string }> = {
  booking_created: { label: "Booking Created", color: "#10b981" }, // emerald
  estimate_sent: { label: "Estimate Sent", color: "#0ea5e9" }, // sky
  info_provided: { label: "Info Provided", color: "#6366f1" }, // indigo
  no_answer: { label: "No Answer", color: "#ef4444" }, // red
  voicemail_left: { label: "Left Voicemail", color: "#f59e0b" }, // amber
  referred: { label: "Referred", color: "#a855f7" }, // purple
  complaint_logged: { label: "Complaint Logged", color: "#f43f5e" }, // rose
  other: { label: "Other", color: "#94a3b8" }, // slate
};

// Donut geometry.
const R = 54;
const CENTER = 70;
const STROKE = 16;
const CIRC = 2 * Math.PI * R;

const pct = (n: number, total: number) => (total ? (n / total) * 100 : 0);

export function OutcomeBreakdown({
  logs,
  previousLogs,
  comparisonLabel,
}: {
  logs: CallLog[];
  previousLogs: CallLog[];
  /** "" → no period-over-period comparison (e.g. All time). */
  comparisonLabel: string;
}) {
  const counts = useMemo(() => computeOutcomeBreakdown(logs), [logs]);
  const prevCounts = useMemo(
    () => computeOutcomeBreakdown(previousLogs),
    [previousLogs],
  );
  const total = logs.length;
  const prevTotal = previousLogs.length;
  const showCompare = comparisonLabel !== "" && prevTotal > 0;

  // Outcomes present this period, largest slice first.
  const present = OUTCOME_KEYS.filter((k) => counts[k] > 0).sort(
    (a, b) => counts[b] - counts[a],
  );

  // Donut segments — offset is the running fraction of all earlier slices.
  // (n ≤ 8, so the per-item prefix sum is trivially cheap and keeps the
  // computation free of a mutable accumulator.)
  const segments = present.map((k, i) => ({
    k,
    frac: counts[k] / total,
    offset: present.slice(0, i).reduce((s, kk) => s + counts[kk] / total, 0),
  }));

  const bookingPct = pct(counts.booking_created, total);
  const prevBookingPct = pct(prevCounts.booking_created, prevTotal);
  const bookingDelta = bookingPct - prevBookingPct;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChart className="size-4 text-indigo-600" />
          Call Outcome Breakdown
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Where every call landed — phone inquiry to booking conversion.
          {showCompare && (
            <>
              {" "}
              Booking conversion{" "}
              <span className="font-semibold text-foreground">
                {Math.round(bookingPct)}%
              </span>{" "}
              vs{" "}
              <span className="font-medium">{Math.round(prevBookingPct)}%</span>{" "}
              {comparisonLabel}
              <span
                className={cn(
                  "ml-1 inline-flex items-center gap-0.5 font-semibold",
                  bookingDelta > 0
                    ? "text-emerald-600"
                    : bookingDelta < 0
                      ? "text-red-600"
                      : "text-muted-foreground",
                )}
              >
                {bookingDelta > 0 ? (
                  <TrendingUp className="size-3" />
                ) : bookingDelta < 0 ? (
                  <TrendingDown className="size-3" />
                ) : null}
                {bookingDelta > 0 ? "+" : ""}
                {Math.round(bookingDelta)}pp
              </span>
            </>
          )}
        </p>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No calls in this period.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            {/* Donut */}
            <div className="relative size-[150px] shrink-0">
              <svg viewBox="0 0 140 140" className="size-full -rotate-90">
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={R}
                  fill="none"
                  className="stroke-muted"
                  strokeWidth={STROKE}
                />
                {segments.map((s) => (
                  <circle
                    key={s.k}
                    cx={CENTER}
                    cy={CENTER}
                    r={R}
                    fill="none"
                    stroke={OUTCOME_META[s.k].color}
                    strokeWidth={STROKE}
                    strokeDasharray={`${s.frac * CIRC} ${CIRC}`}
                    strokeDashoffset={-s.offset * CIRC}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold tabular-nums text-emerald-600">
                  {Math.round(bookingPct)}%
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  to booking
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="w-full flex-1 space-y-1.5">
              {present.map((k) => {
                const c = counts[k];
                const p = pct(c, total);
                const prevP = pct(prevCounts[k], prevTotal);
                const delta = p - prevP;
                return (
                  <div key={k} className="flex items-center gap-2 text-sm">
                    <span
                      className="size-3 shrink-0 rounded-sm"
                      style={{ backgroundColor: OUTCOME_META[k].color }}
                    />
                    <span className="flex-1 truncate">{OUTCOME_META[k].label}</span>
                    <span className="w-7 text-right font-semibold tabular-nums">
                      {c}
                    </span>
                    <span className="w-10 text-right tabular-nums text-muted-foreground">
                      {Math.round(p)}%
                    </span>
                    {showCompare && (
                      <span
                        className="flex w-24 items-center justify-end gap-0.5 text-right text-xs tabular-nums text-muted-foreground"
                        title={`${Math.round(p)}% this period vs ${Math.round(prevP)}% ${comparisonLabel}`}
                      >
                        {delta > 0 ? "▲" : delta < 0 ? "▼" : "–"}
                        {delta !== 0 ? `${Math.abs(Math.round(delta))}pp` : ""}
                        <span className="text-muted-foreground/70">
                          vs {Math.round(prevP)}%
                        </span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
