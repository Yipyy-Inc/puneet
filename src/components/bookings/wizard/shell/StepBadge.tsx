import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import type { WizardStepState } from "./types";

// ============================================================================
// The wizard's step badge (§5c): a finished step is a white tick on solid
// success, the open one solid primary carrying its number, a step still ahead
// an outline. The number lives in the badge, so the label never repeats it,
// and a finished step shows the tick INSTEAD of its number.
//
// `onPrimary`: the open step's card is itself solid primary in the client's
// layout, so its badge turns white with a primary number — a primary circle on
// a primary card would vanish.
// ============================================================================

const SIZES = {
  lg: "size-7 text-[12px] [&_svg]:size-3.5",
  md: "size-6 text-[11px] [&_svg]:size-3",
  sm: "size-5 text-[10.5px] [&_svg]:size-3",
} as const;

export function StepBadge({
  state,
  label,
  size = "lg",
  onPrimary = false,
}: {
  state: WizardStepState;
  label: number | string;
  size?: keyof typeof SIZES;
  onPrimary?: boolean;
}) {
  return (
    <span
      aria-hidden
      data-state={state}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold tabular-nums",
        SIZES[size],
        state === "done" && "bg-success text-white",
        state === "current" &&
          (onPrimary
            ? "bg-card text-primary"
            : "bg-primary text-primary-foreground"),
        state === "todo" && "border-line-strong text-ink-tertiary border",
      )}
    >
      {state === "done" ? <Check strokeWidth={2.5} /> : label}
    </span>
  );
}
