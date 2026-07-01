"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Stepper,
  StepperContent,
  StepperNavigation,
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
import {
  validateCustomServiceModule,
  hasBlockingIssues,
} from "@/lib/custom-service-validation";
import type { CustomServiceModule } from "@/types/facility";

// ========================================
// WIZARD STEPS CONFIG
// ========================================
//
// The Workflow Questionnaire (step 2) is the "brain" of the wizard: its answers
// decide which later steps are relevant. Irrelevant steps stay in the progress
// rail but are greyed out and auto-skipped by Next/Back. Each step declares its
// own `visible` predicate (defaults to always visible) so adding new conditional
// steps is just a matter of adding a rule here — no index juggling elsewhere.

interface WizardStepDef {
  id: string;
  /** Short label + description shown in the stepper rail. */
  title: string;
  description: string;
  /** Heading + blurb shown above the step content. */
  detailTitle: string;
  detailDescription: string;
  /**
   * Whether the step is relevant for the current answers. When false the step
   * is greyed out in the rail and skipped by navigation. Default: relevant.
   */
  visible?: (data: CustomServiceModule) => boolean;
  /** Whether the user may advance past this step. Default: yes. */
  validate?: (data: CustomServiceModule) => boolean;
}

const WIZARD_STEP_DEFS: WizardStepDef[] = [
  {
    id: "basic",
    title: "Basic Info",
    description: "Name & category",
    detailTitle: "Basic Information",
    detailDescription:
      "Give your service a name, choose a category, pick an icon, and add a public description.",
    validate: (d) => d.name.trim().length > 0 && d.slug.length > 0,
  },
  {
    id: "workflow",
    title: "Workflow Setup",
    description: "Required questionnaire",
    detailTitle: "Required Workflow Questionnaire",
    detailDescription:
      "Answer the 10 required setup questions. These responses automatically configure how the service behaves and which of the following steps you'll see.",
    validate: (d) => getModuleWorkflowQuestionnaire(d).questionnaireCompleted,
  },
  {
    id: "calendar",
    title: "Calendar",
    description: "Scheduling",
    detailTitle: "Calendar & Availability",
    detailDescription:
      "Configure how this service appears on your scheduling calendar, session durations, and resource assignments.",
  },
  {
    id: "checkin",
    title: "Check-In/Out",
    description: "Arrival tracking",
    detailTitle: "Check-In / Check-Out",
    detailDescription:
      "Set up how pet arrivals and departures are tracked for this service.",
    // Q4 — skipped entirely when the service does not require check-in/out.
    visible: (d) => getModuleWorkflowQuestionnaire(d).requiresCheckInOut,
  },
  {
    id: "stay",
    title: "Stay-Based",
    description: "Multi-day stays",
    detailTitle: "Stay-Based Features",
    detailDescription:
      "Enable for multi-day services that use physical space like kennels or suites.",
    // Stay-based suits multi-day services. A time-slot session that also counts
    // toward capacity (e.g. a pool) is skipped per Workflow Q2 + Q8.
    visible: (d) => {
      const wf = getModuleWorkflowQuestionnaire(d);
      return !(wf.requiresTimeSlots && wf.affectsCapacityHeatmap);
    },
  },
  {
    id: "booking",
    title: "Online Booking",
    description: "Client portal",
    detailTitle: "Online Booking",
    detailDescription:
      "Control whether clients can book this service from your public portal and set eligibility rules.",
    // Q7 — only relevant when the service is bookable online.
    visible: (d) => getModuleWorkflowQuestionnaire(d).bookableOnline,
  },
  {
    id: "pricing",
    title: "Pricing",
    description: "Rates & billing",
    detailTitle: "Pricing",
    detailDescription:
      "Choose a pricing model, set rates, and configure tax and billing options.",
  },
  {
    id: "staff",
    title: "Staff",
    description: "Assignment & tasks",
    detailTitle: "Staff Assignment",
    detailDescription:
      "Configure auto-assignment, required staff roles, and which tasks are auto-generated.",
  },
  {
    id: "yipyygo",
    title: "Yipyy Express Check-in",
    description: "Pre-check-in form",
    detailTitle: "Yipyy Express Check-in",
    detailDescription:
      "Configure whether customers must complete a pre-check-in form before their booking, and customize the sections shown.",
  },
  {
    id: "eligibility",
    title: "Rules",
    description: "Eligibility & capacity",
    detailTitle: "Eligibility, Dependencies & Capacity",
    detailDescription:
      "Set conditions for who can book, service dependencies, and capacity limits with waitlists.",
  },
  {
    id: "care",
    title: "Care Instructions",
    description: "Feeding, meds & belongings",
    detailTitle: "Care Instructions",
    detailDescription:
      "Choose whether feeding instructions, medications, and belongings are required, optional, or disabled for this service.",
  },
  {
    id: "review",
    title: "Review",
    description: "Confirm & save",
    detailTitle: "Review & Save",
    detailDescription:
      "Review all your settings before saving the module. Click Edit on any section to make changes.",
    // Block Save until all critical pre-publish checks pass.
    validate: (d) => !hasBlockingIssues(validateCustomServiceModule(d)),
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
  /**
   * Seed a NEW module for this facility (facility-scoped creation). The facility
   * is fixed and not selectable — pair with `showFacilitySelector={false}`.
   * Ignored in edit mode (when `initialData` is provided).
   */
  facilityId?: number;
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
  facilityId,
}: CustomServiceWizardProps) {
  const router = useRouter();
  const { addModule, updateModule, resources } = useCustomServices();
  const isEditMode = !!initialData;

  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data — never from localStorage, always in-memory
  const [formData, setFormData] = useState<CustomServiceModule>(() => {
    if (initialData) return { ...initialData };
    // Facility-scoped creation seeds the fixed facility; falls back to 11.
    return createDefaultCustomServiceModule(facilityId ?? 11);
  });

  const handleChange = useCallback((updates: Partial<CustomServiceModule>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  // All steps stay in the rail; the questionnaire answers decide which are
  // skipped (greyed out + jumped over by navigation) rather than removed.
  const isStepEnabled = (step: WizardStepDef) =>
    step.visible?.(formData) ?? true;

  // Steps for the rail, each tagged disabled when skipped by the answers.
  const stepperSteps = WIZARD_STEP_DEFS.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    disabled: !isStepEnabled(s),
  }));

  // The current step is always an enabled one (we never land on a skipped step,
  // but guard defensively by snapping forward if answers disabled it).
  const enabledSteps = WIZARD_STEP_DEFS.filter(isStepEnabled);
  const activeStep =
    WIZARD_STEP_DEFS[currentStep] &&
    isStepEnabled(WIZARD_STEP_DEFS[currentStep])
      ? WIZARD_STEP_DEFS[currentStep]
      : (enabledSteps.find((s) => WIZARD_STEP_DEFS.indexOf(s) >= currentStep) ??
        enabledSteps[enabledSteps.length - 1]);
  const activeIndex = WIZARD_STEP_DEFS.indexOf(activeStep);

  const canProceed = activeStep.validate?.(formData) ?? true;

  // Next/previous skip over any disabled (irrelevant) steps automatically.
  const handleNext = () => {
    for (let i = activeIndex + 1; i < WIZARD_STEP_DEFS.length; i++) {
      if (isStepEnabled(WIZARD_STEP_DEFS[i])) {
        setCurrentStep(i);
        return;
      }
    }
  };

  const handlePrevious = () => {
    for (let i = activeIndex - 1; i >= 0; i--) {
      if (isStepEnabled(WIZARD_STEP_DEFS[i])) {
        setCurrentStep(i);
        return;
      }
    }
  };

  const goToStepId = (stepId: string) => {
    const index = WIZARD_STEP_DEFS.findIndex((s) => s.id === stepId);
    if (index >= 0 && isStepEnabled(WIZARD_STEP_DEFS[index])) {
      setCurrentStep(index);
    }
  };

  const handleSave = async () => {
    const workflow = getModuleWorkflowQuestionnaire(formData);
    if (!workflow.questionnaireCompleted) {
      goToStepId("workflow");
      toast.error("Complete the workflow questionnaire before saving.");
      return;
    }

    if (hasBlockingIssues(validateCustomServiceModule(formData))) {
      toast.error("Resolve the required pre-publish checks before saving.");
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

  const renderStep = (stepId: string) => {
    switch (stepId) {
      case "basic":
        return (
          <BasicInfoStep
            data={formData}
            onChange={handleChange}
            showFacilitySelector={showFacilitySelector}
          />
        );
      case "workflow":
        return (
          <WorkflowQuestionnaireStep
            data={formData}
            resources={resources}
            onChange={handleChange}
          />
        );
      case "calendar":
        return (
          <CalendarAvailabilityStep
            data={formData}
            resources={resources}
            onChange={handleChange}
          />
        );
      case "checkin":
        return <CheckInOutStep data={formData} onChange={handleChange} />;
      case "stay":
        return <StayBasedStep data={formData} onChange={handleChange} />;
      case "booking":
        return <OnlineBookingStep data={formData} onChange={handleChange} />;
      case "pricing":
        return <PricingStep data={formData} onChange={handleChange} />;
      case "staff":
        return <StaffAssignmentStep data={formData} onChange={handleChange} />;
      case "yipyygo":
        return <YipyyGoConfigStep data={formData} onChange={handleChange} />;
      case "eligibility":
        return <EligibilityStep data={formData} onChange={handleChange} />;
      case "care":
        return <CareInstructionsStep data={formData} onChange={handleChange} />;
      case "review":
        return (
          <WizardReviewPanel
            data={formData}
            onEditStep={goToStepId}
            onChange={handleChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-3 py-6 sm:px-4">
      {/* Stepper header — hidden on small screens, shown as step counter instead */}
      <Card className="overflow-hidden">
        <CardContent className="px-3 pt-6 sm:px-6">
          <div className="hidden sm:block">
            <Stepper
              steps={stepperSteps}
              currentStep={activeIndex}
              onStepChange={(i) => {
                if (isStepEnabled(WIZARD_STEP_DEFS[i])) setCurrentStep(i);
              }}
            />
          </div>
          <div className="text-center sm:hidden">
            <p className="text-muted-foreground text-sm">
              Step {enabledSteps.indexOf(activeStep) + 1} of{" "}
              {enabledSteps.length}
            </p>
            <p className="font-medium">{activeStep.title}</p>
          </div>
        </CardContent>
      </Card>

      {/* Step content with transition */}
      <Card>
        <CardHeader className="px-4 pb-2 sm:px-6">
          <CardTitle>{activeStep.detailTitle}</CardTitle>
          <CardDescription>{activeStep.detailDescription}</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <StepperContent>
            <div
              key={activeStep.id}
              className="animate-in fade-in slide-in-from-right-2 duration-200"
            >
              {renderStep(activeStep.id)}
            </div>

            <StepperNavigation
              currentStep={activeIndex}
              totalSteps={WIZARD_STEP_DEFS.length}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onComplete={handleSave}
              nextLabel="Next Step"
              previousLabel="Back"
              completeLabel={
                isSaving
                  ? "Saving..."
                  : formData.scheduledPublishAt
                    ? "Schedule Publish"
                    : formData.status === "active"
                      ? isEditMode
                        ? "Update & Publish"
                        : "Publish Now"
                      : isEditMode
                        ? "Update Draft"
                        : "Save as Draft"
              }
              canProceed={canProceed && !isSaving}
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
