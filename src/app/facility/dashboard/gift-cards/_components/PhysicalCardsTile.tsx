"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhysicalCardsTileProps {
  /** Blank/unsold physical cards still in stock. */
  available: number;
  /** Total physical cards across all batches. */
  total: number;
  /** Amber low-stock warning triggers when `available` falls below this. */
  threshold: number;
}

export function PhysicalCardsTile({
  available,
  total,
  threshold,
}: PhysicalCardsTileProps) {
  const lowStock = available < threshold;
  const pct =
    total > 0 ? Math.min(100, Math.round((available / total) * 100)) : 0;

  return (
    <Card
      className={cn(
        "relative shadow-sm",
        lowStock
          ? "border border-amber-400 dark:border-amber-500/70"
          : "border-none",
      )}
    >
      {/* Status badge — low-stock warning takes priority over the snapshot marker */}
      {lowStock ? (
        <span className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-amber-700 uppercase dark:bg-amber-900/50 dark:text-amber-300">
          <AlertTriangle className="size-3" />
          Low Stock
        </span>
      ) : (
        <span
          className="text-muted-foreground/80 absolute top-2 right-2 z-10 rounded-full bg-white/70 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase dark:bg-black/30"
          title="Point-in-time stock count — not affected by the date range"
        >
          Current
        </span>
      )}

      <CardContent
        className={cn(
          "flex items-center gap-3 rounded-xl p-4",
          lowStock
            ? "bg-amber-50 dark:bg-amber-950/20"
            : "bg-slate-50 dark:bg-slate-900/40",
        )}
      >
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/70 dark:bg-black/20",
            lowStock ? "text-amber-600" : "text-slate-600 dark:text-slate-300",
          )}
        >
          <Package className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs font-medium">
            Physical Cards Available
          </p>
          <p className="leading-tight">
            <span
              className={cn(
                "text-xl font-bold tabular-nums",
                lowStock
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-foreground",
              )}
            >
              {available}
            </span>
            <span className="text-muted-foreground text-sm font-medium tabular-nums">
              {" "}
              / {total}
            </span>
          </p>
          {/* Stock gauge */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  lowStock ? "bg-amber-500" : "bg-emerald-500",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-muted-foreground shrink-0 text-[10px] font-medium tabular-nums">
              {pct}%
            </span>
          </div>
          {lowStock && (
            <p className="mt-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
              Below {threshold} — reorder soon
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
