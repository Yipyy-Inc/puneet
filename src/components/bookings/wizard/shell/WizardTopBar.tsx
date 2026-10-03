"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

import { StepBadge } from "./StepBadge";
import type { WizardStepView, WizardSubStepView } from "./types";

// ============================================================================
// The booking wizard's top bar below 1024px — where the rail goes on a tablet
// and a phone in the client's mock: the title, how far through, a close
// button, the bar, the four steps as pills (on a phone only the open one
// keeps its label), and Details' screens as a row of chips that scrolls
// sideways. The row is cut off mid-chip at the edge so it reads as scrollable,
// and the open chip is brought into view whenever it changes.
//
// Sizes and colours are the mock's own (2026-10-02, CLAUDE.md § "Client mocks
// decide the look"): 40px step pills, 38px screen chips, a 44px close circle.
// ============================================================================

export interface WizardTopBarProps {
  title: string;
  stepLabel: string;
  percent: number;
  percentLabel: string;
  steps: WizardStepView[];
  /** Details' screens; only while Details is open. */
  subSteps: WizardSubStepView[];
  onClose: () => void;
  closeLabel: string;
  stepsLabel: string;
  subStepsLabel: string;
}

export function WizardTopBar({
  title,
  stepLabel,
  percent,
  percentLabel,
  steps,
  subSteps,
  onClose,
  closeLabel,
  stepsLabel,
  subStepsLabel,
}: WizardTopBarProps) {
  const activeChip = useRef<HTMLButtonElement | HTMLSpanElement | null>(null);
  const activeId = subSteps.find((sub) => sub.state === "current")?.id;
  useEffect(() => {
    activeChip.current?.scrollIntoView?.({
      block: "nearest",
      inline: "nearest",
    });
  }, [activeId]);

  return (
    <div className="border-line bg-surface-inset flex flex-col gap-3 border-b px-4 pt-3.5 pb-3 sm:px-6 sm:pt-4 sm:pb-3.5 lg:hidden">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-heading truncate text-[16px] font-semibold">
            {title}
          </span>
          <span className="text-ink-tertiary text-[11.5px] font-semibold tracking-[0.06em] uppercase">
            {stepLabel} · <span className="tabular-nums">{percentLabel}</span>
          </span>
        </div>
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          className="border-line-strong bg-card text-body-ink focus-visible:outline-primary flex size-11 shrink-0 items-center justify-center rounded-full border text-[20px] leading-none focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span aria-hidden>×</span>
        </button>
      </div>

      <div className="bg-primary-tint-2 h-1 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ol aria-label={stepsLabel} className="flex gap-1.5">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={cn(
              "flex min-w-0",
              step.state === "current"
                ? "max-sm:flex-auto sm:flex-1"
                : "max-sm:flex-none sm:flex-1",
            )}
          >
            <StepPill step={step} number={index + 1} />
          </li>
        ))}
      </ol>

      {subSteps.length > 0 ? (
        <ol
          aria-label={subStepsLabel}
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pr-6 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {subSteps.map((sub, index) => (
            <li key={sub.id} className="shrink-0">
              <SubStepChip
                sub={sub}
                number={index + 1}
                chipRef={sub.state === "current" ? activeChip : undefined}
              />
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function StepPill({ step, number }: { step: WizardStepView; number: number }) {
  const className = cn(
    "flex h-10 w-full min-w-0 items-center gap-2 rounded-full border pr-3 pl-1.5 transition-[background-color] duration-200 motion-reduce:transition-none",
    step.state === "current" &&
      "border-primary bg-primary text-primary-foreground",
    step.state === "done" && "border-line-strong bg-card text-body-ink",
    step.state === "todo" &&
      "border-line-strong text-ink-disabled border-dashed bg-transparent",
  );
  const body = (
    <>
      <StepBadge state={step.state} label={number} size="pill" tone="step" />
      <span
        className={cn(
          "truncate text-[13px] font-semibold",
          step.state !== "current" && "max-sm:sr-only",
        )}
      >
        {step.title}
      </span>
    </>
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
    <span
      className={className}
      aria-current={step.state === "current" ? "step" : undefined}
    >
      {body}
    </span>
  );
}

function SubStepChip({
  sub,
  number,
  chipRef,
}: {
  sub: WizardSubStepView;
  number: number;
  chipRef?: React.Ref<HTMLButtonElement | HTMLSpanElement>;
}) {
  const className = cn(
    "flex h-[38px] items-center gap-2 rounded-full border pr-3.5 pl-[5px] text-[13px] font-semibold whitespace-nowrap",
    sub.state === "current" && "border-acc-soft bg-acc-soft text-acc-soft-text",
    sub.state === "done" && "border-line-strong bg-card text-body-ink",
    sub.state === "todo" &&
      "border-line-strong text-ink-tertiary bg-transparent",
  );
  const body = (
    <>
      <StepBadge state={sub.state} label={number} size="chip" tone="sub" />
      {sub.title}
    </>
  );
  if (sub.onSelect) {
    return (
      <button
        type="button"
        ref={chipRef as React.Ref<HTMLButtonElement>}
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
    <span
      ref={chipRef as React.Ref<HTMLSpanElement>}
      className={className}
      aria-current={sub.state === "current" ? "step" : undefined}
    >
      {body}
    </span>
  );
}
