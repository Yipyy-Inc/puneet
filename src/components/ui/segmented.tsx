"use client";

import { cn } from "@/lib/utils";

// ============================================================================
// §5 Segmented: "--inset track, 3px pad, active segment white with --sh,
// segments pad 9px 17px."
//
// A radio group underneath — native inputs sharing a name, so the arrow keys
// move the choice and a screen reader announces "1 of 3". The track is 40px,
// 48px below 1024px (§6 rule 7), and a segment's label is never cut: the
// track wraps before a French label would (§5g).
// ============================================================================

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
  className,
}: {
  /** One per group on the page. */
  name: string;
  /** What the choice is, for assistive technology. */
  label: string;
  value: T | undefined;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "bg-surface-inset inline-flex max-w-full flex-wrap gap-0.5 rounded-full p-0.75",
        className,
      )}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className="text-ink-secondary has-checked:bg-card has-checked:text-body-ink has-checked:shadow-card has-focus-visible:outline-primary text-body flex min-h-8.5 cursor-pointer items-center rounded-full px-4 font-semibold transition-[background-color,box-shadow,color] duration-120 ease-[ease] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 motion-reduce:transition-none max-lg:min-h-10.5"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
