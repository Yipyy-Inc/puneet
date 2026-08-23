import {
  stepCompletion,
  type MerchantApplication,
} from "@/lib/merchant-application/application";

// ============================================================================
// The five steps, in one place.
//
// The wizard renders them, the landing page counts them, and the status screen
// names the one a facility stopped at. Three screens quoting "step 3 of 5" from
// three different literals is how a wizard ends up telling somebody they are on
// step 4 of 3.
// ============================================================================

export const APPLY_STEPS = [
  { n: 1, title: "Business", hint: "Legal name and address" },
  { n: 2, title: "Owners", hint: "Anyone owning 25% or more" },
  { n: 3, title: "Banking", hint: "Where payouts land" },
  { n: 4, title: "Documents", hint: "Proof of the above" },
  { n: 5, title: "Review & sign", hint: "Check it and submit" },
] as const;

export const APPLY_STEP_COUNT = APPLY_STEPS.length;

/**
 * The step a facility should land on when they come back.
 *
 * Derived from the rows, never stored. Somebody who filled the bank details
 * before the owners should return to the owners, not to wherever they happened
 * to be when they closed the tab.
 */
export function firstIncompleteStep(app: MerchantApplication): number {
  const done = stepCompletion(app);
  if (!done.business) return 1;
  if (!done.principals) return 2;
  if (!done.banking) return 3;
  if (!done.documents) return 4;
  return 5;
}

/** How much of it is finished, for the resume banner. */
export function completedStepCount(app: MerchantApplication): number {
  const done = stepCompletion(app);
  return [done.business, done.principals, done.banking, done.documents].filter(
    Boolean,
  ).length;
}
