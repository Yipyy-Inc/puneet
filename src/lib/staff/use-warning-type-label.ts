"use client";

import { useCallback } from "react";

import { useStaffText } from "@/lib/staff/use-staff-text";
import { WARNING_TYPE_META, type WarningType } from "@/types/facility-warnings";

/**
 * A disciplinary warning type's name, in the viewer's language.
 *
 * `WARNING_TYPE_META` is a module constant, so its six labels are invisible to
 * `check:ui-french` — which reads JSX text — and counted as zero while three
 * files rendered them in English: the profile's warnings tab, the facility
 * warnings page, and the template builder. Sixth such set found in the staff
 * area; the debt map lists the rest.
 *
 * A hook rather than a lookup at each call site, for the reason
 * `useStaffRoleLabel` gives about the thirteen role slugs: three files each
 * writing their own mapping is how "Avertissement écrit" and "Written warning"
 * end up on two screens of the same product.
 *
 * A type the catalogue does not know falls back to the constant's own English,
 * so a seventh reads as words rather than as `final_written`.
 */
export function useWarningTypeLabel(): (type: WarningType) => string {
  const { t } = useStaffText("warnings");

  return useCallback(
    (type: WarningType) => {
      const key = `type${type.charAt(0).toUpperCase()}${type.slice(1)}`;
      const label = t(key);
      return label === key ? WARNING_TYPE_META[type].label : label;
    },
    [t],
  );
}
