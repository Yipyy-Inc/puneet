"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { StepBadge } from "./StepBadge";
import type { WizardStepView, WizardSubStepView } from "./types";

// ============================================================================
// The booking wizard's top bar below 1024px — where the rail goes on a tablet
// and a phone in the client's mock: the title, how far through, a close
// button, the bar, the four steps as pills (on a phone only the open one
// keeps its label), and Details' screens as a row of chips that scrolls
// sideways. The row is cut off mid-chip at the edge so it reads as scrollable
// (§5m), and the open chip is brought into view whenever it changes.
// Every target is 48px (§5m: floor staff are standing, holding an animal).
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
          <span className="text-micro text-ink-tertiary uppercase">
            {stepLabel} · <span className="tabular-nums">{percentLabel}</span>
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label={closeLabel}
          onClick={onClose}
        >
          <X />
        </Button>
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
    "flex min-h-12 w-full min-w-0 items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5",
    step.state === "current" &&
      "border-primary bg-primary text-primary-foreground",
    step.state === "done" && "border-line bg-card text-body-ink",
    step.state === "todo" &&
      "border-line-strong text-ink-tertiary border-dashed bg-transparent",
  );
  const body = (
    <>
      <StepBadge
        state={step.state}
        label={number}
        onPrimary={step.state === "current"}
      />
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
    "flex min-h-12 items-center gap-2 rounded-full border py-1 pr-3.5 pl-1.5 text-[13px] font-semibold whitespace-nowrap",
    sub.state === "current" &&
      "bg-card text-primary-hover border-transparent shadow-[inset_0_0_0_2px_var(--color-primary)]",
    sub.state === "done" && "border-line bg-card text-body-ink",
    sub.state === "todo" &&
      "border-line-strong text-ink-tertiary bg-transparent",
  );
  const body = (
    <>
      <StepBadge state={sub.state} label={number} size="md" />
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
