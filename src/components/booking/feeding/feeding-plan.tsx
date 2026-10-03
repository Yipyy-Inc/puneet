"use client";

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
      className="border-line bg-card overflow-hidden rounded-[20px] border"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-(--row-line) px-4 py-5 sm:px-6">
        <h4 className="text-body-ink min-w-0 text-[17px] font-semibold wrap-break-word">
          {fill(t("feedPlanTitle"), { pet: petName })}
        </h4>
        <Button
          type="button"
          variant="ghost"
          aria-label={fill(t("feedRemovePlanAria"), { pet: petName })}
          onClick={step.removePlan}
          size="care-sm"
          className="text-bad font-normal"
        >
          {t("feedRemovePlan")}
        </Button>
      </header>

      {included ? (
        <p className="bg-wash-success text-success mx-4 mt-5 rounded-[12px] px-4 py-3 text-[14px] font-medium sm:mx-6">
          {t(
            step.service === "daycare"
              ? "feedIncludedDaycare"
              : "feedIncludedBoarding",
          )}
        </p>
      ) : null}

      {step.dateless ? (
        <p className="mx-4 mt-5 rounded-[10px] bg-(--note-bg) px-3 py-2.5 text-[13px] text-(--note-ink) sm:mx-6">
          {t("feedNoDaysWarning")}
        </p>
      ) : null}

      <div className="divide-y divide-(--row-line)">
        <PlanMealTimes step={step} petName={petName} />
        <PlanFoods step={step} petName={petName} />
        <PlanHowEats step={step} petName={petName} />
        <PlanAllergiesNotes step={step} />
      </div>
    </section>
  );
}
