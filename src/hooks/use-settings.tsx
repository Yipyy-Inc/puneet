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
  businessHours,
  businessProfile,
  bookingRules,
  facilityBookingFlowConfig,
  reportCardConfig,
  serviceDateBlocks as defaultServiceDateBlocks,
  scheduleTimeOverrides as defaultScheduleTimeOverrides,
  dropOffPickUpOverrides as defaultDropOffPickUpOverrides,
  notificationToggles,
  serviceNotificationDefaults,
  tipConfig as defaultTipConfig,
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
  updateHours: (hours: BusinessHours) => void;
  updateProfile: (profile: BusinessProfile) => void;
  updateRules: (rules: BookingRules) => void;
  updateBookingFlow: (config: FacilityBookingFlowConfig) => void;
  updateReportCards: (config: ReportCardConfig) => void;
  updateServiceDateBlocks: (blocks: ServiceDateBlock[]) => void;
  updateScheduleTimeOverrides: (overrides: ScheduleTimeOverride[]) => void;
  updateDropOffPickUpOverrides: (overrides: DropOffPickUpOverride[]) => void;
  updateNotifications: (notifications: NotificationToggle[]) => void;
  updateServiceNotifDefaults: (defaults: ServiceNotificationDefault[]) => void;
  updateTipConfig: (config: TipConfig) => void;
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
  if (next.schedule) return next;
  return { ...next, schedule: fallback.schedule };
}

function normalizeBusinessProfile(
  next: BusinessProfile,
  fallback: BusinessProfile,
): BusinessProfile {
  return {
    ...fallback,
    ...next,
    address: {
      ...fallback.address,
      ...(next.address ?? {}),
    },
    socialMedia: {
      ...fallback.socialMedia,
      ...(next.socialMedia ?? {}),
    },
    preferences: {
      ...fallback.preferences,
      ...(next.preferences ?? {}),
    },
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
  const [hours, setHours] = useState<BusinessHours>(() =>
    loadStored("settings-hours", businessHours),
  );
  const [profile, setProfile] = useState<BusinessProfile>(() =>
    normalizeBusinessProfile(
      loadStored("settings-profile", businessProfile),
      businessProfile,
    ),
  );
  const [languageSettings, setLanguageSettings] = useState<AppLanguageSettings>(
    () =>
      normalizeLanguageSettings(
        loadStored(APP_LANGUAGE_SETTINGS_STORAGE_KEY, DEFAULT_APP_LANGUAGE_SETTINGS),
      ),
  );
  const [rules, setRules] = useState<BookingRules>(() =>
    loadStored("settings-rules", bookingRules),
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
  const [tipConfigData, setTipConfigData] = useState<TipConfig>(() =>
    loadStored("settings-tip-config", defaultTipConfig),
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
  const updateHours = (hours: BusinessHours) => {
    setHours(hours);
    localStorage.setItem("settings-hours", JSON.stringify(hours));
  };
  const updateProfile = (profile: BusinessProfile) => {
    const normalizedProfile = normalizeBusinessProfile(
      profile,
      businessProfile,
    );
    setProfile(normalizedProfile);
    localStorage.setItem("settings-profile", JSON.stringify(normalizedProfile));
  };
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
  const updateRules = (rules: BookingRules) => {
    setRules(rules);
    localStorage.setItem("settings-rules", JSON.stringify(rules));
  };
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
  const updateTipConfig = (config: TipConfig) => {
    setTipConfigData(config);
    localStorage.setItem("settings-tip-config", JSON.stringify(config));
  };
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
    setHours(businessHours);
    setProfile(businessProfile);
    setRules(bookingRules);
    setBookingFlow(facilityBookingFlowConfig);
    setReportCards(reportCardConfig);
    setServiceDateBlocksState(defaultServiceDateBlocks);
    setScheduleTimeOverridesState(defaultScheduleTimeOverrides);
    setDropOffPickUpOverridesState(defaultDropOffPickUpOverrides);
    setNotifications(notificationToggles);
    setServiceNotifDefaultsData(serviceNotificationDefaults);
    setTipConfigData(defaultTipConfig);
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
    localStorage.removeItem("settings-hours");
    localStorage.removeItem("settings-profile");
    localStorage.removeItem("settings-rules");
    localStorage.removeItem("settings-booking-flow");
    localStorage.removeItem("settings-report-cards");
    localStorage.removeItem("settings-service-date-blocks");
    localStorage.removeItem("settings-schedule-time-overrides");
    localStorage.removeItem("settings-drop-off-pick-up-overrides");
    localStorage.removeItem("settings-notifications");
    localStorage.removeItem("settings-service-notif-defaults");
    localStorage.removeItem("settings-tip-config");
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
        tipConfig: tipConfigData,
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
