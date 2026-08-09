"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  daycareConfig,
  boardingConfig,
  groomingConfig,
  trainingConfig,
  evaluationConfig,
  evaluationFormTemplate as defaultEvalFormTemplate,
  evaluationReportCardConfig,
  weatherWarningRules as defaultWeatherRules,
  facilityBookingFlowConfig,
  reportCardConfig,
  serviceDateBlocks as defaultServiceDateBlocks,
  scheduleTimeOverrides as defaultScheduleTimeOverrides,
  dropOffPickUpOverrides as defaultDropOffPickUpOverrides,
  notificationToggles,
  serviceNotificationDefaults,
  integrations,
  moduleAddons,
  facilityHolidays,
} from "@/data/settings";
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
  Integration,
  ModuleAddon,
} from "@/types/facility";
import type { CalendarColorOverrides } from "@/lib/operations-calendar";
import { EMPTY_COLOR_OVERRIDES } from "@/lib/operations-calendar";

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
  updateDaycare: (config: ModuleConfig) => void;
  updateBoarding: (config: ModuleConfig) => void;
  updateGrooming: (config: ModuleConfig) => void;
  updateTraining: (config: ModuleConfig) => void;
  updateEvaluation: (config: EvaluationConfig) => void;
  updateEvaluationFormTemplate: (config: EvaluationFormTemplate) => void;
  updateEvaluationReportCard: (config: EvaluationReportCardConfig) => void;
  updateHours: (hours: BusinessHours) => Promise<unknown>;
  updateProfile: (profile: BusinessProfile) => Promise<unknown>;
  updateRules: (rules: BookingRules) => Promise<unknown>;
  updateBookingFlow: (config: FacilityBookingFlowConfig) => void;
  updateReportCards: (config: ReportCardConfig) => void;
  updateServiceDateBlocks: (blocks: ServiceDateBlock[]) => void;
  updateScheduleTimeOverrides: (overrides: ScheduleTimeOverride[]) => void;
  updateDropOffPickUpOverrides: (overrides: DropOffPickUpOverride[]) => void;
  updateNotifications: (notifications: NotificationToggle[]) => void;
  updateServiceNotifDefaults: (defaults: ServiceNotificationDefault[]) => void;
  updateTipConfig: (config: TipConfig) => Promise<unknown>;
  updateIntegrations: (integrations: Integration[]) => void;
  updateAddons: (addons: ModuleAddon[]) => void;
  updateWeatherRules: (rules: WeatherWarningRule[]) => void;
  updateServiceColorOverrides: (overrides: CalendarColorOverrides) => void;
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
  const [daycare, setDaycare] = useState<ModuleConfig>(() =>
    loadStored("settings-daycare", daycareConfig),
  );
  const [boarding, setBoarding] = useState<ModuleConfig>(() =>
    loadStored("settings-boarding", boardingConfig),
  );
  const [grooming, setGrooming] = useState<ModuleConfig>(() =>
    loadStored("settings-grooming", groomingConfig),
  );
  const [training, setTraining] = useState<ModuleConfig>(() =>
    loadStored("settings-training", trainingConfig),
  );
  const [evaluation, setEvaluation] = useState<EvaluationConfig>(() =>
    normalizeEvaluation(
      loadStored("settings-evaluation", evaluationConfig),
      evaluationConfig,
    ),
  );
  const [evalFormTemplateData, setEvalFormTemplateData] =
    useState<EvaluationFormTemplate>(() =>
      loadStored("settings-eval-form-template", defaultEvalFormTemplate),
    );
  const [evaluationReportCardData, setEvaluationReportCardData] =
    useState<EvaluationReportCardConfig>(() =>
      loadStored("settings-evaluation-report-card", evaluationReportCardConfig),
    );
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
  const [bookingFlow, setBookingFlow] = useState<FacilityBookingFlowConfig>(
    () => loadStored("settings-booking-flow", facilityBookingFlowConfig),
  );
  const [reportCards, setReportCards] = useState<ReportCardConfig>(() =>
    loadStored("settings-report-cards", reportCardConfig),
  );
  const [serviceDateBlocksState, setServiceDateBlocksState] = useState<
    ServiceDateBlock[]
  >(() => loadStored("settings-service-date-blocks", defaultServiceDateBlocks));
  const [scheduleTimeOverridesState, setScheduleTimeOverridesState] = useState<
    ScheduleTimeOverride[]
  >(() =>
    loadStored(
      "settings-schedule-time-overrides",
      defaultScheduleTimeOverrides,
    ),
  );
  const [dropOffPickUpOverridesState, setDropOffPickUpOverridesState] =
    useState<DropOffPickUpOverride[]>(() =>
      loadStored(
        "settings-drop-off-pick-up-overrides",
        defaultDropOffPickUpOverrides,
      ),
    );
  const [notifications, setNotifications] = useState<NotificationToggle[]>(() =>
    loadStored("settings-notifications", notificationToggles),
  );
  const [serviceNotifDefaultsData, setServiceNotifDefaultsData] = useState<
    ServiceNotificationDefault[]
  >(() =>
    loadStored("settings-service-notif-defaults", serviceNotificationDefaults),
  );
  const [integrationsData, setIntegrationsData] = useState<Integration[]>(() =>
    loadStored("settings-integrations", integrations),
  );
  const [addons, setAddons] = useState<ModuleAddon[]>(() =>
    loadStored("settings-addons", moduleAddons),
  );
  const [weatherRulesData, setWeatherRulesData] = useState<
    WeatherWarningRule[]
  >(() => loadStored("settings-weather-rules", defaultWeatherRules));
  const [serviceColorOverridesData, setServiceColorOverridesData] =
    useState<CalendarColorOverrides>(() =>
      loadStored("settings-service-color-overrides", EMPTY_COLOR_OVERRIDES),
    );

  const updateDaycare = (config: ModuleConfig) => {
    setDaycare(config);
    localStorage.setItem("settings-daycare", JSON.stringify(config));
  };
  const updateBoarding = (config: ModuleConfig) => {
    setBoarding(config);
    localStorage.setItem("settings-boarding", JSON.stringify(config));
  };
  const updateGrooming = (config: ModuleConfig) => {
    setGrooming(config);
    localStorage.setItem("settings-grooming", JSON.stringify(config));
  };
  const updateTraining = (config: ModuleConfig) => {
    setTraining(config);
    localStorage.setItem("settings-training", JSON.stringify(config));
  };
  const updateEvaluation = (config: EvaluationConfig) => {
    setEvaluation(config);
    localStorage.setItem("settings-evaluation", JSON.stringify(config));
  };
  const updateEvaluationFormTemplate = (config: EvaluationFormTemplate) => {
    setEvalFormTemplateData(config);
    localStorage.setItem("settings-eval-form-template", JSON.stringify(config));
  };
  const updateEvaluationReportCard = (config: EvaluationReportCardConfig) => {
    setEvaluationReportCardData(config);
    localStorage.setItem(
      "settings-evaluation-report-card",
      JSON.stringify(config),
    );
  };
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
  const updateBookingFlow = (config: FacilityBookingFlowConfig) => {
    setBookingFlow(config);
    localStorage.setItem("settings-booking-flow", JSON.stringify(config));
  };
  const updateReportCards = (config: ReportCardConfig) => {
    setReportCards(config);
    localStorage.setItem("settings-report-cards", JSON.stringify(config));
  };
  const updateServiceDateBlocks = (blocks: ServiceDateBlock[]) => {
    setServiceDateBlocksState(blocks);
    localStorage.setItem(
      "settings-service-date-blocks",
      JSON.stringify(blocks),
    );
  };
  const updateScheduleTimeOverrides = (overrides: ScheduleTimeOverride[]) => {
    setScheduleTimeOverridesState(overrides);
    localStorage.setItem(
      "settings-schedule-time-overrides",
      JSON.stringify(overrides),
    );
  };
  const updateDropOffPickUpOverrides = (overrides: DropOffPickUpOverride[]) => {
    setDropOffPickUpOverridesState(overrides);
    localStorage.setItem(
      "settings-drop-off-pick-up-overrides",
      JSON.stringify(overrides),
    );
  };
  const updateNotifications = (notifications: NotificationToggle[]) => {
    setNotifications(notifications);
    localStorage.setItem(
      "settings-notifications",
      JSON.stringify(notifications),
    );
  };
  const updateServiceNotifDefaults = (
    defaults: ServiceNotificationDefault[],
  ) => {
    setServiceNotifDefaultsData(defaults);
    localStorage.setItem(
      "settings-service-notif-defaults",
      JSON.stringify(defaults),
    );
  };
  const updateTipConfig = (config: TipConfig) =>
    saveSetting.mutateAsync({ domain: "tip_config", value: config });
  const updateIntegrations = (integrations: Integration[]) => {
    setIntegrationsData(integrations);
    localStorage.setItem("settings-integrations", JSON.stringify(integrations));
  };
  const updateAddons = (addons: ModuleAddon[]) => {
    setAddons(addons);
    localStorage.setItem("settings-addons", JSON.stringify(addons));
  };
  const updateWeatherRules = (rules: WeatherWarningRule[]) => {
    setWeatherRulesData(rules);
    localStorage.setItem("settings-weather-rules", JSON.stringify(rules));
  };
  const updateServiceColorOverrides = (overrides: CalendarColorOverrides) => {
    setServiceColorOverridesData(overrides);
    localStorage.setItem(
      "settings-service-color-overrides",
      JSON.stringify(overrides),
    );
  };

  const resetModules = () => {
    setDaycare(daycareConfig);
    setBoarding(boardingConfig);
    setGrooming(groomingConfig);
    setTraining(trainingConfig);
    setEvaluation(evaluationConfig);
    setEvalFormTemplateData(defaultEvalFormTemplate);
    setEvaluationReportCardData(evaluationReportCardConfig);
    // hours and rules are NOT reset here. "Reset modules" clears this browser's
    // local overrides; those two now live in the facility's own row, and
    // silently rewriting a business's opening hours and cancellation policy
    // because somebody clicked a reset button on a different screen would be a
    // destructive act nobody asked for. Resetting them is a deliberate save.
    setBookingFlow(facilityBookingFlowConfig);
    setReportCards(reportCardConfig);
    setServiceDateBlocksState(defaultServiceDateBlocks);
    setScheduleTimeOverridesState(defaultScheduleTimeOverrides);
    setDropOffPickUpOverridesState(defaultDropOffPickUpOverrides);
    setNotifications(notificationToggles);
    setServiceNotifDefaultsData(serviceNotificationDefaults);
    setIntegrationsData(integrations);
    setAddons(moduleAddons);
    setWeatherRulesData(defaultWeatherRules);
    setServiceColorOverridesData(EMPTY_COLOR_OVERRIDES);
    setLanguageSettings(DEFAULT_APP_LANGUAGE_SETTINGS);
    persistLanguageSettingsCookies(DEFAULT_APP_LANGUAGE_SETTINGS);
    const oneYearSeconds = 60 * 60 * 24 * 365;
    document.cookie = `NEXT_LOCALE=${DEFAULT_APP_LANGUAGE_SETTINGS.primaryLocale}; path=/; max-age=${oneYearSeconds}`;
    dispatchAppLanguageChanged();
    localStorage.removeItem("settings-daycare");
    localStorage.removeItem("settings-boarding");
    localStorage.removeItem("settings-grooming");
    localStorage.removeItem("settings-training");
    localStorage.removeItem("settings-evaluation");
    localStorage.removeItem("settings-eval-form-template");
    localStorage.removeItem("settings-evaluation-report-card");
    localStorage.removeItem("settings-booking-flow");
    localStorage.removeItem("settings-report-cards");
    localStorage.removeItem("settings-service-date-blocks");
    localStorage.removeItem("settings-schedule-time-overrides");
    localStorage.removeItem("settings-drop-off-pick-up-overrides");
    localStorage.removeItem("settings-notifications");
    localStorage.removeItem("settings-service-notif-defaults");
    localStorage.removeItem("settings-integrations");
    localStorage.removeItem("settings-addons");
    localStorage.removeItem("settings-weather-rules");
    localStorage.removeItem("settings-service-color-overrides");
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
        updateTipConfig,
        updateIntegrations,
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
