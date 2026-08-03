"use client";

import { CheckCircle2, Circle, CircleDashed } from "lucide-react";

import { EMPLOYEE_TASK_LABEL } from "@/data/staff-onboarding";
import type { EmployeeOnboardingTaskType } from "@/data/staff-onboarding";
import { cn } from "@/lib/utils";

// The checklist a signed-in hire sees. Read-only here on purpose: filling a
// section in happens through the tokenised /onboard link, which is the one
// surface the section-save RPC accepts. Duplicating the forms would mean two
// write paths to the same rows and two places for the rules to drift.
export function OnboardingChecklist({
  sections,
  hasInstance,
  submitted,
}: {
  sections: {
    taskKey: string;
    type: string;
    status: string;
    completedAt: string | null;
  }[];
  hasInstance: boolean;
  submitted: boolean;
}) {
  if (!hasInstance) {
    return (
      <div className="border-border/60 text-muted-foreground rounded-xl border border-dashed px-4 py-10 text-center text-sm">
        Your manager has not set up your onboarding checklist yet. Nothing to do
        right now.
      </div>
    );
  }

  const done = sections.filter((s) => s.status === "complete").length;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Your checklist</h2>
        <span className="text-muted-foreground text-xs">
          {done} of {sections.length} done
        </span>
      </div>

      {sections.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No steps have been added to your checklist.
        </p>
      ) : (
        <ul className="space-y-2">
          {sections.map((s) => {
            const complete = s.status === "complete";
            const started = s.status === "in_progress";
            const Icon = complete
              ? CheckCircle2
              : started
                ? CircleDashed
                : Circle;
            return (
              <li
                key={s.taskKey}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm",
                  complete && "border-emerald-200 dark:border-emerald-900",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    complete
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground",
                  )}
                />
                <span className="flex-1">
                  {EMPLOYEE_TASK_LABEL[s.type as EmployeeOnboardingTaskType] ??
                    s.type}
                </span>
                <span className="text-muted-foreground text-xs">
                  {complete ? "Done" : started ? "In progress" : "Not started"}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {submitted && (
        <p className="text-muted-foreground text-xs">
          Submitted — no further action needed from you.
        </p>
      )}
    </section>
  );
}
