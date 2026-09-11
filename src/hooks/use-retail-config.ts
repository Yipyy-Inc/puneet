"use client";

import type { RetailConfig } from "@/data/retail-config";
import {
  useFacilitySettings,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";

/**
 * The facility's retail configuration (the `retail_config` settings domain)
 * and a save that writes the whole of it.
 *
 * `pending` is true until the settings have arrived: a screen must not offer
 * to edit — and then save over — a configuration it has not read yet.
 */
export function useRetailConfig(): {
  config: RetailConfig;
  pending: boolean;
  saving: boolean;
  save: (next: RetailConfig) => Promise<unknown>;
} {
  const { settings, isPending } = useFacilitySettings();
  const { mutateAsync, isPending: saving } = useSaveFacilitySetting();
  return {
    config: settings.retail_config.value,
    pending: isPending,
    saving,
    save: (next) => mutateAsync({ domain: "retail_config", value: next }),
  };
}
