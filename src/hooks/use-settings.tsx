"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  daycareConfig,
  boardingConfig,
  groomingConfig,
  trainingConfig,
  evaluationConfig,
  businessHours,
  businessProfile,
  bookingRules,
  facilityBookingFlowConfig,
  reportCardConfig,
  serviceDateBlocks as defaultServiceDateBlocks,
  scheduleTimeOverrides as defaultScheduleTimeOverrides,
  dropOffPickUpOverrides as defaultDropOffPickUpOverrides,
  notificationToggles,
  integrations,
  moduleAddons,
} from "@/data/settings";
import type {
  ModuleConfig,
  EvaluationConfig,
  BusinessHours,
  BusinessProfile,
  BookingRules,
  FacilityBookingFlowConfig,
  ReportCardConfig,
  ServiceDateBlock,
  ScheduleTimeOverride,
  DropOffPickUpOverride,
  NotificationToggle,
  Integration,
  ModuleAddon,
} from "@/types/facility";

interface SettingsContextValue {
  daycare: ModuleConfig;
  boarding: ModuleConfig;
  grooming: ModuleConfig;
  training: ModuleConfig;
  evaluation: EvaluationConfig;
  hours: BusinessHours;
  profile: BusinessProfile;
  rules: BookingRules;
  bookingFlow: FacilityBookingFlowConfig;
  reportCards: ReportCardConfig;
  serviceDateBlocks: ServiceDateBlock[];
  scheduleTimeOverrides: ScheduleTimeOverride[];
  dropOffPickUpOverrides: DropOffPickUpOverride[];
  notifications: NotificationToggle[];
  integrations: Integration[];
  addons: ModuleAddon[];
  updateDaycare: (config: ModuleConfig) => void;
  updateBoarding: (config: ModuleConfig) => void;
  updateGrooming: (config: ModuleConfig) => void;
  updateTraining: (config: ModuleConfig) => void;
  updateEvaluation: (config: EvaluationConfig) => void;
  updateHours: (hours: BusinessHours) => void;
  updateProfile: (profile: BusinessProfile) => void;
  updateRules: (rules: BookingRules) => void;
  updateBookingFlow: (config: FacilityBookingFlowConfig) => void;
  updateReportCards: (config: ReportCardConfig) => void;
  updateServiceDateBlocks: (blocks: ServiceDateBlock[]) => void;
  updateScheduleTimeOverrides: (overrides: ScheduleTimeOverride[]) => void;
  updateDropOffPickUpOverrides: (overrides: DropOffPickUpOverride[]) => void;
  updateNotifications: (notifications: NotificationToggle[]) => void;
  updateIntegrations: (integrations: Integration[]) => void;
  updateAddons: (addons: ModuleAddon[]) => void;
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
  const [hours, setHours] = useState<BusinessHours>(() =>
    loadStored("settings-hours", businessHours),
  );
  const [profile, setProfile] = useState<BusinessProfile>(() =>
    loadStored("settings-profile", businessProfile),
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
  const [integrationsData, setIntegrationsData] = useState<Integration[]>(() =>
    loadStored("settings-integrations", integrations),
  );
  const [addons, setAddons] = useState<ModuleAddon[]>(() =>
    loadStored("settings-addons", moduleAddons),
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
  const updateHours = (hours: BusinessHours) => {
    setHours(hours);
    localStorage.setItem("settings-hours", JSON.stringify(hours));
  };
  const updateProfile = (profile: BusinessProfile) => {
    setProfile(profile);
    localStorage.setItem("settings-profile", JSON.stringify(profile));
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
  const updateIntegrations = (integrations: Integration[]) => {
    setIntegrationsData(integrations);
    localStorage.setItem("settings-integrations", JSON.stringify(integrations));
  };
  const updateAddons = (addons: ModuleAddon[]) => {
    setAddons(addons);
    localStorage.setItem("settings-addons", JSON.stringify(addons));
  };

  const resetModules = () => {
    setDaycare(daycareConfig);
    setBoarding(boardingConfig);
    setGrooming(groomingConfig);
    setTraining(trainingConfig);
    setEvaluation(evaluationConfig);
    setHours(businessHours);
    setProfile(businessProfile);
    setRules(bookingRules);
    setBookingFlow(facilityBookingFlowConfig);
    setReportCards(reportCardConfig);
    setServiceDateBlocksState(defaultServiceDateBlocks);
    setScheduleTimeOverridesState(defaultScheduleTimeOverrides);
    setDropOffPickUpOverridesState(defaultDropOffPickUpOverrides);
    setNotifications(notificationToggles);
    setIntegrationsData(integrations);
    setAddons(moduleAddons);
    localStorage.removeItem("settings-daycare");
    localStorage.removeItem("settings-boarding");
    localStorage.removeItem("settings-grooming");
    localStorage.removeItem("settings-training");
    localStorage.removeItem("settings-evaluation");
    localStorage.removeItem("settings-hours");
    localStorage.removeItem("settings-profile");
    localStorage.removeItem("settings-rules");
    localStorage.removeItem("settings-booking-flow");
    localStorage.removeItem("settings-report-cards");
    localStorage.removeItem("settings-service-date-blocks");
    localStorage.removeItem("settings-schedule-time-overrides");
    localStorage.removeItem("settings-drop-off-pick-up-overrides");
    localStorage.removeItem("settings-notifications");
    localStorage.removeItem("settings-integrations");
    localStorage.removeItem("settings-addons");
  };

  return (
    <SettingsContext.Provider
      value={{
        daycare,
        boarding,
        grooming,
        training,
        evaluation,
        hours,
        profile,
        rules,
        bookingFlow,
        reportCards,
        serviceDateBlocks: serviceDateBlocksState,
        scheduleTimeOverrides: scheduleTimeOverridesState,
        dropOffPickUpOverrides: dropOffPickUpOverridesState,
        notifications,
        integrations: integrationsData,
        addons,
        updateDaycare,
        updateBoarding,
        updateGrooming,
        updateTraining,
        updateEvaluation,
        updateHours,
        updateProfile,
        updateRules,
        updateBookingFlow,
        updateReportCards,
        updateServiceDateBlocks,
        updateScheduleTimeOverrides,
        updateDropOffPickUpOverrides,
        updateNotifications,
        updateIntegrations,
        updateAddons,
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
