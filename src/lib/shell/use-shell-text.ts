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
