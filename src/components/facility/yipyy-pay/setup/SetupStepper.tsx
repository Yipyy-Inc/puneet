"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

// ============================================================================
// The three-segment progress header, shared by every wizard step.
//
// ── IT IS A REPORT, NOT A CONTROL ─────────────────────────────────────────
//
// Rendered as text and dividers rather than buttons, because it cannot be
// pressed and should not look pressable. Two of the three steps depend on a
// round trip to Clover; a facility who clicked ahead to step 3 would reach a
// form whose Save has no account to attach to.
//
// ── AND IT REPORTS WHAT IS TRUE, NOT WHAT WAS STORED ──────────────────────
//
// The `done` flags are computed by the wizard from the live connection every
// time it renders. That is the whole reason this takes them as props instead of
// deriving them from `current` — "step 2 must be done because we are on step 3"
// is exactly the inference that would show a green tick to a facility whose
// merchant account had been disconnected at Clover an hour ago.
// ============================================================================

export interface StepState {
  n: 1 | 2 | 3;
  title: string;
  /** One short line under the title. Present tense; no promises. */
  hint: string;
  done: boolean;
}

export function SetupStepper({
  steps,
  current,
}: {
  steps: StepState[];
  current: number;
}) {
  return (
    <>
      {/* Phones get the count and the name, not three stacked cards. The full
          stepper turned vertical is taller than the step it introduces. */}
      <div className="sm:hidden">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Step {current} of {steps.length}
        </p>
        <p className="text-sm font-medium">
          {steps.find((s) => s.n === current)?.title}
        </p>
      </div>

      <ol className="hidden sm:grid sm:grid-cols-3">
        {steps.map((step, index) => {
          const active = step.n === current;
          return (
            <li
              key={step.n}
              className={cn(
                "relative flex items-start gap-3 px-4 py-3",
                index > 0 && "border-l",
                active && "bg-sky-500/5",
              )}
            >
              {/* The active step is marked by a bar rather than a background
                  alone, so it survives at any contrast setting. */}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-sky-500"
                />
              )}
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  step.done
                    ? "bg-emerald-600 text-white"
                    : active
                      ? "bg-sky-500 text-white"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {step.done ? <Check className="size-4" /> : step.n}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-sm/tight font-medium",
                    !active && !step.done && "text-muted-foreground",
                  )}
                >
                  {step.title}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block text-xs",
                    step.done
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground",
                  )}
                >
                  {step.done ? "Done" : step.hint}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}
