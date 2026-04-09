import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import {
  loadLanguageSettingsFromCookies,
  resolveLocaleForSettings,
} from "@/lib/language-settings";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieString = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const languageSettings = loadLanguageSettingsFromCookies(cookieString);
  const requestedLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = resolveLocaleForSettings(requestedLocale, languageSettings);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
