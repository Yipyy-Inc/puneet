"use client";

import { useMemo } from "react";

import { useAppLocale } from "@/hooks/use-app-locale";
import { useHydrated } from "@/hooks/use-hydrated";
import type { AppLocale } from "@/lib/language-settings";
import {
  navBottomBarLabel,
  navItemTitle,
  navSectionLabel,
} from "@/lib/nav/text";

/**
 * The facility navigation in the viewer's language.
 *
 * `hydrated ? locale : "en"` mirrors `useSettingsText` and `useUiText`, and it
 * is load-bearing rather than stylistic: the locale lives in storage the client
 * reads, so rendering French on the server and English on the client — or the
 * reverse — is a hydration mismatch on every label in the sidebar.
 */
export function useNavText() {
  const hydrated = useHydrated();
  const locale = useAppLocale();
  const effective: AppLocale = hydrated ? locale : "en";

  return useMemo(
    () => ({
      section: (id: string, fallback: string) =>
        navSectionLabel(effective, id, fallback),
      item: (url: string, fallback: string) =>
        navItemTitle(effective, url, fallback),
      bottomBar: (url: string, fallback: string) =>
        navBottomBarLabel(effective, url, fallback),
    }),
    [effective],
  );
}
