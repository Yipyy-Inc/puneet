"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  useFacilitySettings,
  useSaveFacilitySetting,
  type FacilitySettings,
} from "@/lib/api/facility-settings";
import { SHIPPED_DAILY_CARE_ROUTINE } from "@/lib/settings/daily-care";
import type { FacilityDailyCareConfig } from "@/types/boarding";

/**
 * The facility's Daily Care routine, from `facility_settings`
 * (`daily_care_config`).
 *
 * It was a module-level copy of the seed routine: the settings screen wrote
 * into it, the board re-derived its rounds from it, and both were one browser
 * tab's — gone on reload, and a manager's routine was never what the floor
 * tablet drew. The return shape is unchanged, so its four readers were not.
 *
 * `setConfig` shows the edit at once (the settings screen autosaves every
 * change), saves the domain, and puts the routine back if the save is refused.
 * It resolves `true` once the routine is saved, so the screen's "Saved" is
 * about the database rather than about a keystroke.
 */
export function useDailyCareConfig() {
  const { settings, isPending } = useFacilitySettings();
  const save = useSaveFacilitySetting();
  const queryClient = useQueryClient();
  const config = settings.daily_care_config.value as FacilityDailyCareConfig;

  const setConfig = useCallback(
    async (next: FacilityDailyCareConfig): Promise<boolean> => {
      queryClient.setQueryData(
        ["facility", "settings"],
        (current: FacilitySettings | undefined) =>
          current
            ? {
                ...current,
                daily_care_config: { value: next, configured: true },
              }
            : current,
      );
      try {
        await save.mutateAsync({ domain: "daily_care_config", value: next });
        return true;
      } catch {
        void queryClient.invalidateQueries({
          queryKey: ["facility", "settings"],
        });
        return false;
      }
    },
    [queryClient, save],
  );

  const reset = useCallback(
    () => setConfig(structuredClone(SHIPPED_DAILY_CARE_ROUTINE)),
    [setConfig],
  );

  return { config, setConfig, reset, isPending, saving: save.isPending };
}
