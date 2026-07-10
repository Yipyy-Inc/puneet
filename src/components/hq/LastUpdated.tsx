"use client";

import { useEffect, useState } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LastUpdatedProps {
  /** Explicit data timestamp. When omitted, derived from the queryKeys' cache
   *  (freshest dataUpdatedAt), then the last manual refresh, then mount time. */
  updatedAt?: number | Date;
  /** TanStack Query keys to invalidate (re-fetch) when Refresh is pressed. */
  queryKeys?: QueryKey[];
  /** Extra work to run on refresh — awaited. Use it to flip a page-level
   *  loading flag so the data below shows a skeleton while re-fetching. */
  onRefresh?: () => void | Promise<void>;
  /** Minimum spinner duration so instant (mock) re-fetches still register. */
  minRefreshMs?: number;
  label?: string;
  className?: string;
}

function toMs(t: number | Date): number {
  return t instanceof Date ? t.getTime() : t;
}

function relativeTime(fromMs: number, nowMs: number): string {
  const secs = Math.max(0, Math.round((nowMs - fromMs) / 1000));
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * Header widget: "Last updated: {relative time} · Refresh". The Refresh button
 * invalidates the given TanStack Query keys (triggering a re-fetch) and runs
 * `onRefresh`; the parent shows a brief skeleton on the data below via its
 * query's `isFetching` (or a flag flipped in `onRefresh`). Used in the Command
 * Center and Staff Pool page headers.
 */
export function LastUpdated({
  updatedAt,
  queryKeys = [],
  onRefresh,
  minRefreshMs = 600,
  label = "Last updated",
  className,
}: LastUpdatedProps) {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  const [mountedAt] = useState(() => Date.now());
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Keep the relative label fresh without reading the clock during render.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Freshest timestamp: explicit prop → query cache → last manual refresh → mount.
  let effectiveTs = updatedAt !== undefined ? toMs(updatedAt) : undefined;
  if (effectiveTs === undefined) {
    for (const queryKey of queryKeys) {
      const cached = queryClient.getQueryCache().find({ queryKey });
      const t = cached?.state.dataUpdatedAt;
      if (t) effectiveTs = Math.max(effectiveTs ?? 0, t);
    }
  }
  const timestamp = effectiveTs ?? refreshedAt ?? mountedAt;

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    const startedAt = Date.now();
    try {
      await Promise.all(
        queryKeys.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
      await onRefresh?.();
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < minRefreshMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, minRefreshMs - elapsed),
        );
      }
      setRefreshedAt(Date.now());
      setRefreshing(false);
    }
  }

  return (
    <div
      className={cn(
        "text-muted-foreground flex items-center gap-1.5 text-xs",
        className,
      )}
    >
      <span aria-live="polite">
        {label}: {relativeTime(timestamp, now)}
      </span>
      <span aria-hidden="true">·</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRefresh}
        disabled={refreshing}
        className="h-6 gap-1 px-1.5 text-xs"
      >
        <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
        Refresh
      </Button>
    </div>
  );
}
