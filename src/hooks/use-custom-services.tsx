"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type {
  CustomServiceModule,
  CustomServiceStatus,
  FacilityResource,
} from "@/types/facility";
import {
  getModuleWorkflowQuestionnaire,
  normalizeCustomServiceModule,
  defaultCustomServiceModules,
  defaultFacilityResources,
} from "@/data/custom-services";

// ========================================
// CONTEXT INTERFACE
// ========================================

interface CustomServicesContextValue {
  modules: CustomServiceModule[];
  activeModules: CustomServiceModule[];
  resources: FacilityResource[];
  // Module CRUD
  addModule: (module: CustomServiceModule) => void;
  updateModule: (id: string, updates: Partial<CustomServiceModule>) => void;
  deleteModule: (id: string) => void;
  duplicateModule: (id: string) => CustomServiceModule | null;
  setModuleStatus: (
    id: string,
    status: CustomServiceStatus,
    reason?: string,
  ) => { ok: boolean; reason?: string };
  // Resource CRUD
  addResource: (resource: FacilityResource) => void;
  updateResource: (id: string, updates: Partial<FacilityResource>) => void;
  deleteResource: (id: string) => void;
  // Queries
  getModuleBySlug: (slug: string) => CustomServiceModule | undefined;
  getModuleById: (id: string) => CustomServiceModule | undefined;
  getResourcesByType: (type: FacilityResource["type"]) => FacilityResource[];
  // Reset
  resetCustomServices: () => void;
}

const CustomServicesContext = createContext<CustomServicesContextValue | null>(
  null,
);

// ========================================
// STORAGE HELPERS
// ========================================

const MODULES_KEY = "custom-services";
const RESOURCES_KEY = "facility-resources";

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored) as T;
  } catch {
    // ignore parse errors
  }
  return fallback;
}

// ========================================
// PROVIDER
// ========================================

export function CustomServicesProvider({ children }: { children: ReactNode }) {
  // Lazy-initialize from localStorage to avoid SSR flash
  const [modules, setModules] = useState<CustomServiceModule[]>(() =>
    loadStored(MODULES_KEY, defaultCustomServiceModules).map(
      normalizeCustomServiceModule,
    ),
  );
  const [resources, setResources] = useState<FacilityResource[]>(() =>
    loadStored(RESOURCES_KEY, defaultFacilityResources),
  );

  // Derived state — computed once per modules change, shared by all consumers
  const activeModules = useMemo(
    () => modules.filter((m) => m.status === "active"),
    [modules],
  );

  // Persist helpers — side effect kept outside updater for concurrent-mode safety
  const persistModules = useCallback(
    (updater: (prev: CustomServiceModule[]) => CustomServiceModule[]) => {
      setModules((prev) => {
        const updated = updater(prev);
        // Schedule localStorage write outside the updater
        queueMicrotask(() =>
          localStorage.setItem(MODULES_KEY, JSON.stringify(updated)),
        );
        return updated;
      });
    },
    [],
  );

  const persistResources = useCallback(
    (updater: (prev: FacilityResource[]) => FacilityResource[]) => {
      setResources((prev) => {
        const updated = updater(prev);
        queueMicrotask(() =>
          localStorage.setItem(RESOURCES_KEY, JSON.stringify(updated)),
        );
        return updated;
      });
    },
    [],
  );

  // --- Module CRUD ---

  const addModule = useCallback(
    (module: CustomServiceModule) => {
      persistModules((prev) => [...prev, normalizeCustomServiceModule(module)]);
    },
    [persistModules],
  );

  const updateModule = useCallback(
    (id: string, updates: Partial<CustomServiceModule>) => {
      persistModules((prev) =>
        prev.map((m) =>
          m.id === id
            ? normalizeCustomServiceModule({
                ...m,
                ...updates,
                updatedAt: new Date().toISOString(),
              })
            : m,
        ),
      );
    },
    [persistModules],
  );

  const deleteModule = useCallback(
    (id: string) => {
      persistModules((prev) => prev.filter((m) => m.id !== id));
    },
    [persistModules],
  );

  const duplicateModule = useCallback(
    (id: string): CustomServiceModule | null => {
      // Build duplicate from current snapshot before persisting
      const source = modules.find((m) => m.id === id);
      if (!source) return null;
      const now = new Date().toISOString();
      const baseSlug = `${source.slug}-copy`;
      const existingSlugs = new Set(modules.map((m) => m.slug));
      let slug = baseSlug;
      let counter = 2;
      while (existingSlugs.has(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      const duplicate: CustomServiceModule = {
        ...source,
        id: `csm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: `${source.name} (Copy)`,
        slug,
        status: "draft",
        workflow: source.workflow
          ? {
              ...source.workflow,
              questionnaireCompleted: false,
              questionnaireCompletedAt: undefined,
            }
          : source.workflow,
        createdAt: now,
        updatedAt: now,
      };
      const normalized = normalizeCustomServiceModule(duplicate);
      persistModules((prev) => [...prev, normalized]);
      return normalized;
    },
    [modules, persistModules],
  );

  const setModuleStatus = useCallback(
    (id: string, status: CustomServiceStatus, reason?: string) => {
      const target = modules.find((module) => module.id === id);
      if (!target) {
        return {
          ok: false,
          reason: "Module not found",
        };
      }

      if (status === "active") {
        const workflow = getModuleWorkflowQuestionnaire(target);
        if (!workflow.questionnaireCompleted) {
          return {
            ok: false,
            reason:
              "Complete the custom service setup questionnaire before activation.",
          };
        }
      }

      persistModules((prev) =>
        prev.map((m) =>
          m.id === id
            ? normalizeCustomServiceModule({
                ...m,
                status,
                disableReason: status === "disabled" ? reason : undefined,
                updatedAt: new Date().toISOString(),
              })
            : m,
        ),
      );

      return { ok: true };
    },
    [modules, persistModules],
  );

  // --- Resource CRUD ---

  const addResource = useCallback(
    (resource: FacilityResource) => {
      persistResources((prev) => [...prev, resource]);
    },
    [persistResources],
  );

  const updateResource = useCallback(
    (id: string, updates: Partial<FacilityResource>) => {
      persistResources((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      );
    },
    [persistResources],
  );

  const deleteResource = useCallback(
    (id: string) => {
      persistResources((prev) => prev.filter((r) => r.id !== id));
    },
    [persistResources],
  );

  // --- Queries ---

  const getModuleBySlug = useCallback(
    (slug: string) => modules.find((m) => m.slug === slug),
    [modules],
  );

  const getModuleById = useCallback(
    (id: string) => modules.find((m) => m.id === id),
    [modules],
  );

  const getResourcesByType = useCallback(
    (type: FacilityResource["type"]) =>
      resources.filter((r) => r.type === type),
    [resources],
  );

  // --- Reset ---

  const resetCustomServices = useCallback(() => {
    persistModules(() =>
      defaultCustomServiceModules.map(normalizeCustomServiceModule),
    );
    persistResources(() => defaultFacilityResources);
  }, [persistModules, persistResources]);

  // Memoize context value to avoid unnecessary consumer re-renders
  const contextValue = useMemo<CustomServicesContextValue>(
    () => ({
      modules,
      activeModules,
      resources,
      addModule,
      updateModule,
      deleteModule,
      duplicateModule,
      setModuleStatus,
      addResource,
      updateResource,
      deleteResource,
      getModuleBySlug,
      getModuleById,
      getResourcesByType,
      resetCustomServices,
    }),
    [
      modules,
      activeModules,
      resources,
      addModule,
      updateModule,
      deleteModule,
      duplicateModule,
      setModuleStatus,
      addResource,
      updateResource,
      deleteResource,
      getModuleBySlug,
      getModuleById,
      getResourcesByType,
      resetCustomServices,
    ],
  );

  return (
    <CustomServicesContext.Provider value={contextValue}>
      {children}
    </CustomServicesContext.Provider>
  );
}

// ========================================
// HOOK
// ========================================

export function useCustomServices(): CustomServicesContextValue {
  const context = useContext(CustomServicesContext);
  if (!context) {
    throw new Error(
      "useCustomServices must be used within a CustomServicesProvider",
    );
  }
  return context;
}
