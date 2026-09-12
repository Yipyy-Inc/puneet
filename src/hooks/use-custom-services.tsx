"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CustomServiceModule,
  CustomServiceStatus,
  FacilityResource,
} from "@/types/facility";
import {
  getModuleWorkflowQuestionnaire,
  normalizeCustomServiceModule,
} from "@/data/custom-services";
import { facilitySettingsQueries } from "@/lib/api/facility-settings";
import { NO_ITEMS } from "@/lib/no-items";

// ============================================================================
// A facility's custom services and resources — the facility's own settings.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// Both lists lived in the browser's localStorage, seeded from
// src/data/custom-services.ts: every facility, in every browser, showed the
// same invented services, an edit reached nobody else, and the customer
// booking flow offered customers services their facility did not sell. They
// are the `custom_services` and `facility_resources` settings domains now
// (lib/settings/custom-services.ts), and a facility that has configured
// neither has none.
//
// ── TWO AUDIENCES ─────────────────────────────────────────────────────────
//
//   staff      reads and writes the facility's settings.
//   customer   reads `public.offered_custom_services()` through
//              /api/customer/custom-services — the active, online-bookable
//              modules with the facility's own fields left out
//              (20260912172123). A customer has no resources and no writes.
//
// ── WRITES ARE PROMISES ───────────────────────────────────────────────────
//
// Every write reads the CURRENT list from the server, applies its change and
// saves the whole list — not the copy the screen loaded minutes ago — and
// resolves once it is saved, or rejects with the server's reason. They were
// synchronous, and every caller toasted before anything could have failed.
// ============================================================================

export type CustomServicesAudience = "staff" | "customer";

interface CustomServicesContextValue {
  modules: CustomServiceModule[];
  activeModules: CustomServiceModule[];
  resources: FacilityResource[];
  /** True until the facility's list has arrived. */
  isPending: boolean;
  // Module CRUD
  addModule: (module: CustomServiceModule) => Promise<void>;
  updateModule: (
    id: string,
    updates: Partial<CustomServiceModule>,
  ) => Promise<void>;
  deleteModule: (id: string) => Promise<void>;
  duplicateModule: (id: string) => Promise<CustomServiceModule | null>;
  setModuleStatus: (
    id: string,
    status: CustomServiceStatus,
    reason?: string,
  ) => Promise<{ ok: boolean; reason?: string }>;
  // Resource CRUD
  addResource: (resource: FacilityResource) => Promise<void>;
  updateResource: (
    id: string,
    updates: Partial<FacilityResource>,
  ) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  // Queries
  getModuleBySlug: (slug: string) => CustomServiceModule | undefined;
  getModuleById: (id: string) => CustomServiceModule | undefined;
  getResourcesByType: (type: FacilityResource["type"]) => FacilityResource[];
}

const CustomServicesContext = createContext<CustomServicesContextValue | null>(
  null,
);

const OFFERED_KEY = ["customer", "custom-services"] as const;

async function readError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return new Error(body?.error ?? fallback);
}

async function fetchOffered(): Promise<CustomServiceModule[]> {
  const response = await fetch("/api/customer/custom-services");
  if (response.status === 401 || response.status === 404) return [];
  if (!response.ok) {
    throw await readError(response, "Could not load the services on offer.");
  }
  return ((await response.json()) as { modules: CustomServiceModule[] })
    .modules;
}

async function saveDomain(
  domain: "custom_services" | "facility_resources",
  value: unknown,
) {
  const response = await fetch("/api/facility/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain, value }),
  });
  if (!response.ok) {
    throw await readError(response, `Request failed (${response.status})`);
  }
}

const NOT_YOURS = "Custom services are changed by the facility.";

export function CustomServicesProvider({
  children,
  audience = "staff",
}: {
  children: ReactNode;
  audience?: CustomServicesAudience;
}) {
  const queryClient = useQueryClient();
  const staff = audience === "staff";

  const settingsQuery = useQuery({
    ...facilitySettingsQueries.all(),
    enabled: staff,
  });
  const offeredQuery = useQuery({
    queryKey: OFFERED_KEY,
    queryFn: fetchOffered,
    enabled: !staff,
  });

  const rawModules = staff
    ? settingsQuery.data?.custom_services?.value.modules
    : offeredQuery.data;
  const rawResources = staff
    ? settingsQuery.data?.facility_resources?.value.resources
    : undefined;

  const modules = useMemo(
    () =>
      ((rawModules as CustomServiceModule[] | undefined) ?? NO_ITEMS).map(
        normalizeCustomServiceModule,
      ),
    [rawModules],
  );
  const resources =
    (rawResources as FacilityResource[] | undefined) ?? NO_ITEMS;
  const isPending = staff ? settingsQuery.isPending : offeredQuery.isPending;

  // Derived state — computed once per modules change, shared by all consumers
  const activeModules = useMemo(
    () => modules.filter((m) => m.status === "active"),
    [modules],
  );

  // ── The current lists, from the server ──────────────────────────────────
  const current = useCallback(async () => {
    const settings = await queryClient.fetchQuery({
      ...facilitySettingsQueries.all(),
      staleTime: 0,
    });
    return {
      modules: (settings.custom_services?.value.modules ??
        []) as CustomServiceModule[],
      resources: (settings.facility_resources?.value.resources ??
        []) as FacilityResource[],
    };
  }, [queryClient]);

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["facility", "settings"] }),
    [queryClient],
  );

  const saveModules = useCallback(
    async (
      change: (prev: CustomServiceModule[]) => CustomServiceModule[],
    ): Promise<void> => {
      if (!staff) throw new Error(NOT_YOURS);
      const { modules: prev } = await current();
      await saveDomain("custom_services", {
        modules: change(prev).map(normalizeCustomServiceModule),
      });
      await refresh();
    },
    [staff, current, refresh],
  );

  const saveResources = useCallback(
    async (
      change: (prev: FacilityResource[]) => FacilityResource[],
    ): Promise<void> => {
      if (!staff) throw new Error(NOT_YOURS);
      const { resources: prev } = await current();
      await saveDomain("facility_resources", { resources: change(prev) });
      await refresh();
    },
    [staff, current, refresh],
  );

  // --- Module CRUD ---

  const addModule = useCallback(
    (module: CustomServiceModule) =>
      saveModules((prev) => [...prev, normalizeCustomServiceModule(module)]),
    [saveModules],
  );

  const updateModule = useCallback(
    (id: string, updates: Partial<CustomServiceModule>) =>
      saveModules((prev) =>
        prev.map((m) =>
          m.id === id
            ? normalizeCustomServiceModule({
                ...m,
                ...updates,
                updatedAt: new Date().toISOString(),
              })
            : m,
        ),
      ),
    [saveModules],
  );

  const deleteModule = useCallback(
    (id: string) => saveModules((prev) => prev.filter((m) => m.id !== id)),
    [saveModules],
  );

  const duplicateModule = useCallback(
    async (id: string): Promise<CustomServiceModule | null> => {
      let duplicate: CustomServiceModule | null = null;
      await saveModules((prev) => {
        const source = prev.find((m) => m.id === id);
        if (!source) return prev;
        const now = new Date().toISOString();
        const baseSlug = `${source.slug}-copy`;
        const existingSlugs = new Set(prev.map((m) => m.slug));
        let slug = baseSlug;
        let counter = 2;
        while (existingSlugs.has(slug)) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        duplicate = normalizeCustomServiceModule({
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
        });
        return [...prev, duplicate];
      });
      return duplicate;
    },
    [saveModules],
  );

  const setModuleStatus = useCallback(
    async (id: string, status: CustomServiceStatus, reason?: string) => {
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

      try {
        await saveModules((prev) =>
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
      } catch (error) {
        return {
          ok: false,
          reason: error instanceof Error ? error.message : String(error),
        };
      }
      return { ok: true };
    },
    [modules, saveModules],
  );

  // --- Resource CRUD ---

  const addResource = useCallback(
    (resource: FacilityResource) =>
      saveResources((prev) => [...prev, resource]),
    [saveResources],
  );

  const updateResource = useCallback(
    (id: string, updates: Partial<FacilityResource>) =>
      saveResources((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      ),
    [saveResources],
  );

  const deleteResource = useCallback(
    (id: string) => saveResources((prev) => prev.filter((r) => r.id !== id)),
    [saveResources],
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

  // Memoize context value to avoid unnecessary consumer re-renders
  const contextValue = useMemo<CustomServicesContextValue>(
    () => ({
      modules,
      activeModules,
      resources,
      isPending,
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
    }),
    [
      modules,
      activeModules,
      resources,
      isPending,
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
