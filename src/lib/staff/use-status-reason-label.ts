"use client";

import { useCallback } from "react";

import { useStaffText } from "@/lib/staff/use-staff-text";

/**
 * Why a staff member's status changed, in the viewer's language.
 *
 * The seven reasons were spelled out in THREE files — the profile sheet's
 * `STATUS_REASON_LABELS`, the audit trail's `REASON_LABEL`, and the status
 * dialog's `BUILT_IN_REASONS` — all module constants, so all three invisible
 * to `check:ui-french` and all three counted as zero.
 *
 * They had already drifted, in ENGLISH: `performance` read "Performance-based
 * termination" on the profile and "Performance-based" in the audit trail, so
 * the same database row described itself two ways on two screens of the same
 * product. Nothing was going to catch that — it is not a French defect, and no
 * gate compares two constants for agreement. The conversion found it only
 * because converting three copies means reading all three.
 *
 * That is the argument for a catalogue rather than three keyed maps: a shared
 * one cannot disagree with itself.
 *
 * A reason the catalogue does not know — the facility configures its own
 * termination reasons in Settings → Staff & HR — falls through to the raw
 * value, which is already the words a person typed and so must NOT pass
 * through the locale layer (§5q).
 */
export function useStatusReasonLabel(): (reason: string) => string {
  const { t } = useStaffText("status");

  return useCallback(
    (reason: string) => {
      const key = `reason${reason
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("")}`;
      const label = t(key);
      return label === key ? reason : label;
    },
    [t],
  );
}
