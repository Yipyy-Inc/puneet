"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "lucide-react";

interface Step {
  id: string;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepChange?: (step: number) => void;
  className?: string;
}

interface StepperContentProps {
  children: React.ReactNode;
  className?: string;
}

interface StepperNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext?: () => void;
  onPrevious?: () => void;
  onComplete?: () => void;
  nextLabel?: string;
  previousLabel?: string;
  completeLabel?: string;
  canProceed?: boolean;
  className?: string;
}

function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Step circles row - aligned horizontally */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium shrink-0",
                  index < currentStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : index === currentStep
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30 bg-background text-muted-foreground",
                )}
              >
                {index < currentStep ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px mx-2",
                  index < currentStep ? "bg-primary" : "bg-muted-foreground/30",
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      {/* Step titles row - below circles */}
      <div className="flex items-start justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center flex-1 text-center">
            <div
              className={cn(
                "text-sm font-medium",
                index <= currentStep
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {step.title}
            </div>
            {step.description && (
              <div className="text-xs text-muted-foreground mt-1 max-w-24">
                {step.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StepperContent({ children, className }: StepperContentProps) {
  return <div className={cn("mt-8", className)}>{children}</div>;
}

function StepperNavigation({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onComplete,
  nextLabel = "Next",
  previousLabel = "Previous",
  completeLabel = "Complete",
  canProceed = true,
  className,
}: StepperNavigationProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className={cn("flex justify-between pt-6", className)}>
      <Button
        type="button"
        variant="outline"
        onClick={onPrevious}
        disabled={isFirstStep}
      >
        {previousLabel}
      </Button>
      <Button
        type="button"
        onClick={isLastStep ? onComplete : onNext}
        disabled={!canProceed}
      >
        {isLastStep ? completeLabel : nextLabel}
      </Button>
    </div>
  );
}

export { Stepper, StepperContent, StepperNavigation, type Step };
