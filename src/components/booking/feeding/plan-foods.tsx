"use client";

import { Plus } from "lucide-react";

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
    <EditorSection label={fill(t("feedSectionFoods"), { pet: petName })}>
      <p className="text-meta text-ink-tertiary -mt-2">{t("feedFoodsHint")}</p>
      {plan.foods.map((food, index) => (
        <FoodCard key={food.id} step={step} food={food} index={index} />
      ))}
      <button
        type="button"
        onClick={step.addFood}
        className="border-line-strong bg-card text-primary hover:bg-surface-inset focus-visible:outline-primary text-body-strong flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed px-4 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <Plus className="size-5" aria-hidden />
        {t("feedAddFood")}
      </button>
    </EditorSection>
  );
}
