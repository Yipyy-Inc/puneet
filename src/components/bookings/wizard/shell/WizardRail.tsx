import type { ReactNode } from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

import { StepBadge } from "./StepBadge";
import type { WizardStepView, WizardSubStepView } from "./types";

// ============================================================================
// The booking wizard's rail, from 1024px (the client's mock,
// docs/Facility_01_-_Find_client.html): the title and who it is for, how far
// through, the four steps with a line each, and the Details screens under
// Details. Below 1024px the same steps are the top bar's pills
// (WizardTopBar), so this is hidden there rather than squeezed.
//
// Finished steps and screens are buttons — clicking one goes back to it. The
// open step is a solid primary card (an active nav item, §1); a step still
// ahead is a dashed outline in tertiary ink, never faded (§6 rule 4).
// ============================================================================

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
  children,
}: WizardRailProps) {
  return (
    <aside className="border-line bg-surface-inset hidden w-[296px] shrink-0 flex-col border-r px-5 pt-7 pb-5 lg:flex">
      <div className="flex flex-col gap-1 px-1">
        <p className="text-heading flex items-start gap-2.5 text-[21px]/[1.25] font-semibold tracking-[-0.01em]">
          <Plus className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span className="min-w-0 wrap-break-word">{title}</span>
        </p>
        <p className="text-meta text-ink-tertiary">{subtitle}</p>
      </div>

      <div className="border-line mx-1 mt-5 mb-4 border-t pt-4">
        <div className="text-micro text-ink-tertiary flex justify-between gap-3 uppercase">
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
              <RailStep step={step} number={index + 1} />
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

function RailStep({ step, number }: { step: WizardStepView; number: number }) {
  const body = (
    <>
      <StepBadge
        state={step.state}
        label={number}
        onPrimary={step.state === "current"}
      />
      <span className="flex min-w-0 flex-col gap-0.5 text-left">
        <span className="text-[15px]/[1.3] font-semibold">{step.title}</span>
        <span
          className={cn(
            "text-meta line-clamp-2",
            step.state === "current"
              ? "text-primary-foreground"
              : "text-ink-tertiary",
          )}
        >
          {step.summary}
        </span>
      </span>
    </>
  );
  const className = cn(
    "flex w-full items-start gap-3 rounded-2xl border px-4 py-[13px] transition-[transform,box-shadow,background-color] duration-200 motion-reduce:transition-none",
    step.state === "current" &&
      "border-primary bg-primary text-primary-foreground shadow-(--sh-cta)",
    step.state === "done" && "border-line bg-card text-body-ink shadow-card",
    step.state === "todo" &&
      "border-line-strong text-ink-tertiary border-dashed bg-transparent",
  );
  if (step.onSelect) {
    return (
      <button
        type="button"
        onClick={step.onSelect}
        className={cn(
          className,
          "focus-visible:outline-primary hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:hover:translate-y-0",
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
      <StepBadge state={sub.state} label={number} size="sm" />
      <span className="flex min-w-0 flex-col text-left">
        <span>{sub.title}</span>
        {sub.summary && sub.state === "done" ? (
          <span className="text-ink-tertiary text-meta line-clamp-2 font-normal">
            {sub.summary}
          </span>
        ) : null}
      </span>
    </>
  );
  const className = cn(
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-[9px] text-[14px]",
    sub.state === "current" &&
      "bg-card text-primary-hover ring-primary font-semibold ring-1",
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
          "hover:bg-card focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2",
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
