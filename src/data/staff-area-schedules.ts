// Mock staff service-area schedules — the "Certain Area for Certain Days"
// feature. Maps each mobile grooming staff member to a weekly area template
// plus any per-date overrides. See StaffServiceAreaSchedule in
// @/types/grooming for the model.

import type { StaffServiceAreaSchedule } from "@/types/grooming";

/** Build a 7-day weekly template from a sparse map. Missing days = null (off). */
function weekly(
  entries: Partial<Record<0 | 1 | 2 | 3 | 4 | 5 | 6, string>>,
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (let d = 0; d < 7; d++) {
    out[String(d)] = entries[d as 0 | 1 | 2 | 3 | 4 | 5 | 6] ?? null;
  }
  return out;
}

/**
 * Build an absolute ISO date string for `daysFromNow` days from today, used
 * to keep override demo data fresh across rebuilds.
 */
function dateInDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

export const staffAreaSchedules: StaffServiceAreaSchedule[] = [
  // Jessica Martinez — North on Mon/Wed, South on Tue/Thu, off otherwise.
  // Saturday next week is an override to East (special event).
  {
    staffId: "fs-groom-08",
    weeklyTemplate: weekly({
      1: "area-north",
      2: "area-south",
      3: "area-north",
      4: "area-south",
    }),
    dateOverrides: {
      [dateInDays(5)]: "area-east",
    },
  },
  // Amy Chen — Tue/Thu North, Wed South, Fri rotating (off by default).
  {
    staffId: "fs-groom-09",
    weeklyTemplate: weekly({
      2: "area-north",
      3: "area-south",
      4: "area-north",
    }),
    dateOverrides: {},
  },
];
