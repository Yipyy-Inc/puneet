import { z } from "zod";

import { trainingPackageSchema, type TrainingPackage } from "@/types/training";

// ============================================================================
// The facility's training programs — the priced offers on the training Rates
// tab (Puppy Foundations, 6 sessions, $240…), what they include and what
// they lead into.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// `trainingPackages` from `@/data/training`. The Rates tab wrote its edits
// into the query cache with `setQueryData` and toasted "created"; a program
// was gone on reload and never reached the booking modal or the prerequisite
// checks, which read the fixture directly.
//
// ── THE FALLBACK IS EMPTY, ON PURPOSE ─────────────────────────────────────
//
// A program is a price. A facility that has set none sells its classes at
// their series price, not at the fixture's invented programs.
// ============================================================================

export const trainingProgramsSchema = z
  .object({ programs: z.array(trainingPackageSchema) })
  .passthrough();

export interface TrainingProgramsConfig {
  programs: TrainingPackage[];
}

export const NO_TRAINING_PROGRAMS: TrainingProgramsConfig = { programs: [] };
