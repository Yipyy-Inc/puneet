"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { integrations, facilityHolidays } from "@/data/settings";
import {
  APP_LANGUAGE_SETTINGS_STORAGE_KEY,
  DEFAULT_APP_LANGUAGE_SETTINGS,
  getClientCookieValue,
  normalizeLanguageSettings,
  persistLanguageSettingsCookies,
  resolveLocaleForSettings,
  type AppLanguageSettings,
} from "@/lib/language-settings";
import { dispatchAppLanguageChanged } from "@/hooks/use-app-locale";
import {
  useFacilitySettings,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import {
  useFacilityProfile,
  useUpdateFacilityProfile,
} from "@/lib/api/facility-profile";
import type {
  ModuleConfig,
  EvaluationConfig,
  EvaluationFormTemplate,
  EvaluationReportCardConfig,
  WeatherWarningRule,
  BusinessHours,
  BusinessProfile,
  BookingRules,
  FacilityBookingFlowConfig,
  ReportCardConfig,
  ServiceDateBlock,
  ScheduleTimeOverride,
  DropOffPickUpOverride,
  NotificationToggle,
  ServiceNotificationDefault,
  TipConfig,
  TipAttribution,
  Integration,
  ModuleAddon,
  GroomingScheduling,
  AccountingStructure,
  NetworkPolicy,
} from "@/types/facility";
import type { CalendarColorOverrides } from "@/lib/operations-calendar";

interface SettingsContextValue {
  daycare: ModuleConfig;
  boarding: ModuleConfig;
  grooming: ModuleConfig;
  training: ModuleConfig;
  evaluation: EvaluationConfig;
  evaluationFormTemplate: EvaluationFormTemplate;
  evaluationReportCard: EvaluationReportCardConfig;
  hours: BusinessHours;
  profile: BusinessProfile;
  rules: BookingRules;
  bookingFlow: FacilityBookingFlowConfig;
  reportCards: ReportCardConfig;
  serviceDateBlocks: ServiceDateBlock[];
  scheduleTimeOverrides: ScheduleTimeOverride[];
  dropOffPickUpOverrides: DropOffPickUpOverride[];
  notifications: NotificationToggle[];
  serviceNotifDefaults: ServiceNotificationDefault[];
  tipConfig: TipConfig;
  integrations: Integration[];
  addons: ModuleAddon[];
  weatherRules: WeatherWarningRule[];
  serviceColorOverrides: CalendarColorOverrides;
  holidays: Array<{ month: number; day: number; name: string }>;
  languageSettings: AppLanguageSettings;
  updateDaycare: (config: ModuleConfig) => Promise<unknown>;
  updateBoarding: (config: ModuleConfig) => Promise<unknown>;
  updateGrooming: (config: ModuleConfig) => Promise<unknown>;
  updateTraining: (config: ModuleConfig) => Promise<unknown>;
  updateEvaluation: (config: EvaluationConfig) => Promise<unknown>;
  updateEvaluationFormTemplate: (
    config: EvaluationFormTemplate,
  ) => Promise<unknown>;
  updateEvaluationReportCard: (
    config: EvaluationReportCardConfig,
  ) => Promise<unknown>;
  updateHours: (hours: BusinessHours) => Promise<unknown>;
  updateProfile: (profile: BusinessProfile) => Promise<unknown>;
  updateRules: (rules: BookingRules) => Promise<unknown>;
  groomingScheduling: GroomingScheduling;
  updateGroomingScheduling: (config: GroomingScheduling) => Promise<unknown>;
  accountingStructure: AccountingStructure;
  updateAccountingStructure: (config: AccountingStructure) => Promise<unknown>;
  networkPolicy: NetworkPolicy;
  updateNetworkPolicy: (config: NetworkPolicy) => Promise<unknown>;
  updateBookingFlow: (config: FacilityBookingFlowConfig) => Promise<unknown>;
  updateReportCards: (config: ReportCardConfig) => Promise<unknown>;
  updateServiceDateBlocks: (blocks: ServiceDateBlock[]) => Promise<unknown>;
  updateScheduleTimeOverrides: (
    overrides: ScheduleTimeOverride[],
  ) => Promise<unknown>;
  updateDropOffPickUpOverrides: (
    overrides: DropOffPickUpOverride[],
  ) => Promise<unknown>;
  updateNotifications: (
    notifications: NotificationToggle[],
  ) => Promise<unknown>;
  updateServiceNotifDefaults: (
    defaults: ServiceNotificationDefault[],
  ) => Promise<unknown>;
  updateTipConfig: (config: TipConfig) => Promise<unknown>;
  tipAttribution: TipAttribution;
  updateTipAttribution: (value: TipAttribution) => Promise<unknown>;
  updateAddons: (addons: ModuleAddon[]) => Promise<unknown>;
  updateWeatherRules: (rules: WeatherWarningRule[]) => Promise<unknown>;
  updateServiceColorOverrides: (
    overrides: CalendarColorOverrides,
  ) => Promise<unknown>;
  updateLanguageSettings: (settings: AppLanguageSettings) => void;
  resetModules: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const stored = localStorage.getItem(key);
  if (!stored) return fallback;
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? (parsed as unknown as T) : fallback;
    }
    if (parsed && typeof parsed === "object") {
      return { ...fallback, ...parsed };
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function normalizeEvaluation(
  next: EvaluationConfig,
  fallback: EvaluationConfig,
): EvaluationConfig {
  if (!next.schedule) return { ...next, schedule: fallback.schedule };
  // Deep-merge schedule so new optional fields from defaults are picked up
  // even when an older stored config doesn't include them yet.
  return {
    ...next,
    schedule: { ...fallback.schedule, ...next.schedule },
  };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  // ── business_hours AND booking_rules COME FROM POSTGRES ─────────────────
  //
  // Converted here, in the provider, rather than at each screen. `hours` and
  // `rules` are read by the booking modals as well as the settings page, so
  // converting only the editor would have let a facility save opening hours
  // that the thing which books customers went on ignoring.
  //
  // They used to be `loadStored(...)` — localStorage, keyed per BROWSER. That
  // is worse than it sounds: an owner set their hours, saw them stick, and
  // every other member of staff, every other device, and every CUSTOMER
  // booking on their own phone carried on being offered the fixture's
  // 07:00-19:00. The bug was invisible precisely to the person who fixed it.
  const facilitySettings = useFacilitySettings();
  const saveSetting = useSaveFacilitySetting();
  const hours = facilitySettings.settings.business_hours.value;
  const rules = facilitySettings.settings.booking_rules.value;
  const groomingScheduling =
    facilitySettings.settings.grooming_scheduling.value;
  const accountingStructure =
    facilitySettings.settings.accounting_structure.value;
  const networkPolicy = facilitySettings.settings.network_policy.value;
  // ── WHAT A CUSTOMER MAY BOOK ────────────────────────────────────────────
  //
  // The four module configs, the booking flow and the evaluation rules. These
  // decide whether a service is offered at all, whether an evaluation gates it,
  // and what it is called and costs — so a facility that hid a service was
  // having that ignored by the page that takes the booking.
  const daycare = facilitySettings.settings.daycare_config.value;
  const boarding = facilitySettings.settings.boarding_config.value;
  const grooming = facilitySettings.settings.grooming_config.value;
  const training = facilitySettings.settings.training_config.value;
  const evaluation = facilitySettings.settings.evaluation_config.value;
  const bookingFlow = facilitySettings.settings.booking_flow.value;
  const evaluationReportCardData =
    facilitySettings.settings.evaluation_report_card.value;
  // ── WORKFLOW AND DISPLAY ────────────────────────────────────────────────
  //
  // What staff see and how a day is shaped. Lower stakes than the block above,
  // converted for the same reason: every facility was handed one answer to a
  // question each of them gets to decide.
  const evalFormTemplateData =
    facilitySettings.settings.evaluation_form_template.value;
  const reportCards = facilitySettings.settings.report_cards.value;
  const serviceDateBlocksState =
    facilitySettings.settings.service_date_blocks.value;
  const scheduleTimeOverridesState =
    facilitySettings.settings.schedule_time_overrides.value;
  const dropOffPickUpOverridesState =
    facilitySettings.settings.drop_off_pick_up_overrides.value;
  const notifications = facilitySettings.settings.notification_toggles.value;
  const serviceNotifDefaultsData =
    facilitySettings.settings.service_notification_defaults.value;
  const addons = facilitySettings.settings.module_addons.value;
  const weatherRulesData = facilitySettings.settings.weather_rules.value;
  const serviceColorOverridesData =
    facilitySettings.settings.service_color_overrides.value;

  // The facility's own profile, from `facilities` (20260809120000). Converted
  // HERE and not only on the settings card, because ReportCardsModule,
  // WeatherWidget and WeatherWarningSettings read it through this context —
  // so fixing the editor alone left a report card branded "PawCare Facility"
  // and a weather widget reading the fixture's temperature unit.
  const facilityProfile = useFacilityProfile();
  const saveProfile = useUpdateFacilityProfile();
  const profile = facilityProfile.profile;
  const [languageSettings, setLanguageSettings] = useState<AppLanguageSettings>(
    () =>
      normalizeLanguageSettings(
        loadStored(
          APP_LANGUAGE_SETTINGS_STORAGE_KEY,
          DEFAULT_APP_LANGUAGE_SETTINGS,
        ),
      ),
  );
  const [integrationsData, setIntegrationsData] = useState<Integration[]>(() =>
    loadStored("settings-integrations", integrations),
  );

  const updateDaycare = (config: ModuleConfig) =>
    saveSetting.mutateAsync({ domain: "daycare_config", value: config });
  const updateBoarding = (config: ModuleConfig) =>
    saveSetting.mutateAsync({ domain: "boarding_config", value: config });
  const updateGrooming = (config: ModuleConfig) =>
    saveSetting.mutateAsync({ domain: "grooming_config", value: config });
  const updateTraining = (config: ModuleConfig) =>
    saveSetting.mutateAsync({ domain: "training_config", value: config });
  const updateEvaluation = (config: EvaluationConfig) =>
    saveSetting.mutateAsync({ domain: "evaluation_config", value: config });
  const updateEvaluationFormTemplate = (config: EvaluationFormTemplate) =>
    saveSetting.mutateAsync({
      domain: "evaluation_form_template",
      value: config,
    });
  const updateEvaluationReportCard = (config: EvaluationReportCardConfig) =>
    saveSetting.mutateAsync({
      domain: "evaluation_report_card",
      value: config,
    });

  // Returns the promise so a caller can await the write and report a refusal.
  // SettingsBlock does; the older callers that ignore it behave as before.
  const updateHours = (hours: BusinessHours) =>
    saveSetting.mutateAsync({ domain: "business_hours", value: hours });
  const updateProfile = (next: BusinessProfile) =>
    saveProfile.mutateAsync(next);
  const updateLanguageSettings = (settings: AppLanguageSettings) => {
    const normalizedSettings = normalizeLanguageSettings(settings);

    setLanguageSettings(normalizedSettings);
    localStorage.setItem(
      APP_LANGUAGE_SETTINGS_STORAGE_KEY,
      JSON.stringify(normalizedSettings),
    );
    persistLanguageSettingsCookies(normalizedSettings);

    const currentLocale =
      getClientCookieValue("NEXT_LOCALE") ?? normalizedSettings.primaryLocale;
    const resolvedLocale = resolveLocaleForSettings(
      currentLocale,
      normalizedSettings,
    );
    const oneYearSeconds = 60 * 60 * 24 * 365;
    document.cookie = `NEXT_LOCALE=${resolvedLocale}; path=/; max-age=${oneYearSeconds}`;
    dispatchAppLanguageChanged();
  };
  const updateRules = (rules: BookingRules) =>
    saveSetting.mutateAsync({ domain: "booking_rules", value: rules });
  const updateGroomingScheduling = (config: GroomingScheduling) =>
    saveSetting.mutateAsync({ domain: "grooming_scheduling", value: config });

  const updateAccountingStructure = (config: AccountingStructure) =>
    saveSetting.mutateAsync({ domain: "accounting_structure", value: config });
  const updateNetworkPolicy = (config: NetworkPolicy) =>
    saveSetting.mutateAsync({ domain: "network_policy", value: config });
  const updateBookingFlow = (config: FacilityBookingFlowConfig) =>
    saveSetting.mutateAsync({ domain: "booking_flow", value: config });
  const updateReportCards = (config: ReportCardConfig) =>
    saveSetting.mutateAsync({ domain: "report_cards", value: config });
  const updateServiceDateBlocks = (blocks: ServiceDateBlock[]) =>
    saveSetting.mutateAsync({ domain: "service_date_blocks", value: blocks });
  const updateScheduleTimeOverrides = (overrides: ScheduleTimeOverride[]) =>
    saveSetting.mutateAsync({
      domain: "schedule_time_overrides",
      value: overrides,
    });
  const updateDropOffPickUpOverrides = (overrides: DropOffPickUpOverride[]) =>
    saveSetting.mutateAsync({
      domain: "drop_off_pick_up_overrides",
      value: overrides,
    });
  const updateNotifications = (notifications: NotificationToggle[]) =>
    saveSetting.mutateAsync({
      domain: "notification_toggles",
      value: notifications,
    });
  const updateServiceNotifDefaults = (defaults: ServiceNotificationDefault[]) =>
    saveSetting.mutateAsync({
      domain: "service_notification_defaults",
      value: defaults,
    });
  const updateTipConfig = (config: TipConfig) =>
    saveSetting.mutateAsync({ domain: "tip_config", value: config });
  // A SEPARATE domain from tip_config on purpose: one decides what a customer
  // is offered, the other decides who gets paid, and they are edited by
  // different people for different reasons.
  const updateTipAttribution = (value: TipAttribution) =>
    saveSetting.mutateAsync({ domain: "tip_attribution", value });
  const updateAddons = (addons: ModuleAddon[]) =>
    saveSetting.mutateAsync({ domain: "module_addons", value: addons });
  const updateWeatherRules = (rules: WeatherWarningRule[]) =>
    saveSetting.mutateAsync({ domain: "weather_rules", value: rules });
  const updateServiceColorOverrides = (overrides: CalendarColorOverrides) =>
    saveSetting.mutateAsync({
      domain: "service_color_overrides",
      value: overrides,
    });

  const resetModules = () => {
    // hours and rules are NOT reset here. "Reset modules" clears this browser's
    // local overrides; those two now live in the facility's own row, and
    // silently rewriting a business's opening hours and cancellation policy
    // because somebody clicked a reset button on a different screen would be a
    // destructive act nobody asked for. Resetting them is a deliberate save.
    setIntegrationsData(integrations);
    setLanguageSettings(DEFAULT_APP_LANGUAGE_SETTINGS);
    persistLanguageSettingsCookies(DEFAULT_APP_LANGUAGE_SETTINGS);
    const oneYearSeconds = 60 * 60 * 24 * 365;
    document.cookie = `NEXT_LOCALE=${DEFAULT_APP_LANGUAGE_SETTINGS.primaryLocale}; path=/; max-age=${oneYearSeconds}`;
    dispatchAppLanguageChanged();
    localStorage.removeItem("settings-integrations");
    localStorage.removeItem(APP_LANGUAGE_SETTINGS_STORAGE_KEY);
  };

  return (
    <SettingsContext.Provider
      value={{
        daycare,
        boarding,
        grooming,
        training,
        evaluation,
        evaluationFormTemplate: evalFormTemplateData,
        evaluationReportCard: evaluationReportCardData,
        hours,
        profile,
        rules,
        bookingFlow,
        reportCards,
        serviceDateBlocks: serviceDateBlocksState,
        scheduleTimeOverrides: scheduleTimeOverridesState,
        dropOffPickUpOverrides: dropOffPickUpOverridesState,
        notifications,
        serviceNotifDefaults: serviceNotifDefaultsData,
        tipConfig: facilitySettings.settings.tip_config.value,
        integrations: integrationsData,
        addons,
        weatherRules: weatherRulesData,
        serviceColorOverrides: serviceColorOverridesData,
        holidays: facilityHolidays,
        languageSettings,
        updateDaycare,
        updateBoarding,
        updateGrooming,
        updateTraining,
        updateEvaluation,
        updateEvaluationFormTemplate,
        updateEvaluationReportCard,
        updateHours,
        updateProfile,
        updateRules,
        updateBookingFlow,
        updateReportCards,
        updateServiceDateBlocks,
        updateScheduleTimeOverrides,
        updateDropOffPickUpOverrides,
        updateNotifications,
        updateServiceNotifDefaults,
        groomingScheduling,
        updateGroomingScheduling,
        accountingStructure,
        updateAccountingStructure,
        networkPolicy,
        updateNetworkPolicy,
        updateTipConfig,
        tipAttribution: facilitySettings.settings.tip_attribution.value,
        updateTipAttribution,
        updateAddons,
        updateWeatherRules,
        updateServiceColorOverrides,
        updateLanguageSettings,
        resetModules,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
