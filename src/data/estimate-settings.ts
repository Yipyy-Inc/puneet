import type { EstimateSettings } from "@/types/estimate-settings";

/**
 * Default per-facility estimate settings (Spec Part 9.3).
 * Mirrors the other settings stores: a mock default plus a localStorage-backed
 * getter/saver so the Settings UI and the read-side flows stay consistent.
 */
export const DEFAULT_ESTIMATE_SETTINGS: EstimateSettings = {
  defaultExpiryDays: 30,
  requireDepositOnAccept: false,
  estimateNumberPrefix: "E",
  minDigits: 5,
  expiryWarningEnabled: true,
  expiryWarningHoursBefore: 24,
  autoConvertOnAccept: false,
  magicLinkExpiryHours: 72,
  sendWelcomeEmail: true,
  allowCustomerAcceptance: true,
  acceptanceRequiresDeposit: false,
};

const ESTIMATE_SETTINGS_KEY = "settings-estimate-defaults";

/** Read the facility's estimate settings (localStorage-backed, SSR-safe). */
export function getEstimateSettings(): EstimateSettings {
  if (typeof window === "undefined") return DEFAULT_ESTIMATE_SETTINGS;
  try {
    const raw = window.localStorage.getItem(ESTIMATE_SETTINGS_KEY);
    return raw
      ? {
          ...DEFAULT_ESTIMATE_SETTINGS,
          ...(JSON.parse(raw) as EstimateSettings),
        }
      : DEFAULT_ESTIMATE_SETTINGS;
  } catch {
    return DEFAULT_ESTIMATE_SETTINGS;
  }
}

/** Persist the facility's estimate settings. */
export function saveEstimateSettings(
  settings: EstimateSettings,
): EstimateSettings {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        ESTIMATE_SETTINGS_KEY,
        JSON.stringify(settings),
      );
    } catch {
      /* ignore quota / serialization errors */
    }
  }
  return settings;
}
