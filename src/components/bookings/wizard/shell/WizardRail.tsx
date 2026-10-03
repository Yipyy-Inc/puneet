import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { StepBadge } from "./StepBadge";
import type { WizardStepView, WizardSubStepView } from "./types";

// ============================================================================
// The booking wizard's rail, from 1024px: the title and who it is for, how far
// through, the steps with a line each, and the Details screens under Details.
// Below 1024px the same steps are the top bar's pills (WizardTopBar), so this
// is hidden there rather than squeezed.
//
// It is drawn exactly as the client's mocks draw it (2026-10-02, CLAUDE.md §
// "Client mocks decide the look"):
//
//   "booking"     docs/Facility_01_-_Find_client.html — the open step a solid
//                 accent card with a coloured shadow, finished steps white
//                 cards, steps ahead a dashed outline in faint ink; the open
//                 Details screen on the accent's soft tint.
//   "evaluation"  docs/Yipyy_Evaluation_Booking.html — a flat list: the open
//                 step a white card with a faint shadow, the rest bare, done
//                 steps a green tick.
//
// Finished steps and screens are buttons — clicking one goes back to it.
// ============================================================================

export type WizardFlavour = "booking" | "evaluation";

export interface WizardRailProps {
  title: string;
  subtitle: string;
  stepLabel: string;
  percent: number;
  percentLabel: string;
  steps: WizardStepView[];
  /** Details' screens, shown under its card once the booking is past Service. */
  subSteps: WizardSubStepView[];
  navLabel: string;
  flavour?: WizardFlavour;
  /** Anything that belongs under the steps (the stay previews). */
  children?: ReactNode;
}

export function WizardRail({
  title,
  subtitle,
  stepLabel,
  percent,
  percentLabel,
  steps,
  subSteps,
  navLabel,
  flavour = "booking",
  children,
}: WizardRailProps) {
  return (
    <aside className="border-line bg-surface-inset hidden w-[296px] shrink-0 flex-col border-r px-5 pt-7 pb-5 lg:flex">
      <div className="flex flex-col gap-1 px-1">
        <p className="text-heading flex items-center gap-2.5 text-[21px] font-semibold tracking-[-0.01em]">
          <span aria-hidden className="text-[24px] leading-none font-normal">
            +
          </span>
          <span className="min-w-0 wrap-break-word">{title}</span>
        </p>
        <p className="text-ink-tertiary text-[13.5px]">{subtitle}</p>
      </div>

      <div className="border-line mx-1 mt-5 mb-4 border-t pt-4">
        <div className="text-ink-tertiary flex justify-between gap-3 text-[11px] font-semibold tracking-[0.07em] uppercase">
          <span>{stepLabel}</span>
          <span className="tabular-nums">{percentLabel}</span>
        </div>
        <div className="bg-primary-tint-2 mt-2 h-1 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <nav
        aria-label={navLabel}
        className="-mx-1 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-1 pb-1"
      >
        <ol className="flex flex-col gap-2.5">
          {steps.map((step, index) => (
            <li key={step.id} className="flex flex-col gap-1">
              <RailStep step={step} number={index + 1} flavour={flavour} />
              {step.id === "details" && subSteps.length > 0 ? (
                <ol className="flex flex-col gap-0.5 pt-1 pb-0.5 pl-[26px]">
                  {subSteps.map((sub, subIndex) => (
                    <li key={sub.id}>
                      <RailSubStep sub={sub} number={subIndex + 1} />
                    </li>
                  ))}
                </ol>
              ) : null}
            </li>
          ))}
        </ol>
        {children}
      </nav>
    </aside>
  );
}

function RailStep({
  step,
  number,
  flavour,
}: {
  step: WizardStepView;
  number: number;
  flavour: WizardFlavour;
}) {
  const evaluation = flavour === "evaluation";
  const body = (
    <>
      <StepBadge
        state={step.state}
        label={number}
        size={evaluation ? "eval" : "step"}
        tone={evaluation ? "eval" : "step"}
      />
      <span className="flex min-w-0 flex-col gap-0.5 text-left">
        <span
          className={cn(
            "font-semibold",
            evaluation ? "text-[14.5px]" : "text-[15px]",
          )}
        >
          {step.title}
        </span>
        <span
          className={cn(
            "truncate text-[12.5px]",
            evaluation ? "text-ink-tertiary" : "opacity-82",
          )}
        >
          {step.summary}
        </span>
      </span>
    </>
  );
  const className = evaluation
    ? cn(
        "flex w-full items-start gap-3 rounded-xl border px-4 py-[13px]",
        step.state === "current"
          ? "border-line-strong bg-card shadow-(--sh-step-flat)"
          : "border-transparent bg-transparent",
      )
    : cn(
        "flex w-full items-start gap-3 rounded-xl border px-4 py-[13px] transition-[box-shadow,background-color] duration-200 motion-reduce:transition-none",
        step.state === "current" &&
          "border-primary bg-primary text-primary-foreground shadow-(--sh-step)",
        step.state === "done" && "border-line-strong bg-card text-body-ink",
        step.state === "todo" &&
          "border-line-strong text-ink-disabled border-dashed bg-transparent",
      );
  if (step.onSelect) {
    return (
      <button
        type="button"
        onClick={step.onSelect}
        className={cn(
          className,
          "focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2",
        )}
      >
        {body}
      </button>
    );
  }
  return (
    <div
      className={className}
      aria-current={step.state === "current" ? "step" : undefined}
    >
      {body}
    </div>
  );
}

function RailSubStep({
  sub,
  number,
}: {
  sub: WizardSubStepView;
  number: number;
}) {
  const body = (
    <>
      <StepBadge state={sub.state} label={number} size="sub" tone="sub" />
      <span className="flex min-w-0 flex-col text-left">
        <span>{sub.title}</span>
        {sub.summary && sub.state === "done" ? (
          <span className="text-ink-tertiary line-clamp-2 text-[12.5px] font-normal">
            {sub.summary}
          </span>
        ) : null}
      </span>
    </>
  );
  const className = cn(
    "flex w-full items-center gap-2.5 rounded-[12px] px-3 py-[9px] text-[14px]",
    sub.state === "current" && "bg-acc-soft text-acc-soft-text font-semibold",
    sub.state === "done" && "text-body-ink font-medium",
    sub.state === "todo" && "text-ink-tertiary font-medium",
  );
  if (sub.onSelect) {
    return (
      <button
        type="button"
        onClick={sub.onSelect}
        className={cn(
          className,
          "focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2",
        )}
      >
        {body}
      </button>
    );
  }
  return (
    <div
      className={className}
      aria-current={sub.state === "current" ? "step" : undefined}
    >
      {body}
    </div>
  );
}
