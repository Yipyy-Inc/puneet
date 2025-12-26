"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  daycareConfig,
  boardingConfig,
  groomingConfig,
  trainingConfig,
  type ModuleConfig,
} from "@/data/modules-config";

type ModuleName = "daycare" | "boarding" | "grooming" | "training";

interface ModulesConfigContextValue {
  configs: Record<ModuleName, ModuleConfig>;
  updateConfig: (module: ModuleName, config: ModuleConfig) => void;
  resetConfigs: () => void;
}

const ModulesConfigContext = createContext<ModulesConfigContextValue | null>(
  null,
);

const initialConfigs: Record<ModuleName, ModuleConfig> = {
  daycare: daycareConfig,
  boarding: boardingConfig,
  grooming: groomingConfig,
  training: trainingConfig,
};

export function ModulesConfigProvider({ children }: { children: ReactNode }) {
  const [configs, setConfigs] =
    useState<Record<ModuleName, ModuleConfig>>(initialConfigs);

  const updateConfig = (module: ModuleName, config: ModuleConfig) => {
    setConfigs((prev) => ({ ...prev, [module]: config }));
  };

  const resetConfigs = () => {
    setConfigs(initialConfigs);
  };

  return (
    <ModulesConfigContext.Provider
      value={{ configs, updateConfig, resetConfigs }}
    >
      {children}
    </ModulesConfigContext.Provider>
  );
}

export function useModulesConfig() {
  const context = useContext(ModulesConfigContext);
  if (!context) {
    throw new Error(
      "useModulesConfig must be used within a ModulesConfigProvider",
    );
  }
  return context;
}
