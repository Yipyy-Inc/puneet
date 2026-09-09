"use client";

import { useCallback } from "react";

import { useStaffText } from "@/lib/staff/use-staff-text";

/**
 * The last-resort rendering of a slug the catalogue does not know. It moved
 * here from `staff-form-sections`, whose two callers both read the hook now —
 * left there it would have been dead code, and `bun run prune` would say so.
 */
const humanizeType = (v: string) =>
  v.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * An employment type's name, in the viewer's language.
 *
 * This closes a debt recorded at `staff-form-dialog.tsx` on the review-step
 * commit — "the employment types have their own catalogue block in settings,
 * and wiring this to it is its own change". Four call sites rendered the slug
 * through a regex, and the regexes did not agree:
 *
 *   - `staff-profile-sheet`  `.replace("_", " ")`   — NO `/g`, so only the
 *                                                     first underscore goes
 *   - `EmployeeDashboard`    `.replace(/_/g, " ")`  — all of them
 *   - `staff-form-sections`  `humanizeType()`       — all of them, capitalised
 *   - `staff-form-dialog`    `humanizeType()`
 *
 * The six seeded types carry one underscore each, so the missing `/g` renders
 * correctly today and would have shipped `full time_seasonal` the day a
 * facility added a longer one. A regex over an identifier is not a label; that
 * is the same finding this area has now produced a dozen times, and the reason
 * the catalogue exists.
 *
 * `StaffHrConfig.employmentTypes` is FACILITY-CONFIGURED, so the list is open.
 * The six seeded slugs are keyed; anything a facility added is words a person
 * typed, which §5q keeps out of the locale layer — those fall through to
 * `humanizeType`, which at least renders them consistently everywhere now.
 */
export function useEmploymentTypeLabel(): (type: string) => string {
  const { t } = useStaffText("employment");

  return useCallback(
    (type: string) => {
      if (!type) return "—";
      const key = `type${type
        .split(/[_-]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("")}`;
      const label = t(key);
      return label === key ? humanizeType(type) : label;
    },
    [t],
  );
}
