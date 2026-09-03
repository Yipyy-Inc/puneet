"use client";

import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A control inside the bulk-selection bar. docs/design-system/design-system.md
 * §5b pattern 04.
 *
 * It cannot be `<Button variant="outline">`: that is white with body ink and
 * a lift, and the bar it sits on is solid `--primary`. The reference draws
 * these as 32px pills, transparent, with a `rgba(255,255,255,.5)` hairline
 * and white 13/600 — the only place in the system where a control is defined
 * against a blue ground rather than white.
 *
 * 32px is below rule 7's 48px tap floor, so it steps to 48 under 1024px like
 * every other control in the system.
 */
export function BulkActionButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        `inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-white/50 bg-transparent px-3.5 text-[13px] font-semibold whitespace-nowrap text-white outline-none max-lg:h-12 max-lg:px-5`,
        `transition-[background-color] duration-180 ease-[ease] motion-reduce:transition-none`,
        `hover:bg-white/16 focus-visible:ring-2 focus-visible:ring-white`,
        // Rule 4 removes the obvious answer here: white at 60% on #1668E3
        // composites to well under 4.5:1, and opacity rewrites every ratio in
        // the subtree. So a disabled bulk action keeps its white label and
        // loses its hairline instead — legible, and plainly not a control.
        `disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-transparent`,
        className,
      )}
      {...props}
    />
  );
}
