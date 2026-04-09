"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_APP_LANGUAGE_SETTINGS,
  getClientCookieValue,
  loadLanguageSettingsFromStorage,
  resolveLocaleForSettings,
  type AppLanguageSettings,
  type AppLocale,
} from "@/lib/language-settings";

const LANGUAGE_EVENT = "app-language-settings-changed";

let cachedSettings: AppLanguageSettings = DEFAULT_APP_LANGUAGE_SETTINGS;
let cachedSettingsKey = JSON.stringify(DEFAULT_APP_LANGUAGE_SETTINGS);
let cachedLocale: AppLocale = DEFAULT_APP_LANGUAGE_SETTINGS.primaryLocale;
let clientStoreReady = false;

function getRuntimeLanguageSettings(): AppLanguageSettings {
  const nextSettings = loadLanguageSettingsFromStorage();
  const nextSettingsKey = JSON.stringify(nextSettings);

  if (nextSettingsKey !== cachedSettingsKey) {
    cachedSettings = nextSettings;
    cachedSettingsKey = nextSettingsKey;
  }

  return cachedSettings;
}

function subscribeLocale(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  let hydrationTimer: number | null = null;

  if (!clientStoreReady) {
    // Defer client locale/settings adoption until after hydration commits.
    clientStoreReady = true;
    hydrationTimer = window.setTimeout(() => {
      onStoreChange();
    }, 0);
  }

  const notify = () => onStoreChange();
  window.addEventListener("storage", notify);
  window.addEventListener("focus", notify);
  window.addEventListener("visibilitychange", notify);
  window.addEventListener(LANGUAGE_EVENT, notify as EventListener);

  return () => {
    if (hydrationTimer !== null) {
      window.clearTimeout(hydrationTimer);
    }
    window.removeEventListener("storage", notify);
    window.removeEventListener("focus", notify);
    window.removeEventListener("visibilitychange", notify);
    window.removeEventListener(LANGUAGE_EVENT, notify as EventListener);
  };
}

function getLanguageSettingsSnapshot(): AppLanguageSettings {
  if (typeof window === "undefined" || !clientStoreReady) {
    return DEFAULT_APP_LANGUAGE_SETTINGS;
  }

  return getRuntimeLanguageSettings();
}

function getLocaleSnapshot(): AppLocale {
  if (typeof window === "undefined" || !clientStoreReady) {
    return DEFAULT_APP_LANGUAGE_SETTINGS.primaryLocale;
  }

  const locale = resolveLocaleForSettings(
    getClientCookieValue("NEXT_LOCALE"),
    getRuntimeLanguageSettings(),
  );

  if (locale !== cachedLocale) {
    cachedLocale = locale;
  }

  return cachedLocale;
}

function getServerLanguageSettingsSnapshot(): AppLanguageSettings {
  return DEFAULT_APP_LANGUAGE_SETTINGS;
}

function getServerLocaleSnapshot(): AppLocale {
  return DEFAULT_APP_LANGUAGE_SETTINGS.primaryLocale;
}

export function useAppLanguageSettings(): AppLanguageSettings {
  return useSyncExternalStore(
    subscribeLocale,
    getLanguageSettingsSnapshot,
    getServerLanguageSettingsSnapshot,
  );
}

export function useAppLocale(): AppLocale {
  return useSyncExternalStore(
    subscribeLocale,
    getLocaleSnapshot,
    getServerLocaleSnapshot,
  );
}

export function dispatchAppLanguageChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LANGUAGE_EVENT));
}
