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
        /** The booking details mock's red chip: an allergy, "Required",
         *  "Unpaid" — its wash with a deeper red than the danger ink. */
        "bd-danger": "bg-wash-error text-(--bd-danger-ink,var(--bad))",
        /** What the chip labels decides its colours: `data-kind` on it (or
         *  above it) sets --chip-bg and --chip-ink — a journal entry's kind,
         *  a skill's state, a session's place. */
        kind: "bg-(--chip-bg,var(--inset-2)) text-(--chip-ink,var(--ink-secondary))",
        /** A service's own colour on its soft fill (`data-svc` above it). */
        svc: "bg-(--svc-soft,var(--inset-2)) text-(--svc,var(--ink-secondary))",
      },
      size: {
        /** 2px 8px, 11.5px — a pet card's badges. */
        xs: "px-2 py-0.5 text-[11.5px]",
        /** 2px 9px, 12px — the client card's. */
        sm: "px-[9px] py-0.5 text-[12px]",
        /** 4px 10px, 12.5px — a search result's. */
        md: "px-2.5 py-1 text-[12.5px]",
        /** The booking details mock's sizes. 2px 8px at 11px: a journal
         *  entry's kind. */
        "bd-kind": "px-2 py-0.5 text-[11px]",
        /** 3px 8px at 11px: "Required", a task's category. */
        "bd-tag": "px-2 py-[3px] text-[11px]",
        /** 4px 8px at 11px, spaced: a payment method's "DEFAULT". */
        "bd-default": "px-2 py-1 text-[11px] tracking-[.04em]",
        /** 2px 7px at 12px: a tab's count. */
        "bd-count": "px-[7px] py-0.5 text-[12px]",
        /** 3px 8px at 12px: a session's place. */
        "bd-session": "px-2 py-[3px] text-[12px]",
        /** 4px 10px at 12px: the pet's chips, the payment state. A long one
         *  ("Vaccines due: Rabies, DHPP…") wraps rather than spill past its
         *  card at phone width. */
        "bd-pet": "px-2.5 py-1 text-[12px] whitespace-normal",
        /** 4px 10px at 13px: the service, the status, a logged result. */
        "bd-13": "px-2.5 py-1 text-[13px]",
        /** 6px 10px at 13px: "2 of 3 logged". */
        "bd-progress": "px-2.5 py-1.5 text-[13px]",
        /** 6px 12px at 13px/500: the header's alerts — which wrap, as the
         *  pet's chips do: a vaccine gap names every vaccine. */
        "bd-alert": "px-3 py-1.5 text-[13px] font-medium whitespace-normal",
        /** 32px at 13px, room on the right for its ×: an applied promo
         *  code in the Take payment dialog. */
        "bd-promo": "h-8 gap-1.5 pr-1.5 pl-3 text-[13px]",
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
