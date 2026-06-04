"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  getFacilityLoyaltyConfig,
  buildDefaultLoyaltyConfig,
  buildDefaultEarnRules,
  buildDefaultTiers,
} from "@/data/facility-loyalty-config";
import { badges as defaultBadges } from "@/data/marketing";
import type { FacilityLoyaltyConfig } from "@/types/loyalty";

/**
 * Editable, persisted facility loyalty *program* configuration.
 *
 * This is distinct from the read-only `useLoyaltyConfig` hook (which exposes
 * derived feature flags / permissions). `useLoyaltyProgram` owns the writable
 * `FacilityLoyaltyConfig` edited by the admin configuration UI under
 * /facility/dashboard/loyalty. Edits persist to localStorage (mock layer);
 * swapping to a real API only requires changing `loadConfig`/`persist`.
 */

/** Static facility ID for the admin session (matches loyalty-reports). */
export const DEFAULT_LOYALTY_FACILITY_ID = 1;

const storageKey = (facilityId: number) => `loyalty-program-${facilityId}`;

/**
 * Resolve the base config for a facility: its saved example config, or a fresh
 * default. Seeds achievement badges from the marketing defaults when absent so
 * the Badges editor is never empty on first load.
 */
function resolveBaseConfig(facilityId: number): FacilityLoyaltyConfig {
  const base =
    getFacilityLoyaltyConfig(facilityId) ??
    buildDefaultLoyaltyConfig(facilityId);
  return {
    ...base,
    badges: base.badges && base.badges.length > 0 ? base.badges : defaultBadges,
    earnRules:
      base.earnRules && base.earnRules.length > 0
        ? base.earnRules
        : buildDefaultEarnRules(facilityId),
    tierDefinitions:
      base.tierDefinitions && base.tierDefinitions.length > 0
        ? base.tierDefinitions
        : buildDefaultTiers(facilityId),
  };
}

function loadConfig(facilityId: number): FacilityLoyaltyConfig {
  const fallback = resolveBaseConfig(facilityId);
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(storageKey(facilityId));
  if (!stored) return fallback;
  try {
    const parsed = JSON.parse(stored) as Partial<FacilityLoyaltyConfig>;
    if (parsed && typeof parsed === "object") {
      return { ...fallback, ...parsed };
    }
  } catch {
    return fallback;
  }
  return fallback;
}

interface LoyaltyProgramContextValue {
  facilityId: number;
  config: FacilityLoyaltyConfig;
  /** Persist a full updated config (stamps updatedAt). */
  updateConfig: (config: FacilityLoyaltyConfig) => void;
  /** Persist a partial patch to the top-level config (stamps updatedAt). */
  patchConfig: (patch: Partial<FacilityLoyaltyConfig>) => void;
  /** Restore the facility's base/default config and clear local edits. */
  resetConfig: () => void;
}

const LoyaltyProgramContext = createContext<LoyaltyProgramContextValue | null>(
  null,
);

export function LoyaltyProgramProvider({
  children,
  facilityId = DEFAULT_LOYALTY_FACILITY_ID,
}: {
  children: ReactNode;
  facilityId?: number;
}) {
  const [config, setConfig] = useState<FacilityLoyaltyConfig>(() =>
    loadConfig(facilityId),
  );

  const writeStorage = useCallback(
    (next: FacilityLoyaltyConfig) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          storageKey(facilityId),
          JSON.stringify(next),
        );
      }
    },
    [facilityId],
  );

  const updateConfig = useCallback(
    (next: FacilityLoyaltyConfig) => {
      const stamped = { ...next, updatedAt: new Date().toISOString() };
      setConfig(stamped);
      writeStorage(stamped);
    },
    [writeStorage],
  );

  const patchConfig = useCallback(
    (patch: Partial<FacilityLoyaltyConfig>) => {
      setConfig((prev) => {
        const stamped = {
          ...prev,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
        writeStorage(stamped);
        return stamped;
      });
    },
    [writeStorage],
  );

  const resetConfig = useCallback(() => {
    const base = resolveBaseConfig(facilityId);
    setConfig(base);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey(facilityId));
    }
  }, [facilityId]);

  return (
    <LoyaltyProgramContext.Provider
      value={{ facilityId, config, updateConfig, patchConfig, resetConfig }}
    >
      {children}
    </LoyaltyProgramContext.Provider>
  );
}

export function useLoyaltyProgram() {
  const ctx = useContext(LoyaltyProgramContext);
  if (!ctx) {
    throw new Error(
      "useLoyaltyProgram must be used within a LoyaltyProgramProvider",
    );
  }
  return ctx;
}
