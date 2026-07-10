"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

type DeltaDirection = "up" | "down" | "flat";

interface HqKpiTileProps {
  /** The metric label / period, e.g. "Revenue · This month". */
  label: string;
  /** The headline value — format numbers before passing (e.g. "$1.2M", 87). */
  value: string | number;
  /** Optional unit suffix, e.g. "%", "hrs", "pts". */
  unit?: string;
  /** Trend value. A number renders as a signed percentage ("+2.3%"); a string
   *  renders verbatim. */
  delta?: number | string;
  /** Trend direction — drives the colour + arrow. Inferred from a numeric
   *  delta's sign when omitted. */
  deltaDirection?: DeltaDirection;
  /** Secondary line beneath the value, e.g. "vs. last month". */
  sublabel?: string;
  onClick?: () => void;
}

function resolveDirection(
  delta: number | string | undefined,
  explicit: DeltaDirection | undefined,
): DeltaDirection {
  if (explicit) return explicit;
  if (typeof delta === "number") {
    if (delta > 0) return "up";
    if (delta < 0) return "down";
  }
  return "flat";
}

function formatDelta(delta: number | string): string {
  if (typeof delta === "string") return delta;
  return `${delta > 0 ? "+" : ""}${delta}%`;
}

/**
 * Standard HQ KPI tile. The value renders at 36–48px bold in the primary navy
 * (never below 24px); the label/period sits in ~13px slate; the trend indicator
 * is ~14px green (up) or red (down). Red here is a trend/alert signal, not a
 * location colour. Shared across the HQ pages (Command Center, Performance,
 * Staff Pool, Transfer Center, Clients HQ, Training HQ).
 */
export function HqKpiTile({
  label,
  value,
  unit,
  delta,
  deltaDirection,
  sublabel,
  onClick,
}: HqKpiTileProps) {
  const direction = resolveDirection(delta, deltaDirection);

  const content = (
    <>
      <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        {/* Value — 36px→48px, bold, primary navy. Floor is well above 24px. */}
        <span className="text-4xl font-bold tracking-tight text-[#1b2a4a] tabular-nums sm:text-5xl dark:text-[#93a7d0]">
          {value}
          {unit && (
            <span className="ml-0.5 text-2xl font-semibold text-[#1b2a4a]/70 dark:text-[#93a7d0]/70">
              {unit}
            </span>
          )}
        </span>
        {delta !== undefined && delta !== "" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-sm font-semibold",
              direction === "up" && "text-emerald-600 dark:text-emerald-400",
              direction === "down" && "text-red-600 dark:text-red-400",
              direction === "flat" && "text-muted-foreground",
            )}
          >
            {direction === "up" && <ArrowUp className="size-3.5" />}
            {direction === "down" && <ArrowDown className="size-3.5" />}
            {formatDelta(delta)}
          </span>
        )}
      </div>
      {sublabel && (
        <p className="text-muted-foreground mt-1 text-xs">{sublabel}</p>
      )}
    </>
  );

  const base = "bg-card w-full rounded-xl border p-4 text-left";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          base,
          "hover:bg-muted/40 focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none",
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={base}>{content}</div>;
}
