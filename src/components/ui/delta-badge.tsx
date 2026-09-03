import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { computeDelta, type Delta, type DeltaDirection } from "@/lib/format";
import { cn } from "@/lib/utils";

// §3's status inks, not raw palette steps. `up` is success, `down` is the
// error ink at text weight (#B23B3B, 5.86:1) rather than the dot-weight
// #D24545 that rule 4 keeps off text, and `flat` is the neutral ink.
const TONE: Record<DeltaDirection, string> = {
  up: "text-success",
  down: "text-bad",
  flat: "text-ink-secondary",
};

// On a solid --primary tile the ink cannot be a status colour — none of them
// carry on #1668E3. §tiles' applied state puts everything in white, and the
// glyph plus the signed number still say the direction, so no meaning is lost
// (§3: colour is never the only channel).
const TONE_ON_SOLID = "text-white";

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
  /** Rendering on a solid --primary surface (§tiles' applied filter). */
  onSolid?: boolean;
  className?: string;
}

/**
 * Period-over-period indicator: an arrow glyph plus the signed percentage.
 * The single source of truth for delta styling across KPI tiles and report
 * headers. The glyph is mandatory and never decorative — it is what carries
 * the direction for a reader who cannot separate the green from the red.
 */
export function DeltaBadge({
  delta,
  current,
  previous,
  sublabel,
  onSolid = false,
  className,
}: DeltaBadgeProps) {
  const d = delta ?? computeDelta(current ?? 0, previous ?? 0);
  const Icon = ICON[d.direction];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[13px] font-semibold tabular-nums",
        onSolid ? TONE_ON_SOLID : TONE[d.direction],
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {d.label}
      {sublabel && (
        <span
          className={cn(
            "font-normal",
            onSolid ? "text-white/80" : "text-ink-secondary",
          )}
        >
          {sublabel}
        </span>
      )}
    </span>
  );
}
