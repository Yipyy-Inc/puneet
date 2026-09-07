"use client";

import { useMemo } from "react";

import { useAppLocale } from "@/hooks/use-app-locale";
import { useHydrated } from "@/hooks/use-hydrated";
import type { AppLocale } from "@/lib/language-settings";
import { shellText, type ShellGroup } from "@/lib/shell/text";

/**
 * The shell's own copy in the viewer's language.
 *
 * `hydrated ? locale : "en"` mirrors `useSettingsText` and `useUiText`
 * exactly, and it is load-bearing rather than stylistic: the locale lives in a
 * cookie the client reads, so rendering French on the server and English on
 * the client — or the reverse — is a hydration mismatch on chrome that is
 * present on every route in the product.
 */
export function useShellText(group: ShellGroup) {
  const hydrated = useHydrated();
  const locale = useAppLocale();
  const effective: AppLocale = hydrated ? locale : "en";

  return useMemo(
    () => (key: string) => shellText(effective, group, key),
    [effective, group],
  );
}

/**
 * The locale the shell is rendering in — for `Intl`, not for a lookup.
 *
 * A shell surface that FORMATS rather than translates needs the same effective
 * locale `useShellText` resolves, and the `hydrated ? locale : "en"` rule has
 * to be identical or the two disagree for one paint. Kept beside it so there
 * is one definition per module rather than a copy at each call site.
 */
export function useShellLocale(): AppLocale {
  const hydrated = useHydrated();
  const locale = useAppLocale();
  return hydrated ? locale : "en";
}
