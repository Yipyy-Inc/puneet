"use client";

import { FeedingStep } from "@/components/booking/feeding/feeding-step";
import type { FeedingStepState } from "@/components/booking/feeding/use-feeding-step";
import { MedicationsStep } from "@/components/booking/medications/medications-step";
import type { MedicationStepState } from "@/components/booking/medications/use-medication-step";
import { FEEDING_SUB_STEP_ID } from "@/lib/bookings/care-steps";
import { useShellText } from "@/lib/shell/use-shell-text";

// ============================================================================
// The Feeding or Medications step, for a service whose own details screen
// does not draw them — grooming and training, where the facility turned the
// steps on (2026-10-01). Daycare and boarding draw them in their own screens,
// as they always have. Until the service's own sub-steps are answered there
// are no days to plan over, so the step says to finish those first.
// ============================================================================

export function CareStepPanel({
  subStepId,
  ready,
  feedingStep,
  medicationStep,
  stepLabel,
}: {
  subStepId: number;
  /** The service's own sub-steps are answered: the step has its days. */
  ready: boolean;
  feedingStep: FeedingStepState;
  medicationStep: MedicationStepState;
  stepLabel: string;
}) {
  const t = useShellText("booking");
  if (!ready) {
    return (
      <div className="border-line-strong bg-card rounded-xl border-[1.5px] border-dashed p-8 text-center">
        <p className="text-body text-ink-secondary">
          {t("pleaseCompleteThePreviousSteps")}
        </p>
      </div>
    );
  }
  return subStepId === FEEDING_SUB_STEP_ID ? (
    <FeedingStep step={feedingStep} stepLabel={stepLabel} />
  ) : (
    <MedicationsStep step={medicationStep} stepLabel={stepLabel} />
  );
}
