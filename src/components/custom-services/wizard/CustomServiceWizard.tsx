"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Stepper,
  StepperContent,
  StepperNavigation,
  type Step,
} from "@/components/ui/stepper";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { BasicInfoStep } from "./steps/BasicInfoStep";
import { WorkflowQuestionnaireStep } from "./steps/WorkflowQuestionnaireStep";
import { CalendarAvailabilityStep } from "./steps/CalendarAvailabilityStep";
import { CheckInOutStep } from "./steps/CheckInOutStep";
import { StayBasedStep } from "./steps/StayBasedStep";
import { OnlineBookingStep } from "./steps/OnlineBookingStep";
import { PricingStep } from "./steps/PricingStep";
import { StaffAssignmentStep } from "./steps/StaffAssignmentStep";
import { YipyyGoConfigStep } from "./steps/YipyyGoConfigStep";
import { EligibilityStep } from "./steps/EligibilityStep";
import { CareInstructionsStep } from "./steps/CareInstructionsStep";
import { WizardReviewPanel } from "./WizardReviewPanel";
import { useCustomServices } from "@/hooks/use-custom-services";
import {
  createDefaultCustomServiceModule,
  getModuleWorkflowQuestionnaire,
} from "@/data/custom-services";
import type { CustomServiceModule } from "@/types/facility";

// ========================================
// WIZARD STEPS CONFIG
// ========================================

const WIZARD_STEPS: Step[] = [
  { id: "basic", title: "Basic Info", description: "Name & category" },
  {
    id: "workflow",
    title: "Workflow Setup",
    description: "Required questionnaire",
  },
  { id: "calendar", title: "Calendar", description: "Scheduling" },
  { id: "checkin", title: "Check-In/Out", description: "Arrival tracking" },
  { id: "stay", title: "Stay-Based", description: "Multi-day stays" },
  { id: "booking", title: "Online Booking", description: "Client portal" },
  { id: "pricing", title: "Pricing", description: "Rates & billing" },
  { id: "staff", title: "Staff", description: "Assignment & tasks" },
  {
    id: "yipyygo",
    title: "Yipyy Express Check-in",
    description: "Pre-check-in form",
  },
  { id: "eligibility", title: "Rules", description: "Eligibility & capacity" },
  {
    id: "care",
    title: "Care Instructions",
    description: "Feeding, meds & belongings",
  },
  { id: "review", title: "Review", description: "Confirm & save" },
];

// ========================================
// STEP DESCRIPTIONS
// ========================================

const STEP_DETAILS: { title: string; description: string }[] = [
  {
    title: "Basic Information",
    description:
      "Give your service a name, choose a category, pick an icon, and add a public description.",
  },
  {
    title: "Required Workflow Questionnaire",
    description:
      "Answer the 8 required setup questions. These responses automatically configure how the service behaves across calendar, booking, tasks, resources, online booking, and reporting.",
  },
  {
    title: "Calendar & Availability",
    description:
      "Configure how this service appears on your scheduling calendar, session durations, and resource assignments.",
  },
  {
    title: "Check-In / Check-Out",
    description:
      "Set up how pet arrivals and departures are tracked for this service.",
  },
  {
    title: "Stay-Based Features",
    description:
      "Enable for multi-day services that use physical space like kennels or suites.",
  },
  {
    title: "Online Booking",
    description:
      "Control whether clients can book this service from your public portal and set eligibility rules.",
  },
  {
    title: "Pricing",
    description:
      "Choose a pricing model, set rates, and configure tax and billing options.",
  },
  {
    title: "Staff Assignment",
    description:
      "Configure auto-assignment, required staff roles, and which tasks are auto-generated.",
  },
  {
    title: "Yipyy Express Check-in",
    description:
      "Configure whether customers must complete a pre-check-in form before their booking, and customize the sections shown.",
  },
  {
    title: "Eligibility, Dependencies & Capacity",
    description:
      "Set conditions for who can book, service dependencies, and capacity limits with waitlists.",
  },
  {
    title: "Care Instructions",
    description:
      "Choose whether feeding instructions, medications, and belongings are required, optional, or disabled for this service.",
  },
  {
    title: "Review & Save",
    description:
      "Review all your settings before saving the module. Click Edit on any section to make changes.",
  },
];

// ========================================
// PROPS
// ========================================

interface CustomServiceWizardProps {
  /** Provide to pre-populate the wizard (edit mode). If omitted, creates a new module. */
  initialData?: CustomServiceModule;
  /** Called after successful save */
  onSaved?: (module: CustomServiceModule) => void;
  /** Called when user cancels */
  onCancel?: () => void;
  /** Show facility selector dropdown (super admin context) */
  showFacilitySelector?: boolean;
  /** Override the default redirect path after save/cancel */
  redirectPath?: string;
}

// ========================================
// COMPONENT
// ========================================

export function CustomServiceWizard({
  initialData,
  onSaved,
  onCancel,
  showFacilitySelector = false,
  redirectPath = "/facility/dashboard/services/custom",
}: CustomServiceWizardProps) {
  const router = useRouter();
  const { addModule, updateModule, resources } = useCustomServices();
  const isEditMode = !!initialData;

  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data — never from localStorage, always in-memory
  const [formData, setFormData] = useState<CustomServiceModule>(() => {
    if (initialData) return { ...initialData };
    return createDefaultCustomServiceModule(11); // default facilityId
  });

  const handleChange = useCallback((updates: Partial<CustomServiceModule>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Validate step before proceeding
  const canProceedFromStep = (step: number): boolean => {
    if (step === 0) {
      return formData.name.trim().length > 0 && formData.slug.length > 0;
    }
    if (step === 1) {
      return getModuleWorkflowQuestionnaire(formData).questionnaireCompleted;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleEditStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleSave = async () => {
    const workflow = getModuleWorkflowQuestionnaire(formData);
    if (!workflow.questionnaireCompleted) {
      setCurrentStep(1);
      toast.error("Complete the workflow questionnaire before saving.");
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      if (isEditMode) {
        updateModule(formData.id, { ...formData, updatedAt: now });
      } else {
        addModule({ ...formData, createdAt: now, updatedAt: now });
      }
      onSaved?.(formData);
      router.push(redirectPath);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    router.push(redirectPath);
  };

  const stepDetail = STEP_DETAILS[currentStep];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-3 py-6 sm:px-4">
      {/* Stepper header — hidden on small screens, shown as step counter instead */}
      <Card className="overflow-hidden">
        <CardContent className="px-3 pt-6 sm:px-6">
          <div className="hidden sm:block">
            <Stepper
              steps={WIZARD_STEPS}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
            />
          </div>
          <div className="text-center sm:hidden">
            <p className="text-muted-foreground text-sm">
              Step {currentStep + 1} of {WIZARD_STEPS.length}
            </p>
            <p className="font-medium">{WIZARD_STEPS[currentStep].title}</p>
          </div>
        </CardContent>
      </Card>

      {/* Step content with transition */}
      <Card>
        <CardHeader className="px-4 pb-2 sm:px-6">
          <CardTitle>{stepDetail.title}</CardTitle>
          <CardDescription>{stepDetail.description}</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <StepperContent>
            <div
              key={currentStep}
              className="animate-in fade-in slide-in-from-right-2 duration-200"
            >
              {currentStep === 0 && (
                <BasicInfoStep
                  data={formData}
                  onChange={handleChange}
                  showFacilitySelector={showFacilitySelector}
                />
              )}
              {currentStep === 1 && (
                <WorkflowQuestionnaireStep
                  data={formData}
                  resources={resources}
                  onChange={handleChange}
                />
              )}
              {currentStep === 2 && (
                <CalendarAvailabilityStep
                  data={formData}
                  resources={resources}
                  onChange={handleChange}
                />
              )}
              {currentStep === 3 && (
                <CheckInOutStep data={formData} onChange={handleChange} />
              )}
              {currentStep === 4 && (
                <StayBasedStep data={formData} onChange={handleChange} />
              )}
              {currentStep === 5 && (
                <OnlineBookingStep data={formData} onChange={handleChange} />
              )}
              {currentStep === 6 && (
                <PricingStep data={formData} onChange={handleChange} />
              )}
              {currentStep === 7 && (
                <StaffAssignmentStep data={formData} onChange={handleChange} />
              )}
              {currentStep === 8 && (
                <YipyyGoConfigStep data={formData} onChange={handleChange} />
              )}
              {currentStep === 9 && (
                <EligibilityStep data={formData} onChange={handleChange} />
              )}
              {currentStep === 10 && (
                <CareInstructionsStep data={formData} onChange={handleChange} />
              )}
              {currentStep === 11 && (
                <WizardReviewPanel
                  data={formData}
                  onEditStep={handleEditStep}
                />
              )}
            </div>

            <StepperNavigation
              currentStep={currentStep}
              totalSteps={WIZARD_STEPS.length}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onComplete={handleSave}
              nextLabel="Next Step"
              previousLabel="Back"
              completeLabel={
                isSaving
                  ? "Saving..."
                  : isEditMode
                    ? "Update Module"
                    : "Save Module"
              }
              canProceed={canProceedFromStep(currentStep) && !isSaving}
            />
          </StepperContent>
        </CardContent>
      </Card>

      {/* Cancel link */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleCancel}
          className="text-muted-foreground text-xs underline-offset-2 hover:underline"
        >
          Cancel and discard changes
        </button>
      </div>
    </div>
  );
}
