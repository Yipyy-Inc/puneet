"use client";

import { useCallback } from "react";

import { useAppLocale } from "@/hooks/use-app-locale";
import { useHydrated } from "@/hooks/use-hydrated";
import type { AppLocale } from "@/lib/language-settings";
import { serviceTypeLabel } from "@/lib/settings/service-types";

/**
 * Built-in service names in the viewer's language.
 *
 * `hydrated ? locale : "en"` for the same reason every other text hook does it:
 * the locale is read on the client, so a server render in the other language is
 * a hydration mismatch on every chip.
 */
export function useServiceTypeLabel() {
  const hydrated = useHydrated();
  const locale = useAppLocale();
  const effective: AppLocale = hydrated ? locale : "en";

  return useCallback(
    (id: string, fallback: string) => serviceTypeLabel(effective, id, fallback),
    [effective],
  );
}
