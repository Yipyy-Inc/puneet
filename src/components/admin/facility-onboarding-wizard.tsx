"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import {
  SuccessScreen,
  type DomainOutcome,
  type OwnerInviteOutcome,
} from "./facility-onboarding/success-screen";

type Created = {
  facilityId?: string;
  slug?: string;
  invite?: OwnerInviteOutcome | null;
  domain?: DomainOutcome | null;
};

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
  // One id for the whole wizard, so a retry cannot mint a second facility.
  const [requestId] = useState(() => crypto.randomUUID());
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

  // ──────────────────────────────────────────────────────────────────────────
  // Creating the facility.
  //
  // This used to be `setCreated(true)` and a toast reading "Facility created —
  // welcome email sent to the primary admin." No request was made. Both halves
  // of that sentence were false, and a superadmin was then dropped on a
  // facilities list with nothing new in it while waiting for an invitation that
  // could never arrive.
  //
  // `requestId` is minted ONCE per wizard, not per attempt: if the first call
  // times out and they press Create again, the second carries the same id and
  // provision_facility returns the first call's answer instead of creating a
  // second business.
  // ──────────────────────────────────────────────────────────────────────────
  const create = useMutation({
    mutationFn: async (): Promise<Created> => {
      const response = await fetch("/api/facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          name: draft.displayName || draft.legalName,
          timezone: draft.timeZone || undefined,
          ownerName: `${draft.adminFirstName} ${draft.adminLastName}`.trim(),
          ownerEmail: draft.adminEmail,
          contactPhone: draft.phone,
          website: draft.website,
          locations: draft.city ? [{ name: draft.city }] : [],
          businessTypes: draft.businessTypes,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | (Created & { error?: string })
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not create the facility.");
      }
      return body as Created;
    },
    onSuccess: () => setCreated(true),
    // A real failure now has somewhere to go. There was no failure path before,
    // because there was nothing that could fail.
    onError: (error: Error) => toast.error(error.message),
  });

  // AFTER the hooks, never before: `useMutation` above must run on every
  // render or React loses hook order (react-hooks/rules-of-hooks caught this).
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

  const handleCreate = () => create.mutate();

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
            ownerEmail={draft.adminEmail}
            invite={create.data?.invite ?? null}
            domain={create.data?.domain ?? null}
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
                creating={create.isPending}
              />
            )}
          </div>
        </>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
}
