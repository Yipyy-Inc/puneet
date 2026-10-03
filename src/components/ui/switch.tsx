"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { useLook } from "@/components/look/look-context";
import { cn } from "@/lib/utils";

function Switch({
  className,
  size = "md",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  /** `sm`: the setup mock's row switch (36×20); elsewhere ignored. */
  size?: "md" | "sm";
}) {
  // Inside the booking wizard (CLAUDE.md § "Client mocks decide the look"):
  // the mock's 40×24 track, an 18px knob 3px in, a warm grey when off.
  const look = useLook();
  // The booking page's mock: the Take payment credit switch, 44×24, green on.
  const details = look?.names.at(-1) === "booking-details";
  const setup = !details && (look?.names.includes("care-setup") ?? false);
  const mock =
    !details &&
    !setup &&
    ((look?.names.includes("booking") || look?.names.includes("eval-module")) ??
      false);
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
        mock &&
          "h-6 w-10 border-[3px] shadow-none data-[state=unchecked]:bg-(--switch-off)",
        details &&
          "data-[state=checked]:bg-success h-6 w-11 border-[3px] shadow-none data-[state=unchecked]:bg-(--check-off)",
        // The setup page: 44×24 with an 18px knob, a row's 36×20 with 14px.
        setup &&
          (size === "sm"
            ? "h-5 w-9 border-[3px] shadow-none data-[state=unchecked]:bg-(--switch-off)"
            : "h-6 w-11 border-[3px] shadow-none data-[state=unchecked]:bg-(--switch-off)"),
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          `bg-background pointer-events-none block size-4 rounded-full shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0`,
          mock && "size-[18px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]",
          details &&
            "size-[18px] bg-white shadow-(--bd-sh-knob) data-[state=checked]:translate-x-5",
          setup &&
            (size === "sm"
              ? "size-3.5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
              : "size-[18px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] data-[state=checked]:translate-x-5"),
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
