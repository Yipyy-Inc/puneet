"use client";

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
// ============================================================================

export const choicePillClass =
  "border-line-strong bg-card text-body-ink hover:border-ink-disabled has-checked:text-primary-hover has-focus-visible:outline-primary flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-body font-semibold has-checked:shadow-[inset_0_0_0_2px_var(--primary)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-disabled:cursor-not-allowed has-disabled:text-ink-tertiary max-lg:min-h-12";

export function ChoicePill({
  type,
  name,
  value,
  checked,
  onChange,
  disabled,
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
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  return (
    <label className={cn(choicePillClass, className)}>
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
      {children}
    </label>
  );
}
