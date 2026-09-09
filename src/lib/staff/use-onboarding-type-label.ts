"use client";

import { useCallback } from "react";

import { useStaffText } from "@/lib/staff/use-staff-text";
import { ONBOARDING_TYPE_LABEL } from "@/data/staff-onboarding";

/**
 * An onboarding task type's words, in the viewer's language.
 *
 * `ONBOARDING_TYPE_LABEL` is a module constant in `data/staff-onboarding.ts`,
 * so its nine labels are invisible to `check:ui-french` and counted as zero
 * while a French reader saw "Shadow shift" on every task row.
 *
 * It was keyed once already, as a local helper inside `staff-profile-tabs`.
 * The employee's own onboarding card renders the same nine — so the helper
 * moves here rather than being written a second time, which is the drift that
 * put "Performance-based" and "Performance-based termination" on two screens
 * of this same area earlier in the week.
 *
 * A type the catalogue does not know falls back to the constant's own English,
 * so a tenth reads as words rather than as `shadow_shift`.
 */
export function useOnboardingTypeLabel(): (type: string) => string {
  const { t } = useStaffText("onboardingTypes");

  return useCallback(
    (type: string) => {
      const key = `type${type
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("")}`;
      const label = t(key);
      if (label !== key) return label;
      const meta =
        ONBOARDING_TYPE_LABEL[type as keyof typeof ONBOARDING_TYPE_LABEL];
      return meta ?? type;
    },
    [t],
  );
}
