import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  `
    inline-flex w-fit max-w-full shrink-0 items-center justify-center gap-0.5 md:gap-1 overflow-hidden
    rounded-full border px-1.5 py-0 md:px-2 md:py-0.5 text-[10px] md:text-xs font-medium whitespace-nowrap
    transition-[color,box-shadow]
    focus-visible:border-ring focus-visible:ring-[3px]
    focus-visible:ring-ring/50
    aria-invalid:border-destructive aria-invalid:ring-destructive/20
    dark:aria-invalid:ring-destructive/40
    [&>svg]:pointer-events-none [&>svg]:size-2.5 [&>svg]:md:size-3
  `,
  {
    variants: {
      variant: {
        default: `
            border-transparent bg-primary text-primary-foreground
            [a&]:hover:bg-primary/90
          `,
        secondary: `
            border-transparent bg-secondary text-secondary-foreground
            [a&]:hover:bg-secondary/90
          `,
        destructive: `
            border-transparent bg-destructive text-white
            focus-visible:ring-destructive/20
            dark:bg-destructive/60
            dark:focus-visible:ring-destructive/40
            [a&]:hover:bg-destructive/90
          `,
        success: `
            border-transparent bg-success text-success-foreground
            [a&]:hover:bg-success/90
          `,
        warning: `
            border-transparent bg-warning text-warning-foreground
            [a&]:hover:bg-warning/90
          `,
        info: `
          border-transparent bg-info text-info-foreground
          [a&]:hover:bg-info/90
        `,
        outline: `
            text-foreground
            [a&]:hover:bg-accent [a&]:hover:text-accent-foreground
          `,

        // ── §3 STATUS CHIPS — THE SIX, AND THE ONLY SHAPE A STATUS TAKES ──
        //
        // "Pattern is always: white background, a 1px hairline in the same ink
        // as the label, dark ink, full pill, 26px tall." Every one of the six
        // overrides the base cva's padding and type step, because the base is
        // shared with ~1,200 badges that are not statuses and stage 4 does not
        // resize those.
        //
        // The four SOLID variants above stay: §3 allows a status to be filled
        // solid with the ink at full strength where it must dominate, and
        // since stage 1 those fills are the real inks (5.35–6.50:1 under
        // white), not the dot-weight colours rule 4 bans.
        //
        // The glyph is not optional here — see StatusBadge, which supplies one
        // for every value. Colour is never the only channel.
        confirmed: `
            border-success bg-card text-success
            h-[26px] gap-1.5 px-2.5 text-[13px] leading-none font-semibold md:text-[13px]
            [&>svg]:size-4 [&>svg]:md:size-4
          `,
        checkedIn: `
            border-info bg-card text-info
            h-[26px] gap-1.5 px-2.5 text-[13px] leading-none font-semibold md:text-[13px]
            [&>svg]:size-4 [&>svg]:md:size-4
          `,
        inService: `
            border-violet bg-card text-violet
            h-[26px] gap-1.5 px-2.5 text-[13px] leading-none font-semibold md:text-[13px]
            [&>svg]:size-4 [&>svg]:md:size-4
          `,
        pending: `
            border-warning bg-card text-warning
            h-[26px] gap-1.5 px-2.5 text-[13px] leading-none font-semibold md:text-[13px]
            [&>svg]:size-4 [&>svg]:md:size-4
          `,
        overdue: `
            border-destructive bg-card text-destructive
            h-[26px] gap-1.5 px-2.5 text-[13px] leading-none font-semibold md:text-[13px]
            [&>svg]:size-4 [&>svg]:md:size-4
          `,
        cancelled: `
            border-ink-secondary bg-card text-ink-secondary
            h-[26px] gap-1.5 px-2.5 text-[13px] leading-none font-semibold md:text-[13px]
            [&>svg]:size-4 [&>svg]:md:size-4
          `,
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
