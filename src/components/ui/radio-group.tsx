"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { CircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-3", className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        `border-input hover:not-disabled:border-ink-disabled text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40 disabled:bg-surface-inset disabled:data-[state=checked]:border-ink-disabled disabled:data-[state=checked]:bg-ink-disabled aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed`,
        // ── THE ONE IN THIS FAMILY THAT WAS MISSED (§6 rule 7) ────────────
        //
        // `Switch` and `Checkbox` both carry this exact hit area. The radio
        // did not, so it shipped as a 16px target everywhere in the product —
        // a third of rule 7's 48px floor, on a control whose entire job is to
        // be one of several small things chosen between.
        //
        // No grep could have found it: the class list looks complete, and the
        // absence is only visible against its two siblings. It surfaced in a
        // rendering pass at 599px as `3 x 16px` inside one settings section,
        // and the section was not the problem.
        //
        // Sized EXPLICITLY rather than inset, for the reason switch.tsx
        // records: an inset is measured from the padding box, so a border
        // change silently moves the target. 48 stated outright cannot drift.
        `relative max-lg:before:absolute max-lg:before:top-1/2 max-lg:before:left-1/2 max-lg:before:size-12 max-lg:before:-translate-x-1/2 max-lg:before:-translate-y-1/2 max-lg:before:content-['']`,
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        <CircleIcon className="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
