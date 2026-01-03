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
  updateNotifications: (notifications: NotificationToggle[]) => void;
  updateIntegrations: (integrations: Integration[]) => void;
  updateAddons: (addons: ModuleAddon[]) => void;
  resetModules: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [daycare, setDaycare] = useState<ModuleConfig>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("settings-daycare");
      return stored ? JSON.parse(stored) : daycareConfig;
    }
    return daycareConfig;
  });
  const [boarding, setBoarding] = useState<ModuleConfig>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("settings-boarding");
      return stored ? JSON.parse(stored) : boardingConfig;
    }
    return boardingConfig;
  });
  const [grooming, setGrooming] = useState<ModuleConfig>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("settings-grooming");
      return stored ? JSON.parse(stored) : groomingConfig;
    }
    return groomingConfig;
  });
  const [training, setTraining] = useState<ModuleConfig>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("settings-training");
      return stored ? JSON.parse(stored) : trainingConfig;
    }
    return trainingConfig;
  });
  const [evaluation, setEvaluation] = useState<EvaluationConfig>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("settings-evaluation");
      return stored ? JSON.parse(stored) : evaluationConfig;
    }
    return evaluationConfig;
  });
  const [hours, setHours] = useState<BusinessHours>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("settings-hours");
      return stored ? JSON.parse(stored) : businessHours;
    }
    return businessHours;
  });
  const [profile, setProfile] = useState<BusinessProfile>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("settings-profile");
      return stored ? JSON.parse(stored) : businessProfile;
    }
    return businessProfile;
  });
  const [rules, setRules] = useState<BookingRules>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("settings-rules");
      return stored ? JSON.parse(stored) : bookingRules;
    }
    return bookingRules;
  });
  const [notifications, setNotifications] = useState<NotificationToggle[]>(
    () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("settings-notifications");
        return stored ? JSON.parse(stored) : notificationToggles;
      }
      return notificationToggles;
    },
  );
  const [integrationsData, setIntegrationsData] = useState<Integration[]>(
    () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("settings-integrations");
        return stored ? JSON.parse(stored) : integrations;
      }
      return integrations;
    },
  );
  const [addons, setAddons] = useState<ModuleAddon[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("settings-addons");
      return stored ? JSON.parse(stored) : moduleAddons;
    }
    return moduleAddons;
  });

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
