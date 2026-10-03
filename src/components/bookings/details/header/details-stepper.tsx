"use client";

import { cn } from "@/lib/utils";

// ============================================================================
// The booking's path, as the mock draws it: numbered 24px dots, a blue tick
// for each step passed, the step it is at ringed in blue, the rest grey, and
// a short rule between each that turns blue once passed. An ordered list, so
// a screen reader hears the steps in order and which one is current.
// ============================================================================

export function DetailsStepper({
  labels,
  index,
  ariaLabel,
}: {
  labels: string[];
  /** The step the booking is AT; -1 before the first. */
  index: number;
  ariaLabel: string;
}) {
  return (
    <ol aria-label={ariaLabel} className="flex flex-wrap items-center">
      {labels.map((label, i) => {
        const past = i < index;
        const current = i === index;
        return (
          <li
            key={label}
            aria-current={current ? "step" : undefined}
            className="flex items-center gap-2"
          >
            <span
              aria-hidden
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-bold",
                past && "bg-primary text-white",
                current &&
                  "bg-acc-soft text-primary border-primary border-[1.5px]",
                !past && !current && "bg-surface-inset-2 text-ink-disabled",
              )}
            >
              {past ? "✓" : i + 1}
            </span>
            <span
              className={cn(
                "text-[13px] whitespace-nowrap",
                current ? "text-body-ink font-semibold" : "font-medium",
                past && "text-body-ink",
                !past && !current && "text-ink-disabled",
              )}
            >
              {label}
            </span>
            {i < labels.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "mx-2.5 h-0.5 w-10",
                  past ? "bg-primary" : "bg-line",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
