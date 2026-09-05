"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useSettingsHref } from "@/lib/settings/use-settings-href";

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
  const settingsPath = useSettingsHref();

  const go = useCallback(
    (patch: YipyyPayNavPatch) => {
      const next = new URLSearchParams(searchParams.toString());
      // `section` is no longer ours to write. It used to be set here on every
      // step, alongside a hardcoded `/facility/dashboard/settings` — so a
      // manager working through the connect wizard inside /employee/settings
      // was thrown into a portal guardPortal does not admit them to, halfway
      // through an application, on step two. `settingsPath` writes whichever
      // portal is actually rendering and spells the section itself, which is
      // also what carries this through the move to `/settings/yipyy-pay` —
      // there `section` stops being a parameter at all, and a copied one would
      // linger in the address bar meaning nothing.
      next.delete("section");
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined) next.delete(key);
        else next.set(key, String(value));
      }
      // `replace`, not `push`: the connect wizard advances by itself after a
      // redirect back from Clover, and a history entry per step means Back
      // walks a facility through screens they already completed.
      router.replace(settingsPath("yipyy-pay", Object.fromEntries(next)), {
        scroll: false,
      });
    },
    [router, searchParams, settingsPath],
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
