export type AppLocale = "en" | "fr";

export interface AppLanguageSettings {
  primaryLocale: AppLocale;
  secondaryLocale: AppLocale;
  secondaryEnabled: boolean;
}

export const APP_LANGUAGE_SETTINGS_STORAGE_KEY = "settings-language";
export const APP_LANGUAGE_PRIMARY_COOKIE = "APP_LANG_PRIMARY";
export const APP_LANGUAGE_SECONDARY_COOKIE = "APP_LANG_SECONDARY";
export const APP_LANGUAGE_SECONDARY_ENABLED_COOKIE =
  "APP_LANG_SECONDARY_ENABLED";

export const DEFAULT_APP_LANGUAGE_SETTINGS: AppLanguageSettings = {
  primaryLocale: "en",
  secondaryLocale: "fr",
  secondaryEnabled: true,
};

function normalizeLocale(value: unknown, fallback: AppLocale): AppLocale {
  if (value === "en" || value === "fr") return value;
  return fallback;
}

export function normalizeLanguageSettings(
  input?: Partial<AppLanguageSettings> | null,
): AppLanguageSettings {
  const primaryLocale = normalizeLocale(
    input?.primaryLocale,
    DEFAULT_APP_LANGUAGE_SETTINGS.primaryLocale,
  );
  const fallbackSecondary = primaryLocale === "en" ? "fr" : "en";
  let secondaryLocale = normalizeLocale(
    input?.secondaryLocale,
    DEFAULT_APP_LANGUAGE_SETTINGS.secondaryLocale,
  );

  if (secondaryLocale === primaryLocale) {
    secondaryLocale = fallbackSecondary;
  }

  return {
    primaryLocale,
    secondaryLocale,
    secondaryEnabled:
      typeof input?.secondaryEnabled === "boolean"
        ? input.secondaryEnabled
        : DEFAULT_APP_LANGUAGE_SETTINGS.secondaryEnabled,
  };
}

export function getEnabledLocales(
  settings: AppLanguageSettings,
): AppLocale[] {
  if (!settings.secondaryEnabled) return [settings.primaryLocale];
  return [settings.primaryLocale, settings.secondaryLocale];
}

export function isLocaleEnabled(
  locale: string,
  settings: AppLanguageSettings,
): locale is AppLocale {
  return getEnabledLocales(settings).includes(locale as AppLocale);
}

export function resolveLocaleForSettings(
  preferredLocale: string | null | undefined,
  settings: AppLanguageSettings,
): AppLocale {
  if (preferredLocale && isLocaleEnabled(preferredLocale, settings)) {
    return preferredLocale;
  }
  return settings.primaryLocale;
}

export function getCookieValue(
  cookieString: string | undefined,
  key: string,
): string | undefined {
  if (!cookieString) return undefined;
  const cookies = cookieString.split(";");
  const raw = cookies.find((cookie) =>
    cookie.trim().startsWith(`${key}=`),
  );
  return raw ? raw.split("=").slice(1).join("=") : undefined;
}

export function getClientCookieValue(key: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return getCookieValue(document.cookie, key);
}

export function loadLanguageSettingsFromStorage(): AppLanguageSettings {
  if (typeof window === "undefined") {
    return DEFAULT_APP_LANGUAGE_SETTINGS;
  }

  const raw = window.localStorage.getItem(APP_LANGUAGE_SETTINGS_STORAGE_KEY);
  if (!raw) return DEFAULT_APP_LANGUAGE_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as Partial<AppLanguageSettings>;
    return normalizeLanguageSettings(parsed);
  } catch {
    return DEFAULT_APP_LANGUAGE_SETTINGS;
  }
}

export function persistLanguageSettingsToStorage(
  settings: AppLanguageSettings,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    APP_LANGUAGE_SETTINGS_STORAGE_KEY,
    JSON.stringify(settings),
  );
}

export function persistLanguageSettingsCookies(
  settings: AppLanguageSettings,
): void {
  if (typeof document === "undefined") return;

  const oneYearSeconds = 60 * 60 * 24 * 365;
  document.cookie = `${APP_LANGUAGE_PRIMARY_COOKIE}=${settings.primaryLocale}; path=/; max-age=${oneYearSeconds}`;
  document.cookie = `${APP_LANGUAGE_SECONDARY_COOKIE}=${settings.secondaryLocale}; path=/; max-age=${oneYearSeconds}`;
  document.cookie = `${APP_LANGUAGE_SECONDARY_ENABLED_COOKIE}=${settings.secondaryEnabled ? "1" : "0"}; path=/; max-age=${oneYearSeconds}`;
}

export function setClientLocaleCookie(locale: AppLocale): void {
  if (typeof document === "undefined") return;
  const oneYearSeconds = 60 * 60 * 24 * 365;
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${oneYearSeconds}`;
}

export function loadLanguageSettingsFromCookies(
  cookieString: string | undefined,
): AppLanguageSettings {
  const primaryLocale = getCookieValue(cookieString, APP_LANGUAGE_PRIMARY_COOKIE);
  const secondaryLocale = getCookieValue(
    cookieString,
    APP_LANGUAGE_SECONDARY_COOKIE,
  );
  const secondaryEnabled =
    getCookieValue(cookieString, APP_LANGUAGE_SECONDARY_ENABLED_COOKIE) !== "0";

  return normalizeLanguageSettings({
    primaryLocale: primaryLocale as AppLocale | undefined,
    secondaryLocale: secondaryLocale as AppLocale | undefined,
    secondaryEnabled,
  });
}
