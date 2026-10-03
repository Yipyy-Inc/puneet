"use client";

import { useLook } from "@/components/look/look-context";
import { cn } from "@/lib/utils";

// ============================================================================
// One answer of several, as a pill.
//
// A native radio or checkbox underneath, so arrow keys and a screen reader
// behave as they do everywhere else; the pill is its label. Selected is §5s's
// recipe — a full 2px primary ring, the label one step darker — never a tint
// or an edge line (§6 rules 1 and 2). 40px, and 48px below 1024px (§6 rule 7).
//
// Moved here from the pre-arrival form's ChoicePills (2026-10-01) when the
// booking form's Medications step and its settings came to need the same pill
// with more inside it — a time under a label, a tag beside a method.
//
// `relative` is load-bearing, not layout. The input is `sr-only`, which is
// absolutely positioned: without a positioned label it is placed against the
// nearest positioned ancestor — a dialog's frame — and stays where the step
// first laid it out while the step scrolls. Clicking the pill focuses it, and
// the browser scrolls whatever it must to show it, the frame included: on
// 2026-10-02 the booking form's Feeding and Medications steps rose out of
// their window and left it white (tests/e2e/_wizard.ts, expectFrameSteady).
//
// Inside a client-mock look (CLAUDE.md § "Client mocks decide the look") the
// pill is the mock's own instead: the booking mock's `chip(sel)` — 34px (42px
// on touch), 13px, a solid accent when chosen. Everywhere else, unchanged.
// ============================================================================

export const choicePillClass =
  "border-line-strong bg-card text-body-ink hover:border-ink-disabled has-checked:text-primary-ink relative has-focus-visible:outline-primary flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-body font-semibold has-checked:shadow-[inset_0_0_0_2px_var(--primary)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-disabled:cursor-not-allowed has-disabled:text-ink-tertiary max-lg:min-h-12";

/** The booking mock's chip: white on a strong line; chosen, the solid accent. */
const BOOKING_PILL =
  "border-line-strong bg-card text-body-ink has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground relative has-focus-visible:outline-primary flex min-h-[34px] cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-disabled:cursor-not-allowed has-disabled:text-ink-disabled max-lg:min-h-[42px]";
/** The setup mock's option: a ticked box in a 40px pill; off, dashed and
 *  struck through. */
const SETUP_PILL =
  "group/setup bg-card text-ink-disabled has-checked:bg-acc-soft has-checked:text-body-ink relative has-focus-visible:outline-primary flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-dashed border-(--care-dash) pr-3.5 pl-2.5 text-[14px] font-medium line-through has-checked:border-solid has-checked:border-(--cs-line) has-checked:no-underline has-focus-visible:outline-2 has-focus-visible:outline-offset-2";
/** The care mocks' chip: 44px, 15px; chosen, the accent's line on its tint. */
const CARE_PILL =
  "border-line-strong bg-card text-(--care-chip-ink) has-checked:border-primary has-checked:bg-acc-soft has-checked:text-acc-soft-text relative has-focus-visible:outline-primary flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-[15px] font-medium has-checked:border-[1.5px] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-disabled:cursor-not-allowed has-disabled:text-ink-disabled";
/** The evaluation mock's answer: 42px, 14px; chosen, solid body ink. */
const BOOKING_PILL_INK =
  "border-line-strong bg-card text-body-ink has-checked:border-body-ink has-checked:bg-body-ink relative has-focus-visible:outline-primary flex cursor-pointer items-center gap-2 rounded-full font-semibold has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-disabled:cursor-not-allowed has-disabled:text-ink-disabled";
/** The ink pill's sizes, as the evaluation mock draws each: an answer (42px),
 *  a session length (38px), a service (36px), a weekday (58×42, 12px corners). */
const INK_SIZE = {
  lg: "min-h-[42px] border-[1.5px] px-4 text-[14px]",
  md: "min-h-[38px] border px-3.5 text-[13.5px]",
  sm: "min-h-9 border px-3.5 text-[13.5px]",
  xs: "min-h-[34px] border px-3 text-[13px]",
  day: "min-h-[42px] w-[58px] justify-center rounded-[12px] border px-0 text-[13.5px] font-bold text-ink-tertiary",
} as const;
/** The mock's larger chip, its `chipH2`: training goals and experience. */
const BOOKING_PILL_LG = "min-h-[38px] px-4 text-[13.5px] max-lg:min-h-11";

export function ChoicePill({
  type,
  name,
  value,
  checked,
  onChange,
  disabled,
  size,
  tone = "accent",
  className,
  children,
  "aria-label": ariaLabel,
}: {
  type: "radio" | "checkbox";
  /** Radios in one group share it, so arrow keys move between them. */
  name?: string;
  value?: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  /**
   * `lg` is the booking mock's larger chip. With `tone="ink"` the
   * evaluation mock's sizes: `lg` an answer (the default), `md` a length,
   * `sm` a service, `day` a weekday. Outside a booking look, ignored.
   */
  size?: "md" | "lg" | "sm" | "xs" | "day";
  /** `ink`: the evaluation mock's answer, solid ink when chosen. */
  tone?: "accent" | "ink";
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  const look = useLook();
  const setup = look?.names.includes("care-setup") ?? false;
  const care = !setup && (look?.names.includes("care-step") ?? false);
  const booking =
    !setup &&
    !care &&
    ((look?.names.includes("booking") || look?.names.includes("eval-module")) ??
      false);
  const inkSize =
    INK_SIZE[
      size === "md" || size === "sm" || size === "xs" || size === "day"
        ? size
        : "lg"
    ];
  return (
    <label
      className={cn(
        setup
          ? SETUP_PILL
          : care
            ? CARE_PILL
            : booking
              ? tone === "ink"
                ? cn(BOOKING_PILL_INK, inkSize)
                : BOOKING_PILL
              : choicePillClass,
        booking && tone !== "ink" && size === "lg" && BOOKING_PILL_LG,
        className,
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={ariaLabel}
        className="sr-only"
      />
      {setup && type === "checkbox" ? (
        <span
          aria-hidden
          className="bg-surface-inset-2 group-has-checked/setup:bg-primary grid size-[18px] shrink-0 place-items-center rounded-[6px] text-[12px] font-bold text-white no-underline"
        >
          {checked ? "✓" : ""}
        </span>
      ) : null}
      {children}
    </label>
  );
}
