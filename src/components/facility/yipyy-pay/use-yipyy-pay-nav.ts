"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ============================================================================
// Where inside Yipyy Pay a facility is, kept in the address bar.
//
// Its own module rather than a member of the section it serves: every screen
// under Yipyy Pay needs it, including the ones the section renders, and a hook
// living in the component that imports those screens makes a cycle out of every
// one of them.
//
// ── THE URL IS A VIEW, NOT THE STATE ──────────────────────────────────────
//
//   &apply=N   which step of the merchant application
//   &step=N    which step of the connect-an-existing-account wizard
//   &tab=      which dashboard tab
//
// They are honoured so a facility can bookmark or refresh, but they promote
// nobody: the wizards clamp what they are asked for against what is actually
// finished. Asking for the last step of a connect flow with no connection still
// lands on the first.
// ============================================================================

export interface YipyyPayNavPatch {
  /** Merchant-application step. */
  apply?: number | null;
  /** Connect-an-existing-account step. */
  step?: number | null;
  /** Dashboard tab. */
  tab?: string | null;
}

export function useYipyyPayNav() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const go = useCallback(
    (patch: YipyyPayNavPatch) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("section", "yipyy-pay");
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined) next.delete(key);
        else next.set(key, String(value));
      }
      // `replace`, not `push`: the connect wizard advances by itself after a
      // redirect back from Clover, and a history entry per step means Back
      // walks a facility through screens they already completed.
      router.replace(`/facility/dashboard/settings?${next.toString()}`, {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  const stepParam = Number(searchParams.get("step"));
  const applyParam = Number(searchParams.get("apply"));

  return {
    go,
    requestedStep: Number.isInteger(stepParam) ? stepParam : null,
    requestedApplyStep: Number.isInteger(applyParam) ? applyParam : null,
    requestedTab: searchParams.get("tab"),
    /** The connect wizard is open. */
    inWizard: searchParams.get("step") !== null,
    /** The merchant application is open. */
    inApply: searchParams.get("apply") !== null,
  };
}
