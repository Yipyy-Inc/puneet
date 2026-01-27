"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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
  NotificationToggle,
  Integration,
  ModuleAddon,
} from "@/lib/types";

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
  updateNotifications: (notifications: NotificationToggle[]) => void;
  updateIntegrations: (integrations: Integration[]) => void;
  updateAddons: (addons: ModuleAddon[]) => void;
  resetModules: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [daycare, setDaycare] = useState<ModuleConfig>(daycareConfig);
  const [boarding, setBoarding] = useState<ModuleConfig>(boardingConfig);
  const [grooming, setGrooming] = useState<ModuleConfig>(groomingConfig);
  const [training, setTraining] = useState<ModuleConfig>(trainingConfig);
  const [evaluation, setEvaluation] = useState<EvaluationConfig>(evaluationConfig);
  const [hours, setHours] = useState<BusinessHours>(businessHours);
  const [profile, setProfile] = useState<BusinessProfile>(businessProfile);
  const [rules, setRules] = useState<BookingRules>(bookingRules);
  const [bookingFlow, setBookingFlow] =
    useState<FacilityBookingFlowConfig>(facilityBookingFlowConfig);
  const [reportCards, setReportCards] =
    useState<ReportCardConfig>(reportCardConfig);
  const [notifications, setNotifications] =
    useState<NotificationToggle[]>(notificationToggles);
  const [integrationsData, setIntegrationsData] =
    useState<Integration[]>(integrations);
  const [addons, setAddons] = useState<ModuleAddon[]>(moduleAddons);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadStored = <T,>(key: string, fallback: T): T | null => {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(fallback)) {
          return Array.isArray(parsed) ? parsed : null;
        }
        if (parsed && typeof parsed === "object") {
          return { ...fallback, ...parsed };
        }
      } catch {
        return null;
      }
      return null;
    };

    const normalizeEvaluation = (
      next: EvaluationConfig,
      fallback: EvaluationConfig,
    ): EvaluationConfig => {
      if (next.schedule) return next;
      return { ...next, schedule: fallback.schedule };
    };

    const nextDaycare = loadStored("settings-daycare", daycareConfig);
    if (nextDaycare) setDaycare(nextDaycare);
    const nextBoarding = loadStored("settings-boarding", boardingConfig);
    if (nextBoarding) setBoarding(nextBoarding);
    const nextGrooming = loadStored("settings-grooming", groomingConfig);
    if (nextGrooming) setGrooming(nextGrooming);
    const nextTraining = loadStored("settings-training", trainingConfig);
    if (nextTraining) setTraining(nextTraining);
    const nextEvaluation = loadStored("settings-evaluation", evaluationConfig);
    if (nextEvaluation)
      setEvaluation(normalizeEvaluation(nextEvaluation, evaluationConfig));
    const nextHours = loadStored("settings-hours", businessHours);
    if (nextHours) setHours(nextHours);
    const nextProfile = loadStored("settings-profile", businessProfile);
    if (nextProfile) setProfile(nextProfile);
    const nextRules = loadStored("settings-rules", bookingRules);
    if (nextRules) setRules(nextRules);
    const nextBookingFlow = loadStored(
      "settings-booking-flow",
      facilityBookingFlowConfig,
    );
    if (nextBookingFlow) setBookingFlow(nextBookingFlow);
    const nextReportCards = loadStored("settings-report-cards", reportCardConfig);
    if (nextReportCards) setReportCards(nextReportCards);
    const nextNotifications = loadStored(
      "settings-notifications",
      notificationToggles,
    );
    if (nextNotifications) setNotifications(nextNotifications);
    const nextIntegrations = loadStored("settings-integrations", integrations);
    if (nextIntegrations) setIntegrationsData(nextIntegrations);
    const nextAddons = loadStored("settings-addons", moduleAddons);
    if (nextAddons) setAddons(nextAddons);
  }, []);

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
