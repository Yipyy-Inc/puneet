"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// ============================================================================
// The Take payment mock's selectable card — a method, a saved card, a reader:
// an 18px radio (a 6px accent ring when chosen), then whatever it holds, on
// white with a hairline, the accent's line and pale fill when chosen.
// ============================================================================

export function ChoiceCard({
  name,
  checked,
  disabled,
  onChange,
  children,
  className,
}: {
  name: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "group border-line-strong bg-card text-body-ink has-checked:border-primary has-focus-visible:outline-primary flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-[18px] border px-3.5 py-3 text-[15px] has-checked:border-[1.5px] has-checked:bg-(--acc-pale) has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-disabled:cursor-not-allowed",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      <span
        aria-hidden
        className="bg-card group-has-checked:border-primary size-[18px] shrink-0 rounded-full border-[1.5px] border-(--check-off) group-has-checked:border-[6px]"
      />
      {children}
    </label>
  );
}
