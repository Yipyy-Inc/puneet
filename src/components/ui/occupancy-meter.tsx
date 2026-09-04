"use client";

import { cn } from "@/lib/utils";

// ============================================================================
// Capacity. docs/design-system/design-system.md §2b territory 3.
//
// "The occupancy meter, the capacity bar on a day cell, '3 spots left', the
// boarding run counter. Solid orange fill on an --inset track, figure in body
// ink beside it. At capacity it does NOT turn red — full is not an error. It
// stays orange and the number tells the story."
//
// ── "FULL IS NOT AN ERROR" IS THE WHOLE POINT ─────────────────────────────
//
// The reflex is to turn a full bar red, and it is wrong here in a way that
// costs money: a boarding facility at 100% has had its best possible night.
// Red says "something has gone wrong and you should act", and there is
// nothing to act on. The status inks own what the record IS; orange owns how
// full the building is, and a full building is still just how full it is.
//
// So there is exactly one fill colour at every value, and the FIGURE carries
// the difference — "18 / 18" and "3 spots left" are the sentence, not the
// hue. That is also why this component refuses to take a tone prop.
//
// ── OVER CAPACITY IS THE ONE PLACE A SECOND COLOUR IS RIGHT ───────────────
//
// 19 of 18 is not a full building, it is a booking that should not exist —
// a record in a state somebody has to fix. That is a status, so it belongs to
// a status ink and takes `--bad` plus the error glyph the caller supplies in
// its label. §2b's rule survives intact: orange still never means a problem.
// ============================================================================

interface OccupancyMeterProps {
  /** How many are in. */
  used: number;
  /** How many there are. Zero renders an empty track and no figure. */
  capacity: number;
  /**
   * The sentence beside the bar — "3 spots left", "18 of 18 runs". The
   * component never writes it: §5r wants the product's own words, and "3
   * spots left" and "Full" are decisions about tone, not about capacity.
   */
  label?: React.ReactNode;
  /** A caption under the bar — the room's name, the service. */
  sublabel?: React.ReactNode;
  className?: string;
}

export function OccupancyMeter({
  used,
  capacity,
  label,
  sublabel,
  className,
}: OccupancyMeterProps) {
  const over = capacity > 0 && used > capacity;
  const pct =
    capacity > 0 ? Math.min(100, Math.round((used / capacity) * 100)) : 0;

  return (
    <div data-slot="occupancy-meter" className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body-ink text-[15px] font-semibold tabular-nums">
          {used}
          <span className="text-ink-tertiary"> / {capacity}</span>
        </span>
        {label && (
          <span
            className={cn(
              "text-[13px] tabular-nums",
              // The only branch, and it is a STATUS one — see the header.
              over ? "text-bad font-semibold" : "text-ink-secondary",
            )}
          >
            {label}
          </span>
        )}
      </div>

      <div
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-label={sublabel ? undefined : "Occupancy"}
        className="bg-surface-inset mt-1.5 h-1.5 w-full overflow-hidden rounded-full"
      >
        <div
          className={cn(
            "h-full rounded-full",
            // Rule 3: one transition declaration on this element.
            "transition-[width] duration-280 ease-[ease] motion-reduce:transition-none",
            over ? "bg-bad" : "bg-brand-orange",
          )}
          style={{ width: `${over ? 100 : pct}%` }}
        />
      </div>

      {sublabel && (
        <p className="text-ink-tertiary mt-1 truncate text-[13px]">
          {sublabel}
        </p>
      )}
    </div>
  );
}
