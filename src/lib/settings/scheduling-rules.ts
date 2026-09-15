import { z } from "zod";

import type { PayrollConfig } from "@/lib/settings/payroll";

// ============================================================================
// The rules the schedule warns about.
//
// ── WHY THIS IS SMALL ─────────────────────────────────────────────────────
//
// Scheduling settings were about seventy options in `useState`, saved nowhere
// (`handleSave` was a TODO), and read by nothing. The schedule's conflict
// warnings used a constant in `ScheduleView.tsx` instead — 40 hours, 8 hours'
// rest, 6 days in a row — whatever a facility chose.
//
// Only two of those numbers belong to scheduling alone, so only two are stored
// here. Everything else was a switch for a feature that does not exist (swap
// deadlines, sick call-ins, coverage minimums, break tracking) and comes back
// with its feature, not before.
//
// ── OVERTIME IS PAYROLL'S, NOT A SECOND COPY ──────────────────────────────
//
// The weekly overtime threshold and the day a week starts already live in
// `payroll_config`, and payroll pays from them. A scheduling copy would let the
// schedule warn at 40 hours while the pay run paid overtime from 44. So the
// warning reads payroll's rule, and with no rule set it warns about no
// overtime — an hour past 40 is not overtime in a facility that pays none.
//
// ── THESE WARN, THEY DO NOT BLOCK ─────────────────────────────────────────
//
// Both checks are `warning` severity in scheduling-conflicts.ts, so a default
// is safe here in a way it is not for money: 8 hours and 6 days are what the
// schedule already assumed, and a facility that never opens the screen sees
// exactly what it saw before. 0 turns a warning off.
// ============================================================================

export const schedulingRulesSchema = z.object({
  /** Warn when a person has less rest than this between two shifts. 0 = off. */
  minRestHours: z.number().min(0).max(24).default(8),
  /** Warn when a person would work more days in a row than this. 0 = off. */
  maxConsecutiveDays: z.number().int().min(0).max(14).default(6),
});

export type SchedulingRules = z.infer<typeof schedulingRulesSchema>;

export const DEFAULT_SCHEDULING_RULES: SchedulingRules = {
  minRestHours: 8,
  maxConsecutiveDays: 6,
};

/** What the conflict checks read, from the two domains that own the numbers. */
export interface ShiftRules {
  /** 0 when payroll has no overtime rule: no overtime warning at all. */
  overtimeThresholdWeekly: number;
  minTimeBetweenShifts: number;
  maxConsecutiveDays: number;
  /** 0 = Sunday, as `payroll_config.weekStartsOn`. Where a week's hours reset. */
  weekStartsOn: number;
}

export function shiftRulesFrom(
  rules: SchedulingRules,
  payroll: PayrollConfig,
): ShiftRules {
  return {
    overtimeThresholdWeekly: payroll.overtime.enabled
      ? payroll.overtime.weeklyThresholdHours
      : 0,
    minTimeBetweenShifts: rules.minRestHours,
    maxConsecutiveDays: rules.maxConsecutiveDays,
    weekStartsOn: payroll.weekStartsOn,
  };
}
