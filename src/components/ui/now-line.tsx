"use client";

import { cn } from "@/lib/utils";

// ============================================================================
// Now. docs/design-system/design-system.md §2b territory 4.
//
// "The current-time line across the board, today's column header, the 'now'
// marker on a staff schedule: a 2px orange rule with a 7px dot at its head.
// ONLY the present moment — a future booking is blue or a status, because it
// has not happened yet."
//
// That last sentence is the rule people get wrong. Orange here does not mean
// "important" or "soon"; it means the instant that is happening. A 3pm
// booking at 2:55 is not orange. At 3pm the LINE is orange as it passes.
//
// ── THE 2px RULE IS NOT AN EDGE ACCENT ────────────────────────────────────
//
// §6 rule 1 bans an accent line on any edge — border-left, border-bottom, on
// rows, cards, tiles, list items, calendar blocks or any selected state. This
// is none of those: it is a free-standing mark drawn ACROSS a surface at a
// position that means something, not a border on the edge of a container to
// signal that container's state. The mechanical test in rule 1 — "give it a
// radius or a background and the ban applies again" — is about a container
// wearing a stripe. This has no container.
//
// It is also why it is a `div` positioned absolutely rather than a
// `border-top` on the next row, which WOULD be the banned pattern.
// ============================================================================

interface NowLineProps {
  /**
   * Where the line sits in its container, as a CSS length or percentage —
   * the caller owns the time→position maths, because only it knows the
   * board's own scale.
   */
  offset: string;
  /** `horizontal` for a day column, `vertical` for a timeline running across. */
  orientation?: "horizontal" | "vertical";
  /**
   * The time, for anyone who cannot see the line. It is never the only
   * channel — the board's own axis already says what time it is.
   */
  label?: string;
  className?: string;
}

export function NowLine({
  offset,
  orientation = "horizontal",
  label,
  className,
}: NowLineProps) {
  const horizontal = orientation === "horizontal";

  return (
    <div
      data-slot="now-line"
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-10",
        horizontal ? "right-0 left-0 h-0.5" : "top-0 bottom-0 w-0.5",
        "bg-brand-orange",
        className,
      )}
      style={horizontal ? { top: offset } : { left: offset }}
    >
      {/* The 7px dot at the head. Centred on the rule so the line appears to
          run through it rather than stop at it. */}
      <span
        className={cn(
          "bg-brand-orange absolute block size-[7px] rounded-full",
          horizontal
            ? "top-1/2 left-0 -translate-y-1/2"
            : "top-0 left-1/2 -translate-x-1/2",
        )}
      />
      {label && <span className="sr-only">Now: {label}</span>}
    </div>
  );
}
