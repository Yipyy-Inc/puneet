"use client";

import { useMemo } from "react";

import { useAppLocale } from "@/hooks/use-app-locale";
import { useHydrated } from "@/hooks/use-hydrated";
import type { AppLocale } from "@/lib/language-settings";
import { staffText } from "@/lib/staff/text";

/**
 * Staff-area labels in the viewer's language.
 *
 * `hydrated ? locale : "en"` mirrors `useSettingsText` and `useUiText` exactly,
 * and it is load-bearing rather than stylistic: the locale lives in a cookie
 * the client reads, so rendering French on the server and English on the
 * client — or the reverse — is a hydration mismatch on every label at once.
 *
 * Returns a translator bound to ONE area, so a call site cannot reach another
 * screen's copy by accident and a reviewer can see which screen a string
 * belongs to from the import.
 */
export function useStaffText(area: string) {
  const hydrated = useHydrated();
  const locale = useAppLocale();
  const effective: AppLocale = hydrated ? locale : "en";

  return useMemo(
    () => ({
      locale: effective,
      t: (key: string) => staffText(effective, area, key),
    }),
    [effective, area],
  );
}
