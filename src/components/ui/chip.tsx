import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// ============================================================================
// A small tinted label, as the client's mocks draw them ("Evaluated",
// "Needs evaluation", "Allergy: chicken", "Raised bed", "Daycare"): a pill of
// the colour's own wash with its ink on top, no border and no glyph — the word
// carries the meaning. Screens drawn from a client mock only (CLAUDE.md §
// "Client mocks decide the look"); everywhere else a status is still `Badge`
// with its glyph, which is why this is a primitive of its own rather than a
// Badge variant (check:badge-glyph keeps guarding Badge).
//
// Tones resolve through the look scope's variables, so the same chip is the
// booking mock's green in the wizard and the evaluation module's in its own.
// ============================================================================

const chipVariants = cva(
  "inline-flex w-fit max-w-full shrink-0 items-center gap-1 rounded-full font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-surface-inset-2 text-ink-secondary",
        success: "bg-wash-success text-success",
        warning: "bg-wash-warning text-warning",
        danger: "bg-wash-error text-bad",
        accent: "bg-acc-soft text-acc-soft-text",
        outline: "border-line text-ink-secondary border bg-transparent",
        "warning-outline":
          "text-warning border border-(--warning-line) bg-transparent",
        /** A request, "deposit due": the mocks' fixed blue, not the accent. */
        info: "bg-(--info-wash,var(--wash-primary)) text-(--info-ink,var(--info))",
        /** A service's kind on Confirm. */
        violet:
          "bg-(--violet-wash,var(--wash-violet)) text-(--violet-ink,var(--violet))",
      },
      size: {
        /** 2px 8px, 11.5px — a pet card's badges. */
        xs: "px-2 py-0.5 text-[11.5px]",
        /** 2px 9px, 12px — the client card's. */
        sm: "px-[9px] py-0.5 text-[12px]",
        /** 4px 10px, 12.5px — a search result's. */
        md: "px-2.5 py-1 text-[12.5px]",
      },
    },
    defaultVariants: { tone: "neutral", size: "xs" },
  },
);

export function Chip({
  className,
  tone,
  size,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof chipVariants>) {
  return (
    <span
      data-slot="chip"
      className={cn(chipVariants({ tone, size }), className)}
      {...props}
    />
  );
}
