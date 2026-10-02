// ============================================================================
// How far through the booking wizard someone is, as the client's mock counts
// it (docs/Facility_01_-_Find_client.html, 2026-10-01): every step is one
// unit, except Details, which is one unit per screen inside it. So a boarding
// booking (five Details screens) moves the bar in eighths and a daycare one
// in sevenths, and the bar never jumps a quarter at a time across Details.
//
//   units   = 3 + max(sub-steps, 1)
//   reached = the step's index before Details, 2 + the screen inside it, and
//             every unit once past it
// ============================================================================

export type WizardStepState = "done" | "current" | "todo";

/** Percent through the wizard, 0–100, whole numbers. */
export function wizardProgress(input: {
  /** 0 client & pet, 1 service, 2 details, 3 confirm. */
  stepIndex: number;
  /** Position of the open Details screen, from 0. */
  subIndex: number;
  /** How many screens Details has for this service. */
  subCount: number;
  /** The booking was made: the bar is full. */
  done: boolean;
}): number {
  if (input.done) return 100;
  const subs = Math.max(input.subCount, 1);
  const total = 3 + subs;
  const reached =
    input.stepIndex < 2
      ? input.stepIndex
      : input.stepIndex === 2
        ? 2 + Math.min(Math.max(input.subIndex, 0), subs - 1)
        : 2 + subs;
  return Math.round((reached / total) * 100);
}
