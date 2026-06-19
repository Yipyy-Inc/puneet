"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "lucide-react";

interface Step {
  id: string;
  title: string;
  description?: string;
  /** Greyed out in the rail; typically a step skipped by upstream answers. */
  disabled?: boolean;
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

function Stepper({
  steps,
  currentStep,
  onStepChange,
  className,
}: StepperProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Step circles row - aligned horizontally */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = !step.disabled && index < currentStep;
          const isActive = index === currentStep;
          const interactive = !!onStepChange && !step.disabled;
          const circleClass = cn(
            `flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium`,
            step.disabled
              ? "border-muted-foreground/20 bg-muted text-muted-foreground/40"
              : isCompleted || isActive
                ? "border-primary bg-primary text-primary-foreground"
                : `border-muted-foreground/30 bg-background text-muted-foreground`,
            interactive &&
              "cursor-pointer transition-transform hover:scale-105",
          );
          const circleContent = isCompleted ? (
            <CheckIcon className="size-4" />
          ) : (
            index + 1
          );
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-1 flex-col items-center">
                {interactive ? (
                  <button
                    type="button"
                    onClick={() => onStepChange?.(index)}
                    className={circleClass}
                    aria-current={isActive ? "step" : undefined}
                  >
                    {circleContent}
                  </button>
                ) : (
                  <div className={circleClass}>{circleContent}</div>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-px flex-1",
                    isCompleted ? "bg-primary" : "bg-muted-foreground/30",
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* Step titles row - below circles */}
      <div className="flex items-start justify-between">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="flex flex-1 flex-col items-center text-center"
          >
            <div
              className={cn(
                "text-sm font-medium",
                step.disabled
                  ? "text-muted-foreground/40"
                  : index <= currentStep
                    ? "text-foreground"
                    : "text-muted-foreground",
              )}
            >
              {step.title}
            </div>
            {step.disabled ? (
              <div className="text-muted-foreground/40 mt-1 max-w-24 text-xs italic">
                Skipped
              </div>
            ) : (
              step.description && (
                <div className="text-muted-foreground mt-1 max-w-24 text-xs">
                  {step.description}
                </div>
              )
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
