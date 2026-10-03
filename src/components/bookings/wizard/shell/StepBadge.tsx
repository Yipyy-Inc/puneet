import { cn } from "@/lib/utils";

import type { WizardStepState } from "./types";

// ============================================================================
// The wizard's step badge, exactly as the client's mocks draw it (2026-10-02,
// CLAUDE.md § "Client mocks decide the look"). The number lives in the badge,
// so the label never repeats it, and a finished step shows a tick INSTEAD of
// its number — the mock's own "✓" glyph.
//
//   tone "step"  the booking mock's step cards and top-bar pills: a finished
//                step is the accent with a white tick; the open step's card
//                is itself the accent, so its badge turns white with a deep
//                accent number; a step ahead is grey.
//   tone "sub"   the booking mock's Details sub-steps: the open and finished
//                ones are the accent, the rest grey.
//   tone "eval"  the evaluation mock's flat rail: finished green, open the
//                accent, the rest the line colour.
// ============================================================================

const SIZES = {
  step: "size-6 text-[12px]",
  sub: "size-5 text-[10.5px]",
  pill: "size-7 text-[12px]",
  chip: "size-[26px] text-[11px]",
  eval: "size-[26px] text-[12px]",
} as const;

export type StepBadgeTone = "step" | "sub" | "eval";

export function StepBadge({
  state,
  label,
  size = "step",
  tone = "step",
}: {
  state: WizardStepState;
  label: number | string;
  size?: keyof typeof SIZES;
  tone?: StepBadgeTone;
}) {
  return (
    <span
      aria-hidden
      data-state={state}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold tabular-nums",
        SIZES[size],
        tone === "step" &&
          (state === "done"
            ? "bg-primary text-primary-foreground"
            : state === "current"
              ? "bg-card text-acc-deep"
              : "text-ink-disabled bg-(--step-todo)"),
        tone === "sub" &&
          (state === "todo"
            ? "bg-primary-tint-2 text-ink-tertiary"
            : "bg-primary text-primary-foreground"),
        tone === "eval" &&
          (state === "done"
            ? "bg-success text-white"
            : state === "current"
              ? "bg-primary text-primary-foreground"
              : "bg-line-strong text-ink-tertiary"),
      )}
    >
      {state === "done" ? "✓" : label}
    </span>
  );
}
