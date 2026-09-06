"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        `peer focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary dark:data-[state=unchecked]:bg-input/30 inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent shadow-xs transition-colors outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50`,
        // ── §6 RULE 7, MEASURED AT 599px ─────────────────────────────────
        //
        // The track is 36×20, so every switch in the product was a 20px-tall
        // target on a phone — 41 of them on the notification settings screen
        // alone. Rule 7: "48px tap targets on phone and tablet. 44 is the
        // seated floor, not ours."
        //
        // The hit area is sized EXPLICITLY rather than inset from the track.
        // An inset is measured from the padding box, and this control has
        // `border-2`, so `-inset-y-3.5` on a 20px track computed to 44px —
        // exactly the seated floor rule 7 rejects, and arrived at by accident.
        // 48 stated outright cannot drift with the border.
        `relative max-lg:before:absolute max-lg:before:top-1/2 max-lg:before:left-1/2 max-lg:before:size-12 max-lg:before:-translate-x-1/2 max-lg:before:-translate-y-1/2 max-lg:before:content-['']`,
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          `bg-background pointer-events-none block size-4 rounded-full shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0`,
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
