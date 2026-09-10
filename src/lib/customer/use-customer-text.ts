"use client";

import { useMemo } from "react";

import { useAppLocale } from "@/hooks/use-app-locale";
import { useHydrated } from "@/hooks/use-hydrated";
import type { AppLocale } from "@/lib/language-settings";
import { customerText } from "@/lib/customer/text";

/**
 * A customer-portal page's copy, in the viewer's language.
 *
 * The same contract as `useStaffText` — `{ locale, t, fill }`, bound to ONE
 * area — so a call site cannot reach another screen's copy by accident, and
 * the two portals convert with the same hands.
 *
 * `hydrated ? locale : "en"` is load-bearing: the locale lives in storage the
 * client reads, so rendering French on the server and English on the client
 * is a hydration mismatch on every label at once. It is also why `t` is a NEW
 * function after hydration — any `useMemo` or `useCallback` that calls it must
 * list it, or it serves the pre-hydration English forever.
 * `check:frozen-translator` fails the build if one does not.
 */
export function useCustomerText(area: string) {
  const hydrated = useHydrated();
  const locale = useAppLocale();
  const effective: AppLocale = hydrated ? locale : "en";

  return useMemo(() => {
    const t = (key: string) => customerText(effective, area, key);
    return {
      locale: effective,
      t,
      /**
       * A sentence with a value in it — `fill("vaccineMissing", { pet })`.
       * The placeholder travels INSIDE the string, because French does not put
       * a pet's name where English does.
       */
      fill: (key: string, values: Record<string, string | number>) =>
        Object.entries(values).reduce(
          (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
          t(key),
        ),
    };
  }, [effective, area]);
}
