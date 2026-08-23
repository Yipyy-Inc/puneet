"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

// ============================================================================
// The progress header, shared by both Yipyy Pay wizards.
//
// ── IT IS A REPORT BY DEFAULT, AND A CONTROL ONLY WHEN ASKED ──────────────
//
// The connect wizard renders it as text and dividers, because it cannot be
// pressed and should not look pressable: two of its three steps depend on a
// round trip to Clover, and a facility who clicked ahead to step 3 would reach
// a form whose Save has no account to attach to.
//
// The application wizard passes `onSelect`, because its five steps are five
// independent forms held in one row. Somebody who fetched their bank letter
// before their incorporation certificate should be able to go and put it in,
// and a stepper that refused would send them clicking Next through two forms
// they are not ready to fill.
//
// ── AND IT REPORTS WHAT IS TRUE, NOT WHAT WAS STORED ──────────────────────
//
// The `done` flags are computed by the wizard from live data every time it
// renders. That is the whole reason this takes them as props instead of
// deriving them from `current` — "step 2 must be done because we are on step 3"
// is exactly the inference that would show a green tick to a facility whose
// merchant account had been disconnected at Clover an hour ago, or whose owner
// row lost its identity number.
// ============================================================================

export interface StepState {
  n: number;
  title: string;
  /** One short line under the title. Present tense; no promises. */
  hint: string;
  done: boolean;
}

export function SetupStepper({
  steps,
  current,
  onSelect,
}: {
  steps: StepState[];
  current: number;
  /** Supply to make the segments clickable. Omit for a display-only stepper. */
  onSelect?: (n: number) => void;
}) {
  return (
    <>
      {/* Phones get the count and the name, not five stacked cards. The full
          stepper turned vertical is taller than the step it introduces. */}
      <div className="p-3 sm:hidden">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Step {current} of {steps.length}
        </p>
        <p className="text-sm font-medium">
          {steps.find((s) => s.n === current)?.title}
        </p>
      </div>

      <ol
        className="hidden sm:grid"
        // Column count follows the steps rather than a literal, so the same
        // component carries three and five without a second layout to keep in
        // step with the first.
        style={{
          gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
        }}
      >
        {steps.map((step, index) => {
          const active = step.n === current;
          const Segment = onSelect ? "button" : "span";
          return (
            <li
              key={step.n}
              className={cn(
                "relative",
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
              <Segment
                {...(onSelect
                  ? {
                      type: "button" as const,
                      onClick: () => onSelect(step.n),
                      "aria-current": active ? ("step" as const) : undefined,
                    }
                  : {})}
                className={cn(
                  "flex w-full items-start gap-3 px-3 py-3 text-left lg:px-4",
                  onSelect && "hover:bg-muted/50 transition-colors",
                )}
              >
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
              </Segment>
            </li>
          );
        })}
      </ol>
    </>
  );
}
