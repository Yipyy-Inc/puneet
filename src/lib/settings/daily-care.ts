import { z } from "zod";

import { facilityDailyCareConfig } from "@/data/boarding";
import type { FacilityDailyCareConfig } from "@/types/boarding";

// ============================================================================
// The facility's Daily Care routine — the steps the board is built from
// (morning potty round, breakfast, meds, …), when each runs and to whom it
// applies.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// A module-level copy of the seed routine in `src/data/daily-care-config-
// store.ts`. The settings screen "autosaved" every edit into it, flashed
// "Saved", and the routine was back to the seed on the next reload — and a
// manager's routine was never the one the floor staff's tablet drew.
//
// ── THE FALLBACK IS THE SHIPPED ROUTINE, ON PURPOSE ───────────────────────
//
// Unlike money (where an empty fallback is the honest one), an empty routine
// is a Daily Care board with nothing on it: no rounds, no meals, no meds. The
// shipped routine is a product default a facility edits, the way the shipped
// vaccination rules are — so a facility that has not opened the screen gets a
// working board, and the first edit makes it theirs.
//
// The schema checks the shape the board depends on and lets each step's own
// optional detail through, so a saved routine the board can draw is never
// refused for a field this file does not know about.
// ============================================================================

const stepSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    taskType: z.string(),
    enabled: z.boolean(),
    sortOrder: z.number(),
  })
  .passthrough();

export const dailyCareConfigSchema = z
  .object({
    steps: z.array(stepSchema),
    alertOverdueAfterMinutes: z
      .number()
      .int()
      .min(0)
      .max(24 * 60),
    templates: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          steps: z.array(stepSchema),
        }),
      )
      .optional(),
    activeTemplateId: z.string().optional(),
  })
  .passthrough();

export const SHIPPED_DAILY_CARE_ROUTINE: FacilityDailyCareConfig =
  structuredClone(facilityDailyCareConfig);
