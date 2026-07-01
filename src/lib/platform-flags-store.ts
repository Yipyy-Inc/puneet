"use client";

import { useSyncExternalStore } from "react";

import type { ConfigChangeLog } from "@/data/feature-toggles";

// Editable overlay for the platform feature-flags console. The base data
// (tenant configs, global flags, tier defaults, facility modules) is read-only
// mock; admin edits made on this page live here as overrides keyed by id, so
// they persist while navigating between tabs. Every edit also appends a live
// entry to the change log shown on the Change History tab. Module store.

export interface FlagsOverrides {
  /** `${tenantId}:${moduleId}` -> enabled */
  tenantModules: Record<string, boolean>;
  /** `${flagId}` -> { enabled, rollout } */
  globalFlags: Record<string, { enabled: boolean; rollout: number }>;
  /** `${tierId}:${moduleId}` -> included */
  tierDefaults: Record<string, boolean>;
  /** `${facilityId}:${moduleId}` -> enabled */
  facilityModules: Record<string, boolean>;
}

const EMPTY: FlagsOverrides = {
  tenantModules: {},
  globalFlags: {},
  tierDefaults: {},
  facilityModules: {},
};
const EMPTY_LOG: ConfigChangeLog[] = [];
const ACTOR = "Puneet";

let state: FlagsOverrides = EMPTY;
let changeLog: ConfigChangeLog[] = EMPTY_LOG;
let logSeq = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function commit(
  next: FlagsOverrides,
  log: Omit<ConfigChangeLog, "id" | "timestamp">,
) {
  state = next;
  changeLog = [
    {
      id: `live-${Date.now()}-${logSeq++}`,
      timestamp: new Date().toISOString(),
      ...log,
    },
    ...changeLog,
  ];
  notify();
}

function toggleLog(
  configId: string,
  configKey: string,
  enabled: boolean,
  affectedTenants: number,
): Omit<ConfigChangeLog, "id" | "timestamp"> {
  return {
    configId,
    configKey,
    action: "toggled",
    previousValue: enabled ? "disabled" : "enabled",
    newValue: enabled ? "enabled" : "disabled",
    actor: ACTOR,
    affectedTenants,
  };
}

export function setTenantModule(
  tenantId: string,
  moduleId: string,
  enabled: boolean,
  label: string,
) {
  commit(
    {
      ...state,
      tenantModules: {
        ...state.tenantModules,
        [`${tenantId}:${moduleId}`]: enabled,
      },
    },
    toggleLog(tenantId, label, enabled, 1),
  );
}

export function setGlobalFlag(
  flagId: string,
  value: { enabled: boolean; rollout: number },
  label: string,
  affected: number,
) {
  commit(
    { ...state, globalFlags: { ...state.globalFlags, [flagId]: value } },
    toggleLog(flagId, label, value.enabled, affected),
  );
}

export function setTierDefault(
  tierId: string,
  moduleId: string,
  included: boolean,
  label: string,
  affected: number,
) {
  commit(
    {
      ...state,
      tierDefaults: {
        ...state.tierDefaults,
        [`${tierId}:${moduleId}`]: included,
      },
    },
    toggleLog(tierId, label, included, affected),
  );
}

export function setFacilityModule(
  facilityId: number,
  moduleId: string,
  enabled: boolean,
  label: string,
) {
  commit(
    {
      ...state,
      facilityModules: {
        ...state.facilityModules,
        [`${facilityId}:${moduleId}`]: enabled,
      },
    },
    toggleLog(String(facilityId), label, enabled, 1),
  );
}

/** Clear every per-facility module override for one facility (Reset to Tier Defaults). */
export function resetFacilityModules(facilityId: number, label: string) {
  const prefix = `${facilityId}:`;
  const next: Record<string, boolean> = {};
  let cleared = 0;
  for (const [key, value] of Object.entries(state.facilityModules)) {
    if (key.startsWith(prefix)) cleared += 1;
    else next[key] = value;
  }
  if (cleared === 0) return;
  commit(
    { ...state, facilityModules: next },
    {
      configId: String(facilityId),
      configKey: label,
      action: "updated",
      previousValue: `${cleared} override${cleared === 1 ? "" : "s"}`,
      newValue: "tier defaults",
      actor: ACTOR,
      affectedTenants: 1,
    },
  );
}

/** Override lookup with a base fallback. */
export function resolved(
  map: Record<string, boolean>,
  key: string,
  base: boolean,
): boolean {
  return key in map ? map[key] : base;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePlatformFlags(): FlagsOverrides {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY,
  );
}

/** Live change-log entries made this session (newest first). */
export function useChangeLog(): ConfigChangeLog[] {
  return useSyncExternalStore(
    subscribe,
    () => changeLog,
    () => EMPTY_LOG,
  );
}
