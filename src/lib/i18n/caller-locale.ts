import "server-only";

import { cookies } from "next/headers";

import {
  loadLanguageSettingsFromCookies,
  resolveLocaleForSettings,
  type AppLocale,
} from "@/lib/language-settings";

/**
 * The language of whoever made this request, from their cookies — what a
 * route words its own data in when the screen that asked will show it as it
 * comes (the care lines on a bill, the meals on the daily care board). English
 * when there is no request to read.
 */
export async function callerLocale(): Promise<AppLocale> {
  try {
    const jar = await cookies();
    const cookieString = jar
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");
    return resolveLocaleForSettings(
      jar.get("NEXT_LOCALE")?.value,
      loadLanguageSettingsFromCookies(cookieString),
    );
  } catch {
    return "en";
  }
}
