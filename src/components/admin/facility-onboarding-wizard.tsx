"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Building2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import {
  STEP_META,
  createDefaultDraft,
} from "./facility-onboarding/wizard-config";
import type { FacilityDraft } from "./facility-onboarding/wizard-types";
import { WizardProgress } from "./facility-onboarding/wizard-progress";
import { BusinessInformationStep } from "./facility-onboarding/business-information-step";
import { PlanTrialStep } from "./facility-onboarding/plan-trial-step";
import { ServicesPricingStep } from "./facility-onboarding/services-pricing-step";
import { OperatingConfigurationStep } from "./facility-onboarding/operating-configuration-step";
import { PrimaryAdminStep } from "./facility-onboarding/primary-admin-step";
import { ReviewStep } from "./facility-onboarding/review-step";
import { SuccessScreen } from "./facility-onboarding/success-screen";

export function FacilityOnboardingWizard({
  onClose,
  prefill,
}: {
  onClose: () => void;
  /** Seed the draft (e.g. when approving a facility application). */
  prefill?: Partial<FacilityDraft>;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [created, setCreated] = useState(false);
  // Single source of truth — persists across Back/Forward navigation.
  const [draft, setDraft] = useState<FacilityDraft>(() => ({
    ...createDefaultDraft(),
    ...prefill,
  }));

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!mounted) return null;

  const commit = (values: Partial<FacilityDraft>) =>
    setDraft((d) => ({ ...d, ...values }));

  const handleNext = (values: Partial<FacilityDraft>) => {
    commit(values);
    setStep((s) => Math.min(s + 1, STEP_META.length - 1));
  };

  const handleBack = (values: Partial<FacilityDraft>) => {
    commit(values);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleCreate = () => {
    setCreated(true);
    toast.success(
      "Facility created — welcome email sent to the primary admin.",
    );
  };

  const handleViewProfile = () => {
    onClose();
    router.push("/dashboard/facilities");
  };

  const stepProps = {
    draft,
    onNext: handleNext,
    onBack: step > 0 ? handleBack : undefined,
    onCancel: onClose,
  };

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add Facility"
      className="bg-background fixed inset-0 z-50 flex flex-col"
    >
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-sm">
            <Building2 className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">
              Add Facility
            </h2>
            {!created && (
              <p className="text-muted-foreground truncate text-xs">
                Step {step + 1} of {STEP_META.length} · {STEP_META[step].title}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close wizard"
        >
          <X className="size-5" />
        </Button>
      </header>

      {created ? (
        // min-h-0 + overflow-y-auto: without a scroll container the step body
        // is clipped by the fixed inset-0 shell on short screens, leaving the
        // lower fields and the Next button unreachable on phones.
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SuccessScreen
            facilityName={draft.displayName || draft.legalName}
            onViewProfile={handleViewProfile}
            onClose={onClose}
          />
        </div>
      ) : (
        <>
          <WizardProgress step={step} onStepClick={(i) => setStep(i)} />
          <div className="min-h-0 flex-1 overflow-y-auto">
            {step === 0 && <BusinessInformationStep {...stepProps} />}
            {step === 1 && <PlanTrialStep {...stepProps} />}
            {step === 2 && <ServicesPricingStep {...stepProps} />}
            {step === 3 && <OperatingConfigurationStep {...stepProps} />}
            {step === 4 && <PrimaryAdminStep {...stepProps} />}
            {step === 5 && (
              <ReviewStep
                draft={draft}
                onEdit={(i) => setStep(i)}
                onBack={() => setStep(4)}
                onCancel={onClose}
                onCreate={handleCreate}
              />
            )}
          </div>
        </>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
}
