"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        `peer border-input hover:not-disabled:border-ink-disabled focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary disabled:bg-surface-inset disabled:data-[state=checked]:border-ink-disabled disabled:data-[state=checked]:bg-ink-disabled size-4 shrink-0 rounded-lg border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed`,
        // ── §6 RULE 7, MEASURED AT 599px ─────────────────────────────────
        //
        // The box is 16px, and 20px where a caller sizes it up — so every
        // checkbox in the product was a 16-to-20px target on a phone, this
        // one included on ~88 DataTable screens where it selects the row.
        // Rule 7: "48px tap targets on phone and tablet. 44 is the seated
        // floor, not ours — floor staff are standing and holding an animal."
        //
        // The BOX stays small: a 48px square would be a different control.
        //
        // The hit area is sized explicitly rather than inset from the box. An
        // inset is measured from the padding box, so the 1px border here — and
        // `border-2` on Switch — silently subtracts from it: `-inset-4` on the
        // switch computed to 44px, exactly the seated floor rule 7 rejects.
        // It also makes the two checkbox sizes in use (16px, and 20px where a
        // caller sizes it up) land on one number instead of two.
        `relative max-lg:before:absolute max-lg:before:top-1/2 max-lg:before:left-1/2 max-lg:before:size-12 max-lg:before:-translate-x-1/2 max-lg:before:-translate-y-1/2 max-lg:before:content-['']`,
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
