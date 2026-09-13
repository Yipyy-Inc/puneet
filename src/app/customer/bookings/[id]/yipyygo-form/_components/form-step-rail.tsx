"use client";

import { Check } from "lucide-react";

import { useCustomerText } from "@/lib/customer/use-customer-text";
import type { YipyyGoFormStep } from "@/lib/yipyy-go/owner-form";

// ============================================================================
// Where the owner is in the form (§5c): a 28px badge per step. Done is a white
// tick on solid success, and can be gone back to; current is solid primary;
// still to come is an outline. The badge carries the number, so the label
// never repeats it. Below 1024px only the current step keeps its label on
// screen — nine labels do not fit a phone — and the rest stay for a screen
// reader.
// ============================================================================

interface FormStepRailProps {
  steps: { id: YipyyGoFormStep; label: string }[];
  current: number;
  disabled: boolean;
  onSelect: (index: number) => void;
}

export function FormStepRail({
  steps,
  current,
  disabled,
  onSelect,
}: FormStepRailProps) {
  const { t, fill } = useCustomerText("yipyygo");

  return (
    <nav
      aria-label={fill("stepsLabel", { n: current + 1, total: steps.length })}
    >
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
        {steps.map((step, index) => {
          const state =
            index < current ? "done" : index === current ? "current" : "todo";
          const content = (
            <>
              <span
                data-state={state}
                aria-hidden
                className="data-[state=current]:bg-primary data-[state=done]:bg-success data-[state=todo]:border-line-strong data-[state=todo]:text-ink-secondary flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white tabular-nums data-[state=todo]:border"
              >
                {state === "done" ? <Check className="size-4" /> : index + 1}
              </span>
              <span
                data-state={state}
                className="text-ink-tertiary data-[state=current]:text-body-ink data-[state=done]:text-ink-secondary text-[13.5px] font-semibold data-[state=done]:max-lg:sr-only data-[state=todo]:max-lg:sr-only"
              >
                {step.label}
                {state === "done" && (
                  <span className="sr-only">, {t("stepDone")}</span>
                )}
              </span>
            </>
          );
          return (
            <li key={step.id} className="flex">
              {state === "done" ? (
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  disabled={disabled}
                  className="hover:text-body-ink flex min-h-10 items-center gap-2 rounded-full pr-3 pl-1 disabled:cursor-not-allowed max-lg:min-h-12"
                >
                  {content}
                </button>
              ) : (
                <span
                  aria-current={state === "current" ? "step" : undefined}
                  className="flex min-h-10 items-center gap-2 pr-3 pl-1 max-lg:min-h-12"
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
