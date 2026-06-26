"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleDashed,
  Clock,
  PartyPopper,
  RotateCcw,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ONBOARDING_DISMISS_THRESHOLD } from "@/data/facility-onboarding";
import {
  loadPersistedOnboarding,
  markStepComplete,
  resetStep,
  startStep,
  useFacilityOnboarding,
  type OnboardingStepView,
} from "@/lib/facility-onboarding-store";

const STATUS_META = {
  complete: {
    label: "Complete",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
    icon: Check,
    ring: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  in_progress: {
    label: "In Progress",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
    icon: Clock,
    ring: "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  },
  not_started: {
    label: "Not Started",
    badge:
      "border-slate-200 bg-slate-50 text-slate-600 dark:bg-slate-900/40 dark:text-slate-300",
    icon: CircleDashed,
    ring: "bg-slate-100 text-slate-500 dark:bg-slate-900/40 dark:text-slate-400",
  },
} as const;

function StepRow({ step }: { step: OnboardingStepView }) {
  const meta = STATUS_META[step.status];
  const Icon = meta.icon;
  const isComplete = step.status === "complete";

  return (
    <li className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          meta.ring,
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-semibold">
            Step {step.order}
          </span>
          <Badge variant="outline" className={cn("font-medium", meta.badge)}>
            {meta.label}
          </Badge>
        </div>
        <p className="font-medium">{step.title}</p>
        <p className="text-muted-foreground text-sm">{step.description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isComplete ? (
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href={step.route}>Review</Link>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label={`Reset ${step.title}`}
              onClick={() => resetStep(step.id)}
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => markStepComplete(step.id)}
            >
              Mark complete
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => startStep(step.id)}
            >
              <Link href={step.route}>
                {step.status === "in_progress" ? "Continue" : step.cta}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

export function FacilityOnboardingView() {
  const [mounted, setMounted] = useState(false);
  const { steps, completed, total, percent, allComplete, canDismiss } =
    useFacilityOnboarding();

  useEffect(() => {
    loadPersistedOnboarding();
    setMounted(true);
  }, []);

  const remaining = Math.max(0, ONBOARDING_DISMISS_THRESHOLD - completed);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Get your facility ready
        </h1>
        <p className="text-muted-foreground text-sm">
          Complete these {total} steps to start taking bookings. This checklist
          also appears as a banner across your dashboard until you finish — or
          dismiss it once {ONBOARDING_DISMISS_THRESHOLD} steps are done.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {allComplete ? "You're all set!" : "Setup progress"}
            </CardTitle>
            <span className="text-sm font-medium tabular-nums">
              {completed}/{total} · {percent}%
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress
            value={mounted ? percent : 0}
            className={cn(
              "h-2",
              allComplete ? "[&>div]:bg-emerald-500" : "[&>div]:bg-violet-500",
            )}
          />
          {allComplete ? (
            <p className="flex items-center gap-2 text-sm text-emerald-600">
              <PartyPopper className="size-4" />
              Every step is complete — your facility is fully set up.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              {canDismiss
                ? "You can now dismiss the setup banner from your dashboard."
                : `Complete ${remaining} more step${remaining === 1 ? "" : "s"} to be able to dismiss the dashboard banner.`}
            </p>
          )}
        </CardContent>
      </Card>

      {mounted ? (
        <ul className="space-y-3">
          {steps.map((s) => (
            <StepRow key={s.id} step={s} />
          ))}
        </ul>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: total }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}
    </div>
  );
}
