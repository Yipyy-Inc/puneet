"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { STEP_META } from "./wizard-config";

export function WizardProgress({
  step,
  onStepClick,
}: {
  step: number;
  onStepClick: (index: number) => void;
}) {
  return (
    <nav
      aria-label="Progress"
      className="bg-muted/30 border-b px-4 py-3 sm:px-6"
    >
      <ol className="flex items-center">
        {STEP_META.map((s, i) => {
          const state = i < step ? "done" : i === step ? "current" : "upcoming";
          return (
            <li
              key={s.id}
              className={cn(
                "flex items-center",
                i < STEP_META.length - 1 && "flex-1",
              )}
            >
              <button
                type="button"
                onClick={() => i < step && onStepClick(i)}
                disabled={i >= step}
                className={cn(
                  "flex items-center gap-2 rounded-full text-left",
                  i < step && "cursor-pointer",
                )}
              >
                <span
                  data-state={state}
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                    "data-[state=upcoming]:border-border data-[state=upcoming]:text-muted-foreground",
                    "data-[state=current]:border-violet-500 data-[state=current]:bg-violet-500 data-[state=current]:text-white",
                    "data-[state=done]:border-emerald-500 data-[state=done]:bg-emerald-500 data-[state=done]:text-white",
                  )}
                >
                  {state === "done" ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "hidden text-xs font-medium lg:inline",
                    state === "current"
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {s.title}
                </span>
              </button>
              {i < STEP_META.length - 1 && (
                <span
                  className={cn(
                    "mx-2 h-px flex-1",
                    i < step ? "bg-emerald-500/50" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
