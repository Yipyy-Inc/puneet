"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tags, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallTags } from "@/hooks/use-call-tags";
import { countTagFrequency, tagColorClasses } from "@/lib/calling/call-tags";
import type { CallLog } from "@/types/communications";

// A notable increase worth a manager's attention.
function isSpike(count: number, prev: number): boolean {
  return prev === 0 ? count >= 3 : count - prev >= 3 || count >= prev * 2;
}

export function TagFrequencyChart({
  logs,
  previousLogs,
  comparisonLabel,
}: {
  logs: CallLog[];
  previousLogs: CallLog[];
  comparisonLabel: string;
}) {
  const { tags } = useCallTags();
  const counts = useMemo(() => countTagFrequency(logs), [logs]);
  const prevCounts = useMemo(
    () => countTagFrequency(previousLogs),
    [previousLogs],
  );
  const showCompare = comparisonLabel !== "" && previousLogs.length > 0;

  const present = tags
    .map((t) => ({
      tag: t,
      count: counts[t.id] ?? 0,
      prev: prevCounts[t.id] ?? 0,
    }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  const max = present[0]?.count ?? 1;
  const spikes = showCompare
    ? present.filter((x) => isSpike(x.count, x.prev))
    : [];
  const topSpike = spikes.sort((a, b) => b.count - b.prev - (a.count - a.prev))[0];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Tags className="size-4 text-pink-600" />
          Call Tag Frequency
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          How often each category is tagged — a spike signals an issue to act on.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {topSpike && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50/70 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Spike detected:{" "}
              <strong>{topSpike.tag.name}</strong> is up to {topSpike.count} this
              period (from {topSpike.prev} {comparisonLabel}). Worth a look.
            </span>
          </div>
        )}

        {present.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No tagged calls in this period.
          </p>
        ) : (
          present.map(({ tag, count, prev }) => {
            const c = tagColorClasses(tag.color);
            const delta = count - prev;
            const spike = showCompare && isSpike(count, prev);
            return (
              <div key={tag.id}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 truncate font-medium">
                    {tag.name}
                    {spike && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        <AlertTriangle className="size-2.5" />
                        spike
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold tabular-nums">{count}</span>
                    {showCompare && (
                      <span
                        className="flex w-20 items-center justify-end gap-0.5 text-xs tabular-nums text-muted-foreground"
                        title={`${count} this period vs ${prev} ${comparisonLabel}`}
                      >
                        {delta > 0 ? (
                          <TrendingUp className="size-3" />
                        ) : delta < 0 ? (
                          <TrendingDown className="size-3" />
                        ) : null}
                        {delta > 0 ? "+" : ""}
                        {delta} vs {prev}
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-2 rounded-full transition-all", c.solid)}
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
