"use client";

import { CircleCheck, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fill } from "@/lib/medications/dose";
import { useShellText } from "@/lib/shell/use-shell-text";

import { PlanAllergiesNotes } from "./plan-allergies-notes";
import { PlanFoods } from "./plan-foods";
import { PlanHowEats } from "./plan-how-eats";
import { PlanMealTimes } from "./plan-meal-times";
import type { FeedingStepState } from "./use-feeding-step";

// ============================================================================
// One pet's feeding plan: its title and Remove plan, the design's four parts
// in its order — Meal times, What it eats, How it eats, Allergies & notes.
// There is no Save: the plan is booked as it is written.
// ============================================================================

export function FeedingPlanCard({
  step,
  petName,
}: {
  step: FeedingStepState;
  petName: string;
}) {
  const t = useShellText("booking");
  const plan = step.plan!;
  const included =
    step.panel.included && plan.foods.some((food) => food.source === "house");

  return (
    <section
      aria-label={fill(t("feedPlanTitle"), { pet: petName })}
      className="border-line bg-card shadow-card overflow-hidden rounded-2xl border"
    >
      <header className="border-line flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
        <h4 className="text-section text-body-ink min-w-0 wrap-break-word">
          {fill(t("feedPlanTitle"), { pet: petName })}
        </h4>
        <Button
          type="button"
          variant="ghost"
          aria-label={fill(t("feedRemovePlanAria"), { pet: petName })}
          onClick={step.removePlan}
          className="text-destructive"
        >
          {t("feedRemovePlan")}
        </Button>
      </header>

      {included ? (
        <p className="text-meta text-success mx-4 mt-5 flex items-center gap-2 sm:mx-6">
          <CircleCheck className="size-4 shrink-0" aria-hidden />
          {t(
            step.service === "daycare"
              ? "feedIncludedDaycare"
              : "feedIncludedBoarding",
          )}
        </p>
      ) : null}

      {step.dateless ? (
        <p className="text-meta text-warning mx-4 mt-5 flex items-center gap-2 sm:mx-6">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          {t("feedNoDaysWarning")}
        </p>
      ) : null}

      <div className="divide-line divide-y">
        <PlanMealTimes step={step} petName={petName} />
        <PlanFoods step={step} petName={petName} />
        <PlanHowEats step={step} petName={petName} />
        <PlanAllergiesNotes step={step} />
      </div>
    </section>
  );
}
