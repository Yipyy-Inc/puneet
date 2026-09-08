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

  return useMemo(() => {
    const t = (key: string) => staffText(effective, area, key);

    return {
      locale: effective,
      t,
      /**
       * A sentence with a value in it — `fill("reminderSent", { email })`.
       *
       * Concatenating a translated fragment with a value is the mistake this
       * exists to prevent: French word order is not English word order, so
       * `t("sentTo") + email` pins the value to a position the translator
       * cannot move. The placeholder travels INSIDE the string, which is also
       * why both catalogues can be reviewed as sentences.
       *
       * Settings re-invented this four times as a local `reduce` before
       * anybody noticed; putting it here is what stops the staff area doing
       * it thirty-two more.
       */
      fill: (key: string, values: Record<string, string | number>) =>
        Object.entries(values).reduce(
          (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
          t(key),
        ),
    };
  }, [effective, area]);
}
