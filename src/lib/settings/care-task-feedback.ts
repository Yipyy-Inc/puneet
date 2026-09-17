import { z } from "zod";

import { OUTCOME_OPTIONS } from "@/components/daily-care/outcome-meta";

// ============================================================================
// How a meal and a dose went — the choices staff pick from when they log one.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// `facilityConfig.careTaskFeedback` in `src/data/facility-config.ts`, a plain
// object literal. The settings screen used to assign into it — literally
// `facilityConfig.careTaskFeedback.feeding = feedingOptions` — which the React
// Compiler later refused, so the assignment was removed and the screen was left
// flashing "Feedback options saved" over nothing at all.
//
// It would not have worked anyway, and the note left in CareTaskSettings said
// so: every consumer captured the list in a MODULE-LEVEL const, read once when
// its module was first evaluated. Editing an option here has never changed the
// dropdown a staff member sees.
//
// ── THE SHIPPED DEFAULT COMES FROM outcome-meta, NOT facility-config ───────
//
// There were TWO copies of this list. `facility-config.careTaskFeedback` was
// the "configurable" one nothing read, and `OUTCOME_OPTIONS.feeding` /
// `.medication` in outcome-meta.ts is the one staff actually see — the same
// values, shorter labels, plus a `tone` the badges are coloured from. A comment
// in outcome-meta claims the two "match", which is the arrangement that lets
// them drift.
//
// The one staff see wins. A facility that has never opened the screen keeps
// exactly the board it has today, and the first edit makes it theirs.
//
// ── A FACILITY'S OWN OPTION HAS NO TONE, AND THAT IS NOT A NEW VALUE ──────
//
// `tone` is optional here and absent means `neutral` — already one of the four
// the badge understands. A facility adding "Ate half" gets a neutral badge
// rather than an invented colour (§5v: never choose a value that is not
// already in the system).
//
// NOT the whole board yet. `getOutcomeOption` still serves the static table to
// eleven files that only look a label up for DISPLAY; the two screens that
// actually offer the choice — FeedingLogModal and MedicationLogModal — read
// this. Converting the display lookups is a scoped refactor; see the debt map.
// ============================================================================

const optionSchema = z.object({
  /** Stored on the care-log entry. Changing it orphans past entries. */
  value: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
  tone: z.enum(["success", "warning", "danger", "neutral"]).optional(),
});

export type CareTaskFeedbackOption = z.infer<typeof optionSchema>;

export const careTaskFeedbackSchema = z.object({
  feeding: z.array(optionSchema).max(24),
  medication: z.array(optionSchema).max(24),
});

export type CareTaskFeedback = z.infer<typeof careTaskFeedbackSchema>;

/**
 * What the board offers today. Taken from `OUTCOME_OPTIONS` so a facility that
 * has never opened the screen sees no change whatsoever.
 */
export const SHIPPED_CARE_TASK_FEEDBACK: CareTaskFeedback = {
  feeding: OUTCOME_OPTIONS.feeding.map((o) => ({ ...o })),
  medication: OUTCOME_OPTIONS.medication.map((o) => ({ ...o })),
};
