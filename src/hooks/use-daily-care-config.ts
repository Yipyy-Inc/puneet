"use client";

import { useSyncExternalStore, useCallback } from "react";
import { dailyCareConfigStore } from "@/data/daily-care-config-store";
import type { FacilityDailyCareConfig } from "@/types/boarding";

/**
 * Subscribe to the facility's Daily Care configuration. The settings page
 * mutates via setConfig; the Daily Care List re-derives its sections live.
 */
export function useDailyCareConfig() {
  const config = useSyncExternalStore(
    dailyCareConfigStore.subscribe,
    dailyCareConfigStore.getSnapshot,
    dailyCareConfigStore.getSnapshot,
  );

  const setConfig = useCallback(
    (next: FacilityDailyCareConfig) => dailyCareConfigStore.set(next),
    [],
  );

  const reset = useCallback(() => dailyCareConfigStore.reset(), []);

  return { config, setConfig, reset };
}
