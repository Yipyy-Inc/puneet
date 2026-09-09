"use client";

import { useCallback } from "react";

import { useStaffText } from "@/lib/staff/use-staff-text";
import type { EmployeeDocType } from "@/types/scheduling";

/**
 * An employee document type's name, in the viewer's language.
 *
 * ── WHY A HOOK AND NOT TWO CONSTANTS ─────────────────────────────────────
 *
 * There were two, byte for byte: a `TYPE_META` in `staff/documents/page.tsx`
 * and another in `_components/employee-files-tab.tsx`, each with the same
 * eight labels, icons and tones. Both were invisible to `check:ui-french`
 * (which reads JSX text), so sixteen English words counted as zero.
 *
 * Translating them where they stood would have meant writing the same eight
 * French strings twice and creating a third place for them to drift — which is
 * the failure `useStaffRoleLabel`'s docblock records from four settings
 * sections each rolling their own `humanizeRole()`. The icons and tones stay
 * in each file, because they are presentation; only the words move here.
 *
 * A type the catalogue does not know falls back to its humanised slug, so a
 * ninth reads as words rather than as `visa_document`.
 */
export function useEmployeeDocTypeLabel(): (type: EmployeeDocType) => string {
  const { t } = useStaffText("documents");

  return useCallback(
    (type: EmployeeDocType) => {
      const key = `type${type
        .split("_")
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join("")}`;
      const label = t(key);
      return label === key
        ? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : label;
    },
    [t],
  );
}
