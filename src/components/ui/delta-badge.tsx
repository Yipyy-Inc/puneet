import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeDelta, type Delta, type DeltaDirection } from "@/lib/format";

const TONE: Record<DeltaDirection, string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-red-600 dark:text-red-400",
  flat: "text-muted-foreground",
};

const ICON: Record<DeltaDirection, typeof ArrowUp> = {
  up: ArrowUp,
  down: ArrowDown,
  flat: Minus,
};

export interface DeltaBadgeProps {
  /** Pass a precomputed Delta, or `current`/`previous` to compute one. */
  delta?: Delta;
  current?: number;
  previous?: number;
  /** Optional trailing context, e.g. "vs. prev. period". */
  sublabel?: string;
  className?: string;
}

/**
 * Tokenized period-over-period indicator: ▲/▼ + signed percentage, green when
 * up, red when down, muted when flat/no-base. The single source of truth for
 * delta styling across KPI tiles and report headers.
 */
export function DeltaBadge({
  delta,
  current,
  previous,
  sublabel,
  className,
}: DeltaBadgeProps) {
  const d = delta ?? computeDelta(current ?? 0, previous ?? 0);
  const Icon = ICON[d.direction];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold tabular-nums",
        TONE[d.direction],
        className,
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      {d.label}
      {sublabel && (
        <span className="text-muted-foreground font-normal">{sublabel}</span>
      )}
    </span>
  );
}
