"use client";

import { EditorSection } from "@/components/booking/care/editor-section";
import { fill } from "@/lib/medications/dose";
import { useShellText } from "@/lib/shell/use-shell-text";

import { FoodCard } from "./food-card";
import type { FeedingStepState } from "./use-feeding-step";

// ============================================================================
// WHAT IT EATS: each food on its own card — kibble, a topper, a broth — and
// "+ Add another food".
// ============================================================================

export function PlanFoods({
  step,
  petName,
}: {
  step: FeedingStepState;
  petName: string;
}) {
  const t = useShellText("booking");
  const plan = step.plan!;

  return (
    <EditorSection
      label={fill(t("feedSectionFoods"), { pet: petName })}
      aside={
        <span className="text-ink-tertiary text-[13px]">
          {t("feedFoodsHint")}
        </span>
      }
    >
      {plan.foods.map((food, index) => (
        <FoodCard key={food.id} step={step} food={food} index={index} />
      ))}
      <button
        type="button"
        onClick={step.addFood}
        className="bg-card text-primary focus-visible:outline-primary flex h-13 w-full items-center justify-center gap-1 rounded-[14px] border-[1.5px] border-dashed border-(--care-add-line) px-4 text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span aria-hidden>+</span>
        {t("feedAddFood")}
      </button>
    </EditorSection>
  );
}
