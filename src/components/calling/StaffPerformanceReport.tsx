"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Star,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeStaffPerformance,
  formatMinSec,
  type StaffPerfRow,
} from "@/lib/calling/call-metrics";
import type { CallLog } from "@/types/communications";
import type { AICallSummary } from "@/types/calling";

type SortKey =
  | "name"
  | "callsHandled"
  | "avgSentiment"
  | "avgQa"
  | "followUpRate"
  | "avgDuration";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "name", label: "Staff Member", numeric: false },
  { key: "callsHandled", label: "Calls Handled", numeric: true },
  { key: "avgSentiment", label: "Avg AI Sentiment", numeric: true },
  { key: "avgQa", label: "Avg QA Rating", numeric: true },
  { key: "followUpRate", label: "Follow-up Completion", numeric: true },
  { key: "avgDuration", label: "Avg Call Duration", numeric: true },
];

// Nulls always sort to the bottom regardless of direction.
function compareRows(a: StaffPerfRow, b: StaffPerfRow, key: SortKey, dir: 1 | -1): number {
  if (key === "name") return a.name.localeCompare(b.name) * dir;
  const av = a[key] as number | null;
  const bv = b[key] as number | null;
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  return (av - bv) * dir;
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function StaffPerformanceReport({
  logs,
  summaries,
  periodLabel,
}: {
  logs: CallLog[];
  summaries: AICallSummary[];
  periodLabel: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("callsHandled");
  const [dir, setDir] = useState<1 | -1>(-1); // most calls first

  const rows = useMemo(() => {
    const data = computeStaffPerformance(logs, summaries);
    return [...data].sort((a, b) => compareRows(a, b, sortKey, dir));
  }, [logs, summaries, sortKey, dir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setDir(key === "name" ? 1 : -1); // names A→Z, metrics high→low by default
    }
  };

  const exportCsv = () => {
    const header = [
      "Staff Member",
      "Calls Handled",
      "Avg AI Sentiment (/10)",
      "Avg QA Rating (/5)",
      "Follow-up Completion %",
      "Avg Call Duration",
    ];
    const lines = rows.map((r) =>
      [
        r.name,
        r.callsHandled,
        r.avgSentiment === null ? "" : r.avgSentiment.toFixed(1),
        r.avgQa === null ? "" : r.avgQa.toFixed(1),
        r.followUpRate === null ? "" : `${Math.round(r.followUpRate)}%`,
        r.avgDuration === null ? "" : formatMinSec(r.avgDuration),
      ]
        .map(csvCell)
        .join(","),
    );
    const csv = [header.map(csvCell).join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `staff-phone-performance-${periodLabel.toLowerCase().replace(/\s+/g, "-")}.csv`;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-teal-600" />
              Staff Phone Performance
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Per-staff breakdown for the selected period & location · manager
              view. Click a column to sort.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={exportCsv}
            disabled={rows.length === 0}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No handled calls in this period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  {COLUMNS.map((col) => {
                    const active = sortKey === col.key;
                    return (
                      <th
                        key={col.key}
                        className={cn("pb-2 font-medium", col.numeric ? "text-right" : "text-left")}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className={cn(
                            "inline-flex items-center gap-1 hover:text-foreground",
                            col.numeric && "flex-row-reverse",
                            active && "text-foreground",
                          )}
                        >
                          {col.label}
                          {active ? (
                            dir === 1 ? (
                              <ChevronUp className="size-3.5" />
                            ) : (
                              <ChevronDown className="size-3.5" />
                            )
                          ) : (
                            <ChevronsUpDown className="size-3.5 opacity-40" />
                          )}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => {
                  const isAi = r.name.toLowerCase().includes("ai");
                  return (
                    <tr key={r.name}>
                      <td className="py-2.5 font-medium">
                        <span className="flex items-center gap-1.5">
                          {isAi && <Bot className="size-3.5 text-violet-500" />}
                          {r.name}
                        </span>
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{r.callsHandled}</td>
                      <td className="py-2.5 text-right">
                        {r.avgSentiment === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span
                            className={cn(
                              "font-semibold tabular-nums",
                              r.avgSentiment >= 7
                                ? "text-green-600"
                                : r.avgSentiment >= 5
                                  ? "text-amber-600"
                                  : "text-red-600",
                            )}
                          >
                            {r.avgSentiment.toFixed(1)}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        {r.avgQa === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 font-semibold tabular-nums text-amber-600">
                            <Star className="size-3 fill-amber-400" />
                            {r.avgQa.toFixed(1)}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        {r.followUpRate === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <Badge
                            variant={r.followUpRate >= 80 ? "default" : "secondary"}
                            className="tabular-nums"
                            title={`${r.followUpResolved} of ${r.followUpTotal} resolved`}
                          >
                            {Math.round(r.followUpRate)}%
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                        {r.avgDuration === null ? "—" : formatMinSec(r.avgDuration)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
