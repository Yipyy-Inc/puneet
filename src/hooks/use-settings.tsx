"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  daycareConfig,
  boardingConfig,
  groomingConfig,
  trainingConfig,
  evaluationConfig,
  type ModuleConfig,
  type EvaluationConfig,
} from "@/data/settings";

interface SettingsContextValue {
  daycare: ModuleConfig;
  boarding: ModuleConfig;
  grooming: ModuleConfig;
  training: ModuleConfig;
  evaluation: EvaluationConfig;
  updateDaycare: (config: ModuleConfig) => void;
  updateBoarding: (config: ModuleConfig) => void;
  updateGrooming: (config: ModuleConfig) => void;
  updateTraining: (config: ModuleConfig) => void;
  updateEvaluation: (config: EvaluationConfig) => void;
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

  const resetModules = () => {
    setDaycare(daycareConfig);
    setBoarding(boardingConfig);
    setGrooming(groomingConfig);
    setTraining(trainingConfig);
    setEvaluation(evaluationConfig);
    localStorage.removeItem("settings-daycare");
    localStorage.removeItem("settings-boarding");
    localStorage.removeItem("settings-grooming");
    localStorage.removeItem("settings-training");
    localStorage.removeItem("settings-evaluation");
  };

  return (
    <SettingsContext.Provider
      value={{
        daycare,
        boarding,
        grooming,
        training,
        evaluation,
        updateDaycare,
        updateBoarding,
        updateGrooming,
        updateTraining,
        updateEvaluation,
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
