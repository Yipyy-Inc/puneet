// Types for the facility onboarding checklist.
// Separated from the data/constants in src/data/facility-onboarding.ts per the
// CLAUDE.md "Separate types from data" rule.

export type OnboardingStepStatus = "complete" | "in_progress" | "not_started";

export interface OnboardingStepDef {
  id: string;
  order: number;
  title: string;
  description: string;
  /** Deep-link to the relevant facility section. */
  route: string;
  /** CTA label shown while the step is not yet complete. */
  cta: string;
}
