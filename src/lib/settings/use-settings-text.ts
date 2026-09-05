"use client";

import { useMemo } from "react";

import { useAppLocale } from "@/hooks/use-app-locale";
import { useHydrated } from "@/hooks/use-hydrated";
import type { AppLocale } from "@/lib/language-settings";
import type { SettingsLeaf } from "@/lib/settings/nav";
import {
  settingsGroupLabel,
  settingsLeafLabel,
  settingsText,
} from "@/lib/settings/text";

/**
 * Settings labels in the viewer's language.
 *
 * `hydrated ? locale : "en"` mirrors `useUiText` exactly, and it is load-
 * bearing rather than stylistic: the locale lives in a cookie the client
 * reads, so rendering French on the server and English on the client — or the
 * reverse — is a hydration mismatch on every label in the rail.
 */
export function useSettingsText() {
  const hydrated = useHydrated();
  const locale = useAppLocale();
  const effective: AppLocale = hydrated ? locale : "en";

  return useMemo(
    () => ({
      locale: effective,
      leaf: (leaf: Pick<SettingsLeaf, "id" | "label">) =>
        settingsLeafLabel(effective, leaf),
      group: (label: string) => settingsGroupLabel(effective, label),
      text: (key: string) => settingsText(effective, key),
    }),
    [effective],
  );
}
