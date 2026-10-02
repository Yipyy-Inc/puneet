import type { WizardStepState } from "@/lib/bookings/wizard/progress";

// ============================================================================
// The evaluation flow's rail, as the client's mock lists it (2026-10-02):
// flat, every screen a numbered step — decided with the user that day.
//
//   customer   Your pets · Service · Date & time · About your pet · Review & confirm
//   staff      Client & pet · Service · Date & time · Review & book
//
// The first step stays the wizard's shared one: the service is not known
// there, so it cannot be the evaluation's own. Its percent is the mock's
// too — the step's place in the list, from 0% on the first to 100% on the
// last — rather than the shared wizard's units.
// ============================================================================

export interface EvaluationRailInput {
  /** 0 client & pet, 1 service, 2 details, 3 confirm. */
  stepIndex: number;
  /** The Details screen open now (its id: 0 Date & time, 2 About your pet). */
  subStepId: number;
  /** Details' screens for this viewer, in order. */
  subStepIds: readonly number[];
  done: boolean;
}

export interface EvaluationRailStep {
  /** "client-pet" · "service" · "details:0" · "details:2" · "confirm". */
  id: string;
  /** Where choosing it goes. */
  target: { step: number; subStepId?: number };
  state: WizardStepState;
}

/** Each step's place: before Details, each Details screen, then Confirm. */
function placeOf(input: EvaluationRailInput): number {
  if (input.stepIndex < 2) return input.stepIndex;
  if (input.stepIndex === 2) {
    const at = input.subStepIds.indexOf(input.subStepId);
    return 2 + Math.max(0, at);
  }
  return 2 + input.subStepIds.length;
}

export function evaluationRail(input: EvaluationRailInput): {
  steps: EvaluationRailStep[];
  /** 1-based, for "STEP 3 OF 5". */
  number: number;
  count: number;
  percent: number;
} {
  const entries: Array<{ id: string; target: EvaluationRailStep["target"] }> = [
    { id: "client-pet", target: { step: 0 } },
    { id: "service", target: { step: 1 } },
    ...input.subStepIds.map((subStepId) => ({
      id: `details:${subStepId}`,
      target: { step: 2, subStepId },
    })),
    { id: "confirm", target: { step: 3 } },
  ];
  const place = placeOf(input);
  const steps = entries.map((entry, index) => ({
    ...entry,
    state: (input.done || index < place
      ? "done"
      : index === place
        ? "current"
        : "todo") as WizardStepState,
  }));
  const count = entries.length;
  return {
    steps,
    number: Math.min(place + 1, count),
    count,
    percent: input.done
      ? 100
      : count > 1
        ? Math.round((Math.min(place, count - 1) / (count - 1)) * 100)
        : 0,
  };
}
