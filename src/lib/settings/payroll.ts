import { z } from "zod";

// ============================================================================
// What a facility pays above the base rate: overtime, and holidays.
//
// ── WHY THIS EXISTS ───────────────────────────────────────────────────────
//
// `payroll_summary()` computed gross as hours x rate and nothing else. That is
// correct for a demo and wrong for a real pay run almost anywhere: somebody who
// works 48 hours in a week is owed more than 48 x their rate, and somebody who
// works a statutory holiday is owed more than an ordinary day.
//
// The holiday side already half-existed — `holidayRates` in src/data/scheduling
// with a `multiplier`, drawn on the calendar as "x1.5 pay rate" — and payroll
// had never heard of it. So the roster told a manager a day cost time and a
// half while the wage bill for that day was flat.
//
// ── THE FALLBACK IS OFF, NOT QUEBEC ───────────────────────────────────────
//
// The same rule `tax_config` follows, for the same reason: the fixture ships
// Quebec's numbers, and inheriting them would have every facility on the
// platform computing overtime against a threshold a seed file invented — in
// Ontario, where the daily rule differs, in Alberta, in the United States.
//
// ── BUT SILENCE IS NOT SAFE HERE, WHICH TAX'S SILENCE IS ──────────────────
//
// An unconfigured `tax_config` means no tax line: the facility under-collects
// against its OWN liability, and no customer is over-charged. An unconfigured
// overtime rule means somebody is UNDER-PAID, which is exposure pointing the
// other way and lands on a person rather than a balance sheet.
//
// So `enabled: false` does not quietly mean "no overtime is owed". It means
// "nobody has said", and every screen that shows a gross figure has to say so
// too — the same treatment unpriced hours already get, for the same reason:
// folding an unknown into zero understates the wage bill and looks tidy doing
// it. `payroll_summary` returns `overtime_configured` so a screen cannot
// accidentally present an unconfigured run as a complete one.
//
// ── OVERTIME IS WEEKLY; A PAY PERIOD IS NOT ───────────────────────────────
//
// A fortnight holds two weeks. Summing 80 hours across 14 days and comparing
// that to a 40-hour threshold finds overtime nobody worked, and misses the week
// where somebody did 50 and then 30. The buckets are WEEKS, in the FACILITY's
// timezone, starting on `weekStartsOn` — which is why that lives here rather
// than being assumed to be Monday or read off the reader's locale.
//
// ── AND NO MINUTE IS PAID TWICE ───────────────────────────────────────────
//
// Hours worked on a holiday pay at the holiday multiplier. Overtime then
// applies to the hours over the threshold that were NOT already paid at a
// holiday rate. Jurisdictions differ on whether the two compound; paying a
// minute twice is wrong everywhere, so that is the line this draws.
// ============================================================================

export const overtimeRuleSchema = z.object({
  /**
   * False means NOBODY HAS SAID, not "no overtime is owed here".
   *
   * Read the banner above before treating this as a safe default — it travels
   * to the screens so they can say which of the two it is.
   */
  enabled: z.boolean().default(false),
  /** Hours in a week past which `multiplier` applies. */
  weeklyThresholdHours: z.number().min(0).max(168).default(40),
  /** 1.5 = time and a half. */
  multiplier: z.number().min(1).max(5).default(1.5),
});

// ── NO DAILY THRESHOLD, YET, AND DELIBERATELY NOT A FIELD ─────────────────
//
// Some jurisdictions pay overtime past a daily threshold as well as a weekly
// one — British Columbia after 8 hours, for instance. Quebec and Ontario are
// weekly only.
//
// A `dailyThresholdHours` field was drafted here and removed before it shipped:
// `payroll_summary` implements the weekly rule, so the field would have been a
// setting a facility could fill in and be paid nothing by. That is the same
// shape as every fake this module has spent three days deleting, and it is
// worse in a payroll screen than anywhere else.
//
// Adding it means a second bucket dimension in the function AND a rule for
// which of the two applies when both are exceeded (they do not simply add).
// That is its own change.

// ── THIS IS THE HOLIDAY-RATE CONCEPT, NOT A THIRD ONE ─────────────────────
//
// There were already two, and adding a third would have been the parallel-model
// debt this repo is already paying for:
//
//   `holidayRates` (src/data/scheduling)   { date, name, multiplier,
//     departmentId? } — specific dates that PAY MORE, drawn on the calendar as
//     "x1.5 pay rate". This replaces it. `departmentId` is dropped because no
//     caller of `isHoliday` has ever passed one; per-department holidays were a
//     capability nothing used.
//
//   `facilityHolidays` (src/data/settings)  { month, day, name } — RECURRING
//     dates with no multiplier, about whether the business is OPEN. A different
//     question, deliberately left alone: domains.ts parks it as read-only until
//     something can edit it, and merging "we are closed" with "this pays time
//     and a half" would answer both wrongly.
//
// So: one list, two readers. The calendar draws the multiplier and payroll
// bills it, from the same rows — which is the whole point. Before this, the
// roster told a manager a day cost time and a half and the wage bill for that
// day was flat.

export const payrollHolidaySchema = z.object({
  /** `YYYY-MM-DD`, in the facility's own calendar. */
  date: z.string(),
  name: z.string(),
  /** 1.5 = time and a half for hours worked that day. */
  multiplier: z.number().min(1).max(5).default(1.5),
});

export const payrollConfigSchema = z.object({
  overtime: overtimeRuleSchema.default({
    enabled: false,
    weeklyThresholdHours: 40,
    multiplier: 1.5,
  }),
  /**
   * The facility's statutory holidays. EMPTY by default, like `tax_config`'s
   * tax list: Quebec has eight and Ontario nine, and they fall on different
   * days. A list nobody chose is a list nobody should be paid against.
   */
  holidays: z.array(payrollHolidaySchema).default([]),
  /**
   * 0 = Sunday, matching `Date.getDay()` and the `day_of_week` column
   * `staff_availability` chose to agree with it. Decides where a week's
   * overtime bucket starts and ends.
   */
  weekStartsOn: z.number().int().min(0).max(6).default(0),
});

export type OvertimeRule = z.infer<typeof overtimeRuleSchema>;
export type PayrollHoliday = z.infer<typeof payrollHolidaySchema>;
export type PayrollConfig = z.infer<typeof payrollConfigSchema>;

/** No overtime rule and no holidays, until a facility says otherwise. */
export const NO_PAYROLL_RULES: PayrollConfig = {
  overtime: { enabled: false, weeklyThresholdHours: 40, multiplier: 1.5 },
  holidays: [],
  weekStartsOn: 0,
};
