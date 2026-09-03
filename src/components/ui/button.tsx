import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

// ============================================================================
// Button. docs/design-system/design-system.md §5 (controls), §4 (motion),
// §5s (the state matrix), §1 (size and shape).
//
// Every value is measured off the reference page's own rendered button row:
//
//   height 40 · padding 0 20 · radius 999 · 14.5/600 · icon buttons 40x40
//
//   primary      --primary fill, white, --sh-cta, lift on hover
//   outline      1px --line-strong on --card, body ink, --sh, lift on hover
//   subtle       --inset fill, --ink-secondary, no shadow, no lift
//   ghost        transparent, --ink-tertiary, no shadow, no lift
//   destructive  --bad fill, white, its own red shadow, lift on hover
//   disabled     --inset fill, --ink-disabled, no shadow, not-allowed
//
// ── THE DESTRUCTIVE FILL IS #B23B3B, AND THE SOURCES DISAGREED ────────────
//
// §5's prose says "destructive (`--error-dot` fill)", which is #D24545. The
// rendered page says `background: var(--bad)` — #B23B3B — and the page wins
// (CLAUDE.md: "Where the prose and the page disagree, the page is right").
// It is also the only one that can carry a label: white on #D24545 is 4.49:1
// and fails, white on #B23B3B is 5.86:1 and passes. The dot-weight colour
// survives where it is legal — in the SHADOW, which is not text.
//
// ── SIZE: THE SYSTEM HAS ONE CONTROL HEIGHT ───────────────────────────────
//
// §1: "Controls are 40px, with exactly one 48px prominent control per screen
// — and 48px for everything below 1024px." There is no small button in this
// design system; the reference page's own note reads "Control height 40px ·
// Buttons, inputs, search, filter pills, icon buttons", with one 38px
// exception for calendar nav.
//
// 1,698 call sites in this repo pass `size="sm"`, so the key is KEPT and
// resolves to the same 40px as `default`. That is a compatibility shim, not a
// second size — see the comment on it below.
// ============================================================================

const buttonVariants = cva(
  `
    inline-flex shrink-0 items-center justify-center gap-2 rounded-full
    text-[14.5px] font-semibold whitespace-nowrap outline-none
    disabled:pointer-events-none disabled:cursor-not-allowed
    [&_svg]:pointer-events-none [&_svg]:shrink-0
    [&_svg:not([class*='size-'])]:size-5

    [&:disabled:not([data-loading])]:bg-surface-inset
    [&:disabled:not([data-loading])]:text-ink-disabled
    [&:disabled:not([data-loading])]:shadow-none

    data-loading:[&_svg:not([data-spinner])]:hidden
  `,
  {
    variants: {
      variant: {
        // §4's lift lives in one class, and only that class declares a
        // transition — hard rule 3. `yy-cta` also carries the reduced-motion
        // guard and the specificity needed to beat a utility.
        default: `
          yy-cta bg-primary text-primary-foreground
          hover:bg-primary-hover
        `,
        destructive: `
          yy-cta-bad bg-bad text-white
          hover:bg-bad
        `,
        outline: `
          border-line-strong bg-card text-body-ink shadow-card border
          transition-[transform,background-color] duration-180 ease-[ease]
          hover:-translate-y-0.5 hover:bg-surface-inset
          active:translate-y-0
          motion-reduce:transition-none motion-reduce:hover:translate-y-0
        `,
        // shadcn's `secondary` is §5's `subtle`: an --inset fill that does not
        // lift, because it is not a call to action.
        secondary: `
          bg-surface-inset text-ink-secondary
          transition-[background-color] duration-180 ease-[ease]
          hover:bg-surface-inset-2
        `,
        ghost: `
          text-ink-tertiary bg-transparent
          transition-[background-color] duration-180 ease-[ease]
          hover:bg-surface-inset
        `,
        link: `
          text-primary underline-offset-4
          hover:underline
        `,
      },
      size: {
        // 40px, and 48px below 1024px — §1, and rule 7's standing-staff tap
        // target. `max-lg:` is Tailwind's own <1024px, which is the exact
        // breakpoint §1 names.
        default: `
          h-10 px-5
          max-lg:h-12 max-lg:px-6
        `,
        /**
         * NOT a second size. §1 has one control height, and this key exists
         * only so the 1,698 existing `size="sm"` call sites keep compiling
         * while they are migrated off it. Identical to `default` on purpose —
         * if it rendered smaller it would be reintroducing the 32px control
         * the redesign removes.
         */
        sm: `
          h-10 px-5
          max-lg:h-12 max-lg:px-6
        `,
        /** The one 48px prominent control per screen (§1). */
        prominent: "h-12 px-6",
        /** Kept as the alias `prominent` supersedes; same 48px. */
        lg: "h-12 px-6",
        icon: `
          size-10
          max-lg:size-12
        `,
        "icon-sm": `
          size-10
          max-lg:size-12
        `,
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /**
   * §5s makes Loading a REQUIRED cell for Button, and hard rule 9 says why:
   * "A button with no loading state double-submits."
   *
   * The recipe is exact — "Label stays put, a spinner replaces the leading
   * glyph, width locked", never "swapping the label to Loading…, which shifts
   * layout and throws away the verb". So the label is untouched, and the
   * spinner takes the leading glyph's place literally: the caller's own icons
   * are hidden by the base cva while `data-loading` is set, and the spinner
   * renders in the same slot at the same 20px. A button that already had a
   * leading glyph therefore does not move by a pixel.
   *
   * The honest limit: a button with NO leading glyph grows by the spinner
   * plus its gap, because there is nothing to replace. §5r wants a verb and
   * its object with a glyph on a CTA, so that is the uncommon case.
   *
   * A loading button is disabled — that is the point, hard rule 9 — but it
   * must NOT look disabled, which is a different cell of §5s. The base cva
   * scopes the disabled fill and ink to `:not([data-loading])` for exactly
   * that reason.
   *
   * Ignored when `asChild` is set: the child owns its own content there, and
   * there is no leading slot to replace.
   */
  loading?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const isLoading = loading && !asChild;

  return (
    <Comp
      data-slot="button"
      data-loading={isLoading ? "" : undefined}
      // A loading button is not clickable, and it says so to assistive tech
      // rather than only looking busy.
      aria-busy={isLoading || undefined}
      disabled={isLoading || disabled}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {/* ── WHY THIS IS A TERNARY AND NOT `{spinner}{children}` ─────────────
          Radix's Slot calls React.Children.only, so an `asChild` button must
          receive EXACTLY ONE child. Rendering the spinner slot and the
          children as siblings makes an array of two even when the spinner is
          `null`, and every `asChild` Button in the app — 591 outline links
          among them — throws "React.Children.only expected to receive a
          single React element child" at render. Typecheck cannot see it;
          only running the app can. `isLoading` is already false whenever
          `asChild` is set, so this branch hands Slot the bare children. */}
      {isLoading ? (
        <>
          <LoaderCircle
            aria-hidden
            data-spinner
            className="animate-spin motion-reduce:animate-none"
          />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
