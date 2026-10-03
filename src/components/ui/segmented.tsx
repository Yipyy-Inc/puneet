"use client";

import { useLook } from "@/components/look/look-context";
import { cn } from "@/lib/utils";

// ============================================================================
// §5 Segmented: "--inset track, 3px pad, active segment white with --sh,
// segments pad 9px 17px."
//
// A radio group underneath — native inputs sharing a name, so the arrow keys
// move the choice and a screen reader announces "1 of 3". The track is 40px,
// 48px below 1024px (§6 rule 7), and a segment's label is never cut: the
// track wraps before a French label would (§5g).
//
// Inside the booking wizard (CLAUDE.md § "Client mocks decide the look") it is
// the booking mock's switch instead: a 4px-padded warm track, 36px pills, the
// chosen one white with a soft shadow, every label in body ink.
// ============================================================================

const TRACK =
  "bg-surface-inset inline-flex max-w-full flex-wrap gap-0.5 rounded-full p-0.75";
const SEGMENT =
  "text-ink-secondary has-checked:bg-card has-checked:text-body-ink has-checked:shadow-card has-focus-visible:outline-primary text-body relative flex min-h-8.5 cursor-pointer items-center rounded-full px-4 font-semibold transition-[background-color,box-shadow,color] duration-120 ease-[ease] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 motion-reduce:transition-none max-lg:min-h-10.5";
/** The care mocks' switch: a warm 12px track, 36px segments with 8px corners. */
const CARE_TRACK =
  "inline-flex max-w-full flex-wrap gap-1 self-start rounded-[12px] bg-(--care-track) p-1";
const CARE_SEGMENT =
  "text-ink-tertiary has-checked:bg-card has-checked:text-body-ink has-checked:shadow-[0_1px_2px_rgba(20,18,30,0.12)] has-focus-visible:outline-primary relative flex min-h-9 cursor-pointer items-center rounded-[8px] px-3.5 text-[14px] font-medium has-focus-visible:outline-2 has-focus-visible:outline-offset-2";
/** The setup mock's switch: a 10px track, 34px segments. */
const SETUP_TRACK =
  "inline-flex max-w-full flex-wrap gap-1 self-start rounded-[10px] bg-(--care-track) p-1";
const SETUP_SEGMENT =
  "text-ink-tertiary has-checked:bg-card has-checked:text-body-ink has-checked:shadow-[0_1px_2px_rgba(20,18,30,0.12)] has-focus-visible:outline-primary relative flex min-h-[34px] cursor-pointer items-center rounded-[8px] px-3.5 text-[14px] font-medium whitespace-nowrap has-focus-visible:outline-2 has-focus-visible:outline-offset-2";
const BOOKING_TRACK =
  "bg-surface-inset-2 inline-flex max-w-full flex-wrap gap-1 rounded-full p-1";
const BOOKING_SEGMENT =
  "text-body-ink has-checked:bg-card has-checked:shadow-[0_1px_4px_rgba(0,0,0,0.1)] has-focus-visible:outline-primary relative flex min-h-9 cursor-pointer items-center rounded-full px-4 text-[13.5px] font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2";

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
  const look = useLook();
  const setup = look?.names.includes("care-setup") ?? false;
  const care = !setup && (look?.names.includes("care-step") ?? false);
  const booking = !setup && !care && (look?.names.includes("booking") ?? false);
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        setup
          ? SETUP_TRACK
          : care
            ? CARE_TRACK
            : booking
              ? BOOKING_TRACK
              : TRACK,
        className,
      )}
    >
      {options.map((option) => (
        <label
          key={option.value}
          // Positioned so its hidden input stays inside it (see ChoicePill).
          className={
            setup
              ? SETUP_SEGMENT
              : care
                ? CARE_SEGMENT
                : booking
                  ? BOOKING_SEGMENT
                  : SEGMENT
          }
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
