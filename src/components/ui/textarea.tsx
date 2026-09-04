import * as React from "react";

import { cn } from "@/lib/utils";

// ============================================================================
// The multi-line field. docs/design-system/design-system.md §5c, §1, §6 rule 7.
//
// Same ink, hairline, focus and disabled treatment as `Input` — see the long
// note there, which explains the inset focus ring and why `min-h` replaced a
// fixed `h-9`.
//
// ── THE RADIUS IS 16px, AND THAT IS A JUDGEMENT WORTH FLAGGING ────────────
//
// §5 gives the INPUT a 999px pill, and the reference page has no textarea
// specimen at all — so there is no drawn answer for this control. A 999px
// radius on a 96px-tall box is not "the same shape at a different size", it
// is a lozenge, and the first and last lines of text would sit inside the
// curve.
//
// So this takes §1's radius scale on its own terms: 24px cards and modals,
// **16px medium containers**, 14px rows, 12px calendar blocks. A textarea is
// a medium container. That is applying the published scale rather than
// inventing a value — no new number enters the system — but it IS a choice
// the spec does not make explicitly, so it is written here to be corrected
// rather than discovered. If the client wants the pill, the token is
// `rounded-full` and nothing else changes.
//
// `min-h-20` (80px) is the resting size, not a cap: a textarea must grow, and
// §5c's "never a fixed height" applies here with more force than anywhere
// else in the form.
// ============================================================================

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        `border-line-strong bg-card text-body-ink placeholder:text-ink-tertiary selection:bg-primary selection:text-primary-foreground flex min-h-20 w-full min-w-0 rounded-xl border px-4 py-2.5 text-[14.5px] outline-none`,
        `transition-[color,border-color,box-shadow] duration-120 ease-[ease] motion-reduce:transition-none`,
        `focus-visible:border-primary focus-visible:shadow-[inset_0_0_0_2px_var(--primary),0_0_0_3px_rgba(22,104,227,0.12)]`,
        `aria-invalid:border-error-dot aria-invalid:focus-visible:shadow-[inset_0_0_0_2px_var(--error-dot),0_0_0_3px_rgba(210,69,69,0.12)]`,
        `disabled:bg-surface-inset disabled:text-ink-disabled disabled:pointer-events-none disabled:cursor-not-allowed`,
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
