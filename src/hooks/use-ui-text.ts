"use client";

import { useCallback } from "react";
import { useAppLocale } from "@/hooks/use-app-locale";
import { useHydrated } from "@/hooks/use-hydrated";
import { translateUiText } from "@/lib/ui-translations";
import type { AppLocale } from "@/lib/language-settings";

export function useUiText() {
  const hydrated = useHydrated();
  const locale = useAppLocale();
  const effectiveLocale: AppLocale = hydrated ? locale : "en";

  const t = useCallback(
    (text: string) => translateUiText(text, effectiveLocale),
    [effectiveLocale],
  );

  return { t, locale: effectiveLocale };
}
