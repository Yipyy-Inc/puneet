"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Stepper,
  StepperContent,
  StepperNavigation,
} from "@/components/ui/stepper";
import type { Step } from "@/components/ui/stepper";
import { usePlanBuilder } from "./use-plan-builder";
import { StepBasics } from "./steps/StepBasics";
import { StepPricing } from "./steps/StepPricing";
import { StepBenefits } from "./steps/StepBenefits";
import { StepIncluded } from "./steps/StepIncluded";
import { StepAvailability } from "./steps/StepAvailability";
import { StepReview } from "./steps/StepReview";
import type { MembershipPlan } from "@/data/services-pricing";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: MembershipPlan;
  /** Resolves true once the plan is saved; the dialog stays open otherwise. */
  onSave: (
    planData: ReturnType<typeof usePlanBuilder>["data"],
  ) => Promise<boolean>;
}

const steps: Step[] = [
  { id: "basics", title: "Basics", description: "Name, status, terms" },
  { id: "pricing", title: "Pricing", description: "Price & cycle" },
  { id: "benefits", title: "Benefits", description: "Discounts & perks" },
  { id: "included", title: "Included", description: "Complimentary items" },
  {
    id: "availability",
    title: "Rules",
    description: "Online & cancellation",
  },
  { id: "review", title: "Review", description: "Save plan" },
];

export function PlanBuilderDialog({ open, onOpenChange, plan, onSave }: Props) {
  const builder = usePlanBuilder(plan);
  const { data, update, currentStep, setCurrentStep, canProceedFrom, reset } =
    builder;
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) reset(plan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan?.id]);

  const handleNext = () => {
    if (!canProceedFrom(currentStep)) return;
    setCurrentStep(Math.min(currentStep + 1, steps.length - 1));
  };
  const handlePrev = () => setCurrentStep(Math.max(currentStep - 1, 0));
  // The toast waits for the write, and a refused save keeps the editor
  // open with everything the user typed.
  const handleComplete = async () => {
    if (saving) return;
    setSaving(true);
    const saved = await onSave(data);
    setSaving(false);
    if (!saved) return;
    toast.success(plan ? "Plan updated" : "Plan created", {
      description: `${data.name} has been saved.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-5xl">
        <div className="flex max-h-[92vh] flex-col">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2">
              {plan ? "Edit Membership Plan" : "Create Membership Plan"}
            </DialogTitle>
            <DialogDescription>
              Configure pricing, perks, and availability. Step {currentStep + 1}{" "}
              of {steps.length}.
            </DialogDescription>
          </DialogHeader>

          <div className="border-b px-6 pt-4 pb-2">
            <Stepper steps={steps} currentStep={currentStep} />
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <StepperContent>
              {currentStep === 0 && <StepBasics data={data} update={update} />}
              {currentStep === 1 && <StepPricing data={data} update={update} />}
              {currentStep === 2 && (
                <StepBenefits data={data} update={update} />
              )}
              {currentStep === 3 && (
                <StepIncluded data={data} update={update} />
              )}
              {currentStep === 4 && (
                <StepAvailability data={data} update={update} />
              )}
              {currentStep === 5 && (
                <StepReview data={data} goToStep={setCurrentStep} />
              )}
            </StepperContent>
          </div>

          <div className="border-t px-6 py-3">
            <StepperNavigation
              currentStep={currentStep}
              totalSteps={steps.length}
              canProceed={canProceedFrom(currentStep) && !saving}
              onNext={handleNext}
              onPrevious={handlePrev}
              onComplete={() => void handleComplete()}
              completeLabel={plan ? "Save changes" : "Create plan"}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
