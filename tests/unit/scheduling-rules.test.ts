import { describe, expect, test } from "bun:test";

import { detectShiftConflicts } from "@/lib/scheduling-conflicts";
import { NO_PAYROLL_RULES, type PayrollConfig } from "@/lib/settings/payroll";
import {
  DEFAULT_SCHEDULING_RULES,
  schedulingRulesSchema,
  shiftRulesFrom,
} from "@/lib/settings/scheduling-rules";
import type { ScheduleEmployee, ScheduleShift } from "@/types/scheduling";

// The schedule's warnings used a constant — 40 hours, 8 hours' rest, 6 days —
// whatever a facility set. These pin that they now follow the facility's
// scheduling rules and payroll's overtime rule, and nothing else.

const employee: ScheduleEmployee = {
  id: "p1",
  name: "Sam",
  email: "",
  phone: "",
  initials: "S",
  departmentIds: [],
  positionIds: [],
  primaryPositionId: "",
  hireDate: "",
  status: "active",
  maxHoursPerWeek: 0,
  employmentType: "full_time",
  role: "",
};

function shift(id: string, date: string, start = "09:00", end = "19:00") {
  return {
    id,
    employeeId: "p1",
    departmentId: "d1",
    positionId: "x1",
    date,
    startTime: start,
    endTime: end,
    breakMinutes: 0,
    status: "draft",
  } satisfies ScheduleShift;
}

const overtimeAt = (hours: number, weekStartsOn = 0): PayrollConfig => ({
  ...NO_PAYROLL_RULES,
  overtime: { enabled: true, weeklyThresholdHours: hours, multiplier: 1.5 },
  weekStartsOn,
});

function kinds(
  proposed: ScheduleShift,
  others: ScheduleShift[],
  rules: ReturnType<typeof shiftRulesFrom>,
) {
  return detectShiftConflicts({
    shift: proposed,
    employee,
    allShifts: [...others, proposed],
    timeOffRequests: [],
    settings: rules,
  }).map((c) => c.kind);
}

// Four 10-hour days, Monday 2026-09-07 to Thursday, then a fifth on Friday: 50h.
const week = ["2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10"].map(
  (date, i) => shift(`s${i}`, date),
);
const friday = shift("s5", "2026-09-11");

describe("scheduling rules", () => {
  test("with no overtime rule in payroll, no hour is overtime", () => {
    const rules = shiftRulesFrom(DEFAULT_SCHEDULING_RULES, NO_PAYROLL_RULES);
    expect(rules.overtimeThresholdWeekly).toBe(0);
    expect(kinds(friday, week, rules)).not.toContain("overtime_risk");
  });

  test("overtime warns from payroll's threshold, not 40", () => {
    expect(
      kinds(
        friday,
        week,
        shiftRulesFrom(DEFAULT_SCHEDULING_RULES, overtimeAt(48)),
      ),
    ).toContain("overtime_risk");
    expect(
      kinds(
        friday,
        week,
        shiftRulesFrom(DEFAULT_SCHEDULING_RULES, overtimeAt(50)),
      ),
    ).not.toContain("overtime_risk");
  });

  test("a week's hours reset on payroll's first day of the week", () => {
    // Saturday and Sunday, 10h each, threshold 15. From Sunday they are two
    // weeks; from Monday they are one.
    const saturday = shift("sat", "2026-09-12");
    const sunday = shift("sun", "2026-09-13");
    const fromSunday = shiftRulesFrom(
      DEFAULT_SCHEDULING_RULES,
      overtimeAt(15, 0),
    );
    const fromMonday = shiftRulesFrom(
      DEFAULT_SCHEDULING_RULES,
      overtimeAt(15, 1),
    );
    expect(kinds(sunday, [saturday], fromSunday)).not.toContain(
      "overtime_risk",
    );
    expect(kinds(sunday, [saturday], fromMonday)).toContain("overtime_risk");
  });

  test("rest and days in a row come from the saved rules, and 0 turns them off", () => {
    const late = shift("late", "2026-09-14", "14:00", "23:00");
    const early = shift("early", "2026-09-15", "08:00", "12:00"); // 9h rest
    const strict = shiftRulesFrom(
      { minRestHours: 10, maxConsecutiveDays: 3 },
      NO_PAYROLL_RULES,
    );
    const off = shiftRulesFrom(
      { minRestHours: 0, maxConsecutiveDays: 0 },
      NO_PAYROLL_RULES,
    );
    expect(kinds(early, [late], strict)).toContain("insufficient_rest");
    expect(kinds(early, [late], off)).not.toContain("insufficient_rest");
    expect(kinds(friday, week, strict)).toContain("consecutive_days");
    expect(kinds(friday, week, off)).not.toContain("consecutive_days");
  });

  test("the stored rules are bounded", () => {
    expect(schedulingRulesSchema.safeParse({ minRestHours: 30 }).success).toBe(
      false,
    );
    expect(
      schedulingRulesSchema.safeParse({ maxConsecutiveDays: 2.5 }).success,
    ).toBe(false);
    expect(schedulingRulesSchema.parse({})).toEqual(DEFAULT_SCHEDULING_RULES);
  });
});
