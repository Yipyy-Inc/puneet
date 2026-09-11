"use client";

import {
  useFacilitySettings,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import type { DaycareRate } from "@/types/daycare";

/**
 * The facility's daycare rates (the `daycare_rates` settings domain) and a
 * save that writes the whole list, as the Rates screen edits it.
 *
 * `pending` is true until the settings have arrived: a screen must not offer
 * to edit — and then save over — a list it has not read yet.
 */
export function useDaycareRates(): {
  rates: DaycareRate[];
  pending: boolean;
  saving: boolean;
  save: (rates: DaycareRate[]) => Promise<unknown>;
} {
  const { settings, isPending } = useFacilitySettings();
  const { mutateAsync, isPending: saving } = useSaveFacilitySetting();
  return {
    rates: settings.daycare_rates.value.rates,
    pending: isPending,
    saving,
    save: (rates) => mutateAsync({ domain: "daycare_rates", value: { rates } }),
  };
}
